'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Clock, ExternalLink, ShieldAlert, FileText, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GbpSuspensionWizardProps {
  clientId: string;
  gbpId: string;
  profileName: string;
}

export function GbpSuspensionWizard({ clientId, gbpId, profileName }: GbpSuspensionWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form states
  const [guidelinesChecked, setGuidelinesChecked] = useState(false);
  const [legalNameVerified, setLegalNameVerified] = useState(false);

  const [hasUtilityBill, setHasUtilityBill] = useState(false);
  const [utilityBillFile, setUtilityBillFile] = useState('');
  
  const [hasBusinessLicense, setHasBusinessLicense] = useState(false);
  const [businessLicenseFile, setBusinessLicenseFile] = useState('');

  const [hasStorefrontPhotos, setHasStorefrontPhotos] = useState(false);
  const [storefrontPhotosFile, setStorefrontPhotosFile] = useState('');

  const [reinstatementMessage, setReinstatementMessage] = useState(
    `Hello GBP Support,\n\nWe request reinstatement for our profile "${profileName}". We have verified that our name and address follow all quality guidelines. Attached, you will find our official business license, registration certificate, and utility bills showing the exact business name and physical address.\n\nThank you for your assistance.`
  );

  // Query existing approvals for this client to see if a suspension response is pending or approved
  const { data: approvals, isLoading } = useQuery<any[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals');
      if (!res.ok) throw new Error('Failed to load approvals');
      return res.json();
    }
  });

  const activeApproval = approvals?.find(
    (app) => app.clientId === clientId && app.requestType === 'SUSPENSION_RESPONSE'
  );

  const createApprovalMutation = useMutation({
    mutationFn: async () => {
      const requestData = {
        gbpId,
        compliance: { guidelinesChecked, legalNameVerified },
        evidence: {
          utilityBill: { present: hasUtilityBill, ref: utilityBillFile },
          businessLicense: { present: hasBusinessLicense, ref: businessLicenseFile },
          storefrontPhotos: { present: hasStorefrontPhotos, ref: storefrontPhotosFile }
        },
        message: reinstatementMessage
      };

      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: `Suspension Reinstatement: ${profileName}`,
          description: `Evidence Pack compiled for suspended profile "${profileName}". Requires human review and authorization before submission.`,
          requestType: 'SUSPENSION_RESPONSE',
          requestData: JSON.stringify(requestData)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit approval request');
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success('Evidence Pack submitted for internal approval!');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setStep(4);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    }
  });

  const allChecksPassed = guidelinesChecked && legalNameVerified;
  const allEvidencePassed = hasUtilityBill && hasBusinessLicense && hasStorefrontPhotos;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Checking suspension status...</div>;
  }

  // If there's an active approval, show status screen
  if (activeApproval) {
    return (
      <Card className="border-red-200 dark:border-red-950 bg-red-50/20 dark:bg-red-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base text-red-900 dark:text-red-400">Suspension Response Wizard</CardTitle>
          </div>
          <CardDescription>
            Active reinstatement request for <strong>{profileName}</strong> is undergoing review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border rounded-lg">
            {activeApproval.status === 'PENDING' && (
              <>
                <Clock className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-400">Awaiting Human Approver Sign-off (Gated)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinator completed the evidence pack checklist. The request is queued for owner or approver validation.
                  </p>
                </div>
              </>
            )}
            {activeApproval.status === 'APPROVED' && (
              <>
                <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-emerald-800 dark:text-emerald-400">Approved by {activeApproval.approvedBy?.name || 'Approver'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The evidence checklist and reinstatement message have been verified and signed off. You may proceed to submit to Google.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    asChild
                  >
                    <a
                      href="https://support.google.com/business/troubleshooter/3481078"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Google Reinstatement Form <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </>
            )}
            {activeApproval.status === 'REJECTED' && (
              <>
                <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-red-800 dark:text-red-400">Evidence Rejected</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {activeApproval.rejectedReason || 'No reason provided.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      // Allow compiling a new pack
                      setStep(1);
                      createApprovalMutation.reset();
                    }}
                  >
                    Revise Evidence Pack
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-950 bg-red-50/10 dark:bg-red-950/5">
      <CardHeader className="pb-3 border-b border-red-100 dark:border-red-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <CardTitle className="text-base font-semibold text-red-950 dark:text-red-400">Suspension Playbook Wizard</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Step {step} of 4</span>
        </div>
        <CardDescription className="text-xs mt-1">
          Follow the playbook sequence to build a compliant GBP reinstatement pack. Every case requires strict human gate verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Step 1: Guidelines Compliance Checklist</h3>
            <p className="text-xs text-muted-foreground">
              Google immediately rejects reinstatement requests if names, addresses, or business setups stuffed with spam words are detected.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-md border">
                <Checkbox id="guidelines" checked={guidelinesChecked} onCheckedChange={(c) => setGuidelinesChecked(!!c)} className="mt-0.5" />
                <Label htmlFor="guidelines" className="text-xs leading-normal font-normal cursor-pointer">
                  <strong>Guideline Audit:</strong> I have confirmed the profile description and categories contain zero phone numbers, website links, or all-caps keyword lists.
                </Label>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-md border">
                <Checkbox id="legalName" checked={legalNameVerified} onCheckedChange={(c) => setLegalNameVerified(!!c)} className="mt-0.5" />
                <Label htmlFor="legalName" className="text-xs leading-normal font-normal cursor-pointer">
                  <strong>Business Name Check:</strong> The business name matches the legal registration name perfectly (no keyword stuffing).
                </Label>
              </div>
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setStep(2)}
              disabled={!allChecksPassed}
            >
              Continue to Evidence Gathering <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Step 2: Collect Reinstatement Evidence</h3>
            <p className="text-xs text-muted-foreground">
              You must upload/document verified proof matching the business details. Provide a filename or location reference for each document.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-md border space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="utility" checked={hasUtilityBill} onCheckedChange={(c) => setHasUtilityBill(!!c)} />
                  <Label htmlFor="utility" className="text-xs font-semibold cursor-pointer">Official Utility Bill</Label>
                </div>
                {hasUtilityBill && (
                  <Input
                    placeholder="e.g. Utility_Bill_June_2026.pdf"
                    className="h-8 text-xs"
                    value={utilityBillFile}
                    onChange={(e) => setUtilityBillFile(e.target.value)}
                  />
                )}
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-md border space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="license" checked={hasBusinessLicense} onCheckedChange={(c) => setHasBusinessLicense(!!c)} />
                  <Label htmlFor="license" className="text-xs font-semibold cursor-pointer">Business Registration Certificate</Label>
                </div>
                {hasBusinessLicense && (
                  <Input
                    placeholder="e.g. LLC_Registration_License.pdf"
                    className="h-8 text-xs"
                    value={businessLicenseFile}
                    onChange={(e) => setBusinessLicenseFile(e.target.value)}
                  />
                )}
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-md border space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="photos" checked={hasStorefrontPhotos} onCheckedChange={(c) => setHasStorefrontPhotos(!!c)} />
                  <Label htmlFor="photos" className="text-xs font-semibold cursor-pointer">Physical Storefront / Vehicle Proof Photos</Label>
                </div>
                {hasStorefrontPhotos && (
                  <Input
                    placeholder="e.g. Storefront_Photo_Outdoor.jpg"
                    className="h-8 text-xs"
                    value={storefrontPhotosFile}
                    onChange={(e) => setStorefrontPhotosFile(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
              <Button
                className="w-2/3 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setStep(3)}
                disabled={!allEvidencePassed || !utilityBillFile || !businessLicenseFile || !storefrontPhotosFile}
              >
                Tailor Request Message <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Step 3: Reinstatement Message & Submission Guidance</h3>
            <p className="text-xs text-muted-foreground">
              Review and tailor the justification message that will be submitted alongside the evidence pack.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Justification Message Template</Label>
              <Textarea
                className="text-xs h-32 font-mono"
                value={reinstatementMessage}
                onChange={(e) => setReinstatementMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/3" onClick={() => setStep(2)}>Back</Button>
              <Button
                className="w-2/3 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => createApprovalMutation.mutate()}
                disabled={createApprovalMutation.isPending || !reinstatementMessage.trim()}
              >
                {createApprovalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for Human Approval <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
