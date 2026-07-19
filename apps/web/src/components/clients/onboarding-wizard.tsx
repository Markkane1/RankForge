'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, ChevronRight, HelpCircle, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

export function OnboardingWizard({ clientId, clientName, onComplete }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Guided wizard answers
  const [hasSite, setHasSite] = useState<boolean | null>(null);
  const [isIndexable, setIsIndexable] = useState<boolean | null>(null);
  const [hasCmsLogin, setHasCmsLogin] = useState<boolean | null>(null);
  const [wantsSite, setWantsSite] = useState<boolean | null>(null);

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/onboarding-wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSite, isIndexable, hasCmsLogin, wantsSite })
      });
      if (!response.ok) {
        throw new Error('Failed to submit onboarding wizard');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Onboarding checklist processed successfully!');
      setStep(4);
      if (onComplete) onComplete();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Calculate recommendation based on current selections
  const getRecommendation = () => {
    if (hasSite === null) return null;
    if (hasSite) {
      if (hasCmsLogin === false) {
        return {
          title: 'Request CMS Login credentials and hosting details',
          newState: 'BUILD',
          priority: 'HIGH',
          reason: 'Client has an existing website but no admin credentials. Migration/integration task will be assigned.'
        };
      }
      if (isIndexable === false) {
        return {
          title: 'Fix website indexing issues and robots.txt configuration',
          newState: 'BUILD',
          priority: 'CRITICAL',
          reason: 'Website is currently flagged as non-indexable. Resolving crawl issues is blocking local SEO efforts.'
        };
      }
      return {
        title: 'Perform landing page SEO optimization audit & schema integration',
        newState: 'GROWTH',
        priority: 'MEDIUM',
        reason: 'Site is live and indexable. Proceeding straight to technical metadata updates & schema injections.'
      };
    } else {
      if (wantsSite) {
        return {
          title: 'Draft location page template & design mockup for new website',
          newState: 'BUILD',
          priority: 'HIGH',
          reason: 'Client lacks a website and wants one. New layout template drafting will be scheduled.'
        };
      }
      return {
        title: 'Configure off-site Google Business Profile primary content and citations',
        newState: 'GROWTH',
        priority: 'MEDIUM',
        reason: 'Client lacks a website and does not want one. Focus onboarding entirely on off-site GBP optimization.'
      };
    }
  };

  const rec = getRecommendation();

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10 overflow-hidden">
      <CardHeader className="pb-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Site Existence & Onboarding Wizard
            </CardTitle>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Guide client onboarding for <span className="font-semibold">{clientName}</span>
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-none text-[10px]">
            {step < 4 ? `Step ${step} of 3` : 'Completed'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">1. Does the client have an existing website?</h4>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={hasSite === true ? 'default' : 'outline'}
                className={`h-24 flex flex-col gap-2 rounded-xl border transition-all ${
                  hasSite === true 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' 
                    : 'hover:border-emerald-500 hover:bg-emerald-50/30'
                }`}
                onClick={() => setHasSite(true)}
              >
                <span className="text-2xl">🌐</span>
                <span className="text-xs font-bold">Yes, they have a website</span>
              </Button>
              <Button
                variant={hasSite === false ? 'default' : 'outline'}
                className={`h-24 flex flex-col gap-2 rounded-xl border transition-all ${
                  hasSite === false 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' 
                    : 'hover:border-emerald-500 hover:bg-emerald-50/30'
                }`}
                onClick={() => setHasSite(false)}
              >
                <span className="text-2xl">❌</span>
                <span className="text-xs font-bold">No website yet</span>
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                disabled={hasSite === null}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-9 text-xs"
                onClick={() => setStep(2)}
              >
                Next Step <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {hasSite ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">2a. Is the existing website indexable?</h4>
                  <p className="text-xs text-muted-foreground">Select No if search engine crawlers are blocked (e.g. meta noindex active).</p>
                  <div className="flex gap-3">
                    <Button
                      variant={isIndexable === true ? 'default' : 'outline'}
                      className={`flex-1 h-10 text-xs font-bold transition-all ${
                        isIndexable === true ? 'bg-emerald-600 text-white border-emerald-600' : ''
                      }`}
                      onClick={() => setIsIndexable(true)}
                    >
                      Yes, Indexable
                    </Button>
                    <Button
                      variant={isIndexable === false ? 'default' : 'outline'}
                      className={`flex-1 h-10 text-xs font-bold transition-all ${
                        isIndexable === false ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' : ''
                      }`}
                      onClick={() => setIsIndexable(false)}
                    >
                      No, Indexing issues
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-semibold text-foreground">2b. Do we have CMS login access credentials?</h4>
                  <p className="text-xs text-muted-foreground">Do we have access to WordPress, Webflow, Shopify, or hosting cPanel?</p>
                  <div className="flex gap-3">
                    <Button
                      variant={hasCmsLogin === true ? 'default' : 'outline'}
                      className={`flex-1 h-10 text-xs font-bold transition-all ${
                        hasCmsLogin === true ? 'bg-emerald-600 text-white border-emerald-600' : ''
                      }`}
                      onClick={() => setHasCmsLogin(true)}
                    >
                      Yes, CMS Access Active
                    </Button>
                    <Button
                      variant={hasCmsLogin === false ? 'default' : 'outline'}
                      className={`flex-1 h-10 text-xs font-bold transition-all ${
                        hasCmsLogin === false ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' : ''
                      }`}
                      onClick={() => setHasCmsLogin(false)}
                    >
                      No, Access Needed
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">2a. Does the client want a website built?</h4>
                <p className="text-xs text-muted-foreground">Select Yes to auto-assign location landing page design and wireframing tasks.</p>
                <div className="flex gap-3">
                  <Button
                    variant={wantsSite === true ? 'default' : 'outline'}
                    className={`flex-1 h-12 text-xs font-bold transition-all ${
                      wantsSite === true ? 'bg-emerald-600 text-white border-emerald-600' : ''
                    }`}
                    onClick={() => setWantsSite(true)}
                  >
                    Yes, build a site/landing page
                  </Button>
                  <Button
                    variant={wantsSite === false ? 'default' : 'outline'}
                    className={`flex-1 h-12 text-xs font-bold transition-all ${
                      wantsSite === false ? 'bg-emerald-600 text-white border-emerald-600' : ''
                    }`}
                    onClick={() => setWantsSite(false)}
                  >
                    No website wanted (Off-site only)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                className="h-9 text-xs border-emerald-200"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                disabled={hasSite ? (isIndexable === null || hasCmsLogin === null) : wantsSite === null}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-9 text-xs"
                onClick={() => setStep(3)}
              >
                View Assessment <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && rec && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">3. Guided Onboarding Summary</h4>
            
            <div className="space-y-3 bg-white dark:bg-card border rounded-xl p-4 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Existing Website:</span>
                <span className="font-semibold">{hasSite ? 'Yes' : 'No'}</span>
              </div>
              {hasSite ? (
                <>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Indexable:</span>
                    <span className="font-semibold">{isIndexable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CMS Access:</span>
                    <span className="font-semibold">{hasCmsLogin ? 'Yes' : 'No'}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Needs New Site:</span>
                  <span className="font-semibold">{wantsSite ? 'Yes' : 'No'}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b items-center">
                <span className="text-muted-foreground">Target Lifecycle State:</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">
                  {rec.newState}
                </Badge>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Auto-Assigned Onboarding Task</span>
              </div>
              <p className="text-xs font-bold text-foreground">{rec.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.reason}</p>
              <div className="flex gap-2 pt-1">
                <Badge variant="outline" className="text-[9px] bg-white border-emerald-200">
                  Priority: {rec.priority}
                </Badge>
                <Badge variant="outline" className="text-[9px] bg-white border-emerald-200">
                  Module: M2
                </Badge>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                className="h-9 text-xs border-emerald-200"
                onClick={() => setStep(2)}
                disabled={onboardingMutation.isPending}
              >
                Back
              </Button>
              <Button
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-9 text-xs"
                onClick={() => onboardingMutation.mutate()}
                disabled={onboardingMutation.isPending}
              >
                {onboardingMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Apply Onboarding Setup <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Onboarding Complete!</h4>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              The client setup wizard responses have been verified, the lifecycle state has been updated, and the corresponding onboarding tasks have been created on the project board.
            </p>
            <Button
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-4"
              onClick={() => setStep(1)}
            >
              Rerun Wizard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
