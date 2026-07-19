'use client';

import { useSyncExternalStore, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { getDashboard, getApprovals } from '@/lib/api';
import { Menu, Bell, Sun, Moon, User, LogOut, Settings as SettingsIcon, Search, Clock, CheckCircle2, Check, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ApprovalRequest, NotificationItem } from '@/lib/types';

const viewTitles: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Overview of your agency performance' },
  clients: { title: 'Clients', description: 'Manage your client portfolio' },
  tasks: { title: 'Tasks', description: 'Track and manage all tasks' },
  approvals: { title: 'Approvals', description: 'Review and approve pending actions' },
  'build-status': { title: 'Build Status', description: 'Track platform development progress' },
  settings: { title: 'Settings', description: 'Organization and team configuration' },
};

export function Header() {
  const { currentView, toggleSidebar, setCurrentView, notifications, dismissNotification } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { data: session, status: authStatus } = useSession();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const { data: dashboard } = useQuery({
    queryKey: ['header-dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  const { data: pendingApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ['header-pending-approvals'],
    queryFn: () => getApprovals({ status: 'PENDING' }),
    refetchInterval: 30000,
  });

  const currentUser = session?.user;
  const userInitials = currentUser?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) ?? 'U';

  const pendingCount = dashboard?.pendingApprovals ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalBadge = pendingCount + unreadCount;
  const viewInfo = viewTitles[currentView] ?? viewTitles.dashboard;

  const [searchPulsing, setSearchPulsing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchPulsing(true);
      const clearTimer = setTimeout(() => setSearchPulsing(false), 1000);
      return () => clearTimeout(clearTimer);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const notifIcon = (n: NotificationItem) => {
    switch (n.type) {
      case 'approval_assigned': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'task_completed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'lead_converted': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'client_at_risk': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-gradient-to-r from-background via-background to-muted/20 px-4 backdrop-blur-md sm:px-6">
      {/* Subtle gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] font-semibold tracking-tight truncate gradient-text">{viewInfo.title}</h1>
        <p className="hidden text-[11px] text-muted-foreground md:block">{viewInfo.description}</p>
      </div>

      {/* Search command input - clickable to open command palette */}
      <button
        onClick={openCommandPalette}
        className={cn(
          "hidden md:flex h-8 w-56 items-center gap-2 rounded-lg bg-muted/60 px-3 text-muted-foreground transition-all duration-300 hover:bg-muted/80 border border-transparent hover:border-border/60 hover:border-l-2 hover:border-l-emerald-500 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.15)]",
          searchPulsing && "ring-2 ring-emerald-500/30"
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Search...</span>
        <span className="keycap">⌘K</span>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          </Button>
        )}

        {/* Notification bell with dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 border-l-2 border-l-amber-400 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              {totalBadge > 0 && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute h-6 w-6 rounded-full bg-amber-400/30 animate-pulse-ring" />
                </span>
              )}
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {totalBadge > 0 && unreadCount === 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {(pendingCount > 0 || unreadCount > 0) && (
                <Badge variant="secondary" className="text-[10px] font-medium bg-amber-50 text-amber-700">
                  {totalBadge} pending
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-[320px]">
              {/* Store notifications (unread first) */}
              {notifications.filter((n) => !n.read).length > 0 && (
                <div className="divide-y divide-border/50">
                  {notifications.filter((n) => !n.read).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        n.read ? 'opacity-60' : 'bg-emerald-50/30 dark:bg-emerald-950/10'
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {notifIcon(n)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                          {!n.read && (
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                            >
                              <Check className="h-3 w-3" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Pending approvals */}
              {pendingApprovals && pendingApprovals.length > 0 && (
                <div className="divide-y divide-border/50">
                  {pendingApprovals.slice(0, 5).map((approval) => (
                    <button
                      key={approval.id}
                      onClick={() => setCurrentView('approvals')}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{approval.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {approval.requestedBy.name} · {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-normal border-dashed border-amber-200 text-amber-700 bg-amber-50/50">
                            {approval.requestType}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Needs approval</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {(!pendingApprovals || pendingApprovals.length === 0) && notifications.filter((n) => !n.read).length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No pending notifications</p>
                </div>
              )}
            </ScrollArea>
            {(pendingApprovals && pendingApprovals.length > 3) && (
              <div className="border-t px-4 py-2.5">
                <button
                  onClick={() => setCurrentView('approvals')}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View all {totalBadge} notifications →
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:ring-2 hover:ring-emerald-500/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <Avatar className="h-8 w-8 border-2 border-border">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[11px] font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{currentUser?.name ?? 'User'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email ?? 'user@agency.com'}</p>
                {currentUser?.role && (
                  <Badge variant="outline" className="mt-1 w-fit text-[10px] font-medium">
                    {currentUser.role}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentView('settings')}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}