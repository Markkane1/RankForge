import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-guard';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('APPROVER', 'OWNER');
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const { id } = await params;

    const approval = await db.approvalRequest.findUnique({ where: { id } });

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    if (approval.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve: approval is already ${approval.status}` },
        { status: 422 }
      );
    }

    // 4-eyes principle: requester cannot be the approver
    if (approval.requestedById === userId) {
      return NextResponse.json(
        { error: '4-eyes principle violated: requester and approver must be different people' },
        { status: 403 }
      );
    }

    const now = new Date();

    const updated = await db.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        reviewedAt: now,
      },
    });

    // ─── Execute Intercepted Actions Upon Approval ───
    if (approval.requestData) {
      try {
        const data = typeof approval.requestData === 'string' ? JSON.parse(approval.requestData) : approval.requestData;

        if (approval.requestType === 'CLIENT_PROFILE_CHANGE' && approval.clientId) {
          const { withClientTenant } = await import('@/lib/db');
          await withClientTenant(approval.clientId, async (tenantDb) => {
            await tenantDb.client.update({
              where: { id: approval.clientId! },
              data: {
                ...(data.businessName !== undefined && { businessName: data.businessName }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.website !== undefined && { website: data.website }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.city !== undefined && { city: data.city }),
                ...(data.state !== undefined && { state: data.state }),
                ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
              },
            });
            await tenantDb.changeLogEntry.create({
              data: {
                clientId: approval.clientId!,
                module: 'CORE',
                entityType: 'Client',
                entityId: approval.clientId!,
                field: 'client_profile_approved',
                oldValue: 'PENDING_APPROVAL',
                newValue: 'APPROVED',
                changedById: userId,
              },
            });
          });
        } else if (approval.requestType === 'GBP_VERIFICATION' && approval.clientId) {
          const { withClientTenant } = await import('@/lib/db');
          await withClientTenant(approval.clientId, async (tenantDb) => {
            const gbpId = data.gbpId;
            const targetProfile = gbpId
              ? await tenantDb.gbpProfile.findUnique({ where: { id: gbpId, clientId: approval.clientId! } })
              : null;
            if (targetProfile) {
              await tenantDb.gbpProfile.update({
                where: { id: targetProfile.id, clientId: approval.clientId! },
                data: { isVerified: data.isVerified ?? true },
              });
              await tenantDb.changeLogEntry.create({
                data: {
                  clientId: approval.clientId!,
                  module: 'M1',
                  entityType: 'GbpProfile',
                  entityId: targetProfile.id,
                  field: 'gbp_verification_approved',
                  oldValue: 'UNVERIFIED',
                  newValue: 'VERIFIED',
                  changedById: userId,
                },
              });
            }
          });
        } else if (approval.requestType === 'CATEGORY_CHANGE' && approval.clientId) {
          const { withClientTenant } = await import('@/lib/db');
          await withClientTenant(approval.clientId, async (tenantDb) => {
            const targetProfile = data.gbpId
              ? await tenantDb.gbpProfile.findUnique({ where: { id: data.gbpId, clientId: approval.clientId! } })
              : null;
            if (targetProfile) {
              await tenantDb.gbpProfile.update({
                where: { id: targetProfile.id, clientId: approval.clientId! },
                data: {
                  ...(data.primaryCategory && { primaryCategory: data.primaryCategory }),
                  ...(data.secondaryCategories && { secondaryCategories: data.secondaryCategories }),
                },
              });
              await tenantDb.changeLogEntry.create({
                data: {
                  clientId: approval.clientId!,
                  module: 'M1',
                  entityType: 'GbpProfile',
                  entityId: targetProfile.id,
                  field: 'category_change_approved',
                  oldValue: targetProfile.primaryCategory || 'NONE',
                  newValue: data.primaryCategory || 'UPDATED',
                  changedById: userId,
                },
              });
            }
          });
        } else if (approval.requestType === 'REVIEW_REPLY' && approval.clientId) {
          const { withClientTenant } = await import('@/lib/db');
          await withClientTenant(approval.clientId, async (tenantDb) => {
            const targetReview = await tenantDb.gbpReview.findFirst({
              where: {
                id: data.reviewId,
                gbpProfileId: data.gbpId,
                gbpProfile: { clientId: approval.clientId! },
              },
            });
            if (targetReview) {
              await tenantDb.gbpReview.update({
                where: { id: targetReview.id },
                data: {
                  replyText: data.replyText,
                  repliedAt: now,
                  requiresHumanGate: false,
                },
              });
              await tenantDb.changeLogEntry.create({
                data: {
                  clientId: approval.clientId!,
                  module: 'M1',
                  entityType: 'GbpReview',
                  entityId: targetReview.id,
                  field: 'review_reply_approved',
                  oldValue: 'PENDING_APPROVAL',
                  newValue: 'APPROVED',
                  changedById: userId,
                },
              });
            }
          });
        } else if (approval.requestType === 'CONTENT_PUBLISH' && approval.clientId) {
          const { withClientTenant } = await import('@/lib/db');
          await withClientTenant(approval.clientId, async (tenantDb) => {
            const targetPiece = await tenantDb.contentPiece.findUnique({
              where: { id: data.contentPieceId },
            });
            if (targetPiece && targetPiece.clientId === approval.clientId) {
              await tenantDb.contentPiece.update({
                where: { id: targetPiece.id },
                data: { status: 'APPROVED' },
              });
              await tenantDb.contentPieceStatusHistory.create({
                data: {
                  contentPieceId: targetPiece.id,
                  oldStatus: targetPiece.status,
                  newStatus: 'APPROVED',
                  reason: 'content-publish-approval-granted',
                  metadata: JSON.stringify({ approvalId: approval.id }),
                },
              });
              await tenantDb.changeLogEntry.create({
                data: {
                  clientId: approval.clientId!,
                  module: 'M4',
                  entityType: 'ContentPiece',
                  entityId: targetPiece.id,
                  field: 'content_publish_approved',
                  oldValue: targetPiece.status,
                  newValue: 'APPROVED',
                  changedById: userId,
                },
              });
            }
          });
        } else if (approval.requestType === 'CONFLICT_OF_INTEREST') {
          const incoming = data.incoming || data;
          if (incoming && incoming.name) {
            const org = await db.organization.findFirst();
            if (org) {
              const slug = incoming.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              const existingClient = await db.client.findFirst({ where: { slug } });
              if (!existingClient) {
                const createdClient = await db.client.create({
                  data: {
                    name: incoming.name.trim(),
                    slug,
                    businessName: incoming.businessName || null,
                    phone: incoming.phone || null,
                    email: incoming.email || null,
                    website: incoming.website || null,
                    address: incoming.address || null,
                    city: incoming.city || null,
                    state: incoming.state || null,
                    country: incoming.country || 'US',
                    postalCode: incoming.postalCode || null,
                    type: incoming.type || 'SERVICE_AREA_BUSINESS',
                    notes: incoming.notes || null,
                    intakeData: JSON.stringify({
                      legalName: incoming.legalName,
                      serviceList: String(incoming.serviceList ?? '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                      whatsapp: incoming.whatsapp || null,
                      existingGbpLoginDetails: incoming.existingGbpLoginDetails,
                      pastSuspensions: incoming.pastSuspensions,
                      photoAvailability: incoming.photoAvailability,
                      usps: incoming.usps,
                      bookingSystem: incoming.bookingSystem,
                      businessHours: incoming.businessHours,
                      serviceAreaBusiness: (incoming.type || 'SERVICE_AREA_BUSINESS') === 'SERVICE_AREA_BUSINESS',
                      resumedFromApprovalId: approval.id,
                    }),
                    isActive: true,
                    organizationId: org.id,
                    gbpProfiles: {
                      create: {
                        primaryCategory: incoming.primaryCategory || null,
                        secondaryCategories: incoming.secondaryCategories || null,
                        description: incoming.gbpDescription || null,
                        phone: incoming.phone || null,
                        websiteUrl: incoming.website || null,
                        address: [incoming.address, incoming.city, incoming.state, incoming.postalCode].filter(Boolean).join(', ') || null,
                      },
                    },
                    serviceAreas: incoming.serviceAreas?.length
                      ? {
                          create: incoming.serviceAreas.map((sa: { name: string; city?: string; radiusMiles?: number; isPrimary?: boolean }) => ({
                            name: sa.name,
                            city: sa.city || null,
                            radiusMiles: sa.radiusMiles ?? null,
                            isPrimary: sa.isPrimary ?? false,
                          })),
                        }
                      : undefined,
                  },
                });
                await db.task.create({
                  data: {
                    clientId: createdClient.id,
                    taskId: 'REQ-M6-06',
                    title: `Resume onboarding after conflict approval: ${createdClient.name}`,
                    description: `Conflict-of-interest approval ${approval.id} was approved. Continue client onboarding and run the onboarding wizard.`,
                    module: 'M6',
                    priority: 'HIGH',
                    status: 'IN_PROGRESS',
                    idempotencyKey: `ConflictOnboardingResume:${approval.id}`,
                  },
                });
                await db.changeLogEntry.create({
                  data: {
                    clientId: createdClient.id,
                    module: 'M6',
                    entityType: 'Client',
                    entityId: createdClient.id,
                    field: 'conflict_approval_onboarding_resumed',
                    oldValue: 'PENDING_APPROVAL',
                    newValue: 'ONBOARDING',
                    changedById: userId,
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to execute approved action side effects:', err);
      }
    }

    // If there's a linked task with status PENDING_APPROVAL, move it to IN_PROGRESS
    if (approval.taskId) {
      const linkedTask = await db.task.findUnique({
        where: { id: approval.taskId },
      });

      if (linkedTask && linkedTask.status === 'PENDING_APPROVAL') {
        await db.task.update({
          where: { id: approval.taskId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: linkedTask.startedAt ?? now,
          },
        });

        await db.taskLog.create({
          data: {
            taskId: approval.taskId,
            level: 'INFO',
            message: `Approval granted (ID: ${id}). Status changed from PENDING_APPROVAL to IN_PROGRESS`,
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Approve API error:', error);
    return NextResponse.json(
      { error: 'Failed to approve' },
      { status: 500 }
    );
  }
}
