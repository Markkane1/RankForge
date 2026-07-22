'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, getTaskDetail, updateTaskStatus, getClients, createTask, createSubtask, toggleSubtask, deleteSubtask, importTasksCsv, reorderSubtasks } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Search, ChevronDown, ChevronUp, MoreHorizontal, AlertCircle, Plus,
  Calendar, User, Tag, Clock, Loader2, Download, CheckSquare, X,
  Table as TableIcon, LayoutGrid, Eye, AlertTriangle, FileText, Pencil,
  Upload, FileUp, CheckCircle2, GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import type { TaskItem, ClientListItem, TaskStatus, TaskPriority } from '@/lib/types';
import { TaskKanbanView } from './task-kanban-view';
import { toast } from 'sonner';

// ─── Style Configs ───
const priorityConfig: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  HIGH: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  LOW: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
};

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  NOT_STARTED: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-400' },
  IN_PROGRESS: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', dot: 'bg-blue-500' },
  DONE: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', dot: 'bg-emerald-500' },
  FAILED: { color: 'text-red-700', bg: 'bg-red-100 border-red-200', dot: 'bg-red-500' },
  BLOCKED: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', dot: 'bg-amber-500' },
  PENDING_APPROVAL: { color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200', dot: 'bg-purple-500' },
  DEFERRED: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-400' },
};

const moduleColor: Record<string, string> = {
  M1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  M2: 'bg-blue-50 text-blue-700 border-blue-200',
  M3: 'bg-amber-50 text-amber-700 border-amber-200',
  M4: 'bg-violet-50 text-violet-700 border-violet-200',
  M5: 'bg-rose-50 text-rose-700 border-rose-200',
  M6: 'bg-slate-100 text-slate-700 border-slate-200',
  META: 'bg-stone-100 text-stone-700 border-stone-200',
  CORE: 'bg-gray-50 text-gray-700 border-gray-200',
};

const logLevelConfig: Record<string, { color: string; bg: string; icon: string }> = {
  INFO: { color: 'text-blue-700', bg: 'bg-blue-50', icon: 'ℹ' },
  WARN: { color: 'text-amber-700', bg: 'bg-amber-50', icon: '⚠' },
  ERROR: { color: 'text-red-700', bg: 'bg-red-50', icon: '✕' },
  DEBUG: { color: 'text-gray-500', bg: 'bg-gray-50', icon: '→' },
};

const approvalStatusConfig: Record<string, { color: string; bg: string }> = {
  PENDING: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  REJECTED: { color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-200' },
};

const ALL_STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'DONE', 'FAILED', 'BLOCKED', 'DEFERRED'];
const ALL_MODULES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'META', 'CORE'];
const ALL_PRIORITIES: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const taskFormSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  module: z.string().min(1, 'Module is required'),
  priority: z.string().min(1, 'Priority is required'),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function TasksView() {
  const queryClient = useQueryClient();
  const { expandedTaskId, setExpandedTaskId } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedTasks.map((t) => t.id));
    }
  };

  const batchMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await Promise.all(
        selectedIds.map((id) => updateTaskStatus(id, newStatus))
      );
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Updated ${selectedIds.length} tasks to ${newStatus.replace(/_/g, ' ')}`);
      setSelectedIds([]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: clients } = useQuery<ClientListItem[]>({
    queryKey: ['clients-all'],
    queryFn: () => getClients(),
  });

  const { data: tasks, isLoading, error } = useQuery<TaskItem[]>({
    queryKey: ['tasks', statusFilter, moduleFilter, priorityFilter, clientFilter, search],
    queryFn: () =>
      getTasks({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        clientId: clientFilter !== 'ALL' ? clientFilter : undefined,
        search: search || undefined,
      }),
  });

  const sortedTasks = [...(tasks ?? [])].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
  );

  const activeCount = sortedTasks.filter((t) => t.status !== 'DONE' && t.status !== 'DEFERRED').length;
  const doneCount = sortedTasks.filter((t) => t.status === 'DONE').length;
  const failedCount = sortedTasks.filter((t) => t.status === 'FAILED').length;

  return (
    <div className="flex h-full flex-col">
      {/* Filter Bar */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col gap-3 border-b border-border/40 p-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="shrink-0 h-9 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New Task</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Import CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
              onClick={() => window.open('/api/export/tasks', '_blank')}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Export CSV</span>
            </Button>
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/50">
              <button
                className={cn(
                  'flex h-9 items-center justify-center px-2.5 rounded-l-lg transition-colors',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                className={cn(
                  'flex h-9 items-center justify-center px-2.5 rounded-r-lg transition-colors',
                  viewMode === 'board'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setViewMode('board')}
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] border-0 bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-9 w-[120px] border-0 bg-muted/50">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modules</SelectItem>
                {ALL_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    <Badge variant="outline" className={cn('text-[11px] font-medium', moduleColor[m])}>
                      {m}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[130px] border-0 bg-muted/50">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                {ALL_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-[160px] border-0 bg-muted/50 hidden lg:flex">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Quick stats bar */}
        <div className="flex items-center gap-4 border-t border-border/40 px-6 py-2">
          <span className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{tasks?.length ?? 0}</span> tasks
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 -translate-y-[1.5px] mr-1" />
            <span className="font-medium text-blue-700">{activeCount} active</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 -translate-y-[1.5px] mr-1" />
            <span className="font-medium text-emerald-700">{doneCount} done</span>
          </span>
          <Button
            variant={statusFilter === 'FAILED' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-red-700 hover:text-red-800"
            onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED')}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed Tasks ({failedCount})
          </Button>
        </div>
      </div>

      {/* Content: Table or Kanban */}
      {viewMode === 'board' ? (
        <TaskKanbanView tasks={sortedTasks} isLoading={isLoading} error={error as Error | null} />
      ) : (
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-sm font-medium text-red-600">Failed to load tasks</p>
            <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
          </div>
        )}
        {!isLoading && (
          <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    className="h-4 w-4 accent-emerald-600"
                    checked={sortedTasks.length > 0 && selectedIds.length === sortedTasks.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-10" />
                <TableHead className="w-24 text-xs font-semibold text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Title</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground">Client</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground">Module</TableHead>
                <TableHead className="hidden lg:table-cell text-xs font-semibold text-muted-foreground">Priority</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="hidden lg:table-cell text-xs font-semibold text-muted-foreground">Assignee</TableHead>
                <TableHead className="hidden xl:table-cell text-xs font-semibold text-muted-foreground">Due</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">No tasks found</p>
                      <p className="text-xs text-muted-foreground/60">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {sortedTasks.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  rowIndex={idx}
                  isExpanded={expandedTaskId === task.id}
                  isSelected={selectedIds.includes(task.id)}
                  onToggleSelect={() => toggleSelect(task.id)}
                  onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                  onViewDetail={() => handleViewDetail(task)}
                />
              ))}
            </TableBody>
          </Table>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="sticky bottom-0 z-10 flex items-center justify-between rounded-t-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-white shadow-lg">
              <span className="text-sm font-medium">
                {selectedIds.length} task{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={batchMutation.isPending}
                      className="h-8 gap-1.5 bg-white/20 text-white border-white/30 hover:bg-white/30"
                    >
                      {batchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['IN_PROGRESS', 'DONE', 'BLOCKED', 'DEFERRED'] as const).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => batchMutation.mutate(s)}
                        disabled={batchMutation.isPending}
                      >
                        {s.replace(/_/g, ' ')}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={() => setSelectedIds([])}
                >
                  Deselect All
                </Button>
              </div>
            </motion.div>
          )}
          </>
        )}
      </div>
      )}
      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      {/* Create Task Dialog */}
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients} />
      {/* Import CSV Dialog */}
      <ImportTasksCsvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

// ─── TasksTableContent ───

function TasksTableContent({
  tasks,
  expandedTaskId,
  onToggle,
  onOpenCreate,
}: {
  tasks: TaskItem[];
  expandedTaskId: string | null;
  onToggle: (id: string) => void;
  onOpenCreate: () => void;
}) {
  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        key={`${tasks?.map(t => t.id).join(',')}`}
        className="contents"
      >
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isExpanded={expandedTaskId === task.id}
            onToggle={onToggle}
          />
        ))}
      </motion.div>
      {tasks?.length === 0 && <EmptyState />}
    </>
  );
}

// ─── Task Detail Subtasks ───

function TaskDetailSubtasks({ taskId, subtasks }: { taskId: string; subtasks?: import('@/lib/types').Subtask[] }) {
  const queryClient = useQueryClient();
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const completed = subtasks?.filter((s) => s.isCompleted).length ?? 0;
  const total = subtasks?.length ?? 0;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  const toggleMut = useMutation({
    mutationFn: (subtaskId: string) => toggleSubtask(taskId, subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (subtaskId: string) => deleteSubtask(taskId, subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMut = useMutation({
    mutationFn: (title: string) => createSubtask(taskId, title),
    onSuccess: () => {
      setNewTitle('');
      setShowInput(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMut = useMutation({
    mutationFn: (subtaskIds: string[]) => reorderSubtasks(taskId, subtaskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (dropIdx: number) => {
    if (dragIdx == null || dragIdx === dropIdx || !subtasks) { setDragIdx(null); setOverIdx(null); return; }
    const ids = subtasks.map((s) => s.id);
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(dropIdx, 0, moved);
    reorderMut.mutate(ids);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Subtasks ({completed}/{total})
        </h4>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-300', pct === 100 ? 'bg-emerald-500' : 'bg-emerald-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {subtasks && subtasks.length > 0 ? (
        <div className="space-y-0.5 mb-3">
          {subtasks.map((st, idx) => (
            <div
              key={st.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group/st flex items-center gap-2 text-sm rounded-md px-1 py-1 cursor-grab active:cursor-grabbing transition-colors',
                dragIdx === idx && 'opacity-50',
              )}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
              {overIdx === idx && dragIdx !== idx && (
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
              <Checkbox
                className="h-4 w-4 accent-emerald-600 shrink-0"
                checked={st.isCompleted}
                onCheckedChange={() => toggleMut.mutate(st.id)}
              />
              <span className={cn(
                'flex-1 min-w-0',
                st.isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'
              )}>
                {st.title}
              </span>
              <button
                className="opacity-0 group-hover/st:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-opacity"
                onClick={() => deleteMut.mutate(st.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">No subtasks yet.</p>
      )}
      {showInput ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) createMut.mutate(newTitle.trim());
          }}
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title..."
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!newTitle.trim() || createMut.isPending}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => { setShowInput(false); setNewTitle(''); }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <button
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add subtask
        </button>
      )}
    </div>
  );
}

// ─── Task Row ───

function TaskRow({
  task,
  rowIndex,
  isExpanded,
  isSelected,
  onToggleSelect,
  onToggle,
  onViewDetail,
}: {
  task: TaskItem;
  rowIndex: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  onViewDetail: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: detail, isLoading: detailLoading } = useQuery<TaskItem>({
    queryKey: ['task-detail', task.id],
    queryFn: () => getTaskDetail(task.id),
    enabled: isExpanded,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateTaskStatus(task.id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', task.id] });
      toast.success(`Task moved to ${newStatus.replace(/_/g, ' ')}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fullTask = detail ?? task;
  const pConf = priorityConfig[task.priority];
  const sConf = statusConfig[task.status];

  return (
    <>
      <TableRow
        className={cn(
          'group cursor-pointer transition-colors duration-150 border-l-2 border-l-transparent hover:border-l-emerald-400',
          isExpanded ? 'bg-muted/30' : rowIndex % 2 === 0 ? '' : 'bg-muted/10',
          'hover:bg-muted/40',
          isSelected && 'bg-emerald-50/50 dark:bg-emerald-950/20'
        )}
        onClick={onToggle}
      >
        <TableCell className="w-10 flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            className="h-4 w-4 accent-emerald-600"
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </TableCell>
        <TableCell className="w-10">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </motion.div>
        </TableCell>
        <TableCell>
          <code className="rounded bg-muted/70 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
            {task.taskId}
          </code>
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{task.title}</p>
            {task.description && (
              <p className="truncate text-xs text-muted-foreground max-w-[240px]">{task.description}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <span className="text-sm text-muted-foreground truncate max-w-[140px]">{task.client?.name ?? '—'}</span>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', moduleColor[task.module])}>
            {task.module}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium border-l-2', pConf?.bg, pConf?.color,
            task.priority === 'CRITICAL' ? 'border-l-red-500' :
            task.priority === 'HIGH' ? 'border-l-orange-500' :
            task.priority === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-emerald-500'
          )}>
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full -translate-y-[1.5px] mr-1',
              task.priority === 'CRITICAL' ? 'bg-red-500' :
              task.priority === 'HIGH' ? 'bg-orange-500' :
              task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
            )} />
            <span className="ml-0.5">{task.priority}</span>
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:opacity-80 cursor-pointer',
                  sConf?.bg, sConf?.color
                )}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    task.status === 'IN_PROGRESS' && 'animate-pulse',
                  )} style={{ backgroundColor: sConf?.dot }} />
                )}
                {task.status.replace(/_/g, ' ')}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {ALL_STATUSES.map((s) => {
                const sc = statusConfig[s];
                const isCurrent = s === task.status;
                return (
                  <DropdownMenuItem
                    key={s}
                    disabled={isCurrent || statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                    className="flex items-center gap-2.5 py-2"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sc?.dot }} />
                    <span className={cn('text-xs font-medium', isCurrent && 'opacity-50')}>
                      {s.replace(/_/g, ' ')}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {task.assignedTo?.name?.charAt(0) ?? '—'}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          {task.dueDate ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </TableCell>
        <TableCell className="w-10">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onToggle()}>
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={11} className="bg-muted/20 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-6 animate-slide-up-fade">
                  {detailLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Left: Info */}
                      <div className="space-y-4">
                        {/* Metadata grid */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Module</p>
                              <p className="text-sm font-medium mt-0.5">{fullTask.module}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</p>
                              <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium mt-0.5', pConf?.bg, pConf?.color)}>
                                <span className={cn('inline-block h-1.5 w-1.5 rounded-full -translate-y-[1.5px] mr-1',
                                  fullTask.priority === 'CRITICAL' ? 'bg-red-500' :
                                  fullTask.priority === 'HIGH' ? 'bg-orange-500' :
                                  fullTask.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                )} />
                                <span className="ml-0.5">{fullTask.priority}</span>
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                              <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium mt-0.5', sConf?.bg, sConf?.color)}>
                                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sConf?.dot }} />
                                {fullTask.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sprint</p>
                              <p className="text-sm font-medium mt-0.5">{fullTask.sprint ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assigned To</p>
                              <p className="text-sm font-medium mt-0.5">{fullTask.assignedTo?.name ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Requested By</p>
                              <p className="text-sm font-medium mt-0.5">{fullTask.requestedBy?.name ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Due Date</p>
                              <p className="text-sm font-medium mt-0.5">{fullTask.dueDate ? format(new Date(fullTask.dueDate), 'MMM d, yyyy') : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                              <p className="text-sm font-medium mt-0.5">{format(new Date(fullTask.createdAt), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        </div>
                        {fullTask.description && (
                          <div>
                            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                            <p className="text-sm leading-relaxed text-foreground">{fullTask.description}</p>
                          </div>
                        )}
                        {/* Subtasks */}
                        <TaskDetailSubtasks taskId={fullTask.id} subtasks={fullTask.subtasks} />
                        {fullTask.result && (
                          <div>
                            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Result</h4>
                            <pre className="max-h-32 overflow-auto rounded-lg bg-muted/80 border border-border/40 p-3 text-xs text-muted-foreground">
                              {typeof fullTask.result === 'string'
                                ? (() => { try { return JSON.stringify(JSON.parse(fullTask.result), null, 2); } catch { return fullTask.result; } })()
                                : JSON.stringify(fullTask.result, null, 2)}
                            </pre>
                          </div>
                        )}
                        {fullTask.errorMessage && (
                          <div>
                            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-600">Error</h4>
                            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              {fullTask.errorMessage}
                            </div>
                          </div>
                        )}
                        {/* Status change */}
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Change Status</h4>
                          <Select
                            value={fullTask.status}
                            onValueChange={(v) => statusMutation.mutate(v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Retry info */}
                        {fullTask.retryCount > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                            <span className="font-semibold text-amber-700">
                              Retry {fullTask.retryCount}/{fullTask.maxRetries}
                            </span>
                            {' — '}
                            <span className="text-amber-600">
                              {fullTask.retryCount >= fullTask.maxRetries
                                  ? 'Max retries reached — task is FAILED'
                                  : 'Retrying automatically...'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Task Logs */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Task Logs
                          {fullTask.logs && fullTask.logs.length > 0 && (
                            <span className="text-[11px] font-normal text-muted-foreground">
                              ({fullTask.logs.length} entries)
                            </span>
                          )}
                        </h4>
                        {fullTask.logs && fullTask.logs.length > 0 ? (
                          <div className="max-h-64 space-y-1.5 overflow-auto rounded-lg border border-border/60 p-3">
                            {fullTask.logs.map((log) => {
                              const lc = logLevelConfig[log.level] ?? logLevelConfig.INFO;
                              return (
                                <div key={log.id} className="flex items-start gap-2">
                                  <span
                                    className={cn(
                                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                                      lc.bg,
                                      lc.color,
                                    )}
                                  >
                                    {lc.icon}
                                  </span>
                                  <span className="flex-1 text-[13px] leading-snug">{log.message}</span>
                                  <span className="flex-shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                                    <Clock className="mr-1 inline h-3 w-3" />
                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="py-6 text-center text-sm text-muted-foreground">No logs yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Empty State ───

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={11} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <Search className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground/60">Try adjusting your filters</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Create Task Dialog ───

// ─── Task Detail Dialog ───
function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery<TaskItem>({
    queryKey: ['task-detail-dialog', task?.id],
    queryFn: () => getTaskDetail(task!.id),
    enabled: !!task && open,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail-dialog', task?.id] });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fullTask = detail ?? task;
  const sConf = fullTask ? statusConfig[fullTask.status] : null;
  const pConf = fullTask ? priorityConfig[fullTask.priority] : null;
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const logLevelDotColor: Record<string, string> = {
    INFO: 'bg-blue-500',
    WARN: 'bg-amber-500',
    ERROR: 'bg-red-500',
    DEBUG: 'bg-gray-400',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-lg" />
        {fullTask && !isLoading && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">{fullTask.title}</h2>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{fullTask.taskId}</span>
                    {sConf && (
                      <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', sConf.bg, sConf.color)}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full -translate-y-[1.5px] mr-1" style={{ backgroundColor: sConf.dot }} />
                        {fullTask.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Body */}
            <ScrollArea className="max-h-[70vh]">
              <div className="px-6 py-4 space-y-5">
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Client</p>
                    <p className="text-sm font-medium mt-0.5">{fullTask.client?.name ?? '—'}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Module</p>
                    <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium mt-0.5', moduleColor[fullTask.module])}>
                      {fullTask.module}
                    </Badge>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.09 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</p>
                    {pConf && (
                      <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium mt-0.5', pConf.bg, pConf.color)}>
                        <span className={cn('inline-block h-1.5 w-1.5 rounded-full -translate-y-[1.5px] mr-1',
                          fullTask.priority === 'CRITICAL' ? 'bg-red-500' :
                          fullTask.priority === 'HIGH' ? 'bg-orange-500' :
                          fullTask.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                        )} />
                        <span className="ml-0.5">{fullTask.priority}</span>
                      </Badge>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assignee</p>
                    <p className="text-sm font-medium mt-0.5">{fullTask.assignedTo?.name ?? '—'}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sprint</p>
                    <p className="text-sm font-medium mt-0.5">{fullTask.sprint ?? '—'}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Due Date</p>
                    <p className="text-sm font-medium mt-0.5">{fullTask.dueDate ? format(new Date(fullTask.dueDate), 'MMM d, yyyy') : '—'}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.21 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="text-sm font-medium mt-0.5">{formatDistanceToNow(new Date(fullTask.createdAt), { addSuffix: true })}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Updated</p>
                    <p className="text-sm font-medium mt-0.5">{formatDistanceToNow(new Date(fullTask.updatedAt), { addSuffix: true })}</p>
                  </motion.div>
                </div>

                {/* Description card */}
                {fullTask.description && (
                  <Card className="bg-muted/50 border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{fullTask.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Result card */}
                {fullTask.result && (
                  <Card className="border-l-[3px] border-l-emerald-500">
                    <CardContent className="p-4">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-2">Result</h4>
                      <pre className="max-h-32 overflow-auto rounded bg-muted/80 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        {typeof fullTask.result === 'string'
                          ? (() => { try { return JSON.stringify(JSON.parse(fullTask.result), null, 2); } catch { return fullTask.result; } })()
                          : JSON.stringify(fullTask.result, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Error card */}
                {fullTask.errorMessage && (
                  <Card className="border-l-[3px] border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-700 mb-1">Error</h4>
                          <p className="text-sm text-red-700">{fullTask.errorMessage}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Logs section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Logs
                      {fullTask.logs && fullTask.logs.length > 0 && (
                        <span className="text-[11px] font-normal text-muted-foreground ml-1">({fullTask.logs.length})</span>
                      )}
                    </h4>
                  </div>
                  {fullTask.logs && fullTask.logs.length > 0 ? (
                    <div className="max-h-48 space-y-1.5 overflow-auto rounded-lg border border-border/60 p-3">
                      {fullTask.logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2">
                          <span className={cn('mt-1 h-2 w-2 rounded-full shrink-0', logLevelDotColor[log.level] ?? 'bg-gray-400')} />
                          <span className="flex-1 text-[13px] leading-snug">{log.message}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">No logs recorded.</p>
                  )}
                </div>

                {/* Linked Approvals */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked Approvals</h4>
                  {fullTask.approvals && fullTask.approvals.length > 0 ? (
                    <div className="space-y-2">
                      {fullTask.approvals.map((approval) => {
                        const asc = approvalStatusConfig[approval.status] ?? approvalStatusConfig.PENDING;
                        return (
                          <div key={approval.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{approval.title}</p>
                              <p className="text-[11px] text-muted-foreground">{approval.requestType}</p>
                            </div>
                            <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ml-2', asc.bg, asc.color)}>
                              {approval.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">No linked approvals.</p>
                  )}
                </div>
              </div>
            </ScrollArea>

            <Separator />

            {/* Footer */}
            <div className="px-6 py-3 flex items-center justify-between">
              <DropdownMenu open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn('gap-1.5 text-xs', sConf?.bg, sConf?.color)}
                  >
                    {statusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                    Edit Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {ALL_STATUSES.map((s) => {
                    const sc = statusConfig[s];
                    const isCurrent = s === fullTask.status;
                    return (
                      <DropdownMenuItem
                        key={s}
                        disabled={isCurrent || statusMutation.isPending}
                        onClick={() => { statusMutation.mutate({ id: fullTask!.id, status: s }); setStatusDropdownOpen(false); }}
                        className="flex items-center gap-2.5 py-2"
                      >
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sc?.dot }} />
                        <span className={cn('text-xs font-medium', isCurrent && 'opacity-50')}>{s.replace(/_/g, ' ')}</span>
                        {isCurrent && <span className="ml-auto text-[10px] text-muted-foreground">current</span>}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
        {isLoading && (
          <div className="px-6 py-12">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full mt-4" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Task Dialog ───

function CreateTaskDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[] | undefined;
}) {
  const queryClient = useQueryClient();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      clientId: '',
      module: '',
      priority: 'MEDIUM',
      dueDate: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: TaskFormValues) =>
      createTask({
        title: data.title,
        description: data.description || undefined,
        clientId: data.clientId || undefined,
        module: data.module,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (values: TaskFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-lg" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
              <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Create Task
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new task to the task scheduler. Fill in the required fields below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Task Details Section */}
            <div className="relative">
              <span className="absolute -left-3 top-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Details</span>
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider">Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Optimize GBP description for SparkleClean..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wider">Client</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wider">Module *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALL_MODULES.map((m) => (
                          <SelectItem key={m} value={m}>
                            <Badge variant="outline" className={cn('text-[11px]', moduleColor[m] ?? 'bg-gray-50 text-gray-600')}>
                              {m}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wider">Priority *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALL_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wider">Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional task description..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import CSV Dialog (Tasks) ───
function ImportTasksCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const importMut = useMutation({
    mutationFn: (f: File) => importTasksCsv(f),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Imported ${data.imported} task${data.imported !== 1 ? 's' : ''}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleClose = (o: boolean) => {
    if (!o) { setFile(null); setResult(null); importMut.reset(); }
    onOpenChange(o);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) { setFile(f); } else { toast.error('Please drop a .csv file'); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-lg" />
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <Upload className="h-4 w-4 text-emerald-600" />
              </div>
              Import Tasks CSV
            </DialogTitle>
            <DialogDescription className="mt-1">Upload a CSV file to import tasks in bulk.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 pb-6 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">{result.imported} task{result.imported !== 1 ? 's' : ''} imported</span>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{result.errors.length} warning{result.errors.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {result.errors.map((err, i) => (<p key={i} className="text-xs text-amber-600 dark:text-amber-400">{err}</p>))}
                  </div>
                </div>
              )}
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleClose(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div
                className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer', dragOver ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border/60 hover:border-muted-foreground/30', file && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file'; input.accept = '.csv';
                  input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setFile(f); };
                  input.click();
                }}
              >
                {file ? (<><FileUp className="h-8 w-8 text-emerald-600" /><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p></>) : (<><Upload className="h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Drag & drop a CSV file here, or click to browse</p></>)}
              </div>
              <p className="text-xs text-muted-foreground">
                CSV columns: <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">title</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">client</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">module</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">priority</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">status</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">description</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">dueDate</code>
              </p>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={!file || importMut.isPending} onClick={() => file && importMut.mutate(file)}>
                {importMut.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>) : (<><Upload className="mr-2 h-4 w-4" />Upload & Import</>)}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
