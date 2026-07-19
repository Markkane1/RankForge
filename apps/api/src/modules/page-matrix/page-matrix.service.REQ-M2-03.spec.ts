import { Test, TestingModule } from '@nestjs/testing';
import { PageMatrixService } from './page-matrix.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('@rankforge/database', () => {
  return {
    prisma: {
      client: {
        findUnique: jest.fn(),
      },
      pageMatrixEntry: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    },
  };
});

import { prisma } from '@rankforge/database';

describe('PageMatrixService (REQ-M2-03)', () => {
  let service: PageMatrixService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PageMatrixService],
    }).compile();

    service = module.get<PageMatrixService>(PageMatrixService);
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should throw NotFoundException if client does not exist', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createEntry('client1', {
          slug: 'test-slug',
          pageType: 'LOCATION_PAGE',
          primaryKeyword: 'dentist',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if primary keyword already exists (cannibalization check)', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client1' });
      (prisma.pageMatrixEntry.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-entry-id',
        clientId: 'client1',
        primaryKeyword: 'dentist',
      });

      await expect(
        service.createEntry('client1', {
          slug: 'test-slug',
          pageType: 'LOCATION_PAGE',
          primaryKeyword: 'dentist',
        })
      ).rejects.toThrow(ConflictException);

      expect(prisma.pageMatrixEntry.findUnique).toHaveBeenCalledWith({
        where: {
          clientId_primaryKeyword: {
            clientId: 'client1',
            primaryKeyword: 'dentist',
          },
        },
      });
    });

    it('should successfully create entry if keyword is unique', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client1' });
      (prisma.pageMatrixEntry.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.pageMatrixEntry.create as jest.Mock).mockResolvedValue({
        id: 'new-entry-id',
        clientId: 'client1',
        primaryKeyword: 'dentist',
        slug: 'test-slug',
        pageType: 'LOCATION_PAGE',
      });

      const result = await service.createEntry('client1', {
        slug: 'test-slug',
        pageType: 'LOCATION_PAGE',
        primaryKeyword: 'dentist',
      });

      expect(result.id).toBe('new-entry-id');
      expect(prisma.pageMatrixEntry.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          slug: 'test-slug',
          pageType: 'LOCATION_PAGE',
          primaryKeyword: 'dentist',
          targetArea: undefined,
          priority: 5,
          status: 'DRAFT',
        },
      });
    });
  });
});
