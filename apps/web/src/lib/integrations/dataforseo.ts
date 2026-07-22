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
  async getCompetitorBenchmarks(keyword: string, location_name: string) {
    if (!this.isConnected || !this.credentials) throw new Error("DataForSEO Not Connected");

    const authHeader = "Basic " + Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString("base64");

    const response = await fetch("https://api.dataforseo.com/v3/serp/google/maps/live/advanced", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        keyword,
        location_name,
        language_code: "en",
        depth: 10
      }]),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DataForSEO SERP Error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const items = data?.tasks?.[0]?.result?.[0]?.items || [];
    
    return items.map((item: any) => ({
      competitorName: item.title || 'Unknown Competitor',
      competitorGbpId: item.cid,
      competitorUrl: item.url,
      categories: JSON.stringify(item.category ? [item.category] : []),
      avgRating: item.rating?.value,
      reviewCount: item.rating?.votes_count,
      sourceLineage: {
        provider: "DATAFORSEO",
        endpoint: "serp/google/maps/live/advanced",
        keyword,
        locationName: location_name,
        taskId: data?.tasks?.[0]?.id ?? null,
        itemRank: item.rank_group ?? item.rank_absolute ?? null,
        fetchedAt: new Date().toISOString(),
      },
    }));
  }
}
