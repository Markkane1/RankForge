'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Loader2, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';
import Image from 'next/image';

export default function TwoFactorSetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.twoFactorVerified === true) {
        router.push('/');
      } else {
        fetchSetupData();
      }
    }
  }, [status, session, router]);

  const fetchSetupData = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize setup');
      }
      setQrCodeUrl(data.qrCodeUrl);
      setSetupSecret(data.secret);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (totp.length !== 6) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totp }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setBackupCodes(data.backupCodes);

      // We might need to force a re-login to re-issue the JWT with twoFactorVerified=true.
      // NextAuth update() only updates session if the jwt callback is configured to take session update data.
      await fetch('/api/auth/session?update', { method: 'POST' }); // Some next-auth trick, or just reload
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-50/30 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2 pt-8 px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Security Required</h1>
            <p className="text-sm text-muted-foreground">
              Your account requires Two-Factor Authentication. Please set it up now.
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {backupCodes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-emerald-600 space-x-2">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">2FA Enabled Successfully!</span>
              </div>
              <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600">
                  Save these backup codes in a secure location. You will only see them once.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-3 border rounded">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="text-center">{code}</div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={copyBackupCodes}>
                  {copied ? 'Copied!' : <><Copy className="mr-2 h-4 w-4" /> Copy Codes</>}
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = '/api/auth/signout?callbackUrl=/login'; // Sign out so they can log back in fully verified
                }}
              >
                Log out to complete setup
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center space-y-4 bg-white p-4 rounded-lg border">
                {qrCodeUrl ? (
                  <Image src={qrCodeUrl} alt="QR Code" width={150} height={150} className="rounded-md" />
                ) : (
                  <div className="h-[150px] w-[150px] bg-slate-100 animate-pulse rounded-md" />
                )}
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Or enter this code manually:</p>
                  <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">{setupSecret}</code>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify setup.
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totp}
                    onChange={(value) => {
                      setTotp(value);
                      if (value.length === 6) setError('');
                    }}
                    autoFocus
                  >
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
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={verifying || totp.length !== 6}
                onClick={handleVerify}
              >
                {verifying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  'Verify and Enable'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
