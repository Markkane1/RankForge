import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { GBP_OAUTH_SERVICE } from '@rankforge/database';
import { google } from 'googleapis';
import { CredentialsService } from '../security/credentials.service';
import { requireEnv } from '../../env';

@Injectable()
export class GbpService {
  constructor(private credentialsService: CredentialsService) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      requireEnv('GOOGLE_CLIENT_ID'),
      requireEnv('GOOGLE_CLIENT_SECRET'),
      requireEnv('GOOGLE_REDIRECT_URI'),
    );
  }

  private getOAuthStateSecret() {
    const secret =
      process.env.OAUTH_STATE_SECRET ??
      process.env.NEXTAUTH_SECRET ??
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'OAUTH_STATE_SECRET, NEXTAUTH_SECRET, or JWT_SECRET is required',
      );
    }

    return secret;
  }

  private signStatePayload(payload: string) {
    return crypto
      .createHmac('sha256', this.getOAuthStateSecret())
      .update(payload)
      .digest('base64url');
  }

  createOAuthState(clientId: string) {
    const payload = Buffer.from(
      JSON.stringify({ clientId, iat: Date.now() }),
    ).toString('base64url');
    const signature = this.signStatePayload(payload);

    return `${payload}.${signature}`;
  }

  verifyOAuthState(state: string, maxAgeMs = 10 * 60 * 1000) {
    const [payload, signature] = state.split('.');

    if (!payload || !signature) {
      throw new Error('Invalid OAuth state');
    }

    const expected = this.signStatePayload(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new Error('Invalid OAuth state');
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());

    if (!parsed.clientId || Date.now() - parsed.iat > maxAgeMs) {
      throw new Error('Invalid OAuth state');
    }

    return parsed.clientId as string;
  }

  getAuthUrl(clientId: string): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/business.manage'],
      state: this.createOAuthState(clientId),
    });
  }

  async handleOAuthCallback(code: string, state: string): Promise<string> {
    const clientId = this.verifyOAuthState(state);
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.access_token) {
      await this.credentialsService.setClientCredential(
        clientId,
        GBP_OAUTH_SERVICE,
        tokens.access_token,
        tokens.refresh_token ?? undefined,
        tokens.scope,
        tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      );
    }

    return clientId;
  }

  async getLocations(clientId: string) {
    const creds = await this.credentialsService.getClientCredential(
      clientId,
      GBP_OAUTH_SERVICE,
    );
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: creds.token,
      refresh_token: creds.refreshToken,
    });

    const mybusinessbusinessinformation = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: oauth2Client,
    });

    // Get accounts first (simplified example)
    const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
      version: 'v1',
      auth: oauth2Client,
    });

    const accounts = await mybusinessaccountmanagement.accounts.list();
    if (!accounts.data.accounts || accounts.data.accounts.length === 0) {
      return [];
    }

    const accountName = accounts.data.accounts[0].name;

    // List locations for the first account
    const locations =
      await mybusinessbusinessinformation.accounts.locations.list({
        parent: accountName ?? undefined,
        readMask: 'name,title,storeCode,categories,latlng,websiteUri',
      });

    return locations.data.locations || [];
  }

  async updateProfile(
    clientId: string,
    data: {
      description?: string;
      phone?: string;
      websiteUrl?: string;
      secondaryCategories?: string[];
      serviceAreas?: any[];
    },
  ) {
    // Ponytail backend validators for REQ-M1-15
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        throw new Error(
          'Invalid phone number: must be between 10 and 15 digits.',
        );
      }
    }

    if (data.websiteUrl) {
      try {
        new URL(data.websiteUrl);
      } catch (e) {
        throw new Error('Invalid URL format for website.');
      }
    }

    if (data.description) {
      if (data.description.length > 750) {
        throw new Error('Description exceeds 750 character limit.');
      }

      const letters = data.description.replace(/[^a-zA-Z]/g, '');
      if (letters.length > 0) {
        const upperCount = (letters.match(/[A-Z]/g) || []).length;
        if (upperCount / letters.length > 0.5) {
          throw new Error(
            'Description rejected: contains more than 50% uppercase letters (ALL-CAPS linter).',
          );
        }
      }
    }

    if (data.secondaryCategories && data.secondaryCategories.length > 9) {
      throw new Error(
        'Cannot exceed 9 secondary categories per GBP requirements.',
      );
    }

    if (data.serviceAreas && data.serviceAreas.length > 20) {
      throw new Error('Cannot exceed 20 service areas per GBP requirements.');
    }

    // In a real scenario, this would push updates to Google via OAuth client
    // For now, return a successful validation response
    return { success: true, message: 'Profile data passed strict validation.' };
  }
}
