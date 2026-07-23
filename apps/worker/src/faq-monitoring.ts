export type FaqVisibilityEvidence = {
  providerUrl: string;
  query: string;
  visible: boolean;
  position: number | null;
  snippet: string | null;
  url: string | null;
  testedAt: string;
  providerStatus: number | null;
  error: string | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function collectItems(payload: unknown): unknown[] {
  const data = payload as {
    visible?: unknown;
    answer_box?: unknown;
    items?: unknown[];
    organic?: unknown[];
    tasks?: Array<{ result?: Array<{ items?: unknown[] }> }>;
  };

  return [
    data.answer_box,
    ...(Array.isArray(data.items) ? data.items : []),
    ...(Array.isArray(data.organic) ? data.organic : []),
    ...(Array.isArray(data.tasks)
      ? data.tasks.flatMap((task) =>
          Array.isArray(task.result)
            ? task.result.flatMap((result) => (Array.isArray(result.items) ? result.items : []))
            : [],
        )
      : []),
  ].filter(Boolean);
}

export function parseFaqVisibilityResponse(
  payload: unknown,
  query: string,
  providerUrl: string,
  testedAt = new Date(),
): FaqVisibilityEvidence {
  const direct = payload as { visible?: unknown; position?: unknown; snippet?: unknown; url?: unknown };
  if (typeof direct.visible === 'boolean') {
    return {
      providerUrl,
      query,
      visible: direct.visible,
      position: typeof direct.position === 'number' ? direct.position : null,
      snippet: text(direct.snippet) || null,
      url: text(direct.url) || null,
      testedAt: testedAt.toISOString(),
      providerStatus: 200,
      error: null,
    };
  }

  const normalizedQuery = normalize(query);
  for (const [index, candidate] of collectItems(payload).entries()) {
    const item = candidate as {
      type?: unknown;
      title?: unknown;
      snippet?: unknown;
      text?: unknown;
      question?: unknown;
      url?: unknown;
      rank_group?: unknown;
      rank_absolute?: unknown;
      position?: unknown;
    };
    const haystack = normalize([
      text(item.type),
      text(item.title),
      text(item.snippet),
      text(item.text),
      text(item.question),
    ].join(' '));
    const isFaqLike = haystack.includes('faq') || haystack.includes(normalizedQuery);

    if (isFaqLike) {
      const position =
        typeof item.position === 'number'
          ? item.position
          : typeof item.rank_group === 'number'
            ? item.rank_group
            : typeof item.rank_absolute === 'number'
              ? item.rank_absolute
              : index + 1;
      return {
        providerUrl,
        query,
        visible: true,
        position,
        snippet: text(item.snippet) || text(item.text) || null,
        url: text(item.url) || null,
        testedAt: testedAt.toISOString(),
        providerStatus: 200,
        error: null,
      };
    }
  }

  return {
    providerUrl,
    query,
    visible: false,
    position: null,
    snippet: null,
    url: null,
    testedAt: testedAt.toISOString(),
    providerStatus: 200,
    error: null,
  };
}

export async function fetchFaqVisibility(
  providerUrl: string,
  apiKey: string,
  query: string,
  testedAt = new Date(),
): Promise<FaqVisibilityEvidence> {
  const queryUrl = `${providerUrl}?q=${encodeURIComponent(query)}`;
  const response = await fetch(queryUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return {
      providerUrl,
      query,
      visible: false,
      position: null,
      snippet: null,
      url: null,
      testedAt: testedAt.toISOString(),
      providerStatus: response.status,
      error: `SERP provider returned ${response.status}`,
    };
  }

  return parseFaqVisibilityResponse(await response.json(), query, providerUrl, testedAt);
}
