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
