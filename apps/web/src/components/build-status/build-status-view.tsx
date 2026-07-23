'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBuildStatus, updateBuildReq } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CircleDot,
  Minus,
  Inbox,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import type { BuildStatusData, ReqStatus, BuildRequirement } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

// ─── Sprint names ───

const SPRINT_NAMES: Record<number, string> = {
  0: 'Sprint 0 — Foundations',
  1: 'Sprint 1 — Module 6 Orchestration Core',
  2: 'Sprint 2 — GBP Foundation',
  3: 'Sprint 3 — GBP Research + Core Optimization',
  4: 'Sprint 4 — GBP Engagement Layer',
  5: 'Sprint 5 — GBP Advanced Boosting',
  6: 'Sprint 6 — Module 5 Analytics',
  7: 'Sprint 7 — Module 3 Citations',
  9: 'Sprint 9 — Module 4 Content',
};

// ─── Sprint accent colors (cycling) ───

const sprintAccents = [
  'from-emerald-500 to-emerald-400',
  'from-blue-500 to-blue-400',
  'from-purple-500 to-purple-400',
  'from-amber-500 to-amber-400',
  'from-rose-500 to-rose-400',
  'from-cyan-500 to-cyan-400',
  'from-indigo-500 to-indigo-400',
  'from-pink-500 to-pink-400',
  'from-teal-500 to-teal-400',
  'from-orange-500 to-orange-400',
];

const sprintBorderColors = [
  'border-emerald-500',
  'border-blue-500',
  'border-purple-500',
  'border-amber-500',
  'border-rose-500',
  'border-cyan-500',
  'border-indigo-500',
  'border-pink-500',
  'border-teal-500',
  'border-orange-500',
];

// ─── Module color mapping ───

const moduleColorMap: Record<string, { bg: string; text: string; border: string }> = {
  M1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  M2: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  M3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  M4: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  M5: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  M6: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  META: { bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200' },
  CORE: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  AUTH: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  SEC: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  NFR: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

const getModuleColor = (mod: string) =>
  moduleColorMap[mod] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

// ─── Status badge styling ───

const reqStatusConfig: Record<string, { bg: string; text: string; border: string; icon?: React.ReactNode }> = {
  DONE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NOT_STARTED: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  BLOCKED: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <AlertTriangle className="mr-1 h-3 w-3" />,
  },
  DEFERRED: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: <Clock className="mr-1 h-3 w-3" />,
  },
};

const getStatusLabel = (s: string) => s.replace(/_/g, ' ');

const ALL_REQ_STATUSES: ReqStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'DEFERRED'];

const tooltipStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '12px',
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
};

// ─── Animation ───

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ─── Count badge component ───

function CountBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background px-3 py-2">
      <div className={cn('h-2.5 w-2.5 rounded-full', color)} />
      <div>
        <p className="text-xs font-semibold text-foreground">{count}</p>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
      </div>
    </div>
  );
}

export function BuildStatusView() {
  const [openSprints, setOpenSprints] = useState<Set<number>>(new Set([0, 1]));
  const [editDialog, setEditDialog] = useState<{
    reqId: string;
    title: string;
    currentStatus: ReqStatus;
    note?: string;
  } | null>(null);
  const [detailReq, setDetailReq] = useState<BuildRequirement | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newNote, setNewNote] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<BuildStatusData>({
    queryKey: ['build-status'],
    queryFn: getBuildStatus,
  });

  const updateMutation = useMutation({
    mutationFn: ({ reqId, status, note }: { reqId: string; status: string; note?: string }) =>
      updateBuildReq(reqId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-status'] });
      toast.success('Requirement updated');
      setEditDialog(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSprint = (sprint: number) => {
    setOpenSprints((prev) => {
      const next = new Set(prev);
      if (next.has(sprint)) next.delete(sprint);
      else next.add(sprint);
      return next;
    });
  };

  const openDetailReq = (req: BuildRequirement) => {
    setDetailReq(req);
  };

  const openEditReq = (req: { reqId: string; title: string; status: ReqStatus; note?: string }) => {
    setEditDialog({
      reqId: req.reqId,
      title: req.title,
      currentStatus: req.status,
      note: req.note,
    });
    setNewStatus(req.status);
    setNewNote(req.note ?? '');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-24 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <p className="p-6 text-red-500">Failed to load build status.</p>;
  if (!data) return null;

  const overallPct = data.counts.total > 0
    ? Math.round((data.counts.done / data.counts.total) * 100)
    : 0;

  return (
    <>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6 p-6"
        >
          {/* Overall Progress */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight">Overall Build Progress</h2>
                    <p className="text-sm text-muted-foreground">
                      {data.counts.done} of {data.counts.total} requirements completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold tracking-tight text-emerald-600">{overallPct}%</p>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 relative overflow-hidden"
                    style={{ width: `${overallPct}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <CountBadge color="bg-emerald-500" label="Done" count={data.counts.done} />
                  <CountBadge color="bg-blue-500" label="In Progress" count={data.counts.in_progress} />
                  <CountBadge color="bg-amber-500" label="Blocked" count={data.counts.blocked} />
                  <CountBadge color="bg-purple-500" label="Deferred" count={data.counts.deferred} />
                  <CountBadge color="bg-gray-400" label="Not Started" count={data.counts.not_started} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sprint Completion Overview Chart */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Sprint Completion Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="dark:[&_*]:!text-white">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data.sprints
                        .sort((a, b) => a.sprint - b.sprint)
                        .map((s) => ({
                          name: `Sprint ${s.sprint}`,
                          done: s.counts.done,
                          remaining: s.counts.total - s.counts.done,
                        }))
                      }
                      margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{
                            value === 'done' ? 'Done' : 'Remaining'
                          }</span>
                        )}
                      />
                      <Bar dataKey="remaining" stackId="sprint" fill="var(--muted)" radius={[0, 0, 0, 0]} barSize={32} />
                      <Bar dataKey="done" stackId="sprint" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sprint Sections */}
          {data.sprints.map((sprint) => {
            const sprintPct = sprint.counts.total > 0
              ? Math.round((sprint.counts.done / sprint.counts.total) * 100)
              : 0;
            const isOpen = openSprints.has(sprint.sprint);
            const accentClass = sprintAccents[sprint.sprint % sprintAccents.length];
            const borderColor = sprintBorderColors[sprint.sprint % sprintBorderColors.length];

            return (
              <motion.div key={sprint.sprint} variants={item}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleSprint(sprint.sprint)}
                >
                  <Card className={cn('border-border/60 shadow-sm overflow-hidden border-l-2', borderColor)}>
                    <CollapsibleTrigger className="w-full text-left">
                      <div className="flex hover:bg-muted/20 transition-colors rounded-t-lg">
                        <div className={cn('w-[3px] shrink-0 bg-gradient-to-b', accentClass)} />
                        <div className="flex-1 px-5 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                                  !isOpen && '-rotate-90'
                                )}
                              />
                              <div className={cn(
                                'shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-white text-[11px] font-bold tabular-nums',
                                accentClass
                              )}>
                                {sprint.sprint}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold truncate">
                                  {SPRINT_NAMES[sprint.sprint] ?? `Sprint ${sprint.sprint}`}
                                </h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 ml-4">
                              {/* Mini progress bar */}
                              <div className="hidden sm:flex items-center gap-3">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${sprintPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">
                                  {sprint.counts.done}/{sprint.counts.total}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs font-bold tabular-nums',
                                  sprintPct === 100
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : sprintPct > 0
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-gray-50 text-gray-600'
                                )}
                              >
                                {sprintPct}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-5 px-5">
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                        <div className="border-t border-border/40 pt-4">
                          {sprint.requirements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">No requirements in this sprint</p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-border/40 hover:bg-transparent">
                                  <TableHead className="text-xs font-medium text-muted-foreground w-28">REQ ID</TableHead>
                                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                                  <TableHead className="text-xs font-medium text-muted-foreground w-24">Module</TableHead>
                                  <TableHead className="text-xs font-medium text-muted-foreground w-32">Status</TableHead>
                                  <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Blocked By</TableHead>
                                  <TableHead className="w-16" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sprint.requirements.map((req) => (
                                  <RequirementRow
                                    key={req.id}
                                    req={req}
                                    onEdit={openEditReq}
                                    onView={openDetailReq}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                        </motion.div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            );
          })}
        </motion.div>
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={!!detailReq} onOpenChange={(open) => !open && setDetailReq(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-tight">{detailReq?.title}</DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">{detailReq?.reqId}</DialogDescription>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] font-semibold border', getModuleColor(detailReq.module).bg, getModuleColor(detailReq.module).text, getModuleColor(detailReq.module).border)}>
                  {detailReq.module}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {SPRINT_NAMES[detailReq.sprint] ?? `Sprint ${detailReq.sprint}`}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px] font-medium border gap-0.5', (reqStatusConfig[detailReq.status] ?? reqStatusConfig.NOT_STARTED).bg, (reqStatusConfig[detailReq.status] ?? reqStatusConfig.NOT_STARTED).text, (reqStatusConfig[detailReq.status] ?? reqStatusConfig.NOT_STARTED).border)}>
                  {(reqStatusConfig[detailReq.status] ?? reqStatusConfig.NOT_STARTED).icon}
                  {getStatusLabel(detailReq.status)}
                </Badge>
              </div>
              {detailReq.description && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{detailReq.description}</p>
                  </CardContent>
                </Card>
              )}
              {detailReq.blockedBy && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Blocked By</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">{detailReq.blockedBy}</p>
                  </div>
                </div>
              )}
              {detailReq.note && (
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Note</p>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{renderLinkedNote(detailReq.note)}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Created {formatDistanceToNow(new Date(detailReq.createdAt), { addSuffix: true })}</span>
                <span>Updated {formatDistanceToNow(new Date(detailReq.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailReq(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              onClick={() => {
                if (detailReq) {
                  setDetailReq(null);
                  openEditReq({
                    reqId: detailReq.reqId,
                    title: detailReq.title,
                    status: detailReq.status,
                    note: detailReq.note,
                  });
                }
              }}
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-muted-foreground" />
              Update Requirement
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground">{editDialog?.reqId}</p>
              <p className="text-sm">{editDialog?.title}</p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_REQ_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this change..."
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              onClick={() => {
                if (editDialog) {
                  updateMutation.mutate({
                    reqId: editDialog.reqId,
                    status: newStatus,
                    note: newNote || undefined,
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Requirement Row ───

function renderLinkedNote(note: string) {
  const parts: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
  let last = 0;

  for (const match of note.matchAll(linkRe)) {
    if (match.index > last) parts.push(note.slice(last, match.index));
    parts.push(
      <a
        key={`${match.index}-${match[2]}`}
        href={match[2]}
        target={match[2].startsWith('http') ? '_blank' : undefined}
        rel={match[2].startsWith('http') ? 'noreferrer' : undefined}
        className="font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
      >
        {match[1]}
      </a>,
    );
    last = match.index + match[0].length;
  }

  if (last < note.length) parts.push(note.slice(last));
  return parts.length ? parts : note;
}

function RequirementRow({ req, onEdit, onView }: { req: BuildRequirement; onEdit: (req: BuildRequirement) => void; onView: (req: BuildRequirement) => void }) {
  const modColor = getModuleColor(req.module);
  const statusConf = reqStatusConfig[req.status] ?? reqStatusConfig.NOT_STARTED;

  return (
    <TableRow className={cn('border-border/30 group transition-colors hover:bg-muted/30', req.module === 'M1' && 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10', req.module === 'M2' && 'hover:bg-blue-50/30 dark:hover:bg-blue-950/10', req.module === 'M3' && 'hover:bg-amber-50/30 dark:hover:bg-amber-950/10')}>
      <TableCell className="font-mono text-[11px] text-muted-foreground">{req.reqId}</TableCell>
      <TableCell>
        <button
          onClick={() => onView(req)}
          className="text-sm text-foreground/90 hover:text-foreground text-left cursor-pointer"
        >
          {req.title}
        </button>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-semibold border', modColor.bg, modColor.text, modColor.border)}>
          {req.module}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-medium border gap-0.5', statusConf.bg, statusConf.text, statusConf.border, req.status === 'IN_PROGRESS' && 'animate-glow-pulse')}>
          {statusConf.icon}
          {getStatusLabel(req.status)}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {req.blockedBy ? (
          <span className="text-[11px] italic text-amber-600">blocked by {req.blockedBy}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onView(req)}
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(req)}
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
