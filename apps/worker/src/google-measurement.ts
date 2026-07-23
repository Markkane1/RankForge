type Db = {
  leadLogEntry: {
    createMany(args: { data: Array<Record<string, unknown>>; skipDuplicates: boolean }): Promise<{ count: number }>;
  };
};

type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type GscRow = {
  keys?: string[];
  clicks?: number;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function ingestGa4OrganicSearchConversions(input: {
  db: Db;
  clientId: string;
  propertyId: string;
  accessToken: string;
  startDate: Date;
  endDate: Date;
}) {
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${input.propertyId}:runReport`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: isoDate(input.startDate), endDate: isoDate(input.endDate) }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'conversions' }],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: { matchType: 'EXACT', value: 'Organic Search' },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 Data API returned ${response.status}`);
  }

  const payload = await response.json() as { rows?: Ga4Row[] };
  const rows = (payload.rows ?? [])
    .map((row) => {
      const date = row.dimensionValues?.[0]?.value;
      const conversions = Number(row.metricValues?.[0]?.value ?? 0);
      if (!date || conversions <= 0) return null;
      return {
        clientId: input.clientId,
        source: 'ORGANIC_SEARCH',
        value: conversions,
        providerEventId: `GA4:${input.propertyId}:${date}:organic-search-conversions`,
        sourceLineage: JSON.stringify({
          provider: 'GA4',
          endpoint,
          request: { propertyId: input.propertyId, date },
        }),
        convertedAt: new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00.000Z`),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!rows.length) return 0;
  const result = await input.db.leadLogEntry.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

export async function ingestGscOrganicClicks(input: {
  db: Db;
  clientId: string;
  siteUrl: string;
  accessToken: string;
  startDate: Date;
  endDate: Date;
}) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      startDate: isoDate(input.startDate),
      endDate: isoDate(input.endDate),
      dimensions: ['date'],
      type: 'web',
    }),
  });

  if (!response.ok) {
    throw new Error(`GSC Search Analytics API returned ${response.status}`);
  }

  const payload = await response.json() as { rows?: GscRow[] };
  const rows = (payload.rows ?? [])
    .map((row) => {
      const date = row.keys?.[0];
      const clicks = Number(row.clicks ?? 0);
      if (!date || clicks <= 0) return null;
      return {
        clientId: input.clientId,
        source: 'ORGANIC_SEARCH',
        value: clicks,
        providerEventId: `GSC:${input.siteUrl}:${date}:organic-clicks`,
        sourceLineage: JSON.stringify({
          provider: 'GSC',
          endpoint,
          request: { siteUrl: input.siteUrl, date },
        }),
        convertedAt: new Date(`${date}T00:00:00.000Z`),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!rows.length) return 0;
  const result = await input.db.leadLogEntry.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}
