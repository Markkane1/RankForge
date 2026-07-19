import { PrismaClient } from '@prisma/client';

import { validateTransition, IllegalStateTransitionError } from './state-machine';

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  const extended = client.$extends({
    query: {
      client: {
        async create({ args, query }) {
          // Check for basic geographic conflict of interest on creation
          if (args.data.city && args.data.organizationId) {
            const orgId = typeof (args.data as any).organizationId === 'string' ? (args.data as any).organizationId : (args.data as any).organizationId?.connect?.id;
            if (orgId) {
              const existingConflicts = await client.client.findMany({
                where: {
                  organizationId: orgId,
                  city: { equals: args.data.city, mode: 'insensitive' },
                  isActive: true
                }
              });
              // This is a strict base conflict check. In production, this would be combined with keyword/category.
              if (existingConflicts.length > 2) { // Arbitrary threshold to simulate conflict blocking
                 throw new Error(`Conflict of Interest: Organization already has multiple clients in ${args.data.city}.`);
              }
            }
          }
          return query(args);
        },
        async update({ args, query }) {
          const newState = args.data.lifecycleState as any;
          
          if (newState) {
            // Fetch current state
            const currentClient = await client.client.findUnique({
              where: args.where as any,
              select: { id: true, lifecycleState: true, organizationId: true }
            });
            
            if (currentClient && currentClient.lifecycleState) {
              // 1. Enforce DAG boundary (REQ-M6-STATE-02)
              if (!validateTransition(currentClient.lifecycleState, newState)) {
                throw new IllegalStateTransitionError(currentClient.lifecycleState, newState);
              }

              // REQ-M6-STATE-04: BUILD -> GROWTH blocked by baseline
              if (newState === 'GROWTH' && currentClient.lifecycleState !== 'GROWTH') {
                const baseline = await client.baselineSnapshot.findUnique({
                  where: { clientId: currentClient.id }
                });
                if (!baseline) {
                  throw new Error('Cannot transition to GROWTH: A BaselineSnapshot is required to proceed.');
                }
              }
              
              // 2. Queue High-Priority Task & Notify Owner (REQ-M6-STATE-03)
              if (newState === 'AT_RISK' && currentClient.lifecycleState !== 'AT_RISK') {
                const task = await client.task.create({
                  data: {
                    taskId: `CHURN-${Date.now()}`,
                    clientId: currentClient.id,
                    title: 'CRITICAL: Client AT RISK - Immediate Outreach Required',
                    description: 'Automated trigger: Client has entered AT_RISK state.',
                    module: 'M6',
                    priority: 'CRITICAL',
                    status: 'NOT_STARTED',
                  }
                });

                // Notify all owners in the organization
                const owners = await client.staffUser.findMany({
                  where: { organizationId: currentClient.organizationId, role: 'OWNER' },
                  select: { id: true }
                });

                if (owners.length > 0) {
                  await client.notification.createMany({
                    data: owners.map(o => ({
                      userId: o.id,
                      type: 'client_at_risk',
                      title: 'Client At Risk',
                      message: 'A client has transitioned to AT_RISK. Urgent churn prevention task generated.',
                      relatedEntityId: task.id,
                      relatedEntityType: 'task'
                    }))
                  });
                }
              }
            }
          }

          const result = await query(args);
          // REQ-NFR-06: Scrub PII when client is offboarded (PAUSED)
          if (newState === 'PAUSED') {
            await client.leadLogEntry.updateMany({
              where: { clientId: result.id },
              data: { contactInfo: '[REDACTED DUE TO OFFBOARDING]' },
            });
          }
          return result;
        },
      },
    },
  });

  // Expose 'user' property mapping to 'staffUser' for NextAuth PrismaAdapter compatibility
  Object.defineProperty(extended, 'user', {
    get() {
      return (this as any).staffUser;
    }
  });

  return extended;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
