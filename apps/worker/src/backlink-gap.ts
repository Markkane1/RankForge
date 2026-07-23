export type DataForSeoCredentials = { login: string; password: string };

export type BacklinkOpportunityInput = {
  url: string;
  domainRating: number | null;
  competitorUrl: string;
};

export function parseDataForSeoCredentials(secret: string): DataForSeoCredentials {
  try {
    const parsed = JSON.parse(secret) as Partial<DataForSeoCredentials>;
    if (parsed.login && parsed.password) return { login: parsed.login, password: parsed.password };
  } catch {
    // Fall through to token-as-password compatibility.
  }
  return { login: 'default', password: secret };
}

export function normalizeBacklinkGapResponse(payload: any, competitorUrl: string): BacklinkOpportunityInput[] {
  const items = payload?.tasks?.[0]?.result?.[0]?.items ?? [];
  return items
    .map((item: any) => ({
      url: item.url_from || item.referring_page || item.page_from || item.url,
      domainRating: item.domain_from_rank ?? item.rank ?? null,
      competitorUrl,
    }))
    .filter((item: { url?: string }) => Boolean(item.url));
}

export async function fetchDataForSeoBacklinkGap(
  credentials: DataForSeoCredentials,
  competitorUrl: string,
): Promise<BacklinkOpportunityInput[]> {
  const authHeader = `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')}`;
  const response = await fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      target: competitorUrl,
      limit: 50,
      order_by: ['rank,desc'],
    }]),
  });
  if (!response.ok) {
    throw new Error(`DataForSEO Backlinks Error: ${response.status} ${await response.text()}`);
  }
  return normalizeBacklinkGapResponse(await response.json(), competitorUrl);
}

export async function upsertBacklinkOpportunities(
  tenantDb: {
    backlinkOpportunity: {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
      update: (args: unknown) => Promise<unknown>;
      create: (args: unknown) => Promise<unknown>;
    };
  },
  clientId: string,
  opportunities: BacklinkOpportunityInput[],
) {
  let saved = 0;
  for (const opportunity of opportunities) {
    const existing = await tenantDb.backlinkOpportunity.findFirst({
      where: { clientId, url: opportunity.url, competitorUrl: opportunity.competitorUrl },
    });
    if (existing) {
      await tenantDb.backlinkOpportunity.update({
        where: { id: existing.id },
        data: { domainRating: opportunity.domainRating, status: 'NEW' },
      });
    } else {
      await tenantDb.backlinkOpportunity.create({
        data: {
          clientId,
          url: opportunity.url,
          domainRating: opportunity.domainRating,
          competitorUrl: opportunity.competitorUrl,
          status: 'NEW',
        },
      });
    }
    saved++;
  }
  return saved;
}
