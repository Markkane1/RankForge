'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getApprovals, getBuildStatus, getLeads } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Users, ListTodo, CheckCircle2, TrendingUp, TrendingDown, Minus,
  ArrowUpRight, ArrowDownRight, ArrowRight,
  Plus, FileCheck, BarChart3, UserPlus, Eye, Clock, CalendarIcon,
  PieChart as PieChartIcon, Target, AreaChart as AreaChartIcon,
  Phone, Navigation, Globe, FileText, PhoneCall, Mail, MoreHorizontal,
  ChartBar,
} from 'lucide-react';
import { formatDistanceToNow, format, subDays, startOfMonth, startOfYear, endOfMonth, endOfYear } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  Area, AreaChart, CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { DashboardData, ApprovalRequest, BuildStatusData, LeadLogEntry } from '@/lib/types';
import type { DateRange } from 'react-day-picker';

const CLIENT_STATE_COLORS: Record<string, string> = {
  ONBOARDING: '#3b82f6',
  BUILD: '#f59e0b',
  GROWTH: '#10b981',
  AT_RISK: '#ef4444',
  PAUSED: '#8b5cf6',
};

const CLIENT_STATE_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  BUILD: 'Build',
  GROWTH: 'Growth',
  AT_RISK: 'At Risk',
  PAUSED: 'Paused',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  DONE: '#10b981',
  FAILED: '#ef4444',
  BLOCKED: '#f59e0b',
  PENDING_APPROVAL: '#8b5cf6',
  DEFERRED: '#6b7280',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
  PENDING_APPROVAL: 'Pending Approval',
  DEFERRED: 'Deferred',
};

const LEAD_SOURCE_COLORS: Record<string, string> = {
  GBP_CALL: '#10b981',
  GBP_DIRECTIONS: '#06b6d4',
  GBP_WEBSITE: '#3b82f6',
  FORM_SUBMISSION: '#8b5cf6',
  PHONE_CALL: '#f59e0b',
  WHATSAPP: '#22c55e',
  EMAIL: '#6366f1',
  ORGANIC_SEARCH: '#ec4899',
  REFERRAL: '#f97316',
  OTHER: '#94a3b8',
};

const LEAD_SOURCE_LABELS: Record<string, string> = {
  GBP_CALL: 'GBP Calls',
  GBP_DIRECTIONS: 'GBP Directions',
  GBP_WEBSITE: 'GBP Website',
  FORM_SUBMISSION: 'Form Submissions',
  PHONE_CALL: 'Phone Calls',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  ORGANIC_SEARCH: 'Organic Search',
  REFERRAL: 'Referrals',
  OTHER: 'Other',
};

const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const priorityColor: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

const statusColor: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  BLOCKED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DEFERRED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// Lead source config for dashboard widget
const LEAD_SOURCE_CONFIG: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
  GBP_CALL: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', icon: <Phone className="h-3.5 w-3.5" />, label: 'GBP Call' },
  GBP_DIRECTIONS: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-400', icon: <Navigation className="h-3.5 w-3.5" />, label: 'GBP Directions' },
  GBP_WEBSITE: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', icon: <Globe className="h-3.5 w-3.5" />, label: 'GBP Website' },
  FORM_SUBMISSION: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-400', icon: <FileText className="h-3.5 w-3.5" />, label: 'Form Submission' },
  PHONE_CALL: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', icon: <PhoneCall className="h-3.5 w-3.5" />, label: 'Phone Call' },
  EMAIL: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400', icon: <Mail className="h-3.5 w-3.5" />, label: 'Email' },
  REFERRAL: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', icon: <Users className="h-3.5 w-3.5" />, label: 'Referral' },
  OTHER: { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-700 dark:text-gray-400', icon: <MoreHorizontal className="h-3.5 w-3.5" />, label: 'Other' },
};

const LEAD_SOURCE_DEFAULT = LEAD_SOURCE_CONFIG.OTHER;

const quickActions = [
  {
    label: 'New Task',
    description: 'Create a task for a client',
    icon: Plus,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 group-hover:bg-emerald-100 dark:bg-emerald-900/20 dark:group-hover:bg-emerald-900/40',
    border: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    bottomBorder: 'border-b-2 border-b-transparent hover:border-b-emerald-500',
    ring: 'group-hover:shadow-emerald-500/10',
    action: 'tasks' as const,
  },
  {
    label: 'Create Approval',
    description: 'Submit a new approval request',
    icon: FileCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 group-hover:bg-violet-100 dark:bg-violet-900/20 dark:group-hover:bg-violet-900/40',
    border: 'hover:border-violet-200 dark:hover:border-violet-800',
    bottomBorder: 'border-b-2 border-b-transparent hover:border-b-violet-500',
    ring: 'group-hover:shadow-violet-500/10',
    action: 'approvals' as const,
  },
  {
    label: 'View Build Status',
    description: 'Check sprint progress',
    icon: BarChart3,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:group-hover:bg-amber-900/40',
    border: 'hover:border-amber-200 dark:hover:border-amber-800',
    bottomBorder: 'border-b-2 border-b-transparent hover:border-b-amber-500',
    ring: 'group-hover:shadow-amber-500/10',
    action: 'build-status' as const,
  },
  {
    label: 'Add Client',
    description: 'Onboard a new client',
    icon: UserPlus,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 group-hover:bg-sky-100 dark:bg-sky-900/20 dark:group-hover:bg-sky-900/40',
    border: 'hover:border-sky-200 dark:hover:border-sky-800',
    bottomBorder: 'border-b-2 border-b-transparent hover:border-b-sky-500',
    ring: 'group-hover:shadow-sky-500/10',
    action: 'clients' as const,
  },
];

const TASK_FILTERS = ['ALL', 'IN_PROGRESS', 'PENDING_APPROVAL', 'DONE'] as const;
const TASK_FILTER_LABELS: Record<string, string> = {
  ALL: 'All',
  IN_PROGRESS: 'In Progress',
  PENDING_APPROVAL: 'Pending Approval',
  DONE: 'Done',
};

type TaskFilter = (typeof TASK_FILTERS)[number];

// ─── Module avatar colors for activity feed ───
const MODULE_AVATAR_COLORS: Record<string, string> = {
  M1: 'bg-blue-500',
  M2: 'bg-emerald-500',
  M3: 'bg-amber-500',
  M4: 'bg-violet-500',
  M5: 'bg-rose-500',
  M6: 'bg-slate-500',
};

// ─── Module left-border colors for task cards ───
const MODULE_BORDER_COLORS: Record<string, string> = {
  M1: 'border-l-emerald-500',
  M2: 'border-l-blue-500',
  M3: 'border-l-amber-500',
  M4: 'border-l-violet-500',
  M5: 'border-l-rose-500',
  M6: 'border-l-slate-500',
};

// ─── Relative time helper ("just now" for < 1 min) ───
function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'just now';
  return formatDistanceToNow(d, { addSuffix: false });
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '12px',
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
};

// ─── Date range presets ───
type DatePreset = { label: string; from: Date; to: Date };

function useDatePresets(): DatePreset[] {
  const now = new Date();
  return useMemo(() => [
    { label: 'Last 7 days', from: subDays(now, 6), to: now },
    { label: 'Last 30 days', from: subDays(now, 29), to: now },
    { label: 'Last 90 days', from: subDays(now, 89), to: now },
    { label: 'This Month', from: startOfMonth(now), to: endOfMonth(now) },
    { label: 'This Year', from: startOfYear(now), to: endOfYear(now) },
  ], []);
}

// ─── Animated Counter Component ───
function AnimatedCounter({ target, isCurrency }: { target: number; isCurrency?: boolean }) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // First render: set immediately without triggering cascading render
      prevTarget.current = target;
      initialized.current = true;
      const rafId = requestAnimationFrame(() => setCount(target));
      return () => cancelAnimationFrame(rafId);
    }

    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) return;

    const startTime = performance.now();
    const duration = 800;
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target]);

  return (
    <span className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight">
      {isCurrency
        ? `$${count.toLocaleString()}`
        : count
      }
    </span>
  );
}

// ─── Trend Indicator Component ───
function TrendIndicator({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="flex items-center gap-1"
    >
      {value === null || value === undefined ? (
        <Minus className="h-3 w-3 text-muted-foreground" />
      ) : value === 0 ? (
        <Minus className="h-3 w-3 text-muted-foreground" />
      ) : value > 0 ? (
        <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-500 dark:text-red-400" />
      )}
      <span className={cn(
        'text-xs font-medium',
        value === null || value === undefined ? 'text-muted-foreground' :
        value === 0 ? 'text-muted-foreground' :
        value > 0 ? 'text-emerald-600 dark:text-emerald-400' :
        'text-red-600 dark:text-red-400'
      )}>
        {value !== null && value !== undefined && value !== 0 ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—'}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </motion.div>
  );
}

// ─── Sparkline SVG Component ───
function Sparkline({ data, color = '#10b981', width = 60, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;
  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </svg>
  );
}

// ─── "Last updated" timestamp helper ───
function LastUpdatedBadge() {
  const [text, setText] = useState('just now');
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - mountedAt.current) / 60000);
      setText(diff < 1 ? 'just now' : `${diff} min ago`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-[10px] text-muted-foreground/60">Updated {text}</span>;
}

type KpiCardData = {
  label: string;
  value: number;
  icon: JSX.Element;
  comparisonKey: 'leadsChange' | 'tasksCompletedChange' | 'clientsActiveChange' | 'leadValueChange';
  gradient: string;
  bgLight: string;
  textColor: string;
  sparkData: number[] | undefined;
  isCurrency?: boolean;
};

function KpiCard({ kpi, index, comparison }: { kpi: KpiCardData; index: number; comparison: number | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card className="overflow-hidden border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 kpi-gradient-border">
        <CardContent className="p-0">
          <div className={cn('h-1 w-full', kpi.gradient)} />
          <div className="p-4 md:p-5 relative">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/5 to-transparent dark:from-white/5 rounded-b-lg" />
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCounter target={kpi.value} isCurrency={kpi.isCurrency} />
                  {kpi.label === 'Total Leads' && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br p-2.5', kpi.bgLight)}>
                  <div className={cn(kpi.textColor)}>{kpi.icon}</div>
                </div>
                {kpi.sparkData && kpi.sparkData.length > 1 && (
                  <Sparkline data={kpi.sparkData.slice(-8)} color={kpi.gradient.includes('emerald') ? '#10b981' : '#8b5cf6'} />
                )}
              </div>
            </div>
            <div className="mt-2.5">
              <TrendIndicator value={comparison} label="vs prev period" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DashboardView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Last 30 days');
  const presets = useDatePresets();

  const queryParams = useMemo(() => {
    const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
    return { from, to };
  }, [dateRange]);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard', queryParams.from, queryParams.to],
    queryFn: () => getDashboard(queryParams),
  });

  const { data: pendingApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ['approvals', 'PENDING'],
    queryFn: () => getApprovals({ status: 'PENDING' }),
  });

  const { data: buildData } = useQuery<BuildStatusData>({
    queryKey: ['build-status-dashboard'],
    queryFn: getBuildStatus,
  });

  const { data: recentLeads } = useQuery<LeadLogEntry[]>({
    queryKey: ['leads-dashboard'],
    queryFn: () => getLeads({ limit: 8 }),
  });

  const handlePresetSelect = useCallback((preset: DatePreset) => {
    setDateRange({ from: preset.from, to: preset.to });
    setActivePreset(preset.label);
    setDatePickerOpen(false);
  }, []);

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setActivePreset('');
    }
  }, []);

  const handleQuickAction = (action: string) => {
    setCurrentView(action as 'tasks' | 'approvals' | 'build-status' | 'clients');
  };

  // First-load toast for pending approvals
  const approvalsNotified = useRef(false);
  useEffect(() => {
    if (pendingApprovals && pendingApprovals.length > 0 && !approvalsNotified.current) {
      approvalsNotified.current = true;
      toast.info(`You have ${pendingApprovals.length} pending approval${pendingApprovals.length !== 1 ? 's' : ''}`, {
        description: 'Open the Approvals view to review them.',
      });
    }
  }, [pendingApprovals]);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="p-6 text-red-500">Failed to load dashboard data.</p>;
  if (!data) return null;

  const clientPieData = Object.entries(data.clientsByState).map(([state, count]) => ({
    name: CLIENT_STATE_LABELS[state] ?? state,
    value: count,
    color: CLIENT_STATE_COLORS[state] ?? '#999',
  }));

  const taskBarData = Object.entries(data.tasksByStatus)
    .filter(([s]) => s !== 'PENDING_APPROVAL' && s !== 'DEFERRED')
    .map(([status, count]) => ({
      name: TASK_STATUS_LABELS[status] ?? status,
      count,
      fill: TASK_STATUS_COLORS[status] ?? '#999',
    }));

  const leadSourceData = Object.entries(data.leadsBySource ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({
      name: LEAD_SOURCE_LABELS[source] ?? source,
      value: count,
      color: LEAD_SOURCE_COLORS[source] ?? '#999',
    }));

  const completedTasks = data.tasksByStatus.DONE ?? 0;
  const activeClientsCount = Object.entries(data.clientsByState)
    .filter(([s]) => s === 'BUILD' || s === 'GROWTH')
    .reduce((sum, [, c]) => sum + c, 0);

  const kpiCards = [
    {
      label: 'Total Leads',
      value: data.leadsThisMonth,
      icon: <TrendingUp className="h-5 w-5" />,
      comparisonKey: 'leadsChange' as const,
      gradient: 'from-emerald-500 to-emerald-700',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      sparkData: data.leadsTrend?.map((d) => d.count) ?? [],
    },
    {
      label: 'Tasks Completed',
      value: completedTasks,
      icon: <CheckCircle2 className="h-5 w-5" />,
      comparisonKey: 'tasksCompletedChange' as const,
      gradient: 'from-blue-500 to-blue-700',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-400',
      sparkData: undefined,
    },
    {
      label: 'Active Clients',
      value: activeClientsCount,
      icon: <Users className="h-5 w-5" />,
      comparisonKey: 'clientsActiveChange' as const,
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-400',
      sparkData: undefined,
    },
    {
      label: 'Lead Value',
      value: data.leadValueThisMonth,
      icon: <Target className="h-5 w-5" />,
      comparisonKey: 'leadValueChange' as const,
      gradient: 'from-purple-500 to-purple-700',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-400',
      sparkData: data.leadsTrend?.map((d) => d.value) ?? [],
      isCurrency: true,
    },
    {
      label: 'Citation Consistency',
      value: data.citationMetrics?.averageScore ?? 0,
      icon: <ChartBar className="h-5 w-5" />,
      // No comparison trend for now
      gradient: 'from-pink-500 to-rose-700',
      bgLight: 'bg-pink-50 dark:bg-pink-900/20',
      textColor: 'text-pink-700 dark:text-pink-400',
      tooltip: `Total citations: ${data.citationMetrics?.totalCitations ?? 0}`,
    },
  ];

  const sortedTasks = [...data.recentTasks]
    .filter((t) => taskFilter === 'ALL' || t.status === taskFilter)
    .sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    );

  const recentPending = pendingApprovals?.slice(0, 3) ?? [];

  // Leads trend data for the area chart
  const leadsTrendChartData = (data.leadsTrend ?? []).map((d) => ({
    date: d.date.length > 5 ? format(new Date(d.date + 'T00:00:00'), 'MMM d') : d.date,
    count: d.count,
    value: d.value,
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-4 md:p-6">

      {/* ─── Date Range Picker ─── */}
      <motion.div variants={item} className="flex flex-wrap items-center gap-3">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-2 text-xs font-normal',
                !dateRange && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              defaultMonth={subDays(new Date(), 15)}
            />
            <div className="border-t px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Quick Select</p>
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <Button
                    key={p.label}
                    variant={activePreset === p.label ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => handlePresetSelect(p)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {dateRange?.from && (
          <span className="text-[11px] text-muted-foreground">
            {format(dateRange.from, 'MMM d')} – {format(dateRange.to ?? dateRange.from, 'MMM d, yyyy')}
          </span>
        )}
      </motion.div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <KpiCard key={kpi.label} kpi={kpi} index={index} comparison={data.comparison?.[kpi.comparisonKey] ?? null} />
        ))}
      </div>

      {/* ─── Quick Actions ─── */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAction(qa.action)}
              className={cn(
                'group flex items-center gap-3 md:gap-4 rounded-xl border border-border/60 bg-card p-3 md:p-4 text-left transition-all duration-200 shimmer-hover',
                'hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md',
                qa.border,
                qa.bottomBorder,
                qa.ring,
              )}
            >
              <div className={cn('flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg transition-colors', qa.bg)}>
                <qa.icon className={cn('h-4 w-4 md:h-5 md:w-5', qa.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-semibold">{qa.label}</p>
                <p className="hidden sm:block text-xs text-muted-foreground">{qa.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── Charts Row ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Analytics Overview</h2>
          <LastUpdatedBadge />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Client States Pie Chart */}
        <motion.div variants={item}>
          <Card className="shadow-sm rounded-xl border border-border/40 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-[fade-in_0.5s_ease-out]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold">Client States</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">{data.totalClients} clients</span>
              </div>
            </CardHeader>
            <CardContent>
              {clientPieData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No client data</p>
              ) : (
                <div className="dark:[&_*]:!text-white">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={clientPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={true}
                        animationBegin={200}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {clientPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Status Bar Chart */}
        <motion.div variants={item}>
          <Card className="shadow-sm rounded-xl border border-border/40 bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-[fade-in_0.6s_ease-out]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm font-semibold">Task Status</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">{Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0)} tasks</span>
              </div>
            </CardHeader>
            <CardContent>
              {taskBarData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No task data</p>
              ) : (
                <div className="dark:[&_*]:!text-white">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={taskBarData} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={95}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={true} animationBegin={300} animationDuration={800} animationEasing="ease-out">
                        {taskBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Lead Sources Pie Chart */}
        <motion.div variants={item}>
          <Card className="shadow-sm rounded-xl border border-border/40 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10 dark:to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-[fade-in_0.7s_ease-out]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">{data.leadsThisMonth} leads</span>
              </div>
            </CardHeader>
            <CardContent>
              {leadSourceData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No lead data</p>
              ) : (
                <div className="dark:[&_*]:!text-white">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={leadSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={true}
                        animationBegin={200}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {leadSourceData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>

      {/* ─── Leads Trend Area Chart ─── */}
      {leadsTrendChartData.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Leads Over Time</h2>
            <LastUpdatedBadge />
          </div>
          <Card className="shadow-sm rounded-xl border border-border/40 bg-gradient-to-br from-emerald-50/20 to-transparent dark:from-emerald-950/10 dark:to-transparent">
            <CardContent className="pt-5">
              <div className="dark:[&_*]:!text-white">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={leadsTrendChartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadsTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value, 'Leads']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#leadsTrendFill)"
                      dot={leadsTrendChartData.length <= 14 ? { fill: '#10b981', r: 3, strokeWidth: 2, stroke: 'var(--background)' } : false}
                      activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'var(--background)' }}
                      isAnimationActive={true}
                      animationBegin={400}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Sprint Velocity Chart ─── */}
      {buildData && buildData.sprints.length > 0 && (
        <motion.div variants={item}>
          <Card className="shadow-sm rounded-xl border border-border/40 bg-gradient-to-br from-violet-50/30 to-transparent dark:from-violet-950/10 dark:to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-[fade-in_0.8s_ease-out]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AreaChartIcon className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm font-semibold">Sprint Velocity</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Sprint Completion %</span>
                  <LastUpdatedBadge />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="dark:[&_*]:!text-white">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={buildData.sprints
                    .sort((a, b) => a.sprint - b.sprint)
                    .map((s) => ({
                      name: `Sprint ${s.sprint}`,
                      completion: s.counts.total > 0
                        ? Math.round((s.counts.done / s.counts.total) * 100)
                        : 0,
                    }))
                  } margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value}%`, 'Completion']}
                    />
                    <Area
                      type="monotone"
                      dataKey="completion"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#emeraldFill)"
                      dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
                      activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'var(--background)' }}
                      isAnimationActive={true}
                      animationBegin={400}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Top Clients Table ─── */}
      {data.topClients && data.topClients.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Top Clients</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
              onClick={() => setCurrentView('clients')}
            >
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Leads</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Value</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topClients.map((client, i) => (
                      <motion.tr
                        key={client.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                        onClick={() => setCurrentView('clients')}
                        className={cn(
                          'border-b border-border/30 last:border-0 cursor-pointer transition-colors hover:bg-muted/40',
                          i === 0 && 'bg-emerald-50/40 dark:bg-emerald-950/20',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0',
                              i === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                            )}>
                              {i + 1}
                            </span>
                            <span className={cn(
                              'font-medium text-sm truncate max-w-[180px]',
                              i === 0 && 'text-emerald-700 dark:text-emerald-400',
                            )}>
                              {client.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{client.leads}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">${client.value.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            {client.trend > 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                            ) : client.trend < 0 ? (
                              <TrendingDown className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className={cn(
                              'text-xs font-medium tabular-nums',
                              client.trend > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              client.trend < 0 ? 'text-red-600 dark:text-red-400' :
                              'text-muted-foreground',
                            )}>
                              {client.trend !== 0 ? `${client.trend > 0 ? '+' : ''}${client.trend.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Middle Row — Activity + Tasks ─── */}
      <div className="space-y-3">
        <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Activity & Tasks</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div variants={item}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2">
              <ScrollArea className="h-[340px] px-4">
                {data.recentChangeLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here as changes are made</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.recentChangeLog.map((entry, i) => {
                      const avatarLetter = (entry.client?.name?.[0] ?? entry.module?.[1] ?? '?').toUpperCase();
                      const avatarBg = MODULE_AVATAR_COLORS[entry.module] ?? 'bg-gray-400';
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            'group relative flex gap-3 py-2.5 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors border-l-2',
                            entry.module === 'M1' ? 'border-l-emerald-500' :
                            entry.module === 'M2' ? 'border-l-blue-500' :
                            entry.module === 'M3' ? 'border-l-amber-500' :
                            entry.module === 'M4' ? 'border-l-violet-500' :
                            entry.module === 'M5' ? 'border-l-rose-500' :
                            'border-l-slate-500'
                          )}
                        >
                          {/* Avatar + Timeline */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                                avatarBg,
                              )}
                            >
                              {avatarLetter}
                            </div>
                            {i < data.recentChangeLog.length - 1 && (
                              <div className="w-px flex-1 bg-border/60 mt-1" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-medium h-5">
                                {entry.module}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {relativeTime(entry.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground/80">{entry.client?.name ?? ''}</span>
                              {entry.field
                                ? (
                                  <span>
                                    {' — '}
                                    <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">{entry.field}</code>
                                    {' changed '}
                                  </span>
                                )
                                : ' — '}
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium cursor-default">{entry.entityType}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div variants={item}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TASK_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                      taskFilter === f
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {TASK_FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
              {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ListTodo className="h-10 w-10 text-muted-foreground/20" />
                    <p className="mt-2 text-sm font-medium text-foreground/70">No matching tasks</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try a different filter</p>
                  </div>
              ) : (
                <ScrollArea className="h-[304px]">
                  <div className="space-y-2 pr-4">
                    {sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setCurrentView('tasks')}
                        className={cn(
                          'group flex items-center justify-between rounded-xl border border-border/60 p-3 transition-all hover:border-border hover:shadow-sm cursor-pointer border-l-2',
                          MODULE_BORDER_COLORS[task.module] ?? 'border-l-gray-400',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-medium">{task.title}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{task.client?.name}</span>
                            <span className="text-[11px] text-muted-foreground/40">•</span>
                            <span className="text-[11px] font-mono text-muted-foreground/60">{task.taskId}</span>
                            {task.assignedTo?.name && (
                              <>
                                <span className="text-[11px] text-muted-foreground">→ {task.assignedTo.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', priorityColor[task.priority])}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', statusColor[task.status])}
                          >
                            {task.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </div>

      {/* ─── Leads Pipeline Widget ─── */}
      <div className="space-y-3">
        <h2 className="section-header text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Leads Pipeline</h2>
        <motion.div variants={item}>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              {recentLeads && recentLeads.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {recentLeads.map((lead) => {
                      const src = LEAD_SOURCE_CONFIG[lead.source] ?? LEAD_SOURCE_DEFAULT;
                      return (
                        <motion.div
                          key={lead.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border border-border/50 rounded-lg p-3 hover:shadow-sm hover:border-border transition-all hover:bg-gradient-to-br hover:from-emerald-50/30 hover:to-transparent dark:hover:from-emerald-950/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium', src.bg, src.text)}>
                              {src.icon}
                              {src.label}
                            </span>
                            {lead.value != null && lead.value > 0 && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)] rounded px-1.5 py-0.5">
                                ${lead.value.toLocaleString('en-US')}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-semibold truncate">{lead.client?.name ?? 'Unknown'}</p>
                          {lead.contactInfo && (
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">{lead.contactInfo}</p>
                          )}
                          <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
                      onClick={() => setCurrentView('clients')}
                    >
                      View All
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <UserPlus className="h-10 w-10 text-muted-foreground/20" />
                  <p className="mt-2 text-sm font-medium text-foreground/70">No leads tracked yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Lead data will appear as conversions are logged</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Pending Approvals Widget ─── */}
      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pending Approvals</CardTitle>
              {data.pendingApprovals > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-900/30"
                  onClick={() => setCurrentView('approvals')}
                >
                  View All
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/30" />
                  <p className="mt-2 text-sm font-medium text-foreground/70">All caught up!</p>
                  <p className="mt-1 text-xs text-muted-foreground">No pending approvals</p>
                </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentPending.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{approval.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{approval.requestedBy.name}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-900/30 dark:hover:text-violet-300 animate-breathe"
                      onClick={() => setCurrentView('approvals')}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Date range picker skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-52 bg-muted" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-4 md:p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 bg-muted" />
              <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
            </div>
            <Skeleton className="h-8 w-16 bg-muted" />
            <Skeleton className="h-4 w-24 bg-muted" />
          </div>
        ))}
      </div>
      {/* Section header */}
      <Skeleton className="h-4 w-28 bg-muted animate-pulse" />
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      {/* Charts section header */}
      <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
      {/* Charts: 3 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border/40 p-5 space-y-4 animate-pulse">
          <Skeleton className="h-5 w-40 bg-muted" />
          <Skeleton className="h-[240px] w-full rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border border-border/40 p-5 space-y-4 animate-pulse">
          <Skeleton className="h-5 w-40 bg-muted" />
          <Skeleton className="h-[240px] w-full rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border border-border/40 p-5 space-y-4 animate-pulse">
          <Skeleton className="h-5 w-40 bg-muted" />
          <Skeleton className="h-[240px] w-full rounded-lg bg-muted" />
        </div>
      </div>
      {/* Leads trend skeleton */}
      <div className="rounded-xl border border-border/40 p-5 space-y-4 animate-pulse">
        <Skeleton className="h-5 w-32 bg-muted" />
        <Skeleton className="h-[200px] w-full rounded-lg bg-muted" />
      </div>
      {/* Top clients skeleton */}
      <div className="rounded-xl border border-border/40 p-5 space-y-3 animate-pulse">
        <Skeleton className="h-5 w-28 bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-32 bg-muted" />
            <Skeleton className="h-4 w-16 bg-muted" />
          </div>
        ))}
      </div>
      {/* Activity feed header */}
      <Skeleton className="h-4 w-36 bg-muted animate-pulse" />
      {/* Activity feed rows */}
      <div className="rounded-xl border border-border/40 p-5 space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 bg-muted" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
            </div>
            <Skeleton className="h-3 w-16 bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}