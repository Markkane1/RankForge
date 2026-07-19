import { io as socketIO, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = socketIO("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function joinRoom(roomId: string) {
  getSocket().emit("join-room", roomId);
}

export function leaveRoom(roomId: string) {
  getSocket().emit("leave-room", roomId);
}

export function emitTaskUpdate(data: { taskId: string; clientId?: string; status: string }) {
  getSocket().emit("task-updated", data);
}

export function emitApprovalUpdate(data: { approvalId: string; status: string }) {
  getSocket().emit("approval-updated", data);
}