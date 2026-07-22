import { ClientState } from '@prisma/client';

export const LEGAL_TRANSITIONS: Record<ClientState, ClientState[]> = {
  ONBOARDING: ['BUILD', 'PAUSED'],
  BUILD: ['GROWTH', 'AT_RISK', 'PAUSED'],
  GROWTH: ['AT_RISK', 'PAUSED'],
  AT_RISK: ['GROWTH', 'PAUSED'],
  PAUSED: ['ONBOARDING', 'BUILD', 'GROWTH', 'AT_RISK', 'OFFBOARDED'],
  OFFBOARDED: [],
};

export class IllegalStateTransitionError extends Error {
  constructor(from: ClientState, to: ClientState) {
    super(`Illegal lifecycle transition from ${from} to ${to}. Allowed transitions are: ${LEGAL_TRANSITIONS[from].join(', ')}`);
    this.name = 'IllegalStateTransitionError';
  }
}

export function validateTransition(from: ClientState, to: ClientState): boolean {
  if (from === to) return true; // No state change
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}
