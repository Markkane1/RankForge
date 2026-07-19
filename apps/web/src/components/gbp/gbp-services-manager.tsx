'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGbpServices, createGbpService, updateGbpService, deleteGbpService } from '@/lib/api';
import { GbpService } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Edit2, Plus, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpServicesManagerProps {
  clientId: string;
  gbpId: string;
}

export function GbpServicesManager({ clientId, gbpId }: GbpServicesManagerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<GbpService | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [isPriceConfirmed, setIsPriceConfirmed] = useState(false);

  const queryKey = ['gbp-services', clientId, gbpId];

  const { data: services = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getGbpServices(clientId, gbpId),
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriceStr('');
    setIsPriceConfirmed(false);
    setEditingService(null);
  };

  const handleOpenEdit = (service: GbpService) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setPriceStr(service.price ? service.price.toString() : '');
    setIsPriceConfirmed(service.isPriceConfirmed);
    setIsOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createGbpService(clientId, gbpId, data),
    onSuccess: () => {
      toast.success('Service created successfully');
      queryClient.invalidateQueries({ queryKey });
      setIsOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create service'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (!editingService) throw new Error('No service selected');
      return updateGbpService(clientId, gbpId, editingService.id, data);
    },
    onSuccess: () => {
      toast.success('Service updated successfully');
      queryClient.invalidateQueries({ queryKey });
      setIsOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update service'),
  });

  const deleteMut = useMutation({
    mutationFn: (serviceId: string) => deleteGbpService(clientId, gbpId, serviceId),
    onSuccess: () => {
      toast.success('Service deleted successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete service'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(priceStr);
    const hasPrice = !isNaN(priceNum) && priceNum > 0;

    if (hasPrice && !isPriceConfirmed) {
      toast.error('You must confirm the pricing before saving.');
      return;
    }

    const payload = {
      name,
      description: description || null,
      price: hasPrice ? priceNum : null,
      isPriceConfirmed: hasPrice ? isPriceConfirmed : false,
    };

    if (editingService) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const hasPrice = !isNaN(parseFloat(priceStr)) && parseFloat(priceStr) > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Services</h4>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={resetForm}><Plus className="h-4 w-4 mr-2"/> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Price (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="0" className="pl-9" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              {hasPrice && (
                <div className="flex items-start space-x-2 bg-amber-50 p-3 rounded-md border border-amber-200">
                  <Checkbox id="price-confirm" checked={isPriceConfirmed} onCheckedChange={(val) => setIsPriceConfirmed(Boolean(val))} className="mt-1" />
                  <div className="space-y-1 leading-none">
                    <label htmlFor="price-confirm" className="text-sm font-medium text-amber-900 cursor-pointer">
                      Confirm Pricing Accuracy
                    </label>
                    <p className="text-xs text-amber-700">
                      I confirm that this pricing is accurate and ready to be displayed publicly on the Google Business Profile.
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
                {editingService ? 'Save Changes' : 'Add Service'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading services...</p>
      ) : services.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No services added to this location yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service: GbpService) => (
            <Card key={service.id} className="relative group">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(service)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMut.mutate(service.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {service.price ? (
                  <CardDescription className="text-emerald-600 font-medium flex items-center gap-1">
                    ${service.price.toFixed(2)}
                    {service.isPriceConfirmed && <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">Confirmed</span>}
                  </CardDescription>
                ) : (
                  <CardDescription>No price specified</CardDescription>
                )}
              </CardHeader>
              {service.description && (
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                  {service.description}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
