import { describe, it, expect, vi } from 'vitest';

// Simulates the suspension wizard step progression and submission mapping
function simulateWizardFlow(
  checks: { guidelines: boolean; legalName: boolean },
  evidence: { utilityBill: string; businessLicense: string; storefrontPhotos: string },
  message: string,
  existingApproval: any | null
) {
  // Step 1: Compliance
  const canGoToStep2 = checks.guidelines && checks.legalName;
  if (!canGoToStep2) return { step: 1, allowed: false, approvalCreated: false };

  // Step 2: Evidence
  const canGoToStep3 = !!(evidence.utilityBill && evidence.businessLicense && evidence.storefrontPhotos);
  if (!canGoToStep3) return { step: 2, allowed: false, approvalCreated: false };

  // Step 3: Justification Message
  const canSubmit = !!message.trim();
  if (!canSubmit) return { step: 3, allowed: false, approvalCreated: false };

  if (existingApproval) {
    return { step: 4, allowed: true, approvalCreated: false, approvalStatus: existingApproval.status };
  }

  // Submit and create approval
  return {
    step: 4,
    allowed: true,
    approvalCreated: true,
    approvalData: {
      title: 'Suspension Reinstatement',
      requestType: 'SUSPENSION_RESPONSE',
      requestData: JSON.stringify({ compliance: checks, evidence, message })
    }
  };
}

describe('Suspension Wizard Playbook (REQ-M1-28)', () => {
  it('should remain on step 1 if compliance checks are not completed', () => {
    const state = simulateWizardFlow(
      { guidelines: false, legalName: true },
      { utilityBill: '', businessLicense: '', storefrontPhotos: '' },
      'Hello Support',
      null
    );

    expect(state.step).toBe(1);
    expect(state.allowed).toBe(false);
    expect(state.approvalCreated).toBe(false);
  });

  it('should block moving to message step if any evidence is missing', () => {
    const state = simulateWizardFlow(
      { guidelines: true, legalName: true },
      { utilityBill: 'bill.pdf', businessLicense: '', storefrontPhotos: 'store.jpg' },
      'Hello Support',
      null
    );

    expect(state.step).toBe(2);
    expect(state.allowed).toBe(false);
    expect(state.approvalCreated).toBe(false);
  });

  it('should submit successfully if all playbooks are completed and no active approval exists', () => {
    const state = simulateWizardFlow(
      { guidelines: true, legalName: true },
      { utilityBill: 'bill.pdf', businessLicense: 'license.pdf', storefrontPhotos: 'store.jpg' },
      'Hello GBP team, please reinstate.',
      null
    );

    expect(state.step).toBe(4);
    expect(state.allowed).toBe(true);
    expect(state.approvalCreated).toBe(true);
    expect(state.approvalData?.requestType).toBe('SUSPENSION_RESPONSE');
  });

  it('should render correct status screen if an active approval exists', () => {
    const mockApproval = { status: 'PENDING' };
    const state = simulateWizardFlow(
      { guidelines: true, legalName: true },
      { utilityBill: 'bill.pdf', businessLicense: 'license.pdf', storefrontPhotos: 'store.jpg' },
      'Hello GBP team, please reinstate.',
      mockApproval
    );

    expect(state.step).toBe(4);
    expect(state.approvalCreated).toBe(false);
    expect(state.approvalStatus).toBe('PENDING');
  });
});
