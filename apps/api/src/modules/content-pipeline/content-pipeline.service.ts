import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@rankforge/database';

@Injectable()
export class ContentPipelineService {
  private readonly m4CalendarTemplate =
    'Direct answer first\n\n## What to know\n\n| Question | Answer |\n|---|---|\n| Service fit | Local intent content |\n\n## FAQs\n\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script>';

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

  async populateCalendarFromInformationalKeywords(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const keywords = await prisma.keywordMapEntry.findMany({
      where: { clientId, intent: 'INFORMATIONAL', status: 'ACTIVE' },
      orderBy: [{ priority: 'asc' }, { searchVolume: 'desc' }],
      take: 12,
    });

    const created: any[] = [];
    for (const keyword of keywords) {
      const existing = await prisma.contentPiece.findUnique({
        where: {
          clientId_primaryKeyword: {
            clientId,
            primaryKeyword: keyword.keyword,
          },
        },
      });
      if (existing) continue;

      const piece = await prisma.contentPiece.create({
        data: {
          clientId,
          sourceKeywordId: keyword.id,
          topic: keyword.keyword,
          primaryKeyword: keyword.keyword,
          title: `Content brief: ${keyword.keyword}`,
          brief: `${this.m4CalendarTemplate}\n\nTarget keyword: ${keyword.keyword}`,
          contentType: 'INFORMATIONAL',
          status: 'PLANNED',
        },
      });
      await this.recordContentPieceStatus(
        piece.id,
        null,
        'PLANNED',
        'calendar-populated-from-informational-keyword',
        { keywordId: keyword.id, keyword: keyword.keyword },
      );
      created.push(piece);
    }

    return { planned: created.length, created };
  }

  async listContentPieces(clientId: string) {
    return prisma.contentPiece.findMany({
      where: { clientId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async publishContentPiece(clientId: string, contentPieceId: string) {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });
    if (!piece || piece.clientId !== clientId) {
      throw new NotFoundException('Content piece not found');
    }
    if (!piece.draftBody) {
      throw new BadRequestException('Content piece has no draft body.');
    }
    if (piece.status === 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Content piece requires approval before publishing.',
      );
    }
    if (piece.status !== 'APPROVED') {
      throw new BadRequestException(
        'Content piece must be approved before publishing.',
      );
    }

    const similarity = await this.checkSimilarity(piece.draftBody);
    if (!similarity.ok) {
      const blocked = await prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: {
          status: 'BLOCKED',
          plagiarismProvider: similarity.provider,
          similarityScore: similarity.score,
          similarityEvidence: JSON.stringify(similarity.evidence),
        },
      });
      await this.recordContentPieceStatus(
        contentPieceId,
        piece.status,
        'BLOCKED',
        'similarity-check-failed',
        similarity,
      );
      return { published: false, contentPiece: blocked, similarity };
    }

    const published = await prisma.contentPiece.update({
      where: { id: contentPieceId },
      data: {
        status: 'PUBLISHED',
        plagiarismProvider: similarity.provider,
        similarityScore: similarity.score,
        similarityEvidence: JSON.stringify(similarity.evidence),
        publishedUrl: `/content/${contentPieceId}`,
        publishedAt: new Date(),
      },
    });
    await this.recordContentPieceStatus(
      contentPieceId,
      piece.status,
      'PUBLISHED',
      'similarity-check-passed-and-read-back-published',
      similarity,
    );

    const readBack = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });

    return { published: true, contentPiece: published, readBack, similarity };
  }

  async readPublishedContentPiece(contentPieceId: string) {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });
    if (!piece || piece.status !== 'PUBLISHED') {
      throw new NotFoundException('Published content piece not found');
    }
    return piece;
  }

  async createContentPieceDraft(
    clientId: string,
    data: {
      topic: string;
      primaryKeyword: string;
      title: string;
      brief: string;
      draftBody: string;
      status: string;
    },
  ) {
    const existing = await prisma.contentPiece.findUnique({
      where: {
        clientId_primaryKeyword: {
          clientId,
          primaryKeyword: data.primaryKeyword,
        },
      },
    });

    const piece = existing
      ? await prisma.contentPiece.update({
          where: { id: existing.id },
          data: {
            topic: data.topic,
            title: data.title,
            brief: data.brief,
            draftBody: data.draftBody,
            status: data.status,
          },
        })
      : await prisma.contentPiece.create({
          data: {
            clientId,
            topic: data.topic,
            primaryKeyword: data.primaryKeyword,
            title: data.title,
            brief: data.brief,
            draftBody: data.draftBody,
            contentType: 'INFORMATIONAL',
            status: data.status,
          },
        });

    await this.recordContentPieceStatus(
      piece.id,
      existing?.status ?? null,
      data.status,
      'llm-draft-generated',
      { topic: data.topic, primaryKeyword: data.primaryKeyword },
    );
    return piece;
  }

  private async recordContentPieceStatus(
    contentPieceId: string,
    oldStatus: string | null,
    newStatus: string,
    reason: string,
    metadata?: unknown,
  ) {
    return prisma.contentPieceStatusHistory.create({
      data: {
        contentPieceId,
        oldStatus,
        newStatus,
        reason,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  private async checkSimilarity(content: string) {
    if (!process.env.CONTENT_SIMILARITY_CHECK_URL) {
      throw new BadRequestException(
        'Content similarity provider is not configured.',
      );
    }

    const response = await fetch(process.env.CONTENT_SIMILARITY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new BadRequestException(
        `Content similarity check failed: ${response.status}`,
      );
    }

    const evidence = await response.json();
    const score = Number(evidence.similarityScore ?? evidence.score ?? 0);
    return {
      ok: score < 0.2,
      provider: process.env.CONTENT_SIMILARITY_CHECK_URL,
      score,
      evidence,
    };
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
    requestedById?: string,
  ) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        gbpProfiles: {
          include: { services: true, products: true },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    if (!process.env.OPENAI_API_KEY) {
      throw new BadRequestException(
        'Content generation is not implemented/configured.',
      );
    }

    const body = await this.generateDraftText(client, topic, primaryKeywords);
    const compliance = this.checkContentCompliance(client, body);
    if (!compliance.ok) {
      throw new BadRequestException(
        `Content compliance failed: ${compliance.reason}`,
      );
    }

    const priorDrafts = await prisma.contentPiece.count({
      where: {
        clientId,
        contentType: 'INFORMATIONAL',
      },
    });
    const status = this.needsHumanGate(priorDrafts)
      ? 'PENDING_APPROVAL'
      : 'DRAFT';
    if (status === 'PENDING_APPROVAL' && !requestedById) {
      throw new BadRequestException(
        'requestedById is required for human-gated content drafts.',
      );
    }
    const primaryKeyword = primaryKeywords[0] ?? topic;
    const contentPiece = await this.createContentPieceDraft(clientId, {
      topic,
      primaryKeyword,
      title: `Draft: ${topic}`,
      brief: `${this.m4CalendarTemplate}\n\nTarget keyword: ${primaryKeyword}`,
      draftBody: body,
      status,
    });

    if (status === 'PENDING_APPROVAL') {
      await prisma.approvalRequest.create({
        data: {
          clientId,
          title: `Content publish approval: ${contentPiece.title}`,
          description:
            'First-five publishable content pieces require human approval before publishing.',
          requestType: 'CONTENT_PUBLISH',
          requestData: JSON.stringify({
            contentPieceId: contentPiece.id,
            topic,
            primaryKeyword,
          }),
          status: 'PENDING',
          requestedById: requestedById!,
        },
      });
    }

    return {
      topic,
      primaryKeywords,
      content: body,
      status,
      compliance,
      contentPiece,
    };
  }

  // REQ-M4-03: GEO format checker & query checks
  async syncSearchVisibility(clientId: string, query: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const surfaceResults = await this.runAiAnswerSurfaceChecks(
      client.businessName ?? client.name,
      query,
    );
    const mentioned = surfaceResults.some((result) => result.mentioned);

    const scorecard = await prisma.task.create({
      data: {
        clientId,
        taskId: 'REQ-M4-03',
        title: `AI answer scorecard: ${query}`,
        description: JSON.stringify({
          query,
          mentioned,
          source: 'AI_ANSWER_SURFACE_URLS',
          surfaces: surfaceResults.map((result) => result.surfaceUrl),
          evidence: surfaceResults,
        }),
        module: 'M4',
        priority: 'LOW',
        status: mentioned ? 'DONE' : 'NOT_STARTED',
        idempotencyKey: `ai-answer:${clientId}:${query}:${new Date().toISOString().slice(0, 7)}`,
      },
    });

    return { query, mentioned, scorecard };
  }

  // REQ-M4-04: Quarterly stale content scanner
  async scanStaleContent(clientId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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
      const content = `${post.title ?? ''}\n${post.content ?? ''}`;
      const staleReasons = this.extractStaleContentReasons(content);
      if (staleReasons.length === 0) continue;

      const upPost = await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: 'STALE' },
      });
      updated.push({ ...upPost, staleReasons });
    }

    return {
      scannedCount: stalePosts.length,
      updated,
    };
  }

  private async runAiAnswerSurfaceChecks(clientName: string, query: string) {
    const rawSurfaces = process.env.AI_ANSWER_SURFACE_URLS;
    if (!rawSurfaces) {
      throw new BadRequestException(
        'AI answer surface runner is not configured.',
      );
    }

    const surfaceUrls = rawSurfaces
      .split(',')
      .map((surface) => surface.trim())
      .filter(Boolean);
    if (surfaceUrls.length === 0) {
      throw new BadRequestException(
        'AI answer surface runner is not configured.',
      );
    }

    return Promise.all(
      surfaceUrls.map(async (surfaceUrl) => {
        const url = new URL(surfaceUrl);
        url.searchParams.set('q', query);
        url.searchParams.set('client', clientName);

        const response = await fetch(url);
        if (!response.ok) {
          throw new BadRequestException(
            `AI answer surface check failed for ${surfaceUrl}: ${response.status}`,
          );
        }

        const evidence = await response.json();
        return {
          surfaceUrl,
          query,
          clientName,
          mentioned: Boolean(evidence.mentioned),
          citationUrl: evidence.citationUrl ?? null,
          snippet: evidence.snippet ?? null,
          evidence,
        };
      }),
    );
  }

  private async generateDraftText(
    client: any,
    topic: string,
    primaryKeywords: string[],
  ) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Write local informational content. Use direct-answer-first H2s, a small table, and FAQ schema. Do not invent prices, guarantees, addresses, phone numbers, or licenses.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              businessName: client.businessName ?? client.name,
              city: client.city,
              state: client.state,
              verifiedServices: client.gbpProfiles.flatMap((p: any) =>
                p.services.map((s: any) => ({
                  name: s.name,
                  price: s.isPriceConfirmed ? s.price : null,
                })),
              ),
              topic,
              primaryKeywords,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Content generation failed: ${response.status}`,
      );
    }

    const data = await response.json();
    return String(data?.choices?.[0]?.message?.content ?? '').trim();
  }

  private checkContentCompliance(client: any, content: string) {
    const verifiedPrices = new Set(
      client.gbpProfiles
        .flatMap((p: any) => p.services)
        .filter((s: any) => s.isPriceConfirmed && s.price)
        .map((s: any) => String(s.price)),
    );

    const priceClaims =
      content.match(/\b(?:AED|\$|USD)?\s*\d+(?:\.\d{1,2})?\b/g) ?? [];
    const unverifiedPrice = priceClaims.find(
      (claim) => !verifiedPrices.has(claim.replace(/[^0-9.]/g, '')),
    );
    if (unverifiedPrice) {
      return { ok: false, reason: `unverified price claim ${unverifiedPrice}` };
    }

    const businessName = String(client.businessName ?? client.name ?? '');
    if (businessName && !content.includes(businessName)) {
      return { ok: false, reason: 'verified business name is missing' };
    }

    return { ok: true };
  }

  private needsHumanGate(priorDrafts: number) {
    return priorDrafts < 5 || (priorDrafts + 1) % 4 === 0;
  }

  private extractStaleContentReasons(content: string, now = new Date()) {
    const reasons: string[] = [];
    if (this.hasOldDateReference(content, now)) {
      reasons.push('old-date-reference');
    }
    if (this.hasExpiredOfferReference(content, now)) {
      reasons.push('expired-offer-reference');
    }
    if (this.hasStalePriceReference(content, now)) {
      reasons.push('stale-price-reference');
    }
    return reasons;
  }

  private hasOldDateReference(content: string, now = new Date()) {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const years = content.match(/\b20\d{2}\b/g) ?? [];
    if (years.some((year) => Number(year) < currentYear)) return true;

    const quarters = [...content.matchAll(/\bQ([1-4])\s*(20\d{2})\b/gi)];
    return quarters.some((match) => {
      const quarter = Number(match[1]) - 1;
      const year = Number(match[2]);
      return (
        year < currentYear || (year === currentYear && quarter < currentQuarter)
      );
    });
  }

  private hasExpiredOfferReference(content: string, now = new Date()) {
    const matches = [
      ...content.matchAll(
        /\b(?:expires|valid until|ends)\s*:?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/gi,
      ),
    ];
    return matches.some((match) => {
      const date = new Date(match[1]);
      return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime();
    });
  }

  private hasStalePriceReference(content: string, now = new Date()) {
    const hasPrice = /\b(?:AED|USD|\$|from|price|pricing)\b/i.test(content);
    if (!hasPrice) return false;
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const yearPricePattern =
      /\b(?:20\d{2})\s+(?:price|pricing|rates?)\b|\b(?:price|pricing|rates?)\s+(?:20\d{2})\b/gi;
    const yearMatches = [...content.matchAll(yearPricePattern)];
    if (
      yearMatches.some((match) => {
        const year = match[0].match(/20\d{2}/)?.[0];
        return year ? Number(year) < currentYear : false;
      })
    ) {
      return true;
    }

    const quarterMatches = [
      ...content.matchAll(
        /\bQ([1-4])\s*(20\d{2})\s+(?:price|pricing|rates?)\b|\b(?:price|pricing|rates?)\s+Q([1-4])\s*(20\d{2})\b/gi,
      ),
    ];
    return quarterMatches.some((match) => {
      const quarter = Number(match[1] ?? match[3]) - 1;
      const year = Number(match[2] ?? match[4]);
      return (
        year < currentYear || (year === currentYear && quarter < currentQuarter)
      );
    });
  }
}
