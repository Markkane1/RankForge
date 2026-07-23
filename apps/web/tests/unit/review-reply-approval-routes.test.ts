import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  requireRole: vi.fn(),
  withClientTenant: vi.fn(),
  requireApproval: vi.fn(),
  findReview: vi.fn(),
  updateReview: vi.fn(),
  findContentPiece: vi.fn(),
  updateContentPiece: vi.fn(),
  createContentHistory: vi.fn(),
  createChangeLog: vi.fn(),
  findOrganization: vi.fn(),
  findClientBySlug: vi.fn(),
  createClient: vi.fn(),
  createTask: vi.fn(),
  findApproval: vi.fn(),
  updateApproval: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
  requireRole: mocks.requireRole,
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
    db: {
      approvalRequest: {
        findUnique: mocks.findApproval,
        update: mocks.updateApproval,
      },
      organization: {
        findFirst: mocks.findOrganization,
      },
      client: {
        findFirst: mocks.findClientBySlug,
        create: mocks.createClient,
      },
      task: {
        findUnique: vi.fn(),
        create: mocks.createTask,
      },
      changeLogEntry: {
        create: mocks.createChangeLog,
      },
    },
}));

vi.mock('../../src/lib/approval-guard', () => ({
  requireApproval: mocks.requireApproval,
}));

import { POST as replyToReview } from '../../src/app/api/clients/[id]/gbp/[gbpId]/reviews/[reviewId]/reply/route';
import { POST as approveRequest } from '../../src/app/api/approvals/[id]/approve/route';

const replyParams = { params: Promise.resolve({ id: 'client-1', gbpId: 'gbp-1', reviewId: 'review-1' }) };

describe('review reply approval routes', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.requireClientRole.mockResolvedValue({ ok: true, user: { id: 'requester-1' } });
    mocks.requireRole.mockResolvedValue({ ok: true, user: { id: 'approver-1' } });
    mocks.requireApproval.mockResolvedValue({ id: 'approval-1', status: 'PENDING' });
    mocks.updateReview.mockResolvedValue({ id: 'review-1', replyText: 'Thanks for the feedback.' });
    mocks.createChangeLog.mockResolvedValue({ id: 'log-1' });
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        gbpReview: {
          findFirst: mocks.findReview,
          update: mocks.updateReview,
        },
        contentPiece: {
          findUnique: mocks.findContentPiece,
          update: mocks.updateContentPiece,
        },
        contentPieceStatusHistory: {
          create: mocks.createContentHistory,
        },
        approvalRequest: {
          create: vi.fn(),
        },
        changeLogEntry: {
          create: mocks.createChangeLog,
        },
      }),
    );
  });

  it('routes low-star review replies to approval instead of updating directly', async () => {
    mocks.findReview.mockResolvedValue({ id: 'review-1', rating: 2, requiresHumanGate: true });

    const response = await replyToReview(
      new NextRequest('http://localhost/api/clients/client-1/gbp/gbp-1/reviews/review-1/reply', {
        method: 'POST',
        body: JSON.stringify({ replyText: 'Thanks for the feedback.' }),
      }),
      replyParams,
    );

    expect(response.status).toBe(202);
    expect(mocks.requireApproval).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      clientId: 'client-1',
      requestType: 'REVIEW_REPLY',
      requestData: { gbpId: 'gbp-1', reviewId: 'review-1', replyText: 'Thanks for the feedback.' },
      requestedById: 'requester-1',
    }));
    expect(mocks.updateReview).not.toHaveBeenCalled();
  });

  it('allows non-low-star review replies without approval', async () => {
    mocks.findReview.mockResolvedValue({ id: 'review-1', rating: 5, requiresHumanGate: false });

    const response = await replyToReview(
      new NextRequest('http://localhost/api/clients/client-1/gbp/gbp-1/reviews/review-1/reply', {
        method: 'POST',
        body: JSON.stringify({ replyText: 'Thanks for the feedback.' }),
      }),
      replyParams,
    );

    expect(response.status).toBe(200);
    expect(mocks.requireApproval).not.toHaveBeenCalled();
    expect(mocks.updateReview).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: {
        replyText: 'Thanks for the feedback.',
        repliedAt: expect.any(Date),
      },
    });
  });

  it('executes approved review replies and clears the human gate', async () => {
    mocks.findApproval.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      clientId: 'client-1',
      requestedById: 'requester-1',
      requestType: 'REVIEW_REPLY',
      requestData: JSON.stringify({
        gbpId: 'gbp-1',
        reviewId: 'review-1',
        replyText: 'Thanks for the feedback.',
      }),
      taskId: null,
    });
    mocks.updateApproval.mockResolvedValue({ id: 'approval-1', status: 'APPROVED' });
    mocks.findReview.mockResolvedValue({ id: 'review-1' });

    const response = await approveRequest(
      new NextRequest('http://localhost/api/approvals/approval-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'approval-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateReview).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: {
        replyText: 'Thanks for the feedback.',
        repliedAt: expect.any(Date),
        requiresHumanGate: false,
      },
    });
    expect(mocks.createChangeLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        entityType: 'GbpReview',
        field: 'review_reply_approved',
      }),
    });
  });

  it('executes approved content publish gates by marking the content piece approved', async () => {
    mocks.findApproval.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      clientId: 'client-1',
      requestedById: 'requester-1',
      requestType: 'CONTENT_PUBLISH',
      requestData: JSON.stringify({
        contentPieceId: 'content-1',
      }),
      taskId: null,
    });
    mocks.updateApproval.mockResolvedValue({ id: 'approval-1', status: 'APPROVED' });
    mocks.findContentPiece.mockResolvedValue({
      id: 'content-1',
      clientId: 'client-1',
      status: 'PENDING_APPROVAL',
    });
    mocks.updateContentPiece.mockResolvedValue({ id: 'content-1', status: 'APPROVED' });
    mocks.createContentHistory.mockResolvedValue({ id: 'history-1' });

    const response = await approveRequest(
      new NextRequest('http://localhost/api/approvals/approval-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'approval-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateContentPiece).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { status: 'APPROVED' },
    });
    expect(mocks.createContentHistory).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentPieceId: 'content-1',
        oldStatus: 'PENDING_APPROVAL',
        newStatus: 'APPROVED',
        reason: 'content-publish-approval-granted',
      }),
    });
    expect(mocks.createChangeLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        entityType: 'ContentPiece',
        field: 'content_publish_approved',
      }),
    });
  });

  it('resumes onboarding when a conflict-of-interest client approval is approved', async () => {
    mocks.findApproval.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      clientId: null,
      requestedById: 'requester-1',
      requestType: 'CONFLICT_OF_INTEREST',
      requestData: JSON.stringify({
        incoming: {
          name: 'Acme Plumbing',
          businessName: 'Acme Plumbing LLC',
          phone: '555-0100',
          email: 'owner@example.com',
          website: 'https://acme.example',
          address: '1 Main St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
          type: 'SERVICE_AREA_BUSINESS',
          legalName: 'Acme Plumbing LLC',
          serviceList: 'Drain repair, Leak repair',
          primaryCategory: 'Plumber',
          secondaryCategories: '["Drainage service"]',
          gbpDescription: 'Local plumbing services.',
          serviceAreas: [{ name: 'Austin Metro', city: 'Austin', radiusMiles: 15, isPrimary: true }],
        },
      }),
      taskId: null,
    });
    mocks.updateApproval.mockResolvedValue({ id: 'approval-1', status: 'APPROVED' });
    mocks.findOrganization.mockResolvedValue({ id: 'org-1' });
    mocks.findClientBySlug.mockResolvedValue(null);
    mocks.createClient.mockResolvedValue({ id: 'client-1', name: 'Acme Plumbing' });
    mocks.createTask.mockResolvedValue({ id: 'task-1' });

    const response = await approveRequest(
      new NextRequest('http://localhost/api/approvals/approval-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'approval-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Acme Plumbing',
        slug: 'acme-plumbing',
        businessName: 'Acme Plumbing LLC',
        organizationId: 'org-1',
        gbpProfiles: {
          create: expect.objectContaining({
            primaryCategory: 'Plumber',
            phone: '555-0100',
          }),
        },
        serviceAreas: {
          create: [
            {
              name: 'Austin Metro',
              city: 'Austin',
              radiusMiles: 15,
              isPrimary: true,
            },
          ],
        },
      }),
    });
    expect(mocks.createTask).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        taskId: 'REQ-M6-06',
        status: 'IN_PROGRESS',
        idempotencyKey: 'ConflictOnboardingResume:approval-1',
      }),
    });
    expect(mocks.createChangeLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        field: 'conflict_approval_onboarding_resumed',
      }),
    });
  });
});
