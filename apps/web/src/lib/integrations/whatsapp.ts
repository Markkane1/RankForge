import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export class WhatsAppClient {
  private organizationId: string;
  private accessToken: string | null = null;
  private phoneNumberId: string | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async init() {
    const cred = await db.orgCredential.findFirst({
      where: { organizationId: this.organizationId, service: "WHATSAPP", isValid: true },
    });

    if (cred) {
      // Assuming encryptedKey holds JSON with { accessToken, phoneNumberId } or similar
      try {
        const decrypted = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
        const payload = JSON.parse(decrypted);
        this.accessToken = payload.accessToken || null;
        this.phoneNumberId = payload.phoneNumberId || null;
      } catch (e) {
        // Fallback for raw string token
        this.accessToken = await decryptSecret(cred.encryptedKey, cred.keyId || undefined);
      }
    }
  }

  get isConnected() {
    return this.accessToken !== null;
  }

  // Example WhatsApp Meta Graph API method
  async sendMessage(to: string, message: string) {
    if (!this.isConnected) throw new Error("WhatsApp Not Connected");
    
    if (!this.phoneNumberId) throw new Error("Missing WhatsApp Phone Number ID");

    const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { preview_url: false, body: message }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API Error: ${response.status} ${errorText}`);
    }

    return await response.json();
  }
}
