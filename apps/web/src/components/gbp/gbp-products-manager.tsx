'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGbpProducts, createGbpProduct, updateGbpProduct, deleteGbpProduct } from '@/lib/api';
import { GbpProduct } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus, DollarSign, Link as LinkIcon, ExternalLink, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpProductsManagerProps {
  clientId: string;
  gbpId: string;
}

export function GbpProductsManager({ clientId, gbpId }: GbpProductsManagerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GbpProduct | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [url, setUrl] = useState('');

  const queryKey = ['gbp-products', clientId, gbpId];

  const { data: products = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getGbpProducts(clientId, gbpId),
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPriceStr('');
    setUrl('');
    setEditingProduct(null);
  };

  const handleOpenEdit = (product: GbpProduct) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setCategory(product.category || '');
    setPriceStr(product.price ? product.price.toString() : '');
    setUrl(product.url || '');
    setIsOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createGbpProduct(clientId, gbpId, data),
    onSuccess: () => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey });
      setIsOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create product'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (!editingProduct) throw new Error('No product selected');
      return updateGbpProduct(clientId, gbpId, editingProduct.id, data);
    },
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey });
      setIsOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update product'),
  });

  const deleteMut = useMutation({
    mutationFn: (productId: string) => deleteGbpProduct(clientId, gbpId, productId),
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete product'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(priceStr);
    const hasPrice = !isNaN(priceNum) && priceNum > 0;

    const payload = {
      name,
      description: description || null,
      category: category || null,
      price: hasPrice ? priceNum : null,
      url: url || null,
    };

    if (editingProduct) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Products</h4>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={resetForm}><Plus className="h-4 w-4 mr-2"/> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Plumbing Kits" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (Optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" step="0.01" min="0" className="pl-9" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Landing Page URL (Optional)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="url" className="pl-9" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {url ? 'Verifying Link & Saving...' : 'Saving...'}
                  </>
                ) : editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products...</p>
      ) : products.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No products added to this location yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product: GbpProduct) => (
            <Card key={product.id} className="relative group">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    {product.category && (
                      <CardDescription className="text-xs">{product.category}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(product)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMut.mutate(product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {product.price && (
                  <CardDescription className="text-emerald-600 font-medium">
                    ${product.price.toFixed(2)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {product.description && (
                  <p className="text-sm text-muted-foreground">
                    {product.description}
                  </p>
                )}
                
                {product.url && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <a href={product.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      View Page
                    </a>
                    {product.isUrlValid ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Link Verified
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Broken Link
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
