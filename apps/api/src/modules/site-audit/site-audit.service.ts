import { Injectable, BadRequestException, PreconditionFailedException, NotFoundException } from '@nestjs/common';
import { prisma } from '@rankforge/database';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class SiteAuditService {
  async crawlClientWebsite(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.website) {
      throw new BadRequestException('Client has no website configured');
    }

    // Create a SiteAudit record in PENDING state
    const audit = await prisma.siteAudit.create({
      data: {
        clientId,
        status: 'PENDING',
      },
    });

    let sitemapUrl = client.website;
    if (!sitemapUrl.endsWith('sitemap.xml')) {
      sitemapUrl = sitemapUrl.endsWith('/') ? `${sitemapUrl}sitemap.xml` : `${sitemapUrl}/sitemap.xml`;
    }

    try {
      const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const parser = new XMLParser();
      const result = parser.parse(xmlText);

      let urls: string[] = [];
      if (result.urlset && result.urlset.url) {
        const urlData = result.urlset.url;
        if (Array.isArray(urlData)) {
          urls = urlData.map((u: any) => u.loc).filter(Boolean);
        } else if (urlData.loc) {
          urls = [urlData.loc];
        }
      } else if (result.sitemapindex && result.sitemapindex.sitemap) {
        // Sitemap index: parse nested sitemaps (simple resolution)
        const sitemapData = result.sitemapindex.sitemap;
        let nestedUrls: string[] = [];
        if (Array.isArray(sitemapData)) {
          nestedUrls = sitemapData.map((s: any) => s.loc).filter(Boolean);
        } else if (sitemapData.loc) {
          nestedUrls = [sitemapData.loc];
        }

        // Fetch up to 3 nested sitemaps to keep it lightweight
        for (const nestedUrl of nestedUrls.slice(0, 3)) {
          try {
            const nestedRes = await fetch(nestedUrl, { signal: AbortSignal.timeout(5000) });
            if (nestedRes.ok) {
              const nestedXml = await nestedRes.text();
              const nestedResult = parser.parse(nestedXml);
              if (nestedResult.urlset && nestedResult.urlset.url) {
                const nestedUrlData = nestedResult.urlset.url;
                if (Array.isArray(nestedUrlData)) {
                  urls.push(...nestedUrlData.map((u: any) => u.loc).filter(Boolean));
                } else if (nestedUrlData.loc) {
                  urls.push(nestedUrlData.loc);
                }
              }
            }
          } catch (e) {
            // Ignore nested sitemap errors
          }
        }
      }

      // Deduplicate
      urls = Array.from(new Set(urls));

      // Limit to max 15 URLs for lightweight check
      const urlsToCheck = urls.slice(0, 15);
      const issues: Array<{ url: string; severity: string; issueType: string; description: string }> = [];

      for (const url of urlsToCheck) {
        try {
          const pageRes = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
          if (!pageRes.ok) {
            issues.push({
              url,
              severity: 'CRITICAL',
              issueType: 'BROKEN_LINK',
              description: `HTTP status ${pageRes.status} returned.`,
            });
            continue;
          }

          const html = await pageRes.text();
          
          // H1 Checks
          const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
          if (!h1Matches || h1Matches.length === 0) {
            issues.push({
              url,
              severity: 'HIGH',
              issueType: 'MISSING_H1',
              description: 'No H1 heading found on the page.',
            });
          } else if (h1Matches.length > 1) {
            issues.push({
              url,
              severity: 'MEDIUM',
              issueType: 'MULTIPLE_H1',
              description: `Found ${h1Matches.length} H1 headings on the page.`,
            });
          }

          // Title Check
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (!titleMatch || !titleMatch[1] || titleMatch[1].trim() === '') {
            issues.push({
              url,
              severity: 'HIGH',
              issueType: 'MISSING_TITLE',
              description: 'Title tag is missing or empty.',
            });
          }

          // Meta description Check
          const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                                   html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
          if (!descriptionMatch || !descriptionMatch[1] || descriptionMatch[1].trim() === '') {
            issues.push({
              url,
              severity: 'MEDIUM',
              issueType: 'MISSING_META',
              description: 'Meta description is missing or empty.',
            });
          } else if (descriptionMatch[1].length > 160) {
            issues.push({
              url,
              severity: 'LOW',
              issueType: 'META_TOO_LONG',
              description: `Meta description is too long (${descriptionMatch[1].length} chars). Recommend < 160.`,
            });
          }

        } catch (e: any) {
          issues.push({
            url,
            severity: 'CRITICAL',
            issueType: 'BROKEN_LINK',
            description: `Network error or timeout checking URL: ${e.message}`,
          });
        }
      }

      // Update Audit status and insert issues
      await prisma.$transaction([
        prisma.siteAudit.update({
          where: { id: audit.id },
          data: {
            status: 'COMPLETED',
            totalUrls: urlsToCheck.length,
          },
        }),
        ...issues.map(issue =>
          prisma.siteAuditIssue.create({
            data: {
              siteAuditId: audit.id,
              url: issue.url,
              severity: issue.severity,
              issueType: issue.issueType,
              description: issue.description,
            },
          })
        ),
      ]);

      return prisma.siteAudit.findUnique({
        where: { id: audit.id },
        include: { issues: true },
      });

    } catch (err: any) {
      await prisma.siteAudit.update({
        where: { id: audit.id },
        data: {
          status: 'FAILED',
        },
      });
      throw new BadRequestException(`Crawl failed: ${err.message}`);
    }
  }

  async createRestorePoint(clientId: string, snapshotData: string, description?: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return prisma.siteRestorePoint.create({
      data: {
        clientId,
        snapshotData,
        description,
      },
    });
  }

  async executeFix(clientId: string, issueId: string) {
    // 1. Check if restore point exists in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRestorePoint = await prisma.siteRestorePoint.findFirst({
      where: {
        clientId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentRestorePoint) {
      throw new PreconditionFailedException(
        'Attempting to execute a fix without a stored restore-point reference is blocked'
      );
    }

    // 2. Resolve the issue
    const issue = await prisma.siteAuditIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return prisma.siteAuditIssue.update({
      where: { id: issueId },
      data: { isResolved: true },
    });
  }
}
