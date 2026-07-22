import { describe, it, expect, vi } from 'vitest';

// ─── Appendix D Capability Mapping Resolver ───
export type ExecutionRoute = 'API' | 'PARTNER' | 'HUMAN';

export interface CapabilityRule {
  capability: string;
  primaryRoute: ExecutionRoute;
  fallbackRoute?: ExecutionRoute;
  requiresApproval: boolean;
}

const CAPABILITY_MAP: Record<string, CapabilityRule> = {
  GBP_POST_CREATE: { capability: 'GBP_POST_CREATE', primaryRoute: 'API', fallbackRoute: 'HUMAN', requiresApproval: false },
  REVIEW_REPLY: { capability: 'REVIEW_REPLY', primaryRoute: 'API', fallbackRoute: 'HUMAN', requiresApproval: false },
  PRIMARY_CATEGORY_CHANGE: { capability: 'PRIMARY_CATEGORY_CHANGE', primaryRoute: 'HUMAN', fallbackRoute: 'PARTNER', requiresApproval: true },
  GBP_VERIFICATION: { capability: 'GBP_VERIFICATION', primaryRoute: 'HUMAN', fallbackRoute: 'API', requiresApproval: true },
  CLIENT_PROFILE_CHANGE: { capability: 'CLIENT_PROFILE_CHANGE', primaryRoute: 'HUMAN', fallbackRoute: 'API', requiresApproval: true },
  GEO_GRID_SCAN: { capability: 'GEO_GRID_SCAN', primaryRoute: 'API', fallbackRoute: 'HUMAN', requiresApproval: false },
  DATAFORSEO_SEARCH: { capability: 'DATAFORSEO_SEARCH', primaryRoute: 'API', fallbackRoute: 'HUMAN', requiresApproval: false },
};

export function resolveExecutionRoute(capability: string, providerConnected: boolean): { route: ExecutionRoute; approvalRequired: boolean } {
  const rule = CAPABILITY_MAP[capability];
  if (!rule) {
    return { route: 'HUMAN', approvalRequired: true };
  }

  if (rule.requiresApproval) {
    return { route: 'HUMAN', approvalRequired: true };
  }

  if (!providerConnected) {
    return { route: rule.fallbackRoute || 'HUMAN', approvalRequired: false };
  }

  return { route: rule.primaryRoute, approvalRequired: false };
}

// ─── WhatsApp Delayed Schedule Calculator ───
export function calculateReviewAskSchedules(now = new Date()) {
  const askDelayMs = 2 * 60 * 60 * 1000; // 2 hours
  const reminderDelayMs = 3 * 24 * 60 * 60 * 1000; // 3 days

  const sendAfter = new Date(now.getTime() + askDelayMs);
  const reminderAfter = new Date(now.getTime() + reminderDelayMs);

  return { sendAfter, reminderAfter };
}

describe('01 External Dependencies & Gates Compliance (REQ-M6-CAP-01, REQ-M1-03, REQ-M1-18)', () => {
  describe('Capability Mapping & Routing Logic', () => {
    it('routes API-automated capabilities to API when provider is connected', () => {
      const result = resolveExecutionRoute('GBP_POST_CREATE', true);
      expect(result.route).toBe('API');
      expect(result.approvalRequired).toBe(false);
    });

    it('falls back to HUMAN when primary API provider is unconfigured', () => {
      const result = resolveExecutionRoute('GBP_POST_CREATE', false);
      expect(result.route).toBe('HUMAN');
      expect(result.approvalRequired).toBe(false);
    });

    it('enforces HUMAN approval route for high-risk primary category changes regardless of provider', () => {
      const result = resolveExecutionRoute('PRIMARY_CATEGORY_CHANGE', true);
      expect(result.route).toBe('HUMAN');
      expect(result.approvalRequired).toBe(true);
    });

    it('enforces HUMAN approval route for GBP verification actions', () => {
      const result = resolveExecutionRoute('GBP_VERIFICATION', true);
      expect(result.route).toBe('HUMAN');
      expect(result.approvalRequired).toBe(true);
    });

    it('enforces HUMAN approval route for client profile legal changes', () => {
      const result = resolveExecutionRoute('CLIENT_PROFILE_CHANGE', true);
      expect(result.route).toBe('HUMAN');
      expect(result.approvalRequired).toBe(true);
    });
  });

  describe('WhatsApp Review Ask Delay Scheduling', () => {
    it('calculates exactly 2-hour ask and 3-day reminder delays', () => {
      const baseTime = new Date('2026-07-22T10:00:00.000Z');
      const { sendAfter, reminderAfter } = calculateReviewAskSchedules(baseTime);

      expect(sendAfter.toISOString()).toBe('2026-07-22T12:00:00.000Z');
      expect(reminderAfter.toISOString()).toBe('2026-07-25T10:00:00.000Z');
    });
  });
});
