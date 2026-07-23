type ApprovalToExpire = {
  id: string;
  taskId: string | null;
  clientId: string | null;
  task?: { clientId: string | null } | null;
};

type ApprovalExpiryDb = {
  approvalRequest: {
    findMany(args: unknown): Promise<ApprovalToExpire[]>;
    update(args: unknown): Promise<unknown>;
  };
  task: {
    updateMany(args: unknown): Promise<unknown>;
  };
  taskLog: {
    create(args: unknown): Promise<unknown>;
  };
};

type ApprovalExpiryDeps = {
  prisma: ApprovalExpiryDb;
  withClientTenant<T>(
    clientId: string,
    fn: (tenantDb: ApprovalExpiryDb) => Promise<T>,
  ): Promise<T>;
  now?: Date;
};

export async function expireStaleApprovals({
  prisma,
  withClientTenant,
  now = new Date(),
}: ApprovalExpiryDeps): Promise<number> {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const approvalsToExpire = await prisma.approvalRequest.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: thirtyDaysAgo },
    },
    select: {
      id: true,
      taskId: true,
      clientId: true,
      task: { select: { clientId: true } },
    },
  });

  for (const approval of approvalsToExpire) {
    const expireApproval = async (db: ApprovalExpiryDb) => {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: {
          status: 'EXPIRED',
          rejectedReason: 'System: Auto-expired after 30 days of inactivity.',
        },
      });

      if (approval.taskId) {
        await db.task.updateMany({
          where: { id: approval.taskId, status: 'PENDING_APPROVAL' },
          data: { status: 'BLOCKED' },
        });
        await db.taskLog.create({
          data: {
            taskId: approval.taskId,
            level: 'WARN',
            message: `Approval expired (ID: ${approval.id}). Task moved to BLOCKED.`,
          },
        });
      }
    };

    const clientId = approval.clientId ?? approval.task?.clientId;
    if (clientId) {
      await withClientTenant(clientId, expireApproval);
    } else {
      await expireApproval(prisma);
    }
  }

  return approvalsToExpire.length;
}
