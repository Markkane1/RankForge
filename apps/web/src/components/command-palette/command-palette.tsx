'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getClients, getTasks, getApprovals } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, ListTodo, CheckCircle2, Hammer, Settings,
  Search, ArrowRight,
} from 'lucide-react';
import type { ViewType, ClientListItem, TaskItem, ApprovalRequest } from '@/lib/types';

interface CommandItem {
  id: string;
  type: 'view' | 'client' | 'task' | 'approval';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: { label: string; color: string };
}

const viewItems: { view: ViewType; label: string; icon: React.ReactNode; description: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Overview of your agency performance' },
  { view: 'clients', label: 'Clients', icon: <Users className="h-4 w-4" />, description: 'Manage your client portfolio' },
  { view: 'tasks', label: 'Tasks', icon: <ListTodo className="h-4 w-4" />, description: 'Track and manage all tasks' },
  { view: 'approvals', label: 'Approvals', icon: <CheckCircle2 className="h-4 w-4" />, description: 'Review and approve pending actions' },
  { view: 'build-status', label: 'Build Status', icon: <Hammer className="h-4 w-4" />, description: 'Track platform development progress' },
  { view: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, description: 'Organization and team configuration' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCurrentView, setSelectedClientId } = useAppStore();

  // Listen for custom event to open
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  // Fetch data when open
  const { data: clients } = useQuery<ClientListItem[]>({
    queryKey: ['cmd-clients'],
    queryFn: () => getClients(),
    enabled: open,
  });

  const { data: tasks } = useQuery<TaskItem[]>({
    queryKey: ['cmd-tasks'],
    queryFn: () => getTasks(),
    enabled: open,
  });

  const { data: approvals } = useQuery<ApprovalRequest[]>({
    queryKey: ['cmd-approvals'],
    queryFn: () => getApprovals({ status: 'PENDING' }),
    enabled: open,
  });

  const navigateToClient = useCallback((id: string) => {
    setSelectedClientId(id);
    setCurrentView('clients');
    setOpen(false);
    setSearch('');
  }, [setCurrentView, setSelectedClientId]);

  const navigateToView = useCallback((view: ViewType) => {
    setCurrentView(view);
    setOpen(false);
    setSearch('');
  }, [setCurrentView]);

  const items = useMemo<CommandItem[]>(() => {
    const q = search.toLowerCase().trim();
    const result: CommandItem[] = [];

    // View navigation
    if (!q) {
      for (const v of viewItems) {
        result.push({
          id: `view-${v.view}`,
          type: 'view',
          title: v.label,
          subtitle: v.description,
          icon: v.icon,
          action: () => navigateToView(v.view),
        });
      }
    } else {
      for (const v of viewItems) {
        if (v.label.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)) {
          result.push({
            id: `view-${v.view}`,
            type: 'view',
            title: v.label,
            subtitle: v.description,
            icon: v.icon,
            action: () => navigateToView(v.view),
          });
        }
      }
    }

    // Clients
    if (clients) {
      const filtered = q
        ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q))
        : clients.slice(0, 5);
      for (const c of filtered) {
        result.push({
          id: `client-${c.id}`,
          type: 'client',
          title: c.name,
          subtitle: c.city ? `${c.city}${c.state ? `, ${c.state}` : ''} · ${c.lifecycleState.replace(/_/g, ' ')}` : c.lifecycleState.replace(/_/g, ' '),
          icon: <Users className="h-4 w-4" />,
          action: () => navigateToClient(c.id),
          badge: { label: c.lifecycleState.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-600' },
        });
      }
    }

    // Tasks
    if (tasks) {
      const filtered = q
        ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.taskId.toLowerCase().includes(q))
        : tasks.slice(0, 5);
      for (const t of filtered) {
        result.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          subtitle: `${t.client?.name ?? 'No client'} · ${t.status.replace(/_/g, ' ')} · ${t.priority}`,
          icon: <ListTodo className="h-4 w-4" />,
          action: () => { setCurrentView('tasks'); setOpen(false); setSearch(''); },
          badge: { label: t.priority, color: t.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600' },
        });
      }
    }

    // Pending approvals
    if (approvals && approvals.length > 0) {
      const filtered = q
        ? approvals.filter((a) => a.title.toLowerCase().includes(q))
        : approvals.slice(0, 3);
      for (const a of filtered) {
        result.push({
          id: `approval-${a.id}`,
          type: 'approval',
          title: a.title,
          subtitle: `Requested by ${a.requestedBy.name} · ${a.requestType}`,
          icon: <CheckCircle2 className="h-4 w-4" />,
          action: () => { setCurrentView('approvals'); setOpen(false); setSearch(''); },
          badge: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
        });
      }
    }

    return result.slice(0, 12);
  }, [search, clients, tasks, approvals, navigateToClient, navigateToView, setCurrentView]);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) setSearch('');
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px] gap-0" onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* Search input */}
        <div className="flex items-center border-b border-border/60 px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, tasks, approvals, or type a command..."
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex keycap">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                    'hover:bg-accent/80 focus:bg-accent/80 focus:outline-none hover:pl-4'
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', item.badge.color)}>
                        {item.badge.label}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border/60 bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="keycap">↑↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="keycap">↵</kbd>
            <span>select</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="keycap">esc</kbd>
            <span>close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}