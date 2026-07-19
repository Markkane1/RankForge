import { describe, it, expect, vi } from 'vitest';

// Function representing the logic implemented in route.ts
function runOnboardingWizardLogic(body: {
  hasSite: boolean;
  isIndexable: boolean;
  hasCmsLogin: boolean;
  wantsSite: boolean;
}) {
  const { hasSite, isIndexable, hasCmsLogin, wantsSite } = body;

  let newState: 'ONBOARDING' | 'BUILD' | 'GROWTH' = 'ONBOARDING';
  let taskTitle = '';
  let taskPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let subtasksList: string[] = [];

  if (hasSite) {
    if (!hasCmsLogin) {
      newState = 'BUILD';
      taskTitle = 'Request CMS Login credentials and hosting details';
      taskPriority = 'HIGH';
      subtasksList = [
        'Request login details via email/dashboard',
        'Verify CMS login credentials work',
        'Retrieve hosting control panel access',
        'Backup website before implementing edits'
      ];
    } else if (!isIndexable) {
      newState = 'BUILD';
      taskTitle = 'Fix website indexing issues and robots.txt configuration';
      taskPriority = 'CRITICAL';
      subtasksList = [
        'Inspect meta robots tags for noindex',
        'Verify robots.txt allows crawler access',
        'Submit sitemap to Google Search Console',
        'Verify domain name resolves correctly'
      ];
    } else {
      newState = 'GROWTH';
      taskTitle = 'Perform landing page SEO optimization audit & schema integration';
      taskPriority = 'MEDIUM';
      subtasksList = [
        'Perform target keyword ranking audit',
        'Inject LocalBusiness JSON-LD schema markup',
        'Configure UTM campaign link tracking',
        'Verify title tag and meta descriptions'
      ];
    }
  } else {
    if (wantsSite) {
      newState = 'BUILD';
      taskTitle = 'Draft location page template & design mockup for new website';
      taskPriority = 'HIGH';
      subtasksList = [
        'Select website styling theme & layout',
        'Draft landing page copywriting copy blocks',
        'Assemble location maps embed & schema details',
        'Design wireframe layout mockups'
      ];
    } else {
      newState = 'GROWTH';
      taskTitle = 'Configure off-site Google Business Profile primary content and citations';
      taskPriority = 'MEDIUM';
      subtasksList = [
        'Optimize GBP business details and description',
        'Populate primary services list and products',
        'Build foundational citation platform profiles',
        'Establish weekly post schedule'
      ];
    }
  }

  return { newState, taskTitle, taskPriority, subtasksList };
}

describe('Onboarding Wizard Playbook Automation (REQ-M2-01)', () => {
  it('should recommend CMS Login task and BUILD state if has site but no CMS login access', () => {
    const outcome = runOnboardingWizardLogic({
      hasSite: true,
      isIndexable: true,
      hasCmsLogin: false,
      wantsSite: false
    });

    expect(outcome.newState).toBe('BUILD');
    expect(outcome.taskTitle).toBe('Request CMS Login credentials and hosting details');
    expect(outcome.taskPriority).toBe('HIGH');
    expect(outcome.subtasksList).toContain('Request login details via email/dashboard');
  });

  it('should recommend indexing fix task and BUILD state if has site but it is not indexable', () => {
    const outcome = runOnboardingWizardLogic({
      hasSite: true,
      isIndexable: false,
      hasCmsLogin: true,
      wantsSite: false
    });

    expect(outcome.newState).toBe('BUILD');
    expect(outcome.taskTitle).toBe('Fix website indexing issues and robots.txt configuration');
    expect(outcome.taskPriority).toBe('CRITICAL');
  });

  it('should recommend new site draft task and BUILD state if no site and wants one', () => {
    const outcome = runOnboardingWizardLogic({
      hasSite: false,
      isIndexable: false,
      hasCmsLogin: false,
      wantsSite: true
    });

    expect(outcome.newState).toBe('BUILD');
    expect(outcome.taskTitle).toBe('Draft location page template & design mockup for new website');
    expect(outcome.taskPriority).toBe('HIGH');
  });

  it('should recommend off-site GBP setup task and GROWTH state if no site and does not want one', () => {
    const outcome = runOnboardingWizardLogic({
      hasSite: false,
      isIndexable: false,
      hasCmsLogin: false,
      wantsSite: false
    });

    expect(outcome.newState).toBe('GROWTH');
    expect(outcome.taskTitle).toBe('Configure off-site Google Business Profile primary content and citations');
    expect(outcome.taskPriority).toBe('MEDIUM');
  });

  it('should recommend SEO audit task and GROWTH state if has site, indexable and has CMS login', () => {
    const outcome = runOnboardingWizardLogic({
      hasSite: true,
      isIndexable: true,
      hasCmsLogin: true,
      wantsSite: false
    });

    expect(outcome.newState).toBe('GROWTH');
    expect(outcome.taskTitle).toBe('Perform landing page SEO optimization audit & schema integration');
    expect(outcome.taskPriority).toBe('MEDIUM');
  });
});
