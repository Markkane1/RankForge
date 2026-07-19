'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { ViewType } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useRealtimeEvents } from '@/lib/use-realtime-events';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ClientsView } from '@/components/clients/clients-view';
import { TasksView } from '@/components/tasks/tasks-view';
import { ApprovalsView } from '@/components/approvals/approvals-view';
import { BuildStatusView } from '@/components/build-status/build-status-view';
import { SettingsView } from '@/components/settings/settings-view';
import { CommandPalette } from '@/components/command-palette/command-palette';

const viewMap: ViewType[] = ['dashboard', 'clients', 'tasks', 'approvals', 'build-status', 'settings'];

function AppContent() {
  const { currentView, setCurrentView } = useAppStore();
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Enable real-time WebSocket events across all views
  useRealtimeEvents();

  useEffect(() => {
    const mainEl = document.querySelector('main');
    const handleScroll = () => {
      setShowBackToTop((mainEl?.scrollTop ?? 0) > 200);
    };
    mainEl?.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const viewComponent = useMemo(() => {
    const key = currentView;
    const component = (() => {
      switch (currentView) {
        case 'dashboard': return <DashboardView />;
        case 'clients': return <ClientsView />;
        case 'tasks': return <TasksView />;
        case 'approvals': return <ApprovalsView />;
        case 'build-status': return <BuildStatusView />;
        case 'settings': return <SettingsView />;
        default: return <DashboardView />;
      }
    })();
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="h-full"
      >
        {component}
      </motion.div>
    );
  }, [currentView]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // ⌘K / Ctrl+K command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Dispatch custom event for command palette
        window.dispatchEvent(new CustomEvent('open-command-palette'));
        return;
      }

      const keyIndex = parseInt(e.key, 10);
      if (keyIndex >= 1 && keyIndex <= 6) {
        setCurrentView(viewMap[keyIndex - 1]);
      }
    },
    [setCurrentView]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {viewComponent}
          </AnimatePresence>
        </main>
        <footer className="select-none relative mt-auto flex h-10 shrink-0 flex-col items-center justify-between border-t border-transparent px-4 text-xs text-muted-foreground/70 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:px-6">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span>© 2025 SEO Delivery Agent <span className="mx-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Built with ❤️</span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground/60">
              <kbd className="rounded border border-border/60 bg-muted/60 px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
              <span>Search</span>
            </span>
            <span className="whitespace-nowrap">v1.2.0</span>
          </div>
        </footer>
        {/* Back to top button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-20 right-6 z-30"
            >
              <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <CommandPalette />
      </div>
    </div>
  );
}

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}