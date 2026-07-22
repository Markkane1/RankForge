'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientDetail, updateClientState, updateClientNotes, createTask, createLead, getClientAuditTrail, downloadMonthlyReport, getGeoGrid, runGeoGridScan } from '@/lib/api';
import { GbpIntakeForm } from '@/components/gbp/gbp-intake-form';
import { GbpSuspensionWizard } from '@/components/gbp/gbp-suspension-wizard';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  X,
  ArrowRight,
  MapPin,
  Globe,
  Phone,
  Mail,
  Star,
  ExternalLink,
  Users,
  Minus,
  Plus,
  FileText,
  ListTodo,
  Loader2,
  StickyNote,
  Navigation,
  MessageCircle,
  Search as SearchIcon,
  CircleDot,
  TrendingUp,
  UserPlus,
  Target,
  Download,
  Building2,
  Clock,
  Map,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, isThisMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { ClientDetail, ClientState, LeadLogEntry } from '@/lib/types';
import { KeywordTrackerList } from '../keywords/keyword-tracker-list';
import { CompetitorList } from '../competitors/competitor-list';
import { GbpServicesManager } from '../gbp/gbp-services-manager';
import { GbpProductsManager } from '@/components/gbp/gbp-products-manager';
import { OnboardingWizard } from './onboarding-wizard';
import { GbpPostsManager } from '@/components/gbp/gbp-posts-manager';
import { GbpFaqManager } from '@/components/gbp/gbp-faq-manager';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

const stateColor: Record<string, string> = {
  ONBOARDING: 'bg-blue-100 text-blue-700 border-blue-200',
  BUILD: 'bg-amber-100 text-amber-700 border-amber-200',
  GROWTH: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  AT_RISK: 'bg-red-100 text-red-700 border-red-200',
  PAUSED: 'bg-purple-100 text-purple-700 border-purple-200',
  OFFBOARDED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const stateLabel: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  BUILD: 'Build',
  GROWTH: 'Growth',
  AT_RISK: 'At Risk',
  PAUSED: 'Paused',
  OFFBOARDED: 'Offboarded',
};

const typeLabel: Record<string, string> = {
  SERVICE_AREA_BUSINESS: 'Service Area Business',
  STOREFRONT_BUSINESS: 'Storefront Business',
};

const LEGAL_TRANSITIONS: Record<string, ClientState[]> = {
  ONBOARDING: ['BUILD', 'PAUSED'],
  BUILD: ['GROWTH', 'AT_RISK', 'PAUSED'],
  GROWTH: ['AT_RISK', 'PAUSED'],
  AT_RISK: ['GROWTH', 'PAUSED'],
  PAUSED: ['ONBOARDING', 'BUILD', 'GROWTH', 'AT_RISK', 'OFFBOARDED'],
  OFFBOARDED: [],
};

const STATES_ORDER: ClientState[] = ['ONBOARDING', 'BUILD', 'GROWTH', 'AT_RISK', 'PAUSED', 'OFFBOARDED'];

const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const priorityColor: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const taskStatusColor: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  BLOCKED: 'bg-amber-100 text-amber-700',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-700',
  DEFERRED: 'bg-gray-100 text-gray-500',
};

// Lead source badge colors
const leadSourceColor: Record<string, string> = {
  GBP_CALL: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  GBP_DIRECTIONS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  GBP_WEBSITE: 'bg-blue-100 text-blue-700 border-blue-200',
  FORM_SUBMISSION: 'bg-violet-100 text-violet-700 border-violet-200',
  PHONE_CALL: 'bg-amber-100 text-amber-700 border-amber-200',
  WHATSAPP: 'bg-green-100 text-green-700 border-green-200',
  EMAIL: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  ORGANIC_SEARCH: 'bg-pink-100 text-pink-700 border-pink-200',
  REFERRAL: 'bg-orange-100 text-orange-700 border-orange-200',
  OTHER: 'bg-gray-100 text-gray-600 border-gray-200',
};

const leadSourceLabel: Record<string, string> = {
  GBP_CALL: 'GBP Call',
  GBP_DIRECTIONS: 'GBP Directions',
  GBP_WEBSITE: 'GBP Website',
  FORM_SUBMISSION: 'Form Submission',
  PHONE_CALL: 'Phone Call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  ORGANIC_SEARCH: 'Organic Search',
  REFERRAL: 'Referral',
  OTHER: 'Other',
};

const leadSourceIcon: Record<string, React.ReactNode> = {
  GBP_CALL: <Phone className="h-3.5 w-3.5" />,
  GBP_DIRECTIONS: <Navigation className="h-3.5 w-3.5" />,
  GBP_WEBSITE: <Globe className="h-3.5 w-3.5" />,
  FORM_SUBMISSION: <FileText className="h-3.5 w-3.5" />,
  PHONE_CALL: <Phone className="h-3.5 w-3.5" />,
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  WHATSAPP: <MessageCircle className="h-3.5 w-3.5" />,
  ORGANIC_SEARCH: <SearchIcon className="h-3.5 w-3.5" />,
  REFERRAL: <Users className="h-3.5 w-3.5" />,
  OTHER: <CircleDot className="h-3.5 w-3.5" />,
};

// Module color coding (matches dashboard)
const moduleColor: Record<string, string> = {
  M1: 'bg-blue-500',
  M2: 'bg-cyan-500',
  M3: 'bg-amber-500',
  M4: 'bg-violet-500',
  M5: 'bg-rose-500',
  M6: 'bg-emerald-500',
};

const moduleBadgeColor: Record<string, string> = {
  M1: 'bg-blue-100 text-blue-700 border-blue-200',
  M2: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  M3: 'bg-amber-100 text-amber-700 border-amber-200',
  M4: 'bg-violet-100 text-violet-700 border-violet-200',
  M5: 'bg-rose-100 text-rose-700 border-rose-200',
  M6: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// Keyword rank color coding
function getRankColor(rank: number | null | undefined): string {
  if (rank == null) return 'text-muted-foreground';
  if (rank <= 3) return 'bg-emerald-100 text-emerald-700 font-semibold';
  if (rank <= 10) return 'bg-blue-100 text-blue-700 font-semibold';
  if (rank <= 20) return 'bg-amber-100 text-amber-700 font-semibold';
  return 'bg-red-100 text-red-700 font-semibold';
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${value.toLocaleString('en-US')}`;
}

function getLeadsThisMonth(leads: LeadLogEntry[]): { count: number; value: number } {
  const monthLeads = leads.filter((l) => isThisMonth(new Date(l.createdAt)));
  return {
    count: monthLeads.length,
    value: monthLeads.reduce((sum, l) => sum + (l.value ?? 0), 0),
  };
}

interface ClientDetailPanelProps {
  clientId: string;
  onClose: () => void;
}

// ponytail: stripped out complex sparkline charts and fake mock math. YAGNI.
function RankSparkline() {
  return <span className="text-muted-foreground text-xs">No history yet</span>;
}

function RankChangeBadge({ currentRank, targetRank }: { currentRank: number; targetRank?: number }) {
  if (targetRank == null || targetRank === currentRank) return null;
  const diff = targetRank - currentRank; // positive = improved (rank number decreased)
  if (diff === 0) return null;
  const improved = diff > 0;
  return (
    <span className={cn(
      'inline-flex items-center text-[10px] font-semibold ml-1',
      improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    )}>
      {improved ? '↑' : '↓'}{Math.abs(diff)}
    </span>
  );
}

// ─── Create Task Dialog ───
function CreateTaskDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('M1');
  const [priority, setPriority] = useState('MEDIUM');
  const [sprint, setSprint] = useState('');
  const [dueDate, setDueDate] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createTask({
        title,
        description: description || undefined,
        clientId,
        module,
        priority,
        sprint: sprint ? Number(sprint) : undefined,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Task created successfully');
      onOpenChange(false);
      // Reset form
      setTitle('');
      setDescription('');
      setModule('M1');
      setPriority('MEDIUM');
      setSprint('');
      setDueDate('');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Client</Label>
            <Input value={clientName} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Title <span className="text-red-500">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'META', 'CORE'].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Sprint</Label>
              <Input
                type="number"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
                placeholder="1"
                min={1}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLeadDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState('GBP_CALL');
  const [value, setValue] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createLead({
        clientId,
        source,
        value: value ? Number(value) : undefined,
        contactInfo: contactInfo.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['leads-dashboard'] });
      toast.success('Lead added successfully');
      onOpenChange(false);
      // Reset form
      setSource('GBP_CALL');
      setValue('');
      setContactInfo('');
      setNotes('');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Client</Label>
            <Input value={clientName} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Source <span className="text-red-500">*</span></Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadSourceLabel).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Value ($)</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Optional estimated value"
              min={0}
              step={0.01}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Contact Info</Label>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Phone, email, or name..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this lead..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientDetailPanel({ clientId, onClose }: ClientDetailPanelProps) {
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showGbpSetup, setShowGbpSetup] = useState(false);

  const downloadReportMut = useMutation({
    mutationFn: () => {
      const now = new Date();
      return downloadMonthlyReport(now.getMonth() + 1, now.getFullYear(), clientId);
    },
    onSuccess: () => {
      toast.success('Report downloaded');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const { data: client, isLoading, error } = useQuery<ClientDetail>({
    queryKey: ['client', clientId],
    queryFn: () => getClientDetail(clientId),
    enabled: !!clientId,
  });

  const stateMutation = useMutation({
    mutationFn: ({ state }: { state: string }) => updateClientState(clientId, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client state updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const leadsThisMonth = client ? getLeadsThisMonth(client.leads) : { count: 0, value: 0 };

  return (
    <Sheet open={!!clientId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <SheetTitle className="truncate text-lg">
                {isLoading ? <Skeleton className="h-6 w-48" /> : client?.name}
              </SheetTitle>
              {!isLoading && client && (
                <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', stateColor[client.lifecycleState])}>
                  {stateLabel[client.lifecycleState]}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!isLoading && client && (
            <Badge variant="outline" className="mt-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
              {typeLabel[client.type]}
            </Badge>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="p-6 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        )}

        {error && (
          <p className="p-6 text-red-500">Failed to load client details.</p>
        )}

        {client && (
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="p-6 space-y-6">
              {/* State Machine Visual */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Client Lifecycle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    {STATES_ORDER.map((state, i) => {
                      const isCurrent = client.lifecycleState === state;
                      const transitions = LEGAL_TRANSITIONS[client.lifecycleState] ?? [];
                      const isReachable = transitions.includes(state);

                      return (
                        <div key={state} className="flex items-center gap-2">
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <button
                              disabled={!isReachable || isCurrent}
                              onClick={() =>
                                !isCurrent && isReachable && stateMutation.mutate({ state })
                              }
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                isCurrent
                                  ? stateColor[state]
                                  : isReachable
                                  ? 'border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                  : 'border-border bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {stateLabel[state]}
                            </button>
                          </motion.div>
                          {i < STATES_ORDER.length - 1 && (
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Click a dashed state to transition. Arrows show legal transitions from current state.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setShowCreateTask(true)}
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-600" />
                      Create Task
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => useAppStore.getState().setCurrentView('approvals')}
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-600" />
                      Request Approval
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => useAppStore.getState().setCurrentView('tasks')}
                    >
                      <ListTodo className="h-3.5 w-3.5 text-violet-600" />
                      View Tasks
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => downloadReportMut.mutate()}
                      disabled={downloadReportMut.isPending}
                    >
                      {downloadReportMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="gbp-setup" className="gap-1.5"><Building2 className="h-3 w-3" /> GBP Setup</TabsTrigger>
                  <TabsTrigger value="gbp">GBP Profile</TabsTrigger>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                  <TabsTrigger value="geogrid" className="gap-1.5"><Map className="h-3 w-3" /> Geo-Grid</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  {client && client.lifecycleState === 'ONBOARDING' && (
                    <OnboardingWizard
                      clientId={clientId}
                      clientName={client.name}
                    />
                  )}

                  {/* Leads This Month Summary Card */}
                  <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200/50 dark:from-emerald-950/30 dark:to-background dark:border-emerald-800/30">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Leads This Month</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                              {leadsThisMonth.count} <span className="text-sm font-normal text-muted-foreground">leads</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Value</p>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(leadsThisMonth.value)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* REQ-M1-24: Off-Profile Signal Summary Dashboard */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Citation Consistency Widget */}
                    <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-200/50 dark:from-pink-950/30 dark:to-background dark:border-pink-800/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">Citation Consistency</p>
                            <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                              {client.citationMetrics?.averageScore ?? 85.5}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Across {client.citationMetrics?.totalCitations ?? 12} listing platforms
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400">
                            <span className="text-lg font-bold">🎯</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-pink-100 dark:bg-pink-900/30 h-1.5 rounded-full mt-4 overflow-hidden">
                          <div 
                            className="bg-pink-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${client.citationMetrics?.averageScore ?? 85.5}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Landing Page Schema Status Widget */}
                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200/50 dark:from-indigo-950/30 dark:to-background dark:border-indigo-800/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Landing Page Schema</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={cn(
                                "text-xs font-bold",
                                client.landingPageSchemaStatus === 'VALID' 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              )}>
                                {client.landingPageSchemaStatus === 'VALID' ? 'VALID Schema' : client.landingPageSchemaStatus?.replace(/_/g, ' ') || 'UNCHECKED'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Checked: {client.website ? new URL(client.website).hostname : 'No website set'}
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            <span className="text-lg font-bold">🌐</span>
                          </div>
                        </div>
                        {/* Status bar */}
                        <div className="w-full bg-indigo-100 dark:bg-indigo-900/30 h-1.5 rounded-full mt-4 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              client.landingPageSchemaStatus === 'VALID' ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: client.landingPageSchemaStatus === 'VALID' ? '100%' : '50%' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Business Information</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {client.businessName && <p><strong>Name:</strong> {client.businessName}</p>}
                      {client.phone && (
                        <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {client.phone}</p>
                      )}
                      {client.email && (
                        <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email}</p>
                      )}
                      {client.website && (
                        <p className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" />
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
                            {client.website}
                          </a>
                        </p>
                      )}
                      {client.address && (
                        <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {client.address}</p>
                      )}
                      {client.city && (
                        <p className="text-muted-foreground">{client.city}{client.state ? `, ${client.state}` : ''} {client.postalCode}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Service Areas */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Service Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {client.serviceAreas.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No service areas defined.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {client.serviceAreas.map((sa) => (
                            <Badge key={sa.id} variant="outline" className="text-xs">
                              {sa.name}
                              {sa.isPrimary && <span className="ml-1 text-emerald-600">★</span>}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Competitors */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Competitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {client.competitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No competitor benchmarks.</p>
                      ) : (
                        <div className="space-y-3">
                          {client.competitors.map((c) => (
                            <motion.div
                              key={c.id}
                              whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                              className="rounded-lg border p-3 transition-colors hover:border-emerald-300 hover:bg-muted/30 dark:hover:border-emerald-700"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{c.competitorName}</p>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                    {c.avgRating != null && (
                                      <span className="flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        {c.avgRating}
                                      </span>
                                    )}
                                    {c.reviewCount != null && <span>{c.reviewCount} reviews</span>}
                                    {c.photoCount != null && <span>{c.photoCount} photos</span>}
                                    {c.postFrequency && (
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        {c.postFrequency} posts/mo
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {c.competitorUrl && (
                                  <a href={c.competitorUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                  </a>
                                )}
                              </div>
                              {/* Strengths & Weaknesses */}
                              {(c.strengths || c.weaknesses) && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {c.strengths && (
                                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                                      <p className="text-xs text-emerald-700 dark:text-emerald-300 line-clamp-2">{c.strengths}</p>
                                    </div>
                                  )}
                                  {c.weaknesses && (
                                    <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Weaknesses</p>
                                      <p className="text-xs text-red-700 dark:text-red-300 line-clamp-2">{c.weaknesses}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <NotesSection clientId={clientId} notes={client.notes} updatedAt={client.updatedAt} />
                </TabsContent>

                {/* GBP Setup */}
                <TabsContent value="gbp-setup" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Google Business Profiles</h3>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // Minimalist Add Location approach
                        fetch(`/api/clients/${clientId}/gbp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ gbpAccountId: '', gbpLocationId: '', gbpLocationName: 'New Location' })
                        }).then(() => queryClient.invalidateQueries({ queryKey: ['client', clientId] }));
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Location
                    </Button>
                  </div>
                  
                  {client.gbpProfiles && client.gbpProfiles.length > 0 ? (
                    <div className="space-y-6">
                      {client.gbpProfiles.map((profile: any) => (
                        <div key={profile.id} className="space-y-4 border p-4 rounded-lg bg-card">
                          <Card className={cn('border', profile.isVerified ? 'border-emerald-200' : profile.isSuspended ? 'border-red-200' : 'border-border')}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className={profile.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                                    {profile.isVerified ? '✓ Verified' : 'Not Verified'}
                                  </Badge>
                                  {profile.isSuspended && <Badge className="bg-red-100 text-red-700">Suspended</Badge>}
                                  <span className="font-medium">{profile.gbpLocationName || 'Unnamed Location'}</span>
                                </div>
                                {profile.lastSyncedAt && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Synced {formatDistanceToNow(new Date(profile.lastSyncedAt), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                          {profile.isSuspended && (
                            <GbpSuspensionWizard
                              clientId={clientId}
                              gbpId={profile.id}
                              profileName={profile.gbpLocationName || 'Unnamed Location'}
                            />
                          )}
                          <GbpIntakeForm clientId={clientId} gbpId={profile.id} initialData={profile} />
                          
                          {/* Services Manager */}
                          <div className="pt-4 border-t border-border/50">
                            <GbpServicesManager clientId={clientId} gbpId={profile.id} />
                          </div>

                          {/* Products Manager */}
                          <div className="pt-4 border-t border-border/50">
                            <GbpProductsManager clientId={clientId} gbpId={profile.id} />
                          </div>

                          {/* Posts Manager (Content Calendar) */}
                          <div className="pt-4 border-t border-border/50">
                            <GbpPostsManager clientId={clientId} gbpId={profile.id} />
                          </div>

                          {/* FAQ Ask-Maps Manager */}
                          <div className="pt-4 border-t border-border/50">
                            <GbpFaqManager clientId={clientId} gbpId={profile.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
                      <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">No GBP profile data available.</p>
                      {/* ponytail: Simple native anchor tag redirecting to OAuth. No complex UI state. */}
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/gbp/oauth/init?clientId=${clientId}`}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-emerald-700"
                      >
                        Connect Google Business Profile
                      </a>
                    </div>
                  )}
                </TabsContent>

                {/* GBP Profile */}
                <TabsContent value="gbp" className="mt-4 space-y-4">
                  {client.gbpProfiles && client.gbpProfiles.length > 0 ? (
                    client.gbpProfiles.map((profile: any) => (
                      <Card key={profile.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-lg">{profile.gbpLocationName || 'Unnamed Location'}</span>
                              <Badge className={profile.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                                {profile.isVerified ? '✓ Verified' : 'Not Verified'}
                              </Badge>
                              {profile.isSuspended && (
                                <Badge className="bg-red-100 text-red-700">Suspended</Badge>
                              )}
                              {profile.avgRating != null && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  {profile.avgRating} ({profile.reviewCount} reviews)
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={async () => {
                                  const name = window.prompt("Enter customer name:");
                                  if (!name) return;
                                  const phone = window.prompt("Enter customer WhatsApp number (e.g. +1234567890):");
                                  if (!phone) return;
                                  
                                  try {
                                    const res = await fetch(`/api/clients/${client.id}/reviews/invite`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ customerName: name, phoneNumber: phone })
                                    });
                                    if (res.ok) toast.success("Review invite sent via WhatsApp!");
                                    else toast.error("Failed to send invite");
                                  } catch (e) {
                                    toast.error("Error sending invite");
                                  }
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-2" />
                                Send Review Invite
                              </Button>
                            </div>
                            <Separator />
                            {profile.primaryCategory && (
                              <p><strong>Category:</strong> {profile.primaryCategory}</p>
                            )}
                            {profile.description && (
                              <p><strong>Description:</strong> {profile.description}</p>
                            )}
                            {profile.address && (
                              <p><strong>Address:</strong> {profile.address}</p>
                            )}
                            {profile.phone && (
                              <p><strong>Phone:</strong> {profile.phone}</p>
                            )}
                            {profile.websiteUrl && (
                              <p>
                                <strong>Website:</strong>{' '}
                                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
                                  {profile.websiteUrl}
                                </a>
                              </p>
                            )}
                            {profile.lastSyncedAt && (
                              <p className="text-xs text-muted-foreground mt-4">
                                Last synced {formatDistanceToNow(new Date(profile.lastSyncedAt), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground text-sm">
                        No GBP profiles configured.
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Keywords */}
                <TabsContent value="keywords" className="mt-4">
                  <div className="space-y-4">
                    {/* Rankings Chart stripped out for ponytail mode */}
                    {/* Keyword Table */}
                    <Card>
                    <CardContent className="pt-6">
                      {client.keywords.length === 0 ? (
                        <p className="text-muted-foreground">No keywords tracked.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Keyword</TableHead>
                              <TableHead className="w-16 text-center">Rank</TableHead>
                              <TableHead className="w-28 text-center">Trend</TableHead>
                              <TableHead className="w-20 text-center">Volume</TableHead>
                              <TableHead className="w-20 text-center">Difficulty</TableHead>
                              <TableHead className="w-16 text-center">Priority</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {client.keywords.map((kw) => {
                              const hasRankData = kw.currentRank != null && kw.targetRank != null;

                              return (
                                <TableRow key={kw.id}>
                                  <TableCell className="font-bold text-[13px]">
                                    {kw.keyword}
                                    {kw.mapPack && (
                                      <span className="ml-2 inline-flex items-center">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="In Map Pack" />
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={cn('inline-flex items-center', getRankColor(kw.currentRank))}>
                                      <span className="inline-block rounded-md px-2 py-0.5 text-xs">
                                        {kw.currentRank != null ? `#${kw.currentRank}` : '—'}
                                      </span>
                                      <RankChangeBadge
                                        currentRank={kw.currentRank ?? 0}
                                        targetRank={kw.targetRank}
                                      />
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {hasRankData ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <RankSparkline
                                          currentRank={kw.currentRank!}
                                          targetRank={kw.targetRank}
                                        />
                                      </div>
                                    ) : (
                                      <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">{kw.searchVolume ?? '—'}</TableCell>
                                  <TableCell className="text-center">
                                    {kw.difficulty != null ? kw.difficulty.toFixed(1) : '—'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={
                                      kw.priority <= 3 ? 'bg-red-100 text-red-700' :
                                      kw.priority <= 6 ? 'bg-amber-100 text-amber-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }>
                                      {kw.priority}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {client.tasks.length === 0 ? (
                        <p className="text-muted-foreground">No tasks for this client.</p>
                      ) : (
                        <div className="space-y-2">
                          {[...client.tasks].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)).map((task) => (
                            <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{task.title}</p>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{task.taskId}</span>
                                  {task.dueDate && <span>Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>}
                                </div>
                              </div>
                              <div className="ml-3 flex items-center gap-2">
                                <Badge variant="outline" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', priorityColor[task.priority])}>
                                  {task.priority}
                                </Badge>
                                <Badge variant="secondary" className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', taskStatusColor[task.status])}>
                                  {task.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity */}
                <TabsContent value="activity" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {client.changeLog.length === 0 ? (
                        <p className="text-muted-foreground">No activity recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {client.changeLog.map((entry, idx) => {
                            const moduleKey = entry.module.replace(/^(M\d+).*/, '$1');
                            const dotColor = moduleColor[moduleKey] ?? 'bg-gray-500';
                            const badgeCls = moduleBadgeColor[moduleKey] ?? 'bg-gray-100 text-gray-600 border-gray-200';

                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className="flex gap-3 text-sm"
                              >
                                <div className="flex flex-col items-center">
                                  <div className={`mt-1.5 h-2 w-2 rounded-full ${dotColor}`} />
                                  <div className="w-px flex-1 bg-border" />
                                </div>
                                <div className="flex-1 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-xs font-normal ${badgeCls}`}>
                                      {entry.module}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-muted-foreground">
                                    {entry.field
                                      ? <>{entry.entityType}: <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{entry.field}</code> changed from &quot;{entry.oldValue ?? 'empty'}&quot; to &quot;{entry.newValue ?? 'empty'}&quot;</>
                                      : `${entry.entityType} updated`
                                    }
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Audit Trail */}
                <TabsContent value="audit-trail" className="mt-4">
                  <AuditTrailTab clientId={clientId} />
                </TabsContent>

                {/* Leads */}
                <TabsContent value="leads" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">{client.leads.length} lead{client.leads.length !== 1 ? 's' : ''} recorded</span>
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      onClick={() => setShowAddLead(true)}
                    >
                      <UserPlus className="h-3 w-3" />
                      Add Lead
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      {client.leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <TrendingUp className="h-10 w-10 text-muted-foreground/20" />
                          <p className="mt-2 text-sm font-medium text-foreground/70">No leads recorded yet</p>
                          <p className="mt-1 text-xs text-muted-foreground">Leads will appear here once they are tracked for this client.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Source</TableHead>
                              <TableHead className="w-24 text-right">Value</TableHead>
                              <TableHead>Contact Info</TableHead>
                              <TableHead className="w-24">Date</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {client.leads.map((lead) => (
                              <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors rounded-lg">
                                <TableCell>
                                  <Badge variant="outline" className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${leadSourceColor[lead.source] ?? leadSourceColor.OTHER}`}>
                                    {leadSourceIcon[lead.source] ?? leadSourceIcon.OTHER}
                                    {leadSourceLabel[lead.source] ?? lead.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {lead.value != null && lead.value > 0 ? (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 text-[11px] font-bold tabular-nums">
                                      {formatCurrency(lead.value)}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                                  {lead.contactInfo ?? '—'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                                  {lead.notes ?? '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Geo-Grid */}
                <TabsContent value="geogrid" className="mt-4">
                  <GeoGridTab clientId={clientId} keywords={client.keywords} />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
        {client && (
          <CreateTaskDialog
            clientId={clientId}
            clientName={client.name}
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
          />
        )}
        {client && (
          <AddLeadDialog
            clientId={clientId}
            clientName={client.name}
            open={showAddLead}
            onOpenChange={setShowAddLead}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Geo-Grid Tab Component ───

interface GeoGridTabProps {
  clientId: string;
  keywords: any[];
}

function GeoGridTab({ clientId, keywords }: GeoGridTabProps) {
  const queryClient = useQueryClient();
  const [selectedKeyword, setSelectedKeyword] = useState<string>(
    keywords.length > 0 ? keywords[0].keyword : ''
  );

  // Query scan history
  const { data: scans, isLoading, error } = useQuery({
    queryKey: ['geo-grid', clientId],
    queryFn: () => getGeoGrid(clientId),
  });

  // Mutation to trigger manual scan
  const scanMutation = useMutation({
    mutationFn: (keyword: string) => runGeoGridScan(clientId, keyword),
    onSuccess: (newScan) => {
      toast.success(`Geo-grid scan complete for "${newScan.keyword}"!`);
      queryClient.invalidateQueries({ queryKey: ['geo-grid', clientId] });
    },
    onError: (err: any) => {
      toast.error(`Scan failed: ${err.message}`);
    }
  });

  const handleRunScan = () => {
    if (!selectedKeyword) return;
    scanMutation.mutate(selectedKeyword);
  };

  if (keywords.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center py-8 text-center">
          <Target className="h-10 w-10 text-muted-foreground/20" />
          <p className="mt-2 text-sm font-medium text-foreground/70">No priority keywords configured</p>
          <p className="mt-1 text-xs text-muted-foreground">Add priority keywords in the Keywords tab to run geo-grid scans.</p>
        </CardContent>
      </Card>
    );
  }

  // Filter scans for selected keyword
  const filteredScans = scans ? scans.filter(s => s.keyword === selectedKeyword) : [];
  const latestScan = filteredScans.length > 0 ? filteredScans[0] : null;

  return (
    <div className="space-y-4">
      {/* Selector and Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyword:</span>
          <Select value={selectedKeyword} onValueChange={setSelectedKeyword}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Select keyword" />
            </SelectTrigger>
            <SelectContent>
              {keywords.map((kw) => (
                <SelectItem key={kw.id} value={kw.keyword} className="text-xs">
                  {kw.keyword}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all duration-200"
          onClick={handleRunScan}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <SearchIcon className="h-3.5 w-3.5" />
              Run Scan Now
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load scans.</p>
      ) : latestScan ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Heatmap Grid Visual */}
          <Card className="md:col-span-2 overflow-hidden border border-border/60">
            <CardHeader className="border-b bg-muted/20 px-5 py-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Geo-Grid Heatmap (3x3)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/10">
              <div className="grid grid-cols-3 gap-6 p-4 rounded-2xl bg-white dark:bg-muted/30 border border-border/60 shadow-inner">
                {(latestScan.pointResults as any[]).map((point, idx) => {
                  let badgeColor = 'bg-red-500 text-white';
                  if (point.rank <= 3) {
                    badgeColor = 'bg-emerald-500 text-white ring-2 ring-emerald-500/20';
                  } else if (point.rank <= 10) {
                    badgeColor = 'bg-amber-500 text-white ring-2 ring-amber-500/20';
                  }
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.15 }}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black shadow-md cursor-pointer select-none",
                        badgeColor
                      )}
                      title={`Lat: ${point.lat}, Lng: ${point.lng}\nRank: ${point.rank}`}
                    >
                      {point.rank}
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-5 flex gap-4 text-xs font-semibold text-muted-foreground justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span>Top 3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>4 - 10</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span>11+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Scan Details */}
          <div className="space-y-4">
            <Card className="border border-border/60">
              <CardContent className="p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Average Rank</p>
                  <h3 className="text-3xl font-black text-foreground tracking-tight">{latestScan.averageRank.toFixed(1)}</h3>
                </div>
                <div className="mt-4 border-t pt-3 flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Scan Date:</span>
                  <span className="font-semibold text-foreground">{format(new Date(latestScan.scanDate), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Historical Scan list */}
            <Card className="border border-border/60">
              <CardHeader className="border-b bg-muted/20 px-5 py-3">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scan History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[180px]">
                  <div className="divide-y text-xs font-medium">
                    {filteredScans.map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-3 hover:bg-muted/30">
                        <span className="text-muted-foreground">{format(new Date(s.scanDate), 'MMM d, yyyy')}</span>
                        <Badge variant="outline" className={cn(
                          'rounded-md font-bold px-2 py-0.5',
                          s.averageRank <= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          s.averageRank <= 10 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        )}>
                          Avg: {s.averageRank.toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 py-8">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 animate-pulse mb-3" />
            <p className="text-sm font-semibold text-foreground/80">No scan results found for this keyword</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              No scans have been executed for &quot;{selectedKeyword}&quot; yet. Click &quot;Run Scan Now&quot; above to fetch.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Audit Trail Tab ───

function AuditTrailTab({ clientId }: { clientId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['audit-trail', clientId],
    queryFn: () => getClientAuditTrail(clientId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/20" />
          <p className="mt-2 text-sm font-medium text-foreground/70">No audit entries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Audit trail will appear here once changes are made to this client's data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="hidden sm:table-cell">Changed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const badgeCls = moduleBadgeColor[entry.module.replace(/^(M\d+).*/, '$1')] ?? 'bg-gray-100 text-gray-600 border-gray-200';
              return (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] font-normal ${badgeCls}`}>
                      {entry.module}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{entry.entityType}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{entry.field ?? '—'}</TableCell>
                  <TableCell className="text-xs max-w-[200px]">
                    {entry.oldValue || entry.newValue ? (
                      <span>
                        <code className="rounded bg-red-50 dark:bg-red-950/30 px-1 py-0.5 text-[11px] text-red-600 dark:text-red-400 line-through">
                          {entry.oldValue ?? 'empty'}
                        </code>
                        {' → '}
                        <code className="rounded bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                          {entry.newValue ?? 'empty'}
                        </code>
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {entry.changedByName ?? 'System'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Notes Section ───

function NotesSection({ clientId, notes: initialNotes, updatedAt }: { clientId: string; notes?: string; updatedAt: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialNotes ?? '');

  const notesMutation = useMutation({
    mutationFn: (notes: string) => updateClientNotes(clientId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Notes saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Notes
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Add notes about this client..."
          className="text-sm resize-none"
        />
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            disabled={notesMutation.isPending || draft === (initialNotes ?? '')}
            onClick={() => notesMutation.mutate(draft)}
          >
            {notesMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
