import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const clients = await db.client.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      gbpProfiles: {
        select: { isVerified: true, reviews: { select: { rating: true } } },
      },
    },
  });

  if (clients.length === 0) {
    return new NextResponse('No clients found', { headers: { 'Content-Type': 'text/plain' } });
  }

  const header = 'Name,Business Name,Type,City,State,Country,Phone,Email,Website,Lifecycle State,GBP Verified,Review Count,Avg Rating,Active,Created At,Updated At';
  const rows = clients.map((c) => {
    const esc = (v?: string | null) => {
      if (!v) return '';
      return `"${v.replace(/"/g, '""')}"`;
    };
    const primaryProfile = c.gbpProfiles?.[0];
    const reviews = primaryProfile?.reviews ?? [];
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : '';
    return [
      esc(c.name),
      esc(c.businessName),
      c.type,
      esc(c.city),
      esc(c.state),
      c.country,
      esc(c.phone),
      esc(c.email),
      esc(c.website),
      c.lifecycleState,
      primaryProfile?.isVerified ? 'Yes' : 'No',
      reviewCount,
      avgRating,
      c.isActive ? 'Yes' : 'No',
      c.createdAt.toISOString(),
      c.updatedAt.toISOString(),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}