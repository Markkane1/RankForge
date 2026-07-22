import { ClientState, PrismaClient } from "@prisma/client";

import {
  validateTransition,
  IllegalStateTransitionError,
} from "./state-machine";

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  const extended = client.$extends({
    query: {
      client: {
        async create({ args, query }) {
          // Check for basic geographic conflict of interest on creation
          if (args.data.city && args.data.organizationId) {
            const orgId =
              typeof (args.data as any).organizationId === "string"
                ? (args.data as any).organizationId
                : (args.data as any).organizationId?.connect?.id;
            if (orgId) {
              const existingConflicts = await client.client.findMany({
                where: {
                  organizationId: orgId,
                  city: { equals: args.data.city, mode: "insensitive" },
                  isActive: true,
                },
              });
              // This is a strict base conflict check. In production, this would be combined with keyword/category.
              if (existingConflicts.length > 2) {
                // Arbitrary threshold to simulate conflict blocking
                throw new Error(
                  `Conflict of Interest: Organization already has multiple clients in ${args.data.city}.`,
                );
              }
            }
          }
          return query(args);
        },
        async update({ args, query }) {
          const newState = args.data.lifecycleState as any;

          if (newState) {
            // REQ-M6-01 / REQ-M6-02: all client lifecycle updates pass through the shared transition validator.
            // Fetch current state
            const currentClient = await client.client.findUnique({
              where: args.where as any,
              select: { id: true, lifecycleState: true, organizationId: true },
            });

            if (currentClient && currentClient.lifecycleState) {
              // REQ-M6-STATE-01: ONBOARDING -> BUILD is represented in the shared transition graph.
              // 1. Enforce DAG boundary (REQ-M6-STATE-02)
              if (!validateTransition(currentClient.lifecycleState, newState)) {
                throw new IllegalStateTransitionError(
                  currentClient.lifecycleState,
                  newState,
                );
              }

              // REQ-M6-STATE-04: BUILD -> GROWTH blocked by baseline
              if (
                newState === "GROWTH" &&
                currentClient.lifecycleState !== "GROWTH"
              ) {
                const baseline = await client.baselineSnapshot.findUnique({
                  where: { clientId: currentClient.id },
                });
                if (!baseline) {
                  throw new Error(
                    "Cannot transition to GROWTH: A BaselineSnapshot is required to proceed.",
                  );
                }
              }

              // REQ-M6-STATE-03 and REQ-NFR-06 side effects are enforced by the DB lifecycle trigger too.
            }
          }

          return query(args);
        },
      },
    },
  });

  // Expose 'user' property mapping to 'staffUser' for NextAuth PrismaAdapter compatibility
  Object.defineProperty(extended, "user", {
    get() {
      return (this as any).staffUser;
    },
  });

  return extended;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma: any = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const GBP_OAUTH_SERVICE = "GBP_OAUTH";
export const LEGACY_GBP_SERVICE = "GBP";

export async function transitionClientTo(
  clientId: string,
  lifecycleState: ClientState,
  changedById?: string,
  db: any = prisma,
) {
  if (changedById) {
    await db.$executeRaw`SELECT set_config('app.current_user_id', ${changedById}, true)`;
  }

  const current = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, lifecycleState: true },
  });

  if (!current) {
    throw new Error("Client not found");
  }

  if (current.lifecycleState === lifecycleState) {
    throw new Error("Client is already in this state");
  }

  // ponytail: minimum TS application-level state machine guard matching Postgres trigger logic
  if (lifecycleState === "OFFBOARDED") {
    const checklistTask = await db.task.findFirst({
      where: {
        clientId,
        idempotencyKey: `OffboardingChecklist:${clientId}`,
        status: "DONE",
      },
    });
    if (!checklistTask) {
      throw new Error("Cannot transition to OFFBOARDED: offboarding handover checklist task must be DONE.");
    }
  }

  const updated = await db.client.update({
    where: { id: clientId },
    data: { lifecycleState },
  });

  return updated;
}

export * from "@prisma/client";
export { IllegalStateTransitionError, validateTransition, LEGAL_TRANSITIONS } from "./state-machine";
export { taskPriorityScore } from "./task-priority";
