import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@rankforge/database';

@Injectable()
export class ContentPipelineService {
  // REQ-M4-01: Content calendar builder
  async schedulePost(
    clientId: string,
    data: {
      gbpProfileId: string;
      title: string;
      content: string;
      scheduledAt: string;
      eventType?: string;
      ctaButton?: string;
      ctaUrl?: string;
    },
  ) {
    const profile = await prisma.gbpProfile.findUnique({
      where: { id: data.gbpProfileId },
    });

    if (!profile || profile.clientId !== clientId) {
      throw new NotFoundException('GBP Profile not found');
    }

    const scheduledDate = new Date(data.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduled date format');
    }

    if (scheduledDate.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    return prisma.gbpPost.create({
      data: {
        gbpProfileId: data.gbpProfileId,
        title: data.title,
        content: data.content,
        eventType: data.eventType ?? null,
        ctaButton: data.ctaButton ?? null,
        ctaUrl: data.ctaUrl ?? null,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
      },
    });
  }

  async listScheduledPosts(clientId: string, start?: string, end?: string) {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    return prisma.gbpPost.findMany({
      where: {
        gbpProfile: { clientId },
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        gbpProfile: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateScheduledPost(
    clientId: string,
    postId: string,
    data: {
      title?: string;
      content?: string;
      scheduledAt?: string;
      status?: string;
    },
  ) {
    const post = await prisma.gbpPost.findUnique({
      where: { id: postId },
      include: { gbpProfile: true },
    });

    if (!post || post.gbpProfile.clientId !== clientId) {
      throw new NotFoundException('Post not found');
    }

    const scheduledDate = data.scheduledAt
      ? new Date(data.scheduledAt)
      : undefined;
    if (scheduledDate && isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduled date format');
    }

    return prisma.gbpPost.update({
      where: { id: postId },
      data: {
        title: data.title,
        content: data.content,
        scheduledAt: scheduledDate,
        status: data.status,
      },
    });
  }

  async deleteScheduledPost(clientId: string, postId: string) {
    const post = await prisma.gbpPost.findUnique({
      where: { id: postId },
      include: { gbpProfile: true },
    });

    if (!post || post.gbpProfile.clientId !== clientId) {
      throw new NotFoundException('Post not found');
    }

    return prisma.gbpPost.delete({
      where: { id: postId },
    });
  }

  // REQ-M4-02: LLM content draft generator
  async generateContentDraft(
    clientId: string,
    topic: string,
    primaryKeywords: string[],
  ) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    throw new BadRequestException(
      'Content generation is not implemented/configured.',
    );
  }

  // REQ-M4-03: GEO format checker & query checks
  async syncSearchVisibility(clientId: string, query: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    // Simulate DataForSEO SERP pull/organic snippets scraper
    const isMatchingSnippet =
      query.toLowerCase().includes('plumb') ||
      query.toLowerCase().includes('clean');

    return {
      query,
      clientName: client.businessName,
      organicPosition: isMatchingSnippet ? 3 : 12,
      inLocalPack: isMatchingSnippet,
      snippetText: isMatchingSnippet
        ? `Professional plumbing and cleaning services by ${client.businessName}. Highly rated locally.`
        : 'Other business listings in the region.',
      visibilityScore: isMatchingSnippet ? 85.5 : 22.0,
      competitors: [
        { name: 'Competitor Alpha', position: 1 },
        { name: 'Competitor Beta', position: 2 },
      ],
      lastScrapedAt: new Date(),
    };
  }

  // REQ-M4-04: Quarterly stale content scanner
  async scanStaleContent(clientId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find posts associated with client's GBP profile that are older than 90 days and status is not STALE
    const stalePosts = await prisma.gbpPost.findMany({
      where: {
        gbpProfile: { clientId },
        status: { not: 'STALE' },
        OR: [
          { publishedAt: { lt: ninetyDaysAgo } },
          {
            publishedAt: null,
            createdAt: { lt: ninetyDaysAgo },
          },
        ],
      },
    });

    const updated: any[] = [];
    for (const post of stalePosts) {
      const upPost = await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: 'STALE' },
      });
      updated.push(upPost);
    }

    return {
      scannedCount: stalePosts.length,
      updated,
    };
  }
}
