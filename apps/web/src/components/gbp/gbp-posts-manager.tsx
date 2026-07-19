'use client';

import { useQuery } from '@tanstack/react-query';
import { getGbpPosts } from '@/lib/api';
import { GbpPost } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, AlertCircle } from 'lucide-react';

export interface GbpPostsManagerProps {
  clientId: string;
  gbpId: string;
}

export function GbpPostsManager({ clientId, gbpId }: GbpPostsManagerProps) {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gbp-posts', clientId, gbpId],
    queryFn: () => getGbpPosts(clientId, gbpId),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Content Calendar (Post Rotation)
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {posts.length} generated
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Automatically generated weekly posts based on primary keyword topics. 
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading generated posts...</p>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No posts have been generated yet.</p>
            <p className="text-xs text-muted-foreground">The Monthly Post Generator worker job runs on the 1st of every month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: GbpPost) => (
              <div key={post.id} className="rounded-lg border p-4 hover:border-emerald-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold">{post.title}</h4>
                  <Badge variant={post.status === 'PUBLISHED' ? 'default' : 'secondary'} className="text-[10px]">
                    {post.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{post.content}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground border-t pt-2 mt-2">
                  <span>Scheduled: {post.startDate ? new Date(post.startDate).toLocaleDateString() : 'N/A'}</span>
                  <span>Type: {post.eventType}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
