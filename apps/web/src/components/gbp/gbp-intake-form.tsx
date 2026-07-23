'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateGbpProfile, getGbpCategoryMetadata } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, AlertTriangle, Plus, X, Upload, Image as ImageIcon, ExternalLink, Loader2, Clock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CompetitorBenchmark, GbpProfileData } from '@/lib/types';
import { GbpVerificationWizard } from './gbp-verification-wizard';
import { GbpPhotosManager } from './gbp-photos-manager';

export interface GbpIntakeFormProps {
  clientId: string;
  gbpId: string;
  initialData?: GbpProfileData;
  competitorBenchmarks?: CompetitorBenchmark[];
}

export function getScoredCategoryCandidates(competitorBenchmarks: Pick<CompetitorBenchmark, 'categories' | 'avgRating' | 'photoCount'>[]) {
  const scored = new Map<string, { category: string; competitorCount: number; ratingTotal: number; ratingCount: number; photoTarget: number }>();

  for (const benchmark of competitorBenchmarks) {
    if (!benchmark.categories) continue;
    let categories: string[];
    try {
      const parsed = JSON.parse(benchmark.categories);
      categories = Array.isArray(parsed) ? parsed : [];
    } catch {
      categories = benchmark.categories.split(',');
    }

    for (const category of new Set(categories.map((item) => item.trim()).filter(Boolean))) {
      const current = scored.get(category) ?? {
        category,
        competitorCount: 0,
        ratingTotal: 0,
        ratingCount: 0,
        photoTarget: 0,
      };
      current.competitorCount += 1;
      if (typeof benchmark.avgRating === 'number') {
        current.ratingTotal += benchmark.avgRating;
        current.ratingCount += 1;
      }
      current.photoTarget = Math.max(current.photoTarget, benchmark.photoCount ?? 0);
      scored.set(category, current);
    }
  }

  return Array.from(scored.values())
    .map((candidate) => {
      const avgRating = candidate.ratingCount ? candidate.ratingTotal / candidate.ratingCount : 0;
      return {
        category: candidate.category,
        competitorCount: candidate.competitorCount,
        avgRating: avgRating ? Number(avgRating.toFixed(1)) : null,
        photoTarget: candidate.photoTarget || null,
        score: candidate.competitorCount * 100 + avgRating * 10 + candidate.photoTarget / 10,
      };
    })
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))
    .slice(0, 5);
}

export function GbpIntakeForm({ clientId, gbpId, initialData, competitorBenchmarks = [] }: GbpIntakeFormProps) {
  const queryClient = useQueryClient();
  const { data: categoryMetadata } = useQuery({
    queryKey: ['gbpCategoryMetadata'],
    queryFn: () => getGbpCategoryMetadata(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
  const taxonomy = categoryMetadata?.taxonomy ?? {};
  const [isClaimed, setIsClaimed] = useState(initialData?.isVerified ?? false);
  const [accountId, setAccountId] = useState(initialData?.gbpAccountId ?? '');
  const [locationId, setLocationId] = useState(initialData?.gbpLocationId ?? '');
  const [primaryCategory, setPrimaryCategory] = useState(initialData?.primaryCategory ?? '');
  const [secondaryCategories, setSecondaryCategories] = useState(initialData?.secondaryCategories ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? '');
  const [bookingUrl, setBookingUrl] = useState(initialData?.bookingUrl ?? '');
  const [bookingUrlOverrideNote, setBookingUrlOverrideNote] = useState(initialData?.bookingUrlOverrideNote ?? '');
  const [bookingUrlError, setBookingUrlError] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [competitors, setCompetitors] = useState<Array<{ name: string; gbpUrl: string }>>([]);
  const categoryCandidates = useMemo(
    () => getScoredCategoryCandidates(competitorBenchmarks),
    [competitorBenchmarks],
  );

  const selectCandidateCategory = (category: string) => {
    const parent = Object.entries(taxonomy).find(([, children]) =>
      children.includes(category),
    )?.[0];
    setPrimaryCategory(parent ? `${parent} > ${category}` : category);
  };
  const selectedCategoryName = primaryCategory.includes(' > ')
    ? primaryCategory.split(' > ')[1]
    : primaryCategory;
  const syncedAttributes = selectedCategoryName
    ? categoryMetadata?.attributes[selectedCategoryName] ?? []
    : [];

  const saveMut = useMutation({
    mutationFn: () => updateGbpProfile(clientId, gbpId, {
      isVerified: isClaimed,
      gbpAccountId: accountId || undefined,
      gbpLocationId: locationId || undefined,
      primaryCategory: primaryCategory || undefined,
      secondaryCategories: secondaryCategories || undefined,
      description: description || undefined,
      phone: phone || undefined,
      websiteUrl: websiteUrl || undefined,
      bookingUrl: bookingUrl || undefined,
      bookingUrlOverrideNote: bookingUrlOverrideNote || undefined,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      if (data?.warnings?.some((warning: any) => warning.code === 'BOOKING_URL_UNREACHABLE')) {
        toast.warning('GBP profile updated with booking URL override note');
      } else {
        toast.success('GBP profile updated');
      }
      setBookingUrlError(null);
    },
    onError: (err: any) => {
      // If error indicates BOOKING_URL_UNREACHABLE or similar, we set error state
      if (err.message.includes("BOOKING_URL_UNREACHABLE") || err.message.includes("URL returned status") || err.message.includes("Failed to resolve")) {
        setBookingUrlError("The booking URL appears to be unreachable. Please verify the link, or provide an override note to save it anyway.");
        toast.error("Booking URL is unreachable. See form for details.");
      } else {
        toast.error(err.message);
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Section 1: Business Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Business Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Is the GBP already claimed?</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Has the client already verified their Google Business Profile?</p>
            </div>
            <Switch checked={isClaimed} onCheckedChange={setIsClaimed} />
          </div>
          {isClaimed && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">Account ID</Label>
                  <Input className="h-8 text-sm mt-1" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="GMB Account ID" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Location ID</Label>
                  <Input className="h-8 text-sm mt-1" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="GMB Location ID" />
                </div>
              </div>
              <Badge className={cn('text-xs', isClaimed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                {isClaimed ? '✓ Claimed' : 'Not Claimed'}
              </Badge>
            </>
          )}
          {!isClaimed && <GbpVerificationWizard clientId={clientId} gbpId={gbpId} />}
        </CardContent>
      </Card>

      {/* Section 2: Business Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Business Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryCandidates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Competitor-derived candidates</Label>
              <div className="flex flex-wrap gap-2">
                {categoryCandidates.map((candidate) => (
                  <Button
                    key={candidate.category}
                    type="button"
                    variant={primaryCategory.endsWith(candidate.category) ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto min-h-8 flex-col items-start gap-0 px-2 py-1 text-left"
                    onClick={() => selectCandidateCategory(candidate.category)}
                  >
                    <span className="text-xs font-medium">{candidate.category}</span>
                    <span className="text-[10px] font-normal opacity-70">
                      {candidate.competitorCount} competitors
                      {candidate.avgRating ? `, ${candidate.avgRating} avg` : ''}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium">Industry (Parent)</Label>
              <Select 
                value={primaryCategory.split(' > ')[0] || ''} 
                onValueChange={(val) => setPrimaryCategory(val + ' > ')}
              >
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select industry..." /></SelectTrigger>
                <SelectContent>
                  {Object.keys(taxonomy).map((parent) => (
                    <SelectItem key={parent} value={parent}>{parent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Primary Category (Child)</Label>
              <Select 
                value={primaryCategory.split(' > ')[1] || ''} 
                onValueChange={(val) => {
                  const parent = primaryCategory.split(' > ')[0] || Object.keys(taxonomy)[0];
                  setPrimaryCategory(`${parent} > ${val}`);
                }}
                disabled={!primaryCategory.includes(' > ')}
              >
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select specific category..." /></SelectTrigger>
                <SelectContent>
                  {(taxonomy[primaryCategory.split(' > ')[0]] || []).map((child: string) => (
                    <SelectItem key={child} value={child}>{child}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Secondary Categories</Label>
            <Input className="h-8 text-sm mt-1" value={secondaryCategories} onChange={(e) => setSecondaryCategories(e.target.value)} placeholder="Comma-separated categories" />
          </div>
          {syncedAttributes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs font-medium">Synced category attributes</Label>
                {categoryMetadata?.lastSyncedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Synced {new Date(categoryMetadata.lastSyncedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {syncedAttributes.map((attribute) => (
                  <Badge key={attribute} variant="secondary" className="text-[10px]">
                    {attribute}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Business Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Business Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={(e) => { if (e.target.value.length <= 750) setDescription(e.target.value); }}
            placeholder="Write a compelling business description for Google Business Profile..."
            rows={4}
          />
          <p className={cn('text-xs mt-1', description.length >= 750 ? 'text-red-500' : 'text-muted-foreground')}>
            {description.length}/750 characters
          </p>
        </CardContent>
      </Card>

      {/* Section 4: Business Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Business Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Phone</Label>
            <Input className="h-8 text-sm mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label className="text-xs font-medium">Website</Label>
            <Input className="h-8 text-sm mt-1" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div className="pt-2">
            <Label className="text-xs font-medium">Booking / Appointment URL</Label>
            <Input 
              className={cn("h-8 text-sm mt-1", bookingUrlError ? "border-red-500 bg-red-50" : "")} 
              value={bookingUrl} 
              onChange={(e) => { setBookingUrl(e.target.value); setBookingUrlError(null); }} 
              placeholder="https://booking.example.com" 
            />
            {bookingUrlError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {bookingUrlError}
                </p>
                <Label className="text-xs font-semibold text-red-700">Override Note (Required to save unreachable link)</Label>
                <Textarea 
                  className="mt-1 text-sm bg-white border-red-200" 
                  value={bookingUrlOverrideNote} 
                  onChange={(e) => setBookingUrlOverrideNote(e.target.value)} 
                  placeholder="e.g., The booking portal soft-launches next Tuesday." 
                  rows={2} 
                />
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium">Hours of Operation</Label>
            <Textarea className="mt-1" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon-Fri 9:00 AM - 5:00 PM, Sat 10:00 AM - 2:00 PM" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Photos */}
      <GbpPhotosManager
        clientId={clientId}
        gbpId={gbpId}
        competitorBenchmarks={competitorBenchmarks}
      />

      {/* Section 6: Competitor List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Competitor List</CardTitle>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setCompetitors((p) => [...p, { name: '', gbpUrl: '' }])}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="text-xs text-muted-foreground">No competitors added yet.</p>
          ) : (
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="h-8 text-xs flex-1" value={c.name} onChange={(e) => {
                    const u = [...competitors]; u[i] = { ...u[i], name: e.target.value }; setCompetitors(u);
                  }} placeholder="Competitor name" />
                  <Input className="h-8 text-xs flex-1" value={c.gbpUrl} onChange={(e) => {
                    const u = [...competitors]; u[i] = { ...u[i], gbpUrl: e.target.value }; setCompetitors(u);
                  }} placeholder="GBP URL" />
                  <button className="text-muted-foreground/40 hover:text-red-500 transition-colors" onClick={() => setCompetitors((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {competitors.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Competitor analysis will run in Sprint 2
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
      >
        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save & Continue
      </Button>
    </div>
  );
}
