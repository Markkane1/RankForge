'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTaskStatus, createSubtask, toggleSubtask, deleteSubtask, reorderSubtasks } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, X, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import type { TaskItem, TaskStatus } from '@/lib/types';
import { toast } from 'sonner';

// ─── Style Configs (same as tasks-view) ───
const priorityConfig: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  HIGH: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  LOW: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
};

const priorityDotColor: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-slate-400',
};

const moduleBorderColor: Record<string, string> = {
  M1: 'border-l-emerald-500',
  M2: 'border-l-blue-500',
  M3: 'border-l-amber-500',
  M4: 'border-l-violet-500',
  M5: 'border-l-rose-500',
  M6: 'border-l-slate-500',
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

const ALL_STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'DONE', 'FAILED', 'BLOCKED', 'DEFERRED'];

// ─── Kanban Column Config ───
interface KanbanColumn {
  key: TaskStatus;
  label: string;
  accent: string;
  headerBg: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { key: 'NOT_STARTED', label: 'Not Started', accent: 'bg-gray-400', headerBg: 'from-gray-50 to-white dark:from-gray-900/30 dark:to-card' },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-blue-500', headerBg: 'from-blue-50 to-white dark:from-blue-900/20 dark:to-card' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', accent: 'bg-purple-500', headerBg: 'from-purple-50 to-white dark:from-purple-900/20 dark:to-card' },
  { key: 'DONE', label: 'Done', accent: 'bg-emerald-500', headerBg: 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-card' },
];

// ─── Animation ───
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

// ─── Kanban Card ───
function KanbanCard({ task }: { task: TaskItem }) {
  const queryClient = useQueryClient();
  const [localStatus, setLocalStatus] = useState(task.status);
  const [isHovered, setIsHovered] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateTaskStatus(task.id, newStatus),
    onSuccess: (updated) => {
      setLocalStatus(updated.status);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Task moved to ${updated.status.replace(/_/g, ' ')}`);
    },
    onError: (err: Error) => {
      setLocalStatus(task.status);
      toast.error(err.message);
    },
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setLocalStatus(newStatus as TaskStatus);
    statusMutation.mutate(newStatus);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const pConf = priorityConfig[task.priority];
  const dotColor = priorityDotColor[task.priority];

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      layout
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group/card relative rounded-lg border border-border/60 bg-card p-3 transition-all duration-200 cursor-grab active:cursor-grabbing',
        'hover:-translate-y-1 hover:shadow-lg hover:border-border',
        isHovered && 'border-t-2 border-t-emerald-400',
        moduleBorderColor[task.module],
        isDragging && 'opacity-50',
      )}
    >
      {/* Priority indicator dot - top right */}
      <div className={cn('absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full', dotColor)} title={task.priority} />
      {/* Top row: module badge */}
      <div className="flex items-center mb-2">
        <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', moduleColor[task.module])}>
          {task.module}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-1 line-clamp-2">{task.title}</p>

      {/* Description (truncated) */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
      )}

      {/* Client name */}
      {task.client?.name && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {task.client.name}
        </p>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <SubtaskList taskId={task.id} subtasks={task.subtasks} />
      )}
      <KanbanAddSubtask taskId={task.id} />

      {/* Bottom row: due date */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      {/* Assignee avatar - bottom right overlapping */}
      {task.assignedTo && (
        <Avatar className="absolute -bottom-1.5 -right-1.5 h-5 w-5 border-2 border-card">
          <AvatarFallback className="text-[9px] font-semibold bg-muted">
            {task.assignedTo.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Status dropdown (appears on hover) */}
      <div className={cn(
        'mt-2 pt-2 border-t border-border/40 transition-opacity duration-150',
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <Select value={localStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-7 text-[11px] border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}

// ─── Subtask List (Kanban Card) ───
function SubtaskList({ taskId, subtasks }: { taskId: string; subtasks: TaskItem['subtasks'] }) {
  const queryClient = useQueryClient();
  const completed = subtasks?.filter((s) => s.isCompleted).length ?? 0;
  const total = subtasks?.length ?? 0;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

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

  const reorderMut = useMutation({
    mutationFn: (subtaskIds: string[]) => reorderSubtasks(taskId, subtaskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (dropIdx: number) => {
    if (dragIdx == null || dragIdx === dropIdx || !subtasks) { setDragIdx(null); setOverIdx(null); return; }
    const ids = subtasks.map((s) => s.id);
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(dropIdx, 0, moved);
    reorderMut.mutate(ids);
    setDragIdx(null); setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="mt-1.5 mb-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">
          Subtasks ({completed}/{total})
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-300', pct === 100 ? 'bg-emerald-500' : 'bg-emerald-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
        {subtasks?.map((st, idx) => (
          <div
            key={st.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group/st flex items-center gap-1 text-xs cursor-grab active:cursor-grabbing',
              dragIdx === idx && 'opacity-50',
            )}
          >
            <GripVertical className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
            {overIdx === idx && dragIdx !== idx && (
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
            <Checkbox
              className="h-3 w-3 accent-emerald-600 shrink-0"
              checked={st.isCompleted}
              onCheckedChange={() => toggleMut.mutate(st.id)}
            />
            <span className={cn(
              'flex-1 min-w-0 truncate',
              st.isCompleted ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'
            )}>
              {st.title}
            </span>
            <button
              className="opacity-0 group-hover/st:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-opacity shrink-0"
              onClick={() => deleteMut.mutate(st.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add Subtask (Kanban Card) ───
function KanbanAddSubtask({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');

  const createMut = useMutation({
    mutationFn: (title: string) => createSubtask(taskId, title),
    onSuccess: () => {
      setTitle('');
      setShow(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!show) {
    return (
      <button
        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-emerald-600 transition-colors"
        onClick={() => setShow(true)}
      >
        <Plus className="h-3 w-3" />
        Add subtask
      </button>
    );
  }

  return (
    <form
      className="mt-1 flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) createMut.mutate(title.trim());
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subtask title..."
        className="h-6 text-[11px] px-2"
        autoFocus
        onBlur={() => { if (!title.trim()) setShow(false); }}
      />
    </form>
  );
}

// ─── Empty Column State ───
function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border/60 rounded-lg animate-[fade-in_0.5s_ease-out]">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
        <span className="text-muted-foreground/40 text-lg">—</span>
      </div>
      <p className="text-xs text-muted-foreground">No tasks</p>
    </div>
  );
}

// ─── Kanban View Props ───
export interface KanbanViewProps {
  tasks: TaskItem[];
  isLoading: boolean;
  error: Error | null;
}

export function TaskKanbanView({ tasks, isLoading, error }: KanbanViewProps) {
  const queryClient = useQueryClient();
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Group tasks by kanban column status
  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const dropMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: string }) =>
      updateTaskStatus(taskId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      dropMutation.mutate({ taskId, newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6 overflow-x-auto">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.key} className="min-w-[280px] w-[280px] shrink-0 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 px-6 text-center">
        <p className="text-sm text-red-600">Failed to load tasks for kanban view.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-4 min-h-full">
        <AnimatePresence>
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = getColumnTasks(col.key);
            return (
              <div
                key={col.key}
                className="min-w-[280px] w-[280px] shrink-0 flex flex-col"
              >
                {/* Column Header */}
                <div className={cn(
                  'flex items-center justify-between rounded-t-lg border border-border/60 px-3 py-2.5 bg-gradient-to-r',
                  col.headerBg,
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', col.accent)} />
                    <span className="text-xs font-semibold">{col.label}</span>
                  </div>
                  <Badge variant="secondary" className={cn('text-[10px] font-semibold tabular-nums h-5 min-w-[24px] justify-center', columnTasks.length > 0 && 'animate-glow-pulse')}>
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Column Body (Drop Zone) */}
                <div
                  className={cn(
                    'flex-1 rounded-b-lg border border-t-0 border-border/60 bg-muted/20 p-2 space-y-2 transition-colors duration-200',
                    dragOverColumn === col.key && 'border-emerald-400 border-2 border-dashed bg-emerald-50/50 dark:bg-emerald-950/20 animate-breathe'
                  )}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {columnTasks.length === 0 ? (
                    <EmptyColumn />
                  ) : (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.05 } },
                      }}
                      initial="hidden"
                      animate="show"
                      className="space-y-2"
                    >
                      {columnTasks.map((task) => (
                        <KanbanCard key={task.id} task={task} />
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}