export async function emitRealtimeEvent(event: string, data: unknown, room?: string) {
  try {
    const body: Record<string, unknown> = { event, data };
    if (room) body.room = room;
    await fetch("http://localhost:3004/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Realtime service not available, silently fail
  }
}