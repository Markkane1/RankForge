'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getClients, createClient, importClientsCsv } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
// Progress no longer needed — using inline SVG ring
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Search, Star, MapPin, ShieldCheck, ShieldAlert, ShieldX, Building2, ArrowRight, Plus, Loader2, Download, LayoutGrid, List, ChevronLeft, User, Globe, Upload, FileUp, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { ClientListItem, ClientType } from '@/lib/types';
import { ClientDetailPanel } from './client-detail-panel';

const clientFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  businessName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  type: z.enum(['SERVICE_AREA_BUSINESS', 'STOREFRONT_BUSINESS']),
  notes: z.string().optional().or(z.literal('')),
  primaryCategory: z.string().optional().or(z.literal('')),
  secondaryCategories: z.string().optional().or(z.literal('')),
  gbpDescription: z.string().optional().or(z.literal('')),
  businessHours: z.string().optional().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const stateConfig: Record<string, { color: string; bg: string; label: string }> = {
  ONBOARDING: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Onboarding' },
  BUILD: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Build' },
  GROWTH: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Growth' },
  AT_RISK: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'At Risk' },
  PAUSED: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Paused' },
};

const typeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  SERVICE_AREA_BUSINESS: { label: 'Service Area', icon: <MapPin className="h-3 w-3" /> },
  STOREFRONT_BUSINESS: { label: 'Storefront', icon: <Building2 className="h-3 w-3" /> },
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-3.5 w-3.5',
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-foreground/80">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-muted-foreground">({count})</span>
    </div>
  );
}

const container: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ─── Import CSV Dialog ───

function ImportCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const importMut = useMutation({
    mutationFn: (f: File) => importClientsCsv(f),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Imported ${data.imported} client${data.imported !== 1 ? 's' : ''}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null);
      setResult(null);
      importMut.reset();
    }
    onOpenChange(open);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
    } else {
      toast.error('Please drop a .csv file');
    }
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
              Import CSV
            </DialogTitle>
            <DialogDescription className="mt-1">
              Upload a CSV file to import clients in bulk.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  {result.imported} client{result.imported !== 1 ? 's' : ''} imported successfully
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {result.errors.length} warning{result.errors.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{err}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                  dragOver ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border/60 hover:border-muted-foreground/30',
                  file && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) setFile(f);
                  };
                  input.click();
                }}
              >
                {file ? (
                  <>
                    <FileUp className="h-8 w-8 text-emerald-600" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Drag & drop a CSV file here, or click to browse</p>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                CSV columns: <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">name</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">businessName</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">phone</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">email</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">website</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">address</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">city</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">state</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">postalCode</code>
              </p>

              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={!file || importMut.isPending}
                onClick={() => file && importMut.mutate(file)}
              >
                {importMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Import
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [serviceAreas, setServiceAreas] = useState<Array<{ name: string; city: string; radiusMiles: string; isPrimary: boolean }>>([]);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      businessName: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: 'US',
      postalCode: '',
      type: 'SERVICE_AREA_BUSINESS',
      notes: '',
      primaryCategory: '',
      secondaryCategories: '',
      gbpDescription: '',
      businessHours: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      const cleaned: Record<string, string | undefined> = { ...data };
      for (const key of Object.keys(cleaned)) {
        if (key === 'name' || key === 'type') continue;
        if (cleaned[key] === '') cleaned[key] = undefined;
      }
      const payload: Record<string, unknown> = cleaned;
      // Add service areas if any
      if (serviceAreas.length > 0) {
        payload.serviceAreas = serviceAreas.map((sa) => ({
          name: sa.name,
          city: sa.city || undefined,
          radiusMiles: sa.radiusMiles ? Number(sa.radiusMiles) : undefined,
          isPrimary: sa.isPrimary,
        }));
      }
      return createClient(payload as unknown as Parameters<typeof createClient>[0]);
    },
    onSuccess: () => {
      toast.success('Client created successfully');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      form.reset();
      setStep(1);
      setServiceAreas([]);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create client');
    },
  });

  const onSubmit = (values: ClientFormValues) => {
    mutation.mutate(values);
  };

  const handleClose = (v: boolean) => {
    if (!v || !mutation.isPending) { onOpenChange(v); form.reset(); setStep(1); setServiceAreas([]); }
  };

  const nameValue = form.watch('name');
  const canContinue = step === 1 && nameValue?.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-lg" />
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <Plus className="h-4 w-4 text-emerald-600" />
              </div>
              New Client
            </DialogTitle>
            <DialogDescription className="mt-1">Add a new client to your agency. They will start in the Onboarding state.</DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-5">
            {['Business Info', 'Location', 'GBP Profile', 'Service Areas'].map((label, i) => {
              const s = i + 1;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className={cn('h-px w-4 transition-all duration-500', step >= s ? 'bg-emerald-500' : 'bg-border')} />}
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                      step >= s ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {step > s ? '✓' : s}
                    </div>
                    <span className={cn('text-xs font-medium hidden sm:inline', step >= s ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="Contact person name" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="Business name" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="https://example.com" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Business Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SERVICE_AREA_BUSINESS">Service Area Business (SAB)</SelectItem>
                              <SelectItem value="STOREFRONT_BUSINESS">Storefront Business</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              ) : step === 2 ? (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="123 Main St" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="US" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              ) : step === 3 ? (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="primaryCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {['Plumber', 'Dentist', 'Restaurant', 'Auto Repair', 'HVAC', 'Electrician', 'Roofer', 'Landscaping', 'Lawyer', 'Chiropractor', 'Dermatologist', 'Real Estate Agent', 'Insurance Agent', 'Accountant', 'Veterinarian', 'Gym', 'Salon', 'Painter', 'Cleaning Service', 'Locksmith'].map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondaryCategories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Categories</FormLabel>
                        <FormControl>
                          <Input placeholder="Comma-separated, e.g. Emergency Plumber, Water Heater Repair" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gbpDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GBP Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Business description for Google Business Profile..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Hours</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. Mon-Fri 9:00 AM - 5:00 PM, Sat 10:00 AM - 2:00 PM, Sun Closed" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Service Areas</FormLabel>
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setServiceAreas((p) => [...p, { name: '', city: '', radiusMiles: '', isPrimary: p.length === 0 }])}>
                      <Plus className="h-3 w-3" /> Add Service Area
                    </Button>
                  </div>
                  {serviceAreas.length === 0 && <p className="text-xs text-muted-foreground">No service areas added yet. Click the button above to add one.</p>}
                  {serviceAreas.map((sa, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="text-xs text-muted-foreground">Name *</label>
                        <Input className="h-8 text-xs" value={sa.name} onChange={(e) => {
                          const updated = [...serviceAreas]; updated[i] = { ...updated[i], name: e.target.value }; setServiceAreas(updated);
                        }} placeholder="Area name" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">City</label>
                        <Input className="h-8 text-xs" value={sa.city} onChange={(e) => {
                          const updated = [...serviceAreas]; updated[i] = { ...updated[i], city: e.target.value }; setServiceAreas(updated);
                        }} placeholder="City" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Radius (mi)</label>
                        <Input className="h-8 text-xs" type="number" value={sa.radiusMiles} onChange={(e) => {
                          const updated = [...serviceAreas]; updated[i] = { ...updated[i], radiusMiles: e.target.value }; setServiceAreas(updated);
                        }} placeholder="15" />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          className={cn('h-8 px-3 rounded-md border text-xs font-medium transition-colors', sa.isPrimary ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-border text-muted-foreground hover:text-foreground')}
                          onClick={() => {
                            const updated = serviceAreas.map((a, j) => ({ ...a, isPrimary: j === i }));
                            setServiceAreas(updated);
                          }}
                        >
                          {sa.isPrimary ? '★ Primary' : 'Set Primary'}
                        </button>
                        <button type="button" className="h-8 px-2 text-muted-foreground hover:text-red-500 transition-colors" onClick={() => setServiceAreas((p) => p.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-2" />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any notes about this client..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <DialogFooter className="mt-5 pt-4 border-t">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="mr-auto gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => { handleClose(false); }} disabled={mutation.isPending}>
                Cancel
              </Button>
              {step < 4 ? (
                <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canContinue} className="gap-1.5">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Client
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProgressRing({ pct, doneTasks, totalTasks }: { pct: number; doneTasks: number; totalTasks: number }) {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const hasTasks = totalTasks > 0;
  const offset = hasTasks ? circumference * (1 - pct / 100) : circumference;

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-muted"
      />
      {hasTasks && (
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 14 14)"
          className="transition-all duration-500"
        />
      )}
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        className={cn(
          'text-[9px] font-bold fill-current tabular-nums',
          hasTasks ? (pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-amber-600' : 'text-muted-foreground') : 'text-muted-foreground'
        )}
      >
        {hasTasks ? `${pct}` : '—'}
      </text>
    </svg>
  );
}

function ClientCard({ client, selectedClientId, onSelect }: { client: ClientListItem; selectedClientId: string | null; onSelect: (id: string) => void }) {
  const state = stateConfig[client.lifecycleState];
  const typeConf = typeConfig[client.type];
  const doneTasks = client.taskCounts.DONE ?? 0;
  const totalTasks = Object.values(client.taskCounts).reduce((a, b) => a + b, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const hasGbp = client.gbpProfiles && client.gbpProfiles.length > 0;
  const primaryGbp = hasGbp ? client.gbpProfiles[0] : null;

  return (
    <motion.div variants={item}>
      <Card
        className={cn(
          'group cursor-pointer border border-border/40 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-[2px]',
          selectedClientId === client.id && 'ring-2 ring-emerald-500/30 border-emerald-300 shadow-md'
        )}
        onClick={() => onSelect(client.id)}
      >
        {/* Top accent line on hover - colored by lifecycle state */}
        <div className={cn(
          'h-0.5 w-full absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity',
          client.lifecycleState === 'GROWTH' ? 'bg-emerald-500' :
          client.lifecycleState === 'ONBOARDING' ? 'bg-blue-500' :
          client.lifecycleState === 'BUILD' ? 'bg-amber-500' :
          client.lifecycleState === 'AT_RISK' ? 'bg-red-500' :
          client.lifecycleState === 'PAUSED' ? 'bg-purple-500' :
          'bg-gray-400'
        )} />
        <CardContent className="p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-foreground group-hover:text-emerald-700 transition-colors">
                {client.name}
              </h3>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-[10px] font-normal border-dashed">
                  {typeConf.icon}
                  {typeConf.label}
                </Badge>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-[11px] font-semibold border shrink-0 transition-all duration-300 group-hover:brightness-110', state.bg, state.color, client.lifecycleState === 'AT_RISK' && 'animate-breathe')}>
              {state.label}
            </Badge>
          </div>

          {client.city && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{client.city}{client.state ? `, ${client.state}` : ''}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {hasGbp && primaryGbp ? (
                primaryGbp.isSuspended ? (
                  <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700 text-[10px] font-medium">
                    <ShieldAlert className="h-3 w-3" /> Suspended
                  </Badge>
                ) : primaryGbp.isVerified ? (
                  <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-gray-200 bg-gray-50 text-gray-600 text-[10px] font-medium">
                    <ShieldX className="h-3 w-3" /> Unverified
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-[10px] font-normal border-dashed text-muted-foreground">
                  No GBP
                </Badge>
              )}
            </div>
            {primaryGbp && primaryGbp.reviewCount > 0 && (
              <StarRating rating={primaryGbp.avgRating ?? 0} count={primaryGbp.reviewCount} />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Task Progress</span>
              <span className={cn(
                'font-semibold',
                pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                {doneTasks}/{totalTasks} ({pct}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ProgressRing pct={pct} doneTasks={doneTasks} totalTasks={totalTasks} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
            </p>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ClientListRow({ client, selectedClientId, onSelect }: { client: ClientListItem; selectedClientId: string | null; onSelect: (id: string) => void }) {
  const state = stateConfig[client.lifecycleState];
  const typeConf = typeConfig[client.type];
  const doneTasks = client.taskCounts.DONE ?? 0;
  const totalTasks = Object.values(client.taskCounts).reduce((a, b) => a + b, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg px-3 py-2.5 cursor-pointer hover:shadow-sm hover:bg-muted/20 transition-all duration-200',
        selectedClientId === client.id && 'bg-emerald-50/60 dark:bg-emerald-950/20'
      )}
      onClick={() => onSelect(client.id)}
    >
      <div className="flex items-center gap-2.5 w-[240px] shrink-0 min-w-0">
        {typeConf.icon}
        <span className="text-sm font-medium truncate">{client.name}</span>
      </div>
      <Badge variant="outline" className={cn('text-[10px] font-semibold border shrink-0 w-[100px] hidden sm:flex justify-center transition-all duration-200 group-hover:brightness-110', state.bg, state.color)}>
        {state.label}
      </Badge>
      <span className="w-[160px] shrink-0 text-xs text-muted-foreground truncate hidden md:block">
        {client.city}{client.state ? `, ${client.state}` : ''}
      </span>
      <div className="flex-1 items-center gap-2 hidden lg:flex">
        <ProgressRing pct={pct} doneTasks={doneTasks} totalTasks={totalTasks} />
        <span className="text-[11px] font-medium text-muted-foreground w-12 text-right">{pct}%</span>
      </div>
      <span className="w-[120px] shrink-0 text-right text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
      </span>
    </div>
  );
}

export function ClientsView() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { selectedClientId, setSelectedClientId } = useAppStore();

  const { data: clients, isLoading, error } = useQuery<ClientListItem[]>({
    queryKey: ['clients', search, stateFilter],
    queryFn: () =>
      getClients({
        search: search || undefined,
        state: stateFilter !== 'ALL' ? stateFilter : undefined,
      }),
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        {/* Header + Filters */}
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, city, or state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full h-9 border-0 bg-muted/50 sm:w-[170px]">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All States</SelectItem>
                  <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                  <SelectItem value="BUILD">Build</SelectItem>
                  <SelectItem value="GROWTH">Growth</SelectItem>
                  <SelectItem value="AT_RISK">At Risk</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => { if (v) setViewMode(v as 'grid' | 'list'); }} className="border border-border/60 rounded-lg">
                  <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9 p-0 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9 p-0 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button
                  size="sm"
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Import CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
                  onClick={() => window.open('/api/export/clients', '_blank')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Export</span>
                </Button>
              </div>
              {clients && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {clients.length} client{clients.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Client Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-6"
            >
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </CardContent>
                  </Card>
                ))}

              {error && (
                <p className="col-span-full py-12 text-center text-red-500">
                  Failed to load clients.
                </p>
              )}

              {clients?.map((client) => (
                <ClientCard key={client.id} client={client} selectedClientId={selectedClientId} onSelect={setSelectedClientId} />
              ))}

              {!isLoading && clients?.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-2xl bg-muted/40 p-6 mb-4">
                    <Search className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No clients found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="p-4 sm:p-6"
            >
              {isLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg p-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-2 w-32" />
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="py-12 text-center text-red-500">Failed to load clients.</p>
              )}

              {!isLoading && clients && clients.length > 0 && (
                <div className="space-y-1">
                  {/* List header */}
                  <div className="flex items-center gap-4 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    <span className="w-[240px] shrink-0">Name</span>
                    <span className="w-[100px] shrink-0 hidden sm:block">State</span>
                    <span className="w-[160px] shrink-0 hidden md:block">City</span>
                    <span className="flex-1 hidden lg:block">Progress</span>
                    <span className="w-[120px] shrink-0 text-right">Updated</span>
                  </div>
                  {clients.map((client) => (
                    <ClientListRow key={client.id} client={client} selectedClientId={selectedClientId} onSelect={setSelectedClientId} />
                  ))}
                </div>
              )}

              {!isLoading && clients?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-2xl bg-muted/40 p-6 mb-4">
                    <Search className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No clients found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Client Detail Panel */}
      <AnimatePresence>
        {selectedClientId && (
          <ClientDetailPanel
            clientId={selectedClientId}
            onClose={() => setSelectedClientId(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Client Dialog */}
      <CreateClientDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Import CSV Dialog */}
      <ImportCsvDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}