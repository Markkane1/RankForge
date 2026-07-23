import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { GBP_OAUTH_SERVICE } from "@rankforge/database";

export class GbpClient {
  private organizationId: string;
  private apiKey: string | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async init() {
    const cred = await db.clientCredential.findFirst({
      where: {
        service: GBP_OAUTH_SERVICE,
        isValid: true,
        client: { organizationId: this.organizationId },
      },
    });

    if (cred) {
      this.apiKey = await decryptSecret(cred.encryptedToken);
    }
  }

  get isConnected() {
    return this.apiKey !== null;
  }

  // Get Google Business Locations
  async getLocations(accountId: string = "-") {
    if (!this.isConnected) throw new Error("GBP Not Connected");

    const response = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Business API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.locations || [];
  }
}
