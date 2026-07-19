'use client';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { ViewType } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  CheckCircle2,
  Hammer,
  Settings,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/lib/api';

const navItems: { view: ViewType; label: string; tooltip: string; icon: React.ReactNode; showBadge?: boolean }[] = [
  { view: 'dashboard', label: 'Dashboard', tooltip: 'Overview & KPIs', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { view: 'clients', label: 'Clients', tooltip: 'Client portfolio management', icon: <Users className="h-[18px] w-[18px]" /> },
  { view: 'tasks', label: 'Tasks', tooltip: 'Task tracking & kanban', icon: <ListTodo className="h-[18px] w-[18px]" /> },
  { view: 'approvals', label: 'Approvals', tooltip: 'Review & approve requests', icon: <CheckCircle2 className="h-[18px] w-[18px]" />, showBadge: true },
  { view: 'build-status', label: 'Build Status', tooltip: 'Sprint progress tracking', icon: <Hammer className="h-[18px] w-[18px]" /> },
  { view: 'settings', label: 'Settings', tooltip: 'Organization & team config', icon: <Settings className="h-[18px] w-[18px]" /> },
];

export function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-badge'],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  const pendingApprovals = dashboard?.pendingApprovals ?? 0;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-gradient-to-b from-card via-card to-card/95 transition-transform duration-300 ease-out lg:static lg:translate-x-0 shadow-xl shadow-black/10',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          !sidebarOpen && 'pointer-events-none'
        )}
        style={{ transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Emerald gradient top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
        {/* Subtle radial background overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.06),transparent_70%)]" />
        {/* Animated gradient right border */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-border to-transparent" />
        {/* Branding */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 animate-[shimmer-bg_3s_ease-in-out_infinite] bg-[length:200%_100%] [background-image:linear-gradient(110deg,from-emerald-500,from-emerald-300,from-emerald-500,to-emerald-700)]">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">SEO Delivery</span>
            <span className="text-[10px] text-muted-foreground">Agency Platform</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mx-3 h-px bg-border/60" />

        {/* Navigation label */}
        <div className="relative px-5 pt-5 pb-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">Navigation</p>
        </div>

        {/* Nav items */}
        <nav className="relative flex-1 space-y-1 px-3">
          {navItems.map((navItem) => {
            const isActive = currentView === navItem.view;
            return (
              <Tooltip key={navItem.view}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setCurrentView(navItem.view);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-lg pl-3.5 pr-3 py-2.5 text-[13px] font-medium transition-all duration-200 group-hover:translate-x-0.5',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-[0_0_8px_rgba(16,185,129,0.3)] dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                {/* Active left indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <span className={cn(
                  'transition-colors duration-200',
                  isActive ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {navItem.icon}
                </span>
                <span className="flex-1 text-left">{navItem.label}</span>

                {/* Pending approvals badge */}
                {navItem.showBadge && pendingApprovals > 0 && (
                  <Badge className="h-5 min-w-[20px] justify-center bg-amber-500 px-1.5 text-[11px] font-bold text-white hover:bg-amber-600 border-0">
                    {pendingApprovals}
                  </Badge>
                )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="text-xs">
                  {navItem.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Bottom section */}
        <div className="p-4 space-y-3">
          {/* Quick stats */}
          <div className="rounded-lg border-l-[3px] border-l-emerald-500 bg-muted/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Platform Health</span>
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-emerald-600">Operational</span>
              </div>
            </div>
          </div>

          {/* Org name */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold ring-2 ring-emerald-200 dark:ring-emerald-800">
              S
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-semibold truncate">SEO Delivery Agency</p>
              <p className="text-[10px] text-muted-foreground">Organization</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}