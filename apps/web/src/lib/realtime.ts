import { io as socketIO, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// ponytail: only connect when realtime server is explicitly configured.
// Without NEXT_PUBLIC_REALTIME_URL, skip socket entirely to avoid console noise.
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL;

function createSocket(): Socket {
  const url = REALTIME_URL ?? "/?XTransformPort=3004";
  return socketIO(url, {
    transports: ["websocket", "polling"],
    autoConnect: !!REALTIME_URL,
    reconnectionAttempts: REALTIME_URL ? Infinity : 0,
  });
}

export function getSocket(): Socket {
  if (!socket) {
    socket = createSocket();
  }
  return socket;
}

export function joinRoom(roomId: string) {
  if (!REALTIME_URL) return; // no-op when realtime not configured
  getSocket().emit("join-room", roomId);
}

export function leaveRoom(roomId: string) {
  if (!REALTIME_URL) return;
  getSocket().emit("leave-room", roomId);
}

export function emitTaskUpdate(data: { taskId: string; clientId?: string; status: string }) {
  if (!REALTIME_URL) return;
  getSocket().emit("task-updated", data);
}

export function emitApprovalUpdate(data: { approvalId: string; status: string }) {
  if (!REALTIME_URL) return;
  getSocket().emit("approval-updated", data);
}