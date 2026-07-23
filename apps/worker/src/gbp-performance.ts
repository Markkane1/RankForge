type DateParts = { year: number; month: number; day: number };

type DailyMetricSeries = {
  dailyMetric?: string;
  metric?: string;
  timeSeries?: {
    datedValues?: Array<{
      date?: DateParts;
      value?: number | string;
    }>;
  };
  datedValues?: Array<{
    date?: DateParts;
    value?: number | string;
  }>;
};

export const GBP_PERFORMANCE_DAILY_METRICS = [
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'WEBSITE_CLICKS',
] as const;

export const GBP_PERFORMANCE_SOURCE_MAP: Record<string, 'GBP_CALL' | 'GBP_DIRECTIONS' | 'GBP_WEBSITE'> = {
  CALL_CLICKS: 'GBP_CALL',
  BUSINESS_DIRECTION_REQUESTS: 'GBP_DIRECTIONS',
  WEBSITE_CLICKS: 'GBP_WEBSITE',
};

export type GbpPerformanceLeadEvent = {
  clientId: string;
  gbpProfileId: string;
  source: 'GBP_CALL' | 'GBP_DIRECTIONS' | 'GBP_WEBSITE';
  providerEventId: string;
  createdAt: Date;
  convertedAt: Date;
  notes: string;
  sourceLineage: string;
};

export type GbpPerformanceRequest = {
  clientId: string;
  gbpProfileId: string;
  locationName: string;
  startDate: Date;
  endDate: Date;
  accessToken: string;
  fetchedAt?: Date;
};

function toGoogleDate(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateKey(parts: DateParts): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function eventDate(parts: DateParts): Date {
  return new Date(`${dateKey(parts)}T12:00:00.000Z`);
}

function normalizeLocationName(locationName: string): string {
  const trimmed = locationName.trim();
  if (trimmed.startsWith('locations/')) return trimmed;
  return `locations/${trimmed}`;
}

function metricSeriesFromResponse(payload: unknown): DailyMetricSeries[] {
  if (!payload || typeof payload !== 'object') return [];
  const body = payload as {
    multiDailyMetricTimeSeries?: DailyMetricSeries[];
    dailyMetricTimeSeries?: DailyMetricSeries[];
  };
  if (Array.isArray(body.multiDailyMetricTimeSeries)) return body.multiDailyMetricTimeSeries;
  if (Array.isArray(body.dailyMetricTimeSeries)) return body.dailyMetricTimeSeries;
  return [];
}

export function parseGbpPerformanceLeadEvents(
  payload: unknown,
  request: Omit<GbpPerformanceRequest, 'accessToken'>,
): GbpPerformanceLeadEvent[] {
  const fetchedAt = request.fetchedAt ?? new Date();
  const locationName = normalizeLocationName(request.locationName);
  const events: GbpPerformanceLeadEvent[] = [];

  for (const series of metricSeriesFromResponse(payload)) {
    const metric = series.dailyMetric ?? series.metric;
    const source = metric ? GBP_PERFORMANCE_SOURCE_MAP[metric] : undefined;
    if (!metric || !source) continue;

    const datedValues = series.timeSeries?.datedValues ?? series.datedValues ?? [];
    for (const point of datedValues) {
      if (!point.date) continue;
      const count = Math.max(0, Number(point.value ?? 0));
      if (!Number.isFinite(count) || count <= 0) continue;

      const occurredAt = eventDate(point.date);
      const day = dateKey(point.date);
      for (let index = 0; index < Math.floor(count); index += 1) {
        const providerEventId = `GBP_PERFORMANCE:${request.gbpProfileId}:${day}:${metric}:${index + 1}`;
        const lineage = {
          provider: 'GBP_PERFORMANCE',
          endpoint: `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`,
          request: {
            locationName,
            dailyMetric: metric,
            date: day,
            gbpProfileId: request.gbpProfileId,
          },
          fetchedAt: fetchedAt.toISOString(),
          rawValue: point.value ?? 0,
        };

        events.push({
          clientId: request.clientId,
          gbpProfileId: request.gbpProfileId,
          source,
          providerEventId,
          createdAt: occurredAt,
          convertedAt: occurredAt,
          notes: JSON.stringify({
            ingestion: 'gbp-performance',
            metric,
            metricDate: day,
            fetchedAt: fetchedAt.toISOString(),
          }),
          sourceLineage: JSON.stringify(lineage),
        });
      }
    }
  }

  return events;
}

export async function fetchGbpPerformancePayload(request: GbpPerformanceRequest): Promise<unknown> {
  const locationName = normalizeLocationName(request.locationName);
  const url = new URL(
    `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`,
  );
  for (const metric of GBP_PERFORMANCE_DAILY_METRICS) {
    url.searchParams.append('dailyMetrics', metric);
  }
  const start = toGoogleDate(request.startDate);
  const end = toGoogleDate(request.endDate);
  url.searchParams.set('dailyRange.startDate.year', String(start.year));
  url.searchParams.set('dailyRange.startDate.month', String(start.month));
  url.searchParams.set('dailyRange.startDate.day', String(start.day));
  url.searchParams.set('dailyRange.endDate.year', String(end.year));
  url.searchParams.set('dailyRange.endDate.month', String(end.month));
  url.searchParams.set('dailyRange.endDate.day', String(end.day));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${request.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`GBP Performance API returned ${response.status}`);
  }
  return response.json();
}

export async function ingestGbpPerformanceLeads(
  db: {
    leadLogEntry: {
      createMany: (args: { data: GbpPerformanceLeadEvent[]; skipDuplicates: boolean }) => Promise<{ count: number }>;
    };
  },
  request: GbpPerformanceRequest,
): Promise<{ created: number; events: GbpPerformanceLeadEvent[] }> {
  const payload = await fetchGbpPerformancePayload(request);
  const events = parseGbpPerformanceLeadEvents(payload, request);
  if (events.length === 0) return { created: 0, events };

  const result = await db.leadLogEntry.createMany({
    data: events,
    skipDuplicates: true,
  });

  return { created: result.count, events };
}
