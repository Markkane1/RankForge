'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getApprovals, approveRequest, rejectRequest, createApproval, getClients } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Loader2,
  ChevronDown,
  FileText,
  RefreshCw,
  MapPin,
  DollarSign,
  Info,
  Search,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { ApprovalRequest, ApprovalStatus, ClientListItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/hooks';

// ─── Request type styling ───

const requestTypeConfig: Record<string, { accent: string; accentBorder: string; badge: string; label: string; icon: React.ReactNode }> = {
  STATE_CHANGE: { accent: 'bg-blue-500', accentBorder: 'border-l-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800', label: 'State Change', icon: <RefreshCw className="h-3 w-3" /> },
  GBP_UPDATE: { accent: 'bg-teal-500', accentBorder: 'border-l-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800', label: 'GBP Update', icon: <MapPin className="h-3 w-3" /> },
  BUDGET: { accent: 'bg-rose-500', accentBorder: 'border-l-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800', label: 'Budget', icon: <DollarSign className="h-3 w-3" /> },
  CONTENT_PUBLISH: { accent: 'bg-amber-500', accentBorder: 'border-l-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800', label: 'Content Publish', icon: <FileText className="h-3 w-3" /> },
  CATEGORY_CHANGE: { accent: 'bg-blue-500', accentBorder: 'border-l-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800', label: 'Category Change', icon: <RefreshCw className="h-3 w-3" /> },
  POST_PUBLISH: { accent: 'bg-purple-500', accentBorder: 'border-l-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800', label: 'Post Publish', icon: <FileText className="h-3 w-3" /> },
  SUSPENSION_RESPONSE: { accent: 'bg-red-500', accentBorder: 'border-l-red-500', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800', label: 'Suspension Response', icon: <AlertTriangle className="h-3 w-3" /> },
  KEYWORD_RESEARCH: { accent: 'bg-emerald-500', accentBorder: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800', label: 'Keyword Research', icon: <Search className="h-3 w-3" /> },
  DESCRIPTION_UPDATE: { accent: 'bg-sky-500', accentBorder: 'border-l-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800', label: 'Description Update', icon: <FileText className="h-3 w-3" /> },
  OTHER: { accent: 'bg-gray-400', accentBorder: 'border-l-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: 'Other', icon: <Info className="h-3 w-3" /> },
};

const getRequestTypeConfig = (type: string) =>
  requestTypeConfig[type] ?? { accent: 'bg-gray-400', accentBorder: 'border-l-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200', label: type.replace(/_/g, ' '), icon: <Info className="h-3 w-3" /> };

const ALL_REQUEST_TYPES = [
  'DESCRIPTION_UPDATE',
  'POST_PUBLISH',
  'CONTENT_PUBLISH',
  'CATEGORY_CHANGE',
  'SUSPENSION_RESPONSE',
  'KEYWORD_RESEARCH',
  'OTHER',
];

// ─── Tab config ───

type TabKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const tabConfig: { key: TabKey; label: string; activeBg: string; activeText: string; countColor: string }[] = [
  { key: 'PENDING', label: 'Pending', activeBg: 'bg-amber-500', activeText: 'text-white', countColor: 'bg-amber-100 text-amber-700' },
  { key: 'APPROVED', label: 'Approved', activeBg: 'bg-emerald-500', activeText: 'text-white', countColor: 'bg-emerald-100 text-emerald-700' },
  { key: 'REJECTED', label: 'Rejected', activeBg: 'bg-red-500', activeText: 'text-white', countColor: 'bg-red-100 text-red-700' },
  { key: 'ALL', label: 'All', activeBg: 'bg-gray-800', activeText: 'text-white', countColor: 'bg-gray-100 text-gray-700' },
];

// ─── Empty state config ───

const emptyStateConfig: Record<string, { icon: React.ReactNode; title: string; description: string; subtext: string }> = {
  PENDING: {
    icon: <Clock className="h-16 w-16 text-amber-500/30" />,
    title: 'No pending approvals',
    description: 'All requests have been reviewed.',
    subtext: 'New approval requests from team members will appear here for you to review and approve or reject.',
  },
  APPROVED: {
    icon: <CheckCircle2 className="h-16 w-16 text-emerald-500/30" />,
    title: 'No approved requests',
    description: 'Approved requests will appear here.',
    subtext: 'Once you or another approver approves a request, it will be listed in this tab with the reviewer details.',
  },
  REJECTED: {
    icon: <XCircle className="h-16 w-16 text-red-500/30" />,
    title: 'No rejected requests',
    description: 'Rejected requests will appear here.',
    subtext: 'Rejected requests include the rejection reason and reviewer info for audit trail purposes.',
  },
  ALL: {
    icon: <FileText className="h-16 w-16 text-muted-foreground/20" />,
    title: 'No approval requests',
    description: 'No approval requests have been created yet.',
    subtext: 'Use the "Create Approval" button to submit a new request for review by another team member.',
  },
};

// ─── Animation ───

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

// ─── Zod schema ───

const approvalFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  requestType: z.string().min(1, 'Request type is required'),
  requestData: z.string().optional(),
  clientId: z.string().optional(),
  taskId: z.string().optional(),
});

type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

// ─── Avatar initial ───

function AvatarInitial({ name }: { name: string }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-[11px] font-semibold text-white shadow-sm">
      {initial}
    </div>
  );
}

// ─── Create Approval Dialog ───

function CreateApprovalDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[] | undefined;
}) {
  const queryClient = useQueryClient();

  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      title: '',
      description: '',
      requestType: '',
      requestData: '',
      clientId: '',
      taskId: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ApprovalFormValues) =>
      createApproval({
        title: data.title,
        description: data.description,
        requestType: data.requestType,
        requestData: data.requestData || undefined,
        clientId: data.clientId || undefined,
        taskId: data.taskId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Approval request created');
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (values: ApprovalFormValues) => {
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
            Create Approval Request
          </DialogTitle>
          <DialogDescription>Submit a new request for review and approval.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter request title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe what needs approval..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALL_REQUEST_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
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
            </div>

            <Separator className="my-4" />
            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Task</FormLabel>
                  <FormControl>
                    <Input placeholder="Task ID (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Data</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional JSON data, e.g. {"key": "value"}...'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main View ───

export function ApprovalsView() {
  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
  const [rejectDialog, setRejectDialog] = useState<{ id: string; requesterName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; requesterName: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: clients } = useQuery<ClientListItem[]>({
    queryKey: ['clients-all'],
    queryFn: () => getClients(),
  });

  // Fetch all approvals for counts
  const { data: allApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ['approvals', 'ALL'],
    queryFn: () => getApprovals(),
  });

  // Fetch filtered approvals for display
  const { data: approvals, isLoading, error } = useQuery<ApprovalRequest[]>({
    queryKey: ['approvals', activeTab],
    queryFn: () => (activeTab === 'ALL' ? getApprovals() : getApprovals({ status: activeTab })),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Request approved');
      setConfirmDialog(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDialog(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Request rejected');
      setRejectDialog(null);
      setRejectReason('');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleApprove = (approval: ApprovalRequest) => {
    // 4-eyes check: cannot approve own request
    if (approval.requestedById === currentUserId) return;
    setConfirmDialog({ id: approval.id, requesterName: approval.requestedBy.name });
  };

  const confirmApprove = () => {
    if (confirmDialog) {
      approveMutation.mutate(confirmDialog.id);
    }
  };

  const handleReject = (approval: ApprovalRequest) => {
    setRejectDialog({ id: approval.id, requesterName: approval.requestedBy.name });
  };

  const confirmReject = () => {
    if (rejectDialog) {
      rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason || undefined });
    }
  };

  // Count approvals by status
  const counts: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
  allApprovals?.forEach((a) => {
    counts[a.status] = (counts[a.status] ?? 0) + 1;
  });
  const totalAll = allApprovals?.length ?? 0;

  return (
    <div className="flex flex-col">
      {/* Header with pill tabs */}
      <div className="border-b border-border/60 px-6 pt-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {tabConfig.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? totalAll
                  : counts[tab.key] ?? 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px',
                    isActive
                      ? cn(tab.activeBg, tab.activeText, 'border-emerald-500')
                      : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/20'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                      isActive ? 'bg-white/20' : 'bg-muted-foreground/10'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            className="shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Approval
          </Button>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          key={activeTab}
          className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border/60 shadow-sm overflow-hidden">
                <div className="flex">
                  <Skeleton className="w-[3px]" />
                  <CardContent className="flex-1 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </CardContent>
                </div>
              </Card>
            ))}

          {error && (
            <p className="col-span-full py-12 text-center text-red-500">
              Failed to load approvals.
            </p>
          )}

          {!isLoading && approvals?.map((approval) => {
            const typeConf = getRequestTypeConfig(approval.requestType);
            const isExpiring = approval.expiresAt && new Date(approval.expiresAt) > new Date();
            const isExpired = approval.expiresAt && new Date(approval.expiresAt) <= new Date();
            const isExpiringSoon = isExpiring && approval.expiresAt
              ? (new Date(approval.expiresAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000
              : false;

            return (
              <motion.div key={approval.id} variants={item}>
                <Card className={cn("border-border/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-border/80 transition-all duration-200",
                  approval.status === 'PENDING' && 'border-l-4 border-l-amber-400 cursor-pointer',
                  approval.status === 'APPROVED' && 'border-l-4 border-l-emerald-500',
                  approval.status === 'REJECTED' && 'border-l-4 border-l-red-500',
                  approval.status === 'CANCELLED' && 'border-l-4 border-l-gray-400',
                )} onClick={approval.status === 'PENDING' ? () => handleApprove(approval) : undefined}>
                  <div className="flex flex-1">
                    {/* Left accent bar - 3px */}
                    <div className={cn('w-[3px] shrink-0 rounded-l-lg', typeConf.accent)} />

                    <div className="flex-1 p-5 space-y-3">
                      {/* Card header: type badge + title */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-snug text-foreground">{approval.title}</h3>
                        <Badge variant="outline" className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium border gap-1', typeConf.badge)}>
                          {typeConf.icon}
                          {typeConf.label}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">{approval.description}</p>

                      {/* Requested by with avatar */}
                      <div className="flex items-center gap-2">
                        <AvatarInitial name={approval.requestedBy.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground/80 truncate">{approval.requestedBy.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {approval.requestedBy.role}
                            {approval.client && <span className="ml-1.5">· {approval.client.name}</span>}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">
                          {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Collapsible request data */}
                      {approval.requestData && (
                        <Collapsible className="group/collapsible">
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            Request Data
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 rounded-lg bg-muted/60 border border-border/40 p-3">
                              <pre className="max-h-32 overflow-auto text-[11px] font-mono text-foreground/80">
                                {(() => {
                                  try { return JSON.stringify(JSON.parse(approval.requestData!), null, 2); }
                                  catch { return approval.requestData; }
                                })()}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Card footer */}
                      <div className="border-t border-border/40 pt-3 space-y-3">
                        {/* Expiry countdown */}
                        {isExpiring && (
                          <div className={cn(
                            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5',
                            isExpiringSoon
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-amber-50 border-amber-200'
                          )}>
                            {isExpiringSoon && (
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                              </span>
                            )}
                            <Clock className={cn('h-3.5 w-3.5 shrink-0', isExpiringSoon ? 'text-amber-600' : 'text-amber-600')} />
                            <span className={cn('text-[11px] font-medium', isExpiringSoon ? 'text-amber-700' : 'text-amber-700')}>
                              {isExpiringSoon ? 'Expiring soon — ' : 'Expires '}
                              {formatDistanceToNow(new Date(approval.expiresAt!), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                        {isExpired && (
                          <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            <span className="text-[11px] font-medium text-red-700">Expired</span>
                          </div>
                        )}

                        {/* Actions for PENDING */}
                        {approval.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1">
                                  <Button
                                    size="sm"
                                    className={cn(
                                      'w-full shadow-sm hover:scale-105 active:scale-95 transition-transform duration-150',
                                      approval.requestedById === currentUserId
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    )}
                                    disabled={approval.requestedById === currentUserId}
                                    onClick={(e) => { e.stopPropagation(); handleApprove(approval); }}
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-center">
                                <p className="font-medium">4-Eyes Principle</p>
                                <p className="mt-1 text-[11px] opacity-80">
                                  A different team member must approve this request. You cannot approve your own submissions.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-none hover:scale-105 active:scale-95 transition-transform duration-150"
                              onClick={(e) => { e.stopPropagation(); handleReject(approval); }}
                            >
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Status display for non-pending */}
                        {approval.status !== 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-md px-2 py-0.5 text-[11px] font-medium',
                                approval.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : approval.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-gray-50 text-gray-600 border border-gray-200'
                              )}
                            >
                              {approval.status}
                            </Badge>
                            {approval.approvedBy && (
                              <span className="text-[11px] text-muted-foreground">
                                by {approval.approvedBy.name}
                                {approval.reviewedAt && (
                                  <span className="ml-1">
                                    {formatDistanceToNow(new Date(approval.reviewedAt), { addSuffix: true })}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rejection reason */}
                        {approval.rejectedReason && (
                          <div className="rounded-md bg-red-50 border border-red-100 p-2.5 text-[11px] text-red-700">
                            <strong>Reason:</strong> {approval.rejectedReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}

          {/* Empty state */}
          <AnimatePresence mode="wait">
            {!isLoading && approvals?.length === 0 && (
              <motion.div
                key={`empty-${activeTab}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="col-span-full flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 p-8 mb-4">
                  {emptyStateConfig[activeTab].icon}
                </div>
                <p className="text-sm font-semibold text-foreground/80">{emptyStateConfig[activeTab].title}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{emptyStateConfig[activeTab].description}</p>
                <p className="mt-3 text-[11px] text-muted-foreground/60 max-w-[320px] leading-relaxed">
                  {emptyStateConfig[activeTab].subtext}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </ScrollArea>

      {/* Create Approval Dialog */}
      <CreateApprovalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
      />

      {/* 4-eyes Confirm Approve Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Confirm Approval
            </DialogTitle>
            <DialogDescription>
              You are approving a request made by <strong>{confirmDialog?.requesterName}</strong>. A
              different team member must approve this request (4-eyes principle).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/30 dark:border-amber-800">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              Make sure you have reviewed the request data before approving. This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject with Reason Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Request
            </DialogTitle>
            <DialogDescription>
              Rejecting a request made by <strong>{rejectDialog?.requesterName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}