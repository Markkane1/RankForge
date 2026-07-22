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
              : await tenantDb.gbpProfile.findFirst({ where: { clientId: approval.clientId! } });
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
            const targetProfile = await tenantDb.gbpProfile.findFirst({ where: { clientId: approval.clientId! } });
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
        } else if (approval.requestType === 'CONFLICT_OF_INTEREST') {
          const incoming = data.incoming || data;
          if (incoming && incoming.name) {
            const org = await db.organization.findFirst();
            if (org) {
              const slug = incoming.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              const existingClient = await db.client.findFirst({ where: { slug } });
              if (!existingClient) {
                await db.client.create({
                  data: {
                    name: incoming.name.trim(),
                    slug,
                    businessName: incoming.businessName || null,
                    city: incoming.city || null,
                    isActive: true,
                    organizationId: org.id,
                    gbpProfiles: {
                      create: {
                        primaryCategory: incoming.primaryCategory || null,
                      },
                    },
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
