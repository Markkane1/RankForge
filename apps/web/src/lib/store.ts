import { create } from 'zustand';
import type { ViewType, NotificationItem } from '@/lib/types';

interface AppStore {
  currentView: ViewType;
  selectedClientId: string | null;
  expandedTaskId: string | null;
  sidebarOpen: boolean;
  notifications: NotificationItem[];
  setCurrentView: (view: ViewType) => void;
  setSelectedClientId: (id: string | null) => void;
  setExpandedTaskId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  addNotification: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  dismissNotification: (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentView: 'dashboard',
  selectedClientId: null,
  expandedTaskId: null,
  sidebarOpen: false,
  notifications: [],
  setCurrentView: (view) => set({ currentView: view, sidebarOpen: false, expandedTaskId: null }),
  setSelectedClientId: (id) => set({ selectedClientId: id }),
  setExpandedTaskId: (id) => set({ expandedTaskId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...s.notifications,
      ].slice(0, 50),
    })),
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
}));