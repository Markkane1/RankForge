import { Test, TestingModule } from '@nestjs/testing';
import { ReportingDiagnosticsService } from './reporting-diagnostics.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@rankforge/database', () => {
  return {
    prisma: {
      client: {
        findUnique: jest.fn(),
      },
      leadLogEntry: {
        create: jest.fn(),
      },
      baselineSnapshot: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    },
  };
});

import { prisma } from '@rankforge/database';

describe('ReportingDiagnosticsService (REQ-M5-01 to REQ-M5-05)', () => {
  let service: ReportingDiagnosticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportingDiagnosticsService],
    }).compile();

    service = module.get<ReportingDiagnosticsService>(
      ReportingDiagnosticsService,
    );
    jest.clearAllMocks();
  });

  describe('syncGa4Events (REQ-M5-01)', () => {
    it('should not write synthetic conversion entries when GA4 sync is not configured', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      (prisma.leadLogEntry.create as jest.Mock).mockResolvedValue({
        id: 'log1',
      });

      const result = await service.syncGa4Events(
        'client1',
        'properties/12345',
        'dimension1',
      );
      expect(result.syncedEventsCount).toBe(0);
      expect(result.status).toBe('NOT_CONFIGURED');
      expect(prisma.leadLogEntry.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if propertyId is missing', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      await expect(
        service.syncGa4Events('client1', '', 'dimension1'),
      ).rejects.toThrow('GA4 Property ID is required');
    });
  });

  describe('captureBaseline (REQ-M5-02)', () => {
    it('should successfully save baseline snapshot if none exists', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Apex Clean',
        baseline: null,
        pageMatrixEntries: [],
        geoGridScans: [],
      });

      (prisma.baselineSnapshot.create as jest.Mock).mockResolvedValue({
        id: 'base1',
      });

      const result = await service.captureBaseline('client1');
      expect(result).toBeDefined();
      expect(prisma.baselineSnapshot.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          metricsJson: expect.stringContaining('Apex Clean'),
        },
      });
    });

    it('should throw BadRequestException if baseline already exists', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        baseline: { id: 'base1' },
      });

      await expect(service.captureBaseline('client1')).rejects.toThrow(
        'Baseline snapshot already exists and is immutable.',
      );
    });
  });

  describe('checkMetricAnomalies (REQ-M5-03)', () => {
    it('should alert if WoW visibility drops by more than 20%', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        geoGridScans: [
          { scanDate: new Date(), averageRank: 6.5 }, // current rank (worse)
          { scanDate: new Date(), averageRank: 5.0 }, // previous rank (better) -> drop of 30%
        ],
      });

      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: 'notif1',
      });

      const result = await service.checkMetricAnomalies('client1');
      expect(result.hasAnomaly).toBe(true);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'system-agent',
          title: 'Metric Anomaly Warning',
          message: expect.stringContaining('Average Rank went from 5.0 to 6.5'),
          type: 'ALERT',
        },
      });
    });
  });

  describe('getDiagnosticChecklist (REQ-M5-05)', () => {
    it('should diagnose citation underperformance and suggest citation tasks', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Apex Clean',
        citations: [], // 0 citations (<10 critical threshold)
        gbpProfiles: [
          {
            reviews: [
              { rating: 4.0 },
              { rating: 3.5 }, // avg 3.75 (<4.5 warning threshold)
            ],
          },
        ],
      });

      const result = await service.getDiagnosticChecklist('client1');
      expect(result.diagnosticSteps.length).toBe(2);
      expect(result.diagnosticSteps[0].status).toBe('CRITICAL');
      expect(result.diagnosticSteps[0].actionTask).toBe(
        'Citations Submission Run',
      );
      expect(result.diagnosticSteps[1].status).toBe('WARNING');
      expect(result.diagnosticSteps[1].actionTask).toBe(
        'Gbp Review Invites Campaign',
      );
    });
  });
});
