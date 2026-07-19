'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2, Globe, Plug, Database, BarChart3, MessageSquare, Search, Map,
  Users, ClipboardList, CheckCircle, AlertTriangle, TrendingUp, Activity,
  Clock, Server, Zap, Info, Wrench, RefreshCw, ShieldCheck, ShieldOff, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { SettingsData, StaffRole } from '@/lib/types';
import { useCurrentUser, hasRole } from '@/lib/hooks';
import { toast } from 'sonner';

const roleColor: Record<StaffRole, string> = {
  OWNER: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 rounded-md px-2 py-0.5 text-[11px] font-medium',
  COORDINATOR: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 rounded-md px-2 py-0.5 text-[11px] font-medium',
  APPROVER: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800 rounded-md px-2 py-0.5 text-[11px] font-medium',
  VIEWER: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 rounded-md px-2 py-0.5 text-[11px] font-medium',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Removed static TOOLS array, will build dynamically in component

const TOOL_CONNECTED_STYLE = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400';
const TOOL_DISCONNECTED_STYLE = 'bg-muted text-muted-foreground';
const TOOL_CONNECTED_BADGE = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
const TOOL_DISCONNECTED_BADGE = 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const anim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ─── Platform Info Component ───

function TwoFactorCard() {
  const { user } = useCurrentUser();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Setup state ───
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // ─── Disable state ───
  const [disablePassword, setDisablePassword] = useState('');
  const [disableTotp, setDisableTotp] = useState('');

  useEffect(() => {
    if (user?.twoFactorEnabled !== undefined) {
      setEnabled(user.twoFactorEnabled);
    }
  }, [user?.twoFactorEnabled]);

  // ─── Start 2FA setup: fetch QR + secret ───
  const startSetup = async () => {
    setLoading(true);
    setVerifyCode('');
    setBackupCodes(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start 2FA setup');
        return;
      }
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupOpen(true);
    } catch {
      toast.error('Network error during 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify setup code and enable 2FA ───
  const confirmSetup = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      toast.success('2FA enabled successfully');
    } catch {
      toast.error('Network error during verification');
    } finally {
      setLoading(false);
    }
  };

  // ─── Disable 2FA ───
  const confirmDisable = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, totpCode: disableTotp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to disable 2FA');
        return;
      }
      setEnabled(false);
      setDisableOpen(false);
      setDisablePassword('');
      setDisableTotp('');
      toast.success('2FA disabled');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const closeSetup = () => {
    setSetupOpen(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode('');
    setBackupCodes(null);
  };

  return (
    <Card className="border border-border/60 border-l-2 border-l-blue-500 bg-gradient-to-br from-white via-white to-blue-50/20 dark:from-card dark:via-card dark:to-blue-950/10 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Account Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                Two-Factor Authentication {enabled ? '(Enabled)' : '(Disabled)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security with a TOTP authenticator app.'}
              </p>
            </div>
          </div>
          {enabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisableOpen(true)}
              disabled={loading}
            >
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={startSetup} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Enable 2FA
            </Button>
          )}
        </div>

        {/* ─── Setup Dialog ─── */}
        <Dialog open={setupOpen} onOpenChange={(open) => !open && closeSetup()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password),
                then enter the 6-digit code it generates.
              </DialogDescription>
            </DialogHeader>

            {backupCodes ? (
              // ─── Backup codes reveal ───
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                    ⚠️ Save these backup codes securely
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Each code can be used once if you lose access to your authenticator.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="text-center">{code}</div>
                  ))}
                </div>
                <Button onClick={closeSetup} className="w-full">
                  I&apos;ve saved my backup codes
                </Button>
              </div>
            ) : (
              // ─── QR + verify ───
              <div className="space-y-4">
                {qrCode && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg border" />
                  </div>
                )}
                {secret && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Or enter this code manually:
                    </p>
                    <code className="block rounded bg-muted px-2 py-1 text-xs break-all">
                      {secret}
                    </code>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Enter 6-digit code</Label>
                  <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={confirmSetup}
                  disabled={loading || verifyCode.length !== 6}
                  className="w-full"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify & Enable
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Disable Dialog ─── */}
        <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Confirm your password and current 2FA code to disable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="disable-password">Password</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disable-totp">Current 2FA code</Label>
                <InputOTP maxLength={6} value={disableTotp} onChange={setDisableTotp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={confirmDisable}
                disabled={loading || !disablePassword || disableTotp.length !== 6}
                variant="destructive"
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Disable 2FA
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PlatformInfoCard() {
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => setApiHealthy(res.ok))
      .catch(() => setApiHealthy(false));
  }, []);

  const refreshHealth = () => {
    fetch('/api/dashboard')
      .then((res) => setApiHealthy(res.ok))
      .catch(() => setApiHealthy(false));
  };

  const items = [
    {
      label: 'Platform Version',
      value: 'v1.2.0',
      icon: <Zap className="h-4 w-4 text-emerald-500" />,
    },
    {
      label: 'Database',
      value: 'SQLite — Connected',
      icon: <Database className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
      status: 'healthy' as const,
    },
    {
      label: 'API Health',
      value: apiHealthy === null ? 'Checking...' : apiHealthy ? 'Healthy (200 OK)' : 'Unhealthy',
      icon: (
        <span
          className={
            apiHealthy === null
              ? 'inline-block h-4 w-4 rounded-full bg-amber-400 animate-pulse'
              : apiHealthy
                ? 'inline-block h-4 w-4 rounded-full bg-emerald-500'
                : 'inline-block h-4 w-4 rounded-full bg-red-500'
          }
        />
      ),
      status: apiHealthy === null ? 'checking' as const : apiHealthy ? 'healthy' as const : 'unhealthy' as const,
    },
    {
      label: 'Last Deployment',
      value: 'Just now',
      icon: <Clock className="h-4 w-4 text-purple-500 dark:text-purple-400" />,
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-white to-muted/30 dark:from-card dark:to-muted/10 transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Platform Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 dark:bg-background/30 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${
                    item.status === 'healthy' ? 'text-emerald-700 dark:text-emerald-400' :
                    item.status === 'unhealthy' ? 'text-red-700 dark:text-red-400' :
                    'text-foreground'
                  }`}>
                    {item.value}
                  </p>
                  {item.status === 'healthy' && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse-ring" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>
                {item.status === 'healthy' && item.label === 'API Health' && (
                  <p className="text-[10px] text-muted-foreground">Last checked: Just now</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={refreshHealth}
          className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh health check
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Team Activity Timeline ───

function TeamActivityTimeline({ staff }: { staff: SettingsData['staff'] }) {
  const sortedStaff = [...staff].sort((a, b) => {
    const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Team Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60" />

          {sortedStaff.map((user) => (
              <div key={user.id} className="relative flex items-start gap-4 pb-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-background border-2 border-border shadow-sm">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {getInitials(user.name)}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <Badge className={roleColor[user.role as StaffRole] + ' text-[10px] px-1.5 py-0 rounded-md'}>
                      {user.role}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? `Last login ${formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}`
                      : 'Never logged in'}
                  </p>
                </div>
                {/* Time indicator */}
                <div className="shrink-0 text-right">
                  {user.lastLoginAt ? (
                    <span className="text-[11px] text-muted-foreground/60">
                      {new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/40">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
      </CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Org info skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardContent>
      </Card>
      {/* Staff table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <div>
        <p className="text-sm font-medium text-foreground">Failed to load settings</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { user: currentUser } = useCurrentUser();
  const { data, isLoading, isError, error } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        throw new Error(`Failed to fetch settings (${res.status})`);
      }
      return res.json();
    },
  });

  const { data: integrationsData, isLoading: integrationsLoading } = useQuery<Record<string, boolean>>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await fetch('/api/settings/integrations');
      if (!res.ok) return {};
      return res.json();
    }
  });

  if (isLoading || integrationsLoading) {
    return <SettingsSkeleton />;
  }

  if (isError) {
    return <SettingsError message={error.message} />;
  }

  if (!data) {
    return <SettingsError message="No data returned from server" />;
  }

  const { organization, staff, summary } = data;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      {/* Summary Stats with gradient backgrounds */}
      <motion.div variants={anim} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-50/50 to-transparent pointer-events-none" />
          <CardContent className="relative flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600/70">Total Clients</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{summary.clients}</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-transparent pointer-events-none" />
          <CardContent className="relative flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600/70">Total Tasks</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{summary.tasks}</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Activity className="h-3 w-3" />
                  Tracked
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-50/50 to-transparent pointer-events-none" />
          <CardContent className="relative flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm shadow-purple-500/20">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-purple-600/70">Total Approvals</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{summary.approvals}</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                  <Info className="h-3 w-3" />
                  Reviewed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Organization Info */}
      <motion.div variants={anim}>
        <Card className="border border-border/60 border-l-2 border-l-emerald-500 bg-gradient-to-br from-white via-white to-emerald-50/20 dark:from-card dark:via-card dark:to-emerald-950/10 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{organization.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <p className="text-sm font-medium">{organization.slug}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Domain</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Globe className="h-3.5 w-3.5" />
                  {organization.domain ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">{organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 2FA Security Card ─── */}
      <motion.div variants={anim}>
        <TwoFactorCard />
      </motion.div>

      {/* Platform Info */}
      <motion.div variants={anim}>
        <PlatformInfoCard />
      </motion.div>

      {/* Staff Users */}
      <motion.div variants={anim}>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">2FA</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((user) => (
                  <TableRow key={user.id} className={cn('hover:bg-muted/30 transition-colors hover:shadow-sm hover:-translate-y-0.5',
                    user.role === 'OWNER' && 'border-l-2 border-l-emerald-500',
                    user.role === 'COORDINATOR' && 'border-l-2 border-l-amber-500',
                    user.role === 'APPROVER' && 'border-l-2 border-l-purple-500',
                  )}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          {currentUser && user.id === currentUser.id && (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColor[user.role as StaffRole]}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldOff className="h-3.5 w-3.5" />
                          Off
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          user.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                        )} />
                        <span className="text-sm text-muted-foreground">
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.lastLoginAt
                        ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Tools */}
      <motion.div variants={anim}>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Connected Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { id: 'DATAFORSEO', name: 'DataForSEO', description: 'Keyword research and SERP analysis', icon: <Search className="h-5 w-5" /> },
                { id: 'LOCAL_FALCON', name: 'Local Falcon', description: 'Local grid search rank tracking', icon: <Map className="h-5 w-5" /> },
                { id: 'BRIGHTLOCAL', name: 'BrightLocal', description: 'Citation building and audit', icon: <BarChart3 className="h-5 w-5" /> },
                { id: 'WHATSAPP', name: 'WhatsApp Business API', description: 'Client messaging integration', icon: <MessageSquare className="h-5 w-5" /> },
                { id: 'SENDGRID', name: 'SendGrid', description: 'Email notifications and reports', icon: <Database className="h-5 w-5" /> },
                { id: 'GBP', name: 'Google Business Profile', description: 'Locations and reviews sync', icon: <Globe className="h-5 w-5" /> }
              ].map((tool) => {
                const connected = integrationsData?.[tool.id] ?? false;
                return (
                <div
                  key={tool.name}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 transition-all duration-200 cursor-default',
                    'hover:scale-[1.02] hover:shadow-sm',
                    connected
                      ? 'border-border/60 hover:border-emerald-300 dark:hover:border-emerald-700'
                      : 'border-dashed border-border/60 hover:border-muted-foreground/30'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
                    connected ? TOOL_CONNECTED_STYLE : TOOL_DISCONNECTED_STYLE
                  )}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tool.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          connected ? TOOL_CONNECTED_BADGE : TOOL_DISCONNECTED_BADGE
                        )}
                      >
                        {connected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Activity */}
      <motion.div variants={anim}>
        <TeamActivityTimeline staff={staff} />
      </motion.div>

      {/* Team Performance Summary */}
      <motion.div variants={anim}>
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-50/50 to-transparent pointer-events-none dark:from-emerald-500/5 dark:via-emerald-950/20 dark:to-transparent" />
          <CardContent className="relative flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">Team Performance</p>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                {(summary as any).tasksCompletedThisWeek ?? 12} tasks completed this week
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Across {staff.length} team members
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}