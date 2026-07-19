import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Only APPROVER or OWNER can approve
    if (userRole !== 'APPROVER' && userRole !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only APPROVER or OWNER roles can approve requests' },
        { status: 403 }
      );
    }

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