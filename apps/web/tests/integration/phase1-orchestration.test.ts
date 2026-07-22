import { describe, expect, it, vi } from 'vitest';
import { requireApproval } from '../../src/lib/approval-guard';
import { validateTransition, transitionClientTo, taskPriorityScore } from '@rankforge/database';

describe('Phase 1 - Module 6 Orchestration Core', () => {
  describe('Client State Machine Transitions', () => {
    it('allows valid transitions in sequence', () => {
      expect(validateTransition('ONBOARDING', 'BUILD')).toBe(true);
      expect(validateTransition('BUILD', 'GROWTH')).toBe(true);
      expect(validateTransition('GROWTH', 'PAUSED')).toBe(true);
      expect(validateTransition('PAUSED', 'OFFBOARDED')).toBe(true);
    });

    it('rejects invalid direct transitions', () => {
      expect(validateTransition('ONBOARDING', 'GROWTH')).toBe(false);
      expect(validateTransition('BUILD', 'OFFBOARDED')).toBe(false);
      expect(validateTransition('GROWTH', 'OFFBOARDED')).toBe(false);
      expect(validateTransition('OFFBOARDED', 'BUILD')).toBe(false);
    });

    it('invokes client update with correct state change', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'client-1', lifecycleState: 'BUILD' });
      const mockDb = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        client: {
          findUnique: vi.fn().mockResolvedValue({ id: 'client-1', lifecycleState: 'ONBOARDING' }),
          update: mockUpdate,
        },
        changeLogEntry: {
          create: vi.fn().mockResolvedValue({ id: 'cl-1' }),
        },
      };

      const result = await transitionClientTo('client-1', 'BUILD', 'user-1', mockDb as any);
      expect(result.lifecycleState).toBe('BUILD');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { lifecycleState: 'BUILD' },
      });
    });
  });

  describe('Approval Guard and Helper', () => {
    it('creates approval request with PENDING status and formatted JSON data', async () => {
      const mockCreate = vi.fn().mockImplementation((args) => Promise.resolve({ id: 'appr-1', ...args.data }));
      const mockDb = {
        approvalRequest: {
          create: mockCreate,
        },
      };

      const result = await requireApproval(mockDb, {
        clientId: 'client-1',
        title: 'Change Primary Category',
        description: 'Update category from Plumber to Emergency Plumber',
        requestType: 'CATEGORY_CHANGE',
        requestData: { primaryCategory: 'Emergency Plumber' },
        requestedById: 'user-1',
      });

      expect(result.status).toBe('PENDING');
      expect(result.requestType).toBe('CATEGORY_CHANGE');
      expect(result.requestedById).toBe('user-1');
      expect(result.requestData).toBe(JSON.stringify({ primaryCategory: 'Emergency Plumber' }));
    });
  });

  describe('Task Priority Scoring', () => {
    it('orders tasks so higher priority tasks have lower numeric sort score', () => {
      const criticalScore = taskPriorityScore('CRITICAL');
      const lowScore = taskPriorityScore('LOW');
      expect(criticalScore).toBeLessThan(lowScore);
    });
  });
});
