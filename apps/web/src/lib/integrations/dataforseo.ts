import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export class DataForSeoClient {
  private organizationId: string;
  private credentials: { login: string; password: string } | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async init() {
    const cred = await db.orgCredential.findFirst({
      where: { organizationId: this.organizationId, service: "DATAFORSEO", isValid: true },
    });

    if (cred) {
      try {
        const decrypted = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
        this.credentials = JSON.parse(decrypted);
      } catch (e) {
        // If raw string token
        const decryptedFallback = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
        this.credentials = { login: "default", password: decryptedFallback };
      }
    }
  }

  get isConnected() {
    return this.credentials !== null;
  }

  async getSearchVolume(keyword: string) {
    if (!this.isConnected || !this.credentials) throw new Error("DataForSEO Not Connected");

    const authHeader = "Basic " + Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString("base64");

    const response = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        location_code: 2840, // default to US, can be parameterized
        language_code: "en",
        keywords: [keyword]
      }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DataForSEO API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    const taskResult = data?.tasks?.[0]?.result?.[0];
    const volume = taskResult?.search_volume ?? 0;

    return {
      keyword,
      volume,
      sourceLineage: {
        provider: "DATAFORSEO",
        endpoint: "dataforseo_labs/google/search_volume/live",
        keyword,
        locationCode: 2840,
        taskId: data?.tasks?.[0]?.id ?? null,
        statusCode: data?.tasks?.[0]?.status_code ?? null,
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  // REQ-M1-06: Competitor geo-point benchmark audit using DataForSEO
  async getCompetitorBenchmarks(keywords: string[], locationNames: string[]) {
    if (!this.isConnected || !this.credentials) throw new Error("DataForSEO Not Connected");

    const authHeader = "Basic " + Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString("base64");
    const tasks = keywords.flatMap((keyword) =>
      locationNames.map((locationName) => ({
        keyword,
        location_name: locationName,
        language_code: "en",
        depth: 10,
      })),
    );

    const response = await fetch("https://api.dataforseo.com/v3/serp/google/maps/live/advanced", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DataForSEO SERP Error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const competitors = new Map<string, {
      competitorName: string;
      competitorGbpId?: string;
      competitorUrl?: string;
      categories: Set<string>;
      ratings: number[];
      reviewCounts: number[];
      photoCounts: number[];
      observations: Array<{
        keyword: string;
        locationName: string;
        rank: number | null;
        taskId: string | null;
      }>;
    }>();

    data?.tasks?.forEach((task: any, index: number) => {
      const request = tasks[index];
      const items = task?.result?.[0]?.items ?? [];

      items.forEach((item: any) => {
        const key = String(item.cid || item.title || item.url || `unknown-${index}`);
        const existing = competitors.get(key) ?? {
          competitorName: item.title || "Unknown Competitor",
          competitorGbpId: item.cid,
          competitorUrl: item.url,
          categories: new Set<string>(),
          ratings: [],
          reviewCounts: [],
          photoCounts: [],
          observations: [],
        };

        if (item.category) existing.categories.add(item.category);
        if (typeof item.rating?.value === "number") existing.ratings.push(item.rating.value);
        if (typeof item.rating?.votes_count === "number") existing.reviewCounts.push(item.rating.votes_count);
        if (typeof item.photos_count === "number") existing.photoCounts.push(item.photos_count);
        existing.observations.push({
          keyword: request.keyword,
          locationName: request.location_name,
          rank: item.rank_group ?? item.rank_absolute ?? null,
          taskId: task?.id ?? null,
        });

        competitors.set(key, existing);
      });
    });

    const average = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

    return Array.from(competitors.values()).map((competitor) => {
      const avgRating = average(competitor.ratings);
      const avgReviews = average(competitor.reviewCounts);
      const avgPhotos = average(competitor.photoCounts);

      return {
        competitorName: competitor.competitorName,
        competitorGbpId: competitor.competitorGbpId,
        competitorUrl: competitor.competitorUrl,
        categories: JSON.stringify(Array.from(competitor.categories)),
        avgRating: avgRating === null ? null : Number(avgRating.toFixed(2)),
        reviewCount: avgReviews === null ? null : Math.round(avgReviews),
        photoCount: avgPhotos === null ? null : Math.round(avgPhotos),
        sourceLineage: {
          provider: "DATAFORSEO",
          endpoint: "serp/google/maps/live/advanced",
          keywords,
          locationNames,
          keywordCount: keywords.length,
          geoPointCount: locationNames.length,
          observationCount: competitor.observations.length,
          observations: competitor.observations,
          fetchedAt: new Date().toISOString(),
        },
      };
    });
  }

  async getBacklinkGap(competitorUrl: string) {
    if (!this.isConnected || !this.credentials) throw new Error("DataForSEO Not Connected");

    const authHeader = "Basic " + Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString("base64");

    const response = await fetch("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        target: competitorUrl,
        limit: 50,
        order_by: ["rank,desc"],
      }]),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DataForSEO Backlinks Error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];

    return items
      .map((item: any) => ({
        url: item.url_from || item.referring_page || item.page_from || item.url,
        domainRating: item.domain_from_rank ?? item.rank ?? null,
        competitorUrl,
      }))
      .filter((item: { url?: string }) => Boolean(item.url));
  }
}
