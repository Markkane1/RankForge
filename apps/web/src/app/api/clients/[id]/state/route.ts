import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ClientState } from "@rankforge/database";
import { requireOwner } from "@/lib/auth-guard";
import { updateClientStateSchema } from "@/lib/validations";

type ClientStateType = (typeof ClientState)[keyof typeof ClientState];

const LEGAL_TRANSITIONS: Record<ClientStateType, ClientStateType[]> = {
  ONBOARDING: ["BUILD"],
  BUILD: ["GROWTH"],
  GROWTH: ["AT_RISK"],
  AT_RISK: ["GROWTH", "PAUSED"],
  PAUSED: ["BUILD"],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const parsed = updateClientStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const { state } = parsed.data;

    if (!Object.values(ClientState).includes(state as ClientState)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${Object.values(ClientState).join(", ")}` },
        { status: 400 }
      );
    }

    const client = await db.client.findUnique({
      where: { id },
      include: { baseline: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const currentState = client.lifecycleState;
    const newState = state as ClientStateType;

    if (currentState === newState) {
      return NextResponse.json({ error: "Client is already in this state" }, { status: 400 });
    }

    const allowed = LEGAL_TRANSITIONS[currentState];
    if (!allowed || !allowed.includes(newState)) {
      return NextResponse.json(
        {
          error: `Illegal transition from ${currentState} to ${newState}. Allowed: ${allowed.join(", ")}`,
        },
        { status: 422 }
      );
    }

    // ─── Enforce Baseline Snapshot for GROWTH ───
    if (newState === "GROWTH" && !client.baseline) {
      return NextResponse.json(
        { error: "Cannot transition to GROWTH without a baseline snapshot" },
        { status: 422 }
      );
    }

    const updated = await db.client.update({
      where: { id },
      data: { lifecycleState: newState },
    });

    // Create change log entry for the transition
    await db.changeLogEntry.create({
      data: {
        clientId: id,
        module: "CORE",
        entityType: "Client",
        entityId: id,
        field: "lifecycleState",
        oldValue: currentState,
        newValue: newState,
        changedById: auth.user.id,
      },
    });

    // ─── AT_RISK Alert Trigger ───
    if (newState === "AT_RISK") {
      // Find all STAFF members (e.g., OWNER, COORDINATOR) to alert
      const staffUsers = await db.staffUser.findMany({
        where: { organizationId: client.organizationId, isActive: true },
      });
      
      const notifications = staffUsers.map(staff => ({
        userId: staff.id,
        type: "client_at_risk",
        title: `Client At Risk: ${client.name}`,
        message: `Client ${client.name} has been moved to AT_RISK status. Immediate action required.`,
        relatedEntityId: client.id,
        relatedEntityType: "client",
      }));

      await db.notification.createMany({ data: notifications });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Client state update API error:", error);
    return NextResponse.json(
      { error: "Failed to update client state" },
      { status: 500 }
    );
  }
}
