'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, joinRoom, leaveRoom } from '@/lib/realtime';
import { toast } from 'sonner';

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL;

export function useRealtimeEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // ponytail: skip entire socket setup if realtime server not configured
    if (!REALTIME_URL) return;

    const socket = getSocket();

    const handleTaskUpdate = (_data: { taskId: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleApprovalUpdate = (data: { approvalId: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['header-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.status === 'APPROVED') {
        toast.success('An approval was approved');
      } else if (data.status === 'REJECTED') {
        toast.error('An approval was rejected');
      }
    };

    const handleNotification = (data: { title: string; message: string }) => {
      toast.info(data.title, { description: data.message });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('task-updated', handleTaskUpdate);
    socket.on('approval-updated', handleApprovalUpdate);
    socket.on('notification', handleNotification);

    joinRoom('global');

    return () => {
      socket.off('task-updated', handleTaskUpdate);
      socket.off('approval-updated', handleApprovalUpdate);
      socket.off('notification', handleNotification);
      leaveRoom('global');
    };
  }, [queryClient]);
}