import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import crypto from "crypto";

export class BrightLocalClient {
  private organizationId: string;
  private apiKey: string | null = null;
  private apiSecret: string | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async init() {
    const cred = await db.orgCredential.findFirst({
      where: { organizationId: this.organizationId, service: "BRIGHTLOCAL", isValid: true },
    });

    if (cred) {
      try {
        const decrypted = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
        const parsed = JSON.parse(decrypted);
        this.apiKey = parsed.apiKey;
        this.apiSecret = parsed.apiSecret;
      } catch (e) {
        // Fallback for single key
        this.apiKey = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
      }
    }
  }

  get isConnected() {
    return this.apiKey !== null;
  }

  private getSignature(expires: number) {
    if (!this.apiKey || !this.apiSecret) return "";
    return crypto.createHmac("sha256", this.apiSecret)
      .update(this.apiKey + expires)
      .digest("base64");
  }

  async getCitationTrackerReport(locationId: string) {
    if (!this.isConnected) throw new Error("BrightLocal Not Connected");

    const expires = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    const sig = this.getSignature(expires);

    const response = await fetch(`https://tools.brightlocal.com/seo-tools/api/v4/ct/get-results?location-id=${locationId}`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey as string,
        "sig": sig,
        "expires": expires.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BrightLocal API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  }
}
