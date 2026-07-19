import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface GbpVerificationWizardProps {
  clientId: string;
  gbpId: string;
}

export function GbpVerificationWizard({ clientId, gbpId }: GbpVerificationWizardProps) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [pin, setPin] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["gbp-verification-options", clientId, gbpId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/verification`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch verification options");
      }
      return res.json();
    },
    retry: false
  });

  const startMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, phoneNumber })
      });
      if (!res.ok) throw new Error("Failed to start verification");
      return res.json();
    },
    onSuccess: (data) => {
      // response contains name (which includes verificationId)
      const vId = data.name.split('/').pop();
      setVerificationId(vId);
      toast.success("Verification started! Please check for your PIN.");
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, pin })
      });
      if (!res.ok) throw new Error("Failed to complete verification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Location successfully verified!");
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2 mt-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading verification options...</div>;
  if (error) return <div className="text-sm text-red-500 mt-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> {error.message}</div>;
  
  if (data?.verified) {
     return <div className="text-sm text-emerald-600 mt-4 font-medium">✓ This location is already verified.</div>;
  }

  const options = data?.options || [];

  if (verificationId) {
    return (
      <Card className="mt-4 border-emerald-100 bg-emerald-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Complete Verification</CardTitle>
          <CardDescription className="text-xs">Enter the PIN you received via {method}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Verification PIN</Label>
            <Input className="h-8 mt-1" value={pin} onChange={e => setPin(e.target.value)} placeholder="e.g. 123456" />
          </div>
          <Button size="sm" onClick={() => completeMut.mutate()} disabled={completeMut.isPending || !pin}>
            {completeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit PIN
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Verification Wizard</CardTitle>
        <CardDescription className="text-xs">Select an available method to verify this Google Business Profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground">No verification options available for this location. Ensure address is set.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Verification Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt: any, i: number) => (
                    <SelectItem key={i} value={opt.verificationMethod}>
                      {opt.verificationMethod} {opt.phoneData?.phoneNumber && `(${opt.phoneData.phoneNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {method && options.find((o: any) => o.verificationMethod === method)?.phoneData && (
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input 
                  className="h-8 mt-1" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder={options.find((o: any) => o.verificationMethod === method)?.phoneData?.phoneNumber}
                />
              </div>
            )}

            <Button size="sm" onClick={() => startMut.mutate()} disabled={startMut.isPending || !method}>
              {startMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
