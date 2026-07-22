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
      },
      gbpPost: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
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
  });

  describe('syncSearchVisibility (REQ-M4-03)', () => {
    it('should return search visibility details', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Roof Masters',
      });

      const result = await service.syncSearchVisibility(
        'client1',
        'roofing services',
      );
      expect(result.clientName).toBe('Roof Masters');
      expect(result.visibilityScore).toBeDefined();
    });
  });

  describe('scanStaleContent (REQ-M4-04)', () => {
    it('should flag posts older than 90 days as STALE', async () => {
      (prisma.gbpPost.findMany as jest.Mock).mockResolvedValue([
        { id: 'post1', status: 'PUBLISHED' },
        { id: 'post2', status: 'DRAFT' },
      ]);

      (prisma.gbpPost.update as jest.Mock).mockResolvedValue({
        id: 'post1',
        status: 'STALE',
      });

      const result = await service.scanStaleContent('client1');
      expect(result.scannedCount).toBe(2);
      expect(prisma.gbpPost.update).toHaveBeenCalledTimes(2);
      expect(prisma.gbpPost.update).toHaveBeenCalledWith({
        where: { id: 'post1' },
        data: { status: 'STALE' },
      });
    });
  });
});
