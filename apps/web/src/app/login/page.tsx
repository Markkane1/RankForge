'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, Smartphone } from 'lucide-react';

type LoginStep = 'credentials' | 'totp' | 'magic-link';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Persist email across steps so the 2FA step knows which account
  const [pendingEmail, setPendingEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      totp: step === 'totp' ? totp : undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      // ─── 2FA required: switch to OTP step ───
      if (result.error === '2FA_REQUIRED') {
        setPendingEmail(email);
        setStep('totp');
        setTotp('');
        return;
      }

      // ─── All other errors: show generic message ───
      setError(result.error || 'Invalid email or password');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTotp('');
    setError('');
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error || 'Failed to send magic link');
      } else {
        alert("Check your email (or simulated logs) for the magic link!");
        if (data.link) {
          console.log(`[DEV TEST MAGIC LINK]: ${data.link}`);
        }
      }
    } catch (err: any) {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10 p-4">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2 pt-8 px-8">
          {/* Logo */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>

          {/* Branding */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                SEO Delivery
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 'totp'
                ? 'Enter your 2FA code'
                : 'Sign in to your agency dashboard'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </div>
            )}

            {step === 'credentials' ? (
              <>
                {/* ─── Email ─── */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="h-10"
                  />
                </div>

                {/* ─── Password ─── */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('magic-link'); setError(''); }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Client? Sign in with Magic Link
                  </button>
                </div>
              </>
            ) : step === 'totp' ? (
              /* ─── 2FA TOTP Step ─── */
              <>
                <div className="flex items-center justify-center text-muted-foreground mb-2">
                  <Smartphone className="h-5 w-5 mr-2" />
                  <span className="text-sm">
                    Enter the 6-digit code from your authenticator app
                  </span>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totp}
                    onChange={(value) => {
                      setTotp(value);
                      if (value.length === 6) {
                        setError('');
                      }
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

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToCredentials}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </>
            ) : step === 'magic-link' ? (
              <>
                {/* ─── Magic Link Step ─── */}
                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-sm font-medium">
                    Client Email
                  </Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="client@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="h-10"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleMagicLinkSubmit}
                  disabled={loading || !email}
                  className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToCredentials}
                  className="w-full text-muted-foreground hover:text-foreground mt-2"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to staff login
                </Button>
              </>
            ) : null}

            {step === 'credentials' || step === 'totp' ? (
              <Button
                type="submit"
                disabled={loading || (step === 'totp' && totp.length !== 6)}
                className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === 'totp' ? 'Verifying...' : 'Signing in...'}
                  </>
                ) : step === 'totp' ? (
                  'Verify'
                ) : (
                  'Sign in'
                )}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
