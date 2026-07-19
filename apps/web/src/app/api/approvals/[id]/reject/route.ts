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

    // Only APPROVER or OWNER can reject
    if (userRole !== 'APPROVER' && userRole !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only APPROVER or OWNER roles can reject requests' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    const approval = await db.approvalRequest.findUnique({ where: { id } });

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    if (approval.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot reject: approval is already ${approval.status}` },
        { status: 422 }
      );
    }

    // 4-eyes principle: requester cannot be the rejector
    if (approval.requestedById === userId) {
      return NextResponse.json(
        { error: '4-eyes principle violated: requester and reviewer must be different people' },
        { status: 403 }
      );
    }

    const updated = await db.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: userId,
        rejectedReason: reason ?? null,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Reject API error:', error);
    return NextResponse.json(
      { error: 'Failed to reject' },
      { status: 500 }
    );
  }
}