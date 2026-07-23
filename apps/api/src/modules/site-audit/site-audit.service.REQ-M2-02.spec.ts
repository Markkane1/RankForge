import { Test, TestingModule } from '@nestjs/testing';
import { SiteAuditService } from './site-audit.service';
import {
  BadRequestException,
  PreconditionFailedException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('@rankforge/database', () => {
  return {
    prisma: {
      client: {
        findUnique: jest.fn(),
      },
      siteAudit: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      siteAuditIssue: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      siteRestorePoint: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      pageMatrixEntry: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    },
  };
});

import { prisma } from '@rankforge/database';

describe('SiteAuditService (REQ-M2-02)', () => {
  let service: SiteAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteAuditService],
    }).compile();

    service = module.get<SiteAuditService>(SiteAuditService);
    jest.clearAllMocks();
  });

  describe('executeFix', () => {
    it('should throw PreconditionFailedException if no restore point exists in the last 24 hours', async () => {
      (prisma.siteRestorePoint.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.executeFix('client1', 'issue1')).rejects.toThrow(
        PreconditionFailedException,
      );
      expect(prisma.siteRestorePoint.findFirst).toHaveBeenCalledWith({
        where: {
          clientId: 'client1',
          createdAt: {
            gte: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should execute fix and resolve issue if a restore point exists', async () => {
      (prisma.siteRestorePoint.findFirst as jest.Mock).mockResolvedValue({
        id: 'rp1',
        clientId: 'client1',
        createdAt: new Date(),
      });
      (prisma.siteAuditIssue.findUnique as jest.Mock).mockResolvedValue({
        id: 'issue1',
        isResolved: false,
      });
      (prisma.siteAuditIssue.update as jest.Mock).mockResolvedValue({
        id: 'issue1',
        isResolved: true,
      });

      const result = await service.executeFix('client1', 'issue1');
      expect(result.isResolved).toBe(true);
      expect(prisma.siteAuditIssue.update).toHaveBeenCalledWith({
        where: { id: 'issue1' },
        data: { isResolved: true },
      });
    });

    it('should throw NotFoundException if issue does not exist', async () => {
      (prisma.siteRestorePoint.findFirst as jest.Mock).mockResolvedValue({
        id: 'rp1',
        clientId: 'client1',
        createdAt: new Date(),
      });
      (prisma.siteAuditIssue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.executeFix('client1', 'issue1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRestorePoint', () => {
    it('should create a restore point successfully', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      (prisma.siteRestorePoint.create as jest.Mock).mockResolvedValue({
        id: 'rp1',
        clientId: 'client1',
        snapshotData: '{}',
      });

      const result = await service.createRestorePoint(
        'client1',
        '{}',
        'Before write batch',
      );
      expect(result.snapshotData).toBe('{}');
      expect(prisma.siteRestorePoint.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          snapshotData: '{}',
          description: 'Before write batch',
        },
      });
    });
  });

  describe('rollbackLatestRestorePoint', () => {
    it('should restore page matrix entries from latest restore point and mark it restored', async () => {
      (prisma.siteRestorePoint.findFirst as jest.Mock).mockResolvedValue({
        id: 'rp1',
        clientId: 'client1',
        snapshotData: JSON.stringify({
          pageMatrixEntries: [
            {
              slug: 'emergency-plumber',
              pageType: 'LOCATION_PAGE',
              primaryKeyword: 'emergency plumber',
              targetArea: 'Dubai',
              priority: 1,
              status: 'READY',
              content: '<h1>Emergency plumber</h1>',
              schemaJson: '{"@context":"https://schema.org"}',
            },
          ],
        }),
      });
      (prisma.pageMatrixEntry.upsert as jest.Mock).mockResolvedValue({
        id: 'page1',
      });
      (prisma.siteRestorePoint.update as jest.Mock).mockResolvedValue({
        id: 'rp1',
        restoredAt: new Date(),
      });

      const result = await service.rollbackLatestRestorePoint('client1');

      expect(result).toEqual({ restorePointId: 'rp1', restoredPageCount: 1 });
      expect(prisma.pageMatrixEntry.upsert).toHaveBeenCalledWith({
        where: {
          clientId_primaryKeyword: {
            clientId: 'client1',
            primaryKeyword: 'emergency plumber',
          },
        },
        update: expect.objectContaining({
          slug: 'emergency-plumber',
          status: 'READY',
        }),
        create: expect.objectContaining({
          clientId: 'client1',
          primaryKeyword: 'emergency plumber',
        }),
      });
      expect(prisma.siteRestorePoint.update).toHaveBeenCalledWith({
        where: { id: 'rp1' },
        data: { restoredAt: expect.any(Date) },
      });
    });

    it('should block rollback when no unrestored restore point exists', async () => {
      (prisma.siteRestorePoint.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.rollbackLatestRestorePoint('client1'),
      ).rejects.toThrow(PreconditionFailedException);
    });
  });
});
