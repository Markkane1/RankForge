"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteAuditService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
const fast_xml_parser_1 = require("fast-xml-parser");
let SiteAuditService = class SiteAuditService {
    async crawlClientWebsite(clientId) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        if (!client.website) {
            throw new common_1.BadRequestException('Client has no website configured');
        }
        const audit = await database_1.prisma.siteAudit.create({
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
            const parser = new fast_xml_parser_1.XMLParser();
            const result = parser.parse(xmlText);
            let urls = [];
            if (result.urlset && result.urlset.url) {
                const urlData = result.urlset.url;
                if (Array.isArray(urlData)) {
                    urls = urlData.map((u) => u.loc).filter(Boolean);
                }
                else if (urlData.loc) {
                    urls = [urlData.loc];
                }
            }
            else if (result.sitemapindex && result.sitemapindex.sitemap) {
                const sitemapData = result.sitemapindex.sitemap;
                let nestedUrls = [];
                if (Array.isArray(sitemapData)) {
                    nestedUrls = sitemapData.map((s) => s.loc).filter(Boolean);
                }
                else if (sitemapData.loc) {
                    nestedUrls = [sitemapData.loc];
                }
                for (const nestedUrl of nestedUrls.slice(0, 3)) {
                    try {
                        const nestedRes = await fetch(nestedUrl, { signal: AbortSignal.timeout(5000) });
                        if (nestedRes.ok) {
                            const nestedXml = await nestedRes.text();
                            const nestedResult = parser.parse(nestedXml);
                            if (nestedResult.urlset && nestedResult.urlset.url) {
                                const nestedUrlData = nestedResult.urlset.url;
                                if (Array.isArray(nestedUrlData)) {
                                    urls.push(...nestedUrlData.map((u) => u.loc).filter(Boolean));
                                }
                                else if (nestedUrlData.loc) {
                                    urls.push(nestedUrlData.loc);
                                }
                            }
                        }
                    }
                    catch (e) {
                    }
                }
            }
            urls = Array.from(new Set(urls));
            const urlsToCheck = urls.slice(0, 15);
            const issues = [];
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
                    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
                    if (!h1Matches || h1Matches.length === 0) {
                        issues.push({
                            url,
                            severity: 'HIGH',
                            issueType: 'MISSING_H1',
                            description: 'No H1 heading found on the page.',
                        });
                    }
                    else if (h1Matches.length > 1) {
                        issues.push({
                            url,
                            severity: 'MEDIUM',
                            issueType: 'MULTIPLE_H1',
                            description: `Found ${h1Matches.length} H1 headings on the page.`,
                        });
                    }
                    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                    if (!titleMatch || !titleMatch[1] || titleMatch[1].trim() === '') {
                        issues.push({
                            url,
                            severity: 'HIGH',
                            issueType: 'MISSING_TITLE',
                            description: 'Title tag is missing or empty.',
                        });
                    }
                    const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
                    if (!descriptionMatch || !descriptionMatch[1] || descriptionMatch[1].trim() === '') {
                        issues.push({
                            url,
                            severity: 'MEDIUM',
                            issueType: 'MISSING_META',
                            description: 'Meta description is missing or empty.',
                        });
                    }
                    else if (descriptionMatch[1].length > 160) {
                        issues.push({
                            url,
                            severity: 'LOW',
                            issueType: 'META_TOO_LONG',
                            description: `Meta description is too long (${descriptionMatch[1].length} chars). Recommend < 160.`,
                        });
                    }
                }
                catch (e) {
                    issues.push({
                        url,
                        severity: 'CRITICAL',
                        issueType: 'BROKEN_LINK',
                        description: `Network error or timeout checking URL: ${e.message}`,
                    });
                }
            }
            await database_1.prisma.$transaction([
                database_1.prisma.siteAudit.update({
                    where: { id: audit.id },
                    data: {
                        status: 'COMPLETED',
                        totalUrls: urlsToCheck.length,
                    },
                }),
                ...issues.map(issue => database_1.prisma.siteAuditIssue.create({
                    data: {
                        siteAuditId: audit.id,
                        url: issue.url,
                        severity: issue.severity,
                        issueType: issue.issueType,
                        description: issue.description,
                    },
                })),
            ]);
            return database_1.prisma.siteAudit.findUnique({
                where: { id: audit.id },
                include: { issues: true },
            });
        }
        catch (err) {
            await database_1.prisma.siteAudit.update({
                where: { id: audit.id },
                data: {
                    status: 'FAILED',
                },
            });
            throw new common_1.BadRequestException(`Crawl failed: ${err.message}`);
        }
    }
    async createRestorePoint(clientId, snapshotData, description) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        return database_1.prisma.siteRestorePoint.create({
            data: {
                clientId,
                snapshotData,
                description,
            },
        });
    }
    async executeFix(clientId, issueId) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentRestorePoint = await database_1.prisma.siteRestorePoint.findFirst({
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
            throw new common_1.PreconditionFailedException('Attempting to execute a fix without a stored restore-point reference is blocked');
        }
        const issue = await database_1.prisma.siteAuditIssue.findUnique({
            where: { id: issueId },
        });
        if (!issue) {
            throw new common_1.NotFoundException('Issue not found');
        }
        return database_1.prisma.siteAuditIssue.update({
            where: { id: issueId },
            data: { isResolved: true },
        });
    }
};
exports.SiteAuditService = SiteAuditService;
exports.SiteAuditService = SiteAuditService = __decorate([
    (0, common_1.Injectable)()
], SiteAuditService);
//# sourceMappingURL=site-audit.service.js.map