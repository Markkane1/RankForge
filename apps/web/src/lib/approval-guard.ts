type ApprovalDb<T> = {
  approvalRequest: {
    create(args: unknown): Promise<T>;
  };
};

type ApprovalInput = {
  clientId?: string | null;
  taskId?: string | null;
  title: string;
  description: string;
  requestType: string;
  requestData?: unknown;
  requestedById: string;
  include?: unknown;
};

export async function requireApproval<T>(db: ApprovalDb<T>, input: ApprovalInput): Promise<T> {
  return db.approvalRequest.create({
    data: {
      clientId: input.clientId ?? null,
      taskId: input.taskId ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      requestType: input.requestType.trim(),
      requestData:
        typeof input.requestData === 'string'
          ? input.requestData
          : input.requestData === undefined
            ? null
            : JSON.stringify(input.requestData),
      status: 'PENDING',
      requestedById: input.requestedById,
    },
    ...(input.include ? { include: input.include } : {}),
  });
}
