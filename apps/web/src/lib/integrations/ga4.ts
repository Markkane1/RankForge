import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { google } from 'googleapis';

export class Ga4Client {
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  async getAnalyticsClient() {
    const cred = await db.clientCredential.findFirst({
      where: { clientId: this.clientId, service: "GA4", isValid: true },
    });

    if (!cred) {
      throw new Error("GA4 Not Connected for this client");
    }

    const decryptedToken = await decryptSecret(cred.encryptedToken);
    const decryptedRefresh = cred.refreshToken ? await decryptSecret(cred.refreshToken) : null;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: decryptedToken,
      refresh_token: decryptedRefresh,
    });

    return google.analyticsdata({ version: "v1beta", auth: oauth2Client });
  }

  async getPageViews(propertyId: string, startDate: string, endDate: string) {
    const analyticsData = await this.getAnalyticsClient();
    
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        dimensions: [{ name: "date" }]
      }
    });

    return response.data;
  }
}
