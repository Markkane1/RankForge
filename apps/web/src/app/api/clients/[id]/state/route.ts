import { NextRequest, NextResponse } from "next/server";
import { ClientState, IllegalStateTransitionError, transitionClientTo } from "@rankforge/database";
import { requireOwner } from "@/lib/auth-guard";
import { updateClientStateSchema } from "@/lib/validations";

type ClientStateType = (typeof ClientState)[keyof typeof ClientState];

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

    const updated = await transitionClientTo(id, state as ClientStateType, auth.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof IllegalStateTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error) {
      if (error.message === "Client not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Client is already in this state") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("BaselineSnapshot")) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }

    console.error("Client state update API error:", error);
    return NextResponse.json(
      { error: "Failed to update client state" },
      { status: 500 }
    );
  }
}
