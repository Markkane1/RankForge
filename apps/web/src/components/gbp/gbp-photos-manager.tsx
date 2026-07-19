'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGbpPhotos, uploadGbpPhoto, deleteGbpPhoto } from '@/lib/api';
import { GbpPhoto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpPhotosManagerProps {
  clientId: string;
  gbpId: string;
}

const CATEGORIES = ["EXTERIOR", "INTERIOR", "PRODUCT", "TEAM", "AT_WORK"];

export function GbpPhotosManager({ clientId, gbpId }: GbpPhotosManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("EXTERIOR");

  const queryKey = ['gbp-photos', clientId, gbpId];

  const { data: photos = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getGbpPhotos(clientId, gbpId),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);
      return uploadGbpPhoto(clientId, gbpId, formData);
    },
    onSuccess: () => {
      toast.success('Photo uploaded successfully');
      queryClient.invalidateQueries({ queryKey });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to upload photo');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteMut = useMutation({
    mutationFn: (photoId: string) => deleteGbpPhoto(clientId, gbpId, photoId),
    onSuccess: () => {
      toast.success('Photo deleted successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete photo'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Note: Frontend validations matching backend linters can go here to fail faster,
      // but the core requirement is testing the backend pipeline linters.
      uploadMut.mutate(file);
    }
  };

  const isUploading = uploadMut.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-emerald-600" />
            Photos
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Optimize images before uploading. Max 5MB. No spaces or special characters in filenames.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Upload Zone */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border-2 border-dashed rounded-lg bg-muted/20">
          <div className="w-full sm:w-48">
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isUploading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 w-full relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={isUploading}
            />
            <Button variant="outline" className="w-full h-9 border-dashed disabled:opacity-100" disabled={isUploading}>
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Click or Drag to Upload</>
              )}
            </Button>
          </div>
        </div>

        {/* Gallery */}
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading gallery...</p>
        ) : photos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {photos.map((photo: GbpPhoto) => (
              <div key={photo.id} className="relative group border rounded-md overflow-hidden aspect-square bg-muted">
                {/* Mock Image Display */}
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                  <span className="text-[10px] break-all leading-tight">{photo.url.split('/').pop()}</span>
                </div>
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase">{photo.category}</Badge>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => deleteMut.mutate(photo.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
