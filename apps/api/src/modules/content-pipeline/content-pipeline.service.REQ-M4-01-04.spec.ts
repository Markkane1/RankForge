import { Test, TestingModule } from '@nestjs/testing';
import { ContentPipelineService } from './content-pipeline.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@rankforge/database', () => {
  return {
    prisma: {
      client: {
        findUnique: jest.fn(),
      },
      gbpProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      gbpPost: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      contentPiece: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      contentPieceStatusHistory: {
        create: jest.fn(),
      },
      approvalRequest: {
        create: jest.fn(),
      },
      keywordMapEntry: {
        findMany: jest.fn(),
      },
      task: {
        create: jest.fn(),
      },
    },
  };
});

import { prisma } from '@rankforge/database';

describe('ContentPipelineService (REQ-M4-01 to REQ-M4-04)', () => {
  let service: ContentPipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentPipelineService],
    }).compile();

    service = module.get<ContentPipelineService>(ContentPipelineService);
    jest.clearAllMocks();
  });

  describe('schedulePost (REQ-M4-01)', () => {
    it('should schedule a post successfully with a future date', async () => {
      (prisma.gbpProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof1',
        clientId: 'client1',
      });

      (prisma.gbpPost.create as jest.Mock).mockResolvedValue({
        id: 'post1',
        status: 'SCHEDULED',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const result = await service.schedulePost('client1', {
        gbpProfileId: 'prof1',
        title: 'New Post',
        content: 'Check out our services.',
        scheduledAt: futureDate.toISOString(),
      });

      expect(result.status).toBe('SCHEDULED');
      expect(prisma.gbpPost.create).toHaveBeenCalledWith({
        data: {
          gbpProfileId: 'prof1',
          title: 'New Post',
          content: 'Check out our services.',
          eventType: null,
          ctaButton: null,
          ctaUrl: null,
          status: 'SCHEDULED',
          scheduledAt: futureDate,
        },
      });
    });

    it('should throw BadRequestException if scheduled date is in the past', async () => {
      (prisma.gbpProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof1',
        clientId: 'client1',
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.schedulePost('client1', {
          gbpProfileId: 'prof1',
          title: 'New Post',
          content: 'Check out our services.',
          scheduledAt: pastDate.toISOString(),
        }),
      ).rejects.toThrow('Scheduled date must be in the future');
    });

    it('should populate the content calendar from informational keyword rows', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      (prisma.keywordMapEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'keyword1',
          keyword: 'how to choose roof repair',
          searchVolume: 80,
          priority: 1,
        },
      ]);
      (prisma.contentPiece.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.contentPiece.create as jest.Mock).mockResolvedValue({
        id: 'content1',
        status: 'PLANNED',
      });
      (prisma.contentPieceStatusHistory.create as jest.Mock).mockResolvedValue({
        id: 'history1',
      });

      const result =
        await service.populateCalendarFromInformationalKeywords('client1');

      expect(result.planned).toBe(1);
      expect(prisma.keywordMapEntry.findMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client1',
          intent: 'INFORMATIONAL',
          status: 'ACTIVE',
        },
        orderBy: [{ priority: 'asc' }, { searchVolume: 'desc' }],
        take: 12,
      });
      expect(prisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client1',
          contentType: 'INFORMATIONAL',
          primaryKeyword: 'how to choose roof repair',
          status: 'PLANNED',
          title: 'Content brief: how to choose roof repair',
          brief: expect.stringContaining('FAQPage'),
        }),
      });
      expect(prisma.contentPieceStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentPieceId: 'content1',
          newStatus: 'PLANNED',
          reason: 'calendar-populated-from-informational-keyword',
        }),
      });
    });
  });

  describe('generateContentDraft (REQ-M4-02)', () => {
    const oldOpenAiKey = process.env.OPENAI_API_KEY;

    afterEach(() => {
      process.env.OPENAI_API_KEY = oldOpenAiKey;
    });

    it('should block content generation instead of returning synthetic copy', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        websiteUri: 'https://site.com',
      });

      await expect(
        service.generateContentDraft('client1', 'roof repairs', ['roofing']),
      ).rejects.toThrow('Content generation is not implemented/configured.');
    });

    it('should block unverifiable price claims before human review', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Roof Masters offers emergency roofing from AED 999 with fast booking.',
              },
            },
          ],
        }),
      }) as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        name: 'Roof Masters',
        businessName: 'Roof Masters',
        city: 'Dubai',
        state: 'Dubai',
        gbpProfiles: [
          {
            services: [
              { name: 'Roof repair', price: 250, isPriceConfirmed: true },
            ],
            products: [],
          },
        ],
      });

      await expect(
        service.generateContentDraft('client1', 'roof repairs', ['roofing']),
      ).rejects.toThrow('unverified price claim');
    });

    it('should require a requester when the first five compliant drafts need approval', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Roof Masters explains roof repair options.\n\n## What to know\n\n| Question | Answer |\n|---|---|\n| Timing | Ask for an inspection |\n\n<script type="application/ld+json">{"@type":"FAQPage"}</script>',
              },
            },
          ],
        }),
      }) as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        name: 'Roof Masters',
        businessName: 'Roof Masters',
        city: 'Dubai',
        state: 'Dubai',
        gbpProfiles: [{ services: [], products: [] }],
      });
      (prisma.contentPiece.count as jest.Mock).mockResolvedValue(4);

      await expect(
        service.generateContentDraft('client1', 'roof repairs', ['roofing']),
      ).rejects.toThrow('requestedById is required');
      expect(prisma.contentPiece.create).not.toHaveBeenCalled();
      expect(prisma.approvalRequest.create).not.toHaveBeenCalled();
    });

    it('should gate the first five compliant drafts through approval request creation', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Roof Masters explains roof repair options.\n\n## What to know\n\n| Question | Answer |\n|---|---|\n| Timing | Ask for an inspection |\n\n<script type="application/ld+json">{"@type":"FAQPage"}</script>',
              },
            },
          ],
        }),
      }) as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        name: 'Roof Masters',
        businessName: 'Roof Masters',
        city: 'Dubai',
        state: 'Dubai',
        gbpProfiles: [{ services: [], products: [] }],
      });
      (prisma.contentPiece.count as jest.Mock).mockResolvedValue(4);
      (prisma.contentPiece.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.contentPiece.create as jest.Mock).mockResolvedValue({
        id: 'content1',
        status: 'PENDING_APPROVAL',
      });
      (prisma.contentPieceStatusHistory.create as jest.Mock).mockResolvedValue({
        id: 'history1',
      });
      (prisma.approvalRequest.create as jest.Mock).mockResolvedValue({
        id: 'approval1',
      });

      const result = await service.generateContentDraft(
        'client1',
        'roof repairs',
        ['roofing'],
        'requester-1',
      );

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.contentPiece.id).toBe('content1');
      expect(prisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client1',
          primaryKeyword: 'roofing',
          draftBody: expect.stringContaining('Roof Masters'),
          status: 'PENDING_APPROVAL',
        }),
      });
      expect(prisma.approvalRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client1',
          requestType: 'CONTENT_PUBLISH',
          requestedById: 'requester-1',
          status: 'PENDING',
          requestData: expect.stringContaining('"contentPieceId":"content1"'),
        }),
      });
    });
  });

  describe('publishContentPiece (REQ-M4-02)', () => {
    const oldSimilarityUrl = process.env.CONTENT_SIMILARITY_CHECK_URL;

    afterEach(() => {
      if (oldSimilarityUrl === undefined)
        delete process.env.CONTENT_SIMILARITY_CHECK_URL;
      else process.env.CONTENT_SIMILARITY_CHECK_URL = oldSimilarityUrl;
    });

    it('should block publish when the similarity provider is not configured', async () => {
      (prisma.contentPiece.findUnique as jest.Mock).mockResolvedValue({
        id: 'content1',
        clientId: 'client1',
        status: 'APPROVED',
        draftBody: 'Original local guide',
      });

      await expect(
        service.publishContentPiece('client1', 'content1'),
      ).rejects.toThrow('Content similarity provider is not configured.');
    });

    it('should block publishing content that is still pending approval', async () => {
      (prisma.contentPiece.findUnique as jest.Mock).mockResolvedValue({
        id: 'content1',
        clientId: 'client1',
        status: 'PENDING_APPROVAL',
        draftBody: 'Original local guide',
      });

      await expect(
        service.publishContentPiece('client1', 'content1'),
      ).rejects.toThrow('requires approval before publishing');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should block high-similarity content and record status history', async () => {
      process.env.CONTENT_SIMILARITY_CHECK_URL =
        'https://similarity.test/check';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ similarityScore: 0.82, matches: ['copy'] }),
      }) as any;
      (prisma.contentPiece.findUnique as jest.Mock).mockResolvedValue({
        id: 'content1',
        clientId: 'client1',
        status: 'APPROVED',
        draftBody: 'Copied guide',
      });
      (prisma.contentPiece.update as jest.Mock).mockResolvedValue({
        id: 'content1',
        status: 'BLOCKED',
      });
      (prisma.contentPieceStatusHistory.create as jest.Mock).mockResolvedValue({
        id: 'history1',
      });

      const result = await service.publishContentPiece('client1', 'content1');

      expect(result.published).toBe(false);
      expect(prisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'content1' },
        data: expect.objectContaining({
          status: 'BLOCKED',
          plagiarismProvider: 'https://similarity.test/check',
          similarityScore: 0.82,
        }),
      });
      expect(prisma.contentPieceStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentPieceId: 'content1',
          oldStatus: 'APPROVED',
          newStatus: 'BLOCKED',
          reason: 'similarity-check-failed',
        }),
      });
    });

    it('should publish low-similarity content and read back the published row', async () => {
      process.env.CONTENT_SIMILARITY_CHECK_URL =
        'https://similarity.test/check';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ similarityScore: 0.04, matches: [] }),
      }) as any;
      (prisma.contentPiece.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'content1',
          clientId: 'client1',
          status: 'APPROVED',
          draftBody: 'Original local guide',
        })
        .mockResolvedValueOnce({
          id: 'content1',
          status: 'PUBLISHED',
          statusHistory: [{ newStatus: 'PUBLISHED' }],
        });
      (prisma.contentPiece.update as jest.Mock).mockResolvedValue({
        id: 'content1',
        status: 'PUBLISHED',
      });
      (prisma.contentPieceStatusHistory.create as jest.Mock).mockResolvedValue({
        id: 'history1',
      });

      const result = await service.publishContentPiece('client1', 'content1');

      expect(result.published).toBe(true);
      expect(result.readBack?.status).toBe('PUBLISHED');
      expect(prisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'content1' },
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedUrl: '/content/content1',
          similarityScore: 0.04,
        }),
      });
    });
  });

  describe('syncSearchVisibility (REQ-M4-03)', () => {
    const oldSurfaceUrls = process.env.AI_ANSWER_SURFACE_URLS;

    afterEach(() => {
      if (oldSurfaceUrls === undefined)
        delete process.env.AI_ANSWER_SURFACE_URLS;
      else process.env.AI_ANSWER_SURFACE_URLS = oldSurfaceUrls;
    });

    it('should store an AI answer scorecard row per tracked query across public surfaces', async () => {
      process.env.AI_ANSWER_SURFACE_URLS =
        'https://surface-one.test/query,https://surface-two.test/query';
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            mentioned: false,
            source: 'surface-one',
            snippet: 'No mention',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            mentioned: true,
            source: 'surface-two',
            citationUrl: 'https://example.com',
          }),
        }) as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        name: 'Roof Masters',
        businessName: 'Roof Masters',
      });
      (prisma.task.create as jest.Mock).mockResolvedValue({
        id: 'scorecard1',
        taskId: 'REQ-M4-03',
      });

      const result = await service.syncSearchVisibility(
        'client1',
        'roofing services',
      );

      expect(result.mentioned).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: 'REQ-M4-03',
          title: 'AI answer scorecard: roofing services',
          module: 'M4',
          description: expect.stringContaining(
            'https://surface-two.test/query',
          ),
        }),
      });
    });

    it('should block AI answer monitoring when public surfaces are not configured', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        name: 'Roof Masters',
      });

      await expect(
        service.syncSearchVisibility('client1', 'roofing services'),
      ).rejects.toThrow('AI answer surface runner is not configured.');
    });
  });

  describe('scanStaleContent (REQ-M4-04)', () => {
    it('should flag posts older than 90 days as STALE with explicit stale reasons', async () => {
      (prisma.gbpPost.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'post1',
          status: 'PUBLISHED',
          title: '2024 pricing guide',
          content: 'Roof repair from AED 250',
        },
        {
          id: 'post2',
          status: 'DRAFT',
          title: 'Evergreen guide',
          content: 'Service overview',
        },
      ]);

      (prisma.gbpPost.update as jest.Mock).mockResolvedValue({
        id: 'post1',
        status: 'STALE',
      });

      const result = await service.scanStaleContent('client1');
      expect(result.scannedCount).toBe(2);
      expect(result.updated[0].staleReasons).toContain('stale-price-reference');
      expect(prisma.gbpPost.update).toHaveBeenCalledTimes(1);
      expect(prisma.gbpPost.update).toHaveBeenCalledWith({
        where: { id: 'post1' },
        data: { status: 'STALE' },
      });
    });

    it('should detect expired offer references as stale content reasons', () => {
      const reasons = (service as any).extractStaleContentReasons(
        'Limited offer expires: 2025-04-01',
        new Date('2026-07-23T00:00:00.000Z'),
      );

      expect(reasons).toContain('expired-offer-reference');
    });
  });
});
