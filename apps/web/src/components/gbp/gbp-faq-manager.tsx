'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle, Trash2, Plus, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpFaqManagerProps {
  clientId: string;
  gbpId: string;
}

export function GbpFaqManager({ clientId, gbpId }: GbpFaqManagerProps) {
  const queryClient = useQueryClient();
  const queryKey = ['gbp-faqs', clientId, gbpId];

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const { data: faqs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/faqs`);
      if (!res.ok) throw new Error("Failed to load FAQs");
      return res.json();
    },
  });

  const addFaqMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) throw new Error("Failed to add FAQ");
      return res.json();
    },
    onSuccess: () => {
      toast.success("FAQ added successfully");
      setQuestion('');
      setAnswer('');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Failed to add FAQ"),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (faqId: string) => {
      const res = await fetch(`/api/clients/${clientId}/gbp/${gbpId}/faqs/${faqId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete FAQ");
    },
    onSuccess: () => {
      toast.success("FAQ deleted");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Failed to delete FAQ"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-600" />
            FAQ Ask-Maps Monitor
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {faqs.length} Tracked
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Manage FAQ content and view visibility metrics. The background monitor regularly runs test queries to check if these FAQs appear in public search results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 border rounded-md p-3 bg-muted/20">
          <Input 
            placeholder="Question" 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)} 
            className="text-sm"
          />
          <Textarea 
            placeholder="Answer" 
            value={answer} 
            onChange={(e) => setAnswer(e.target.value)} 
            className="text-sm h-20"
          />
          <Button 
            size="sm" 
            onClick={() => addFaqMutation.mutate()} 
            disabled={!question || !answer || addFaqMutation.isPending}
            className="w-full sm:w-auto mt-1"
          >
            <Plus className="h-4 w-4 mr-2" /> Add FAQ
          </Button>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No FAQs added yet.</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq: any) => {
              const totalTests = faq.passCount + faq.failCount;
              const visibilityRate = totalTests > 0 ? Math.round((faq.passCount / totalTests) * 100) : 0;
              
              return (
                <div key={faq.id} className="rounded-lg border p-3 flex flex-col gap-2 relative group">
                  <div className="flex justify-between items-start gap-4 pr-6">
                    <div>
                      <p className="text-sm font-semibold">{faq.question}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-[10px] pt-2 border-t mt-1">
                    <Badge variant={visibilityRate >= 80 ? "default" : visibilityRate > 0 ? "secondary" : "outline"} className="text-[10px]">
                      Visibility: {totalTests > 0 ? `${visibilityRate}%` : "Not Tested"}
                    </Badge>
                    
                    {faq.lastTestedAt && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Tested: {new Date(faq.lastTestedAt).toLocaleDateString()}
                      </span>
                    )}
                    
                    {totalTests > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Search className="h-3 w-3" />
                        {totalTests} Checks (Pass: {faq.passCount}, Fail: {faq.failCount})
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    onClick={() => deleteFaqMutation.mutate(faq.id)}
                    disabled={deleteFaqMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
