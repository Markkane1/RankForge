import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { CredentialsService } from '../security/credentials.service';

@Injectable()
export class GbpService {
  constructor(private credentialsService: CredentialsService) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(clientId: string): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
      ],
      state: clientId, // Pass the clientId in the state to know who is connecting
    });
  }

  async handleOAuthCallback(code: string, clientId: string): Promise<void> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.access_token) {
      await this.credentialsService.setClientCredential(
        clientId,
        'GBP',
        tokens.access_token,
        tokens.refresh_token ?? undefined,
        tokens.scope,
        tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
      );
    }
  }

  async getLocations(clientId: string) {
    const creds = await this.credentialsService.getClientCredential(clientId, 'GBP');
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
        auth: oauth2Client
    });
    
    const accounts = await mybusinessaccountmanagement.accounts.list();
    if (!accounts.data.accounts || accounts.data.accounts.length === 0) {
        return [];
    }

    const accountName = accounts.data.accounts[0].name;

    // List locations for the first account
    const locations = await mybusinessbusinessinformation.accounts.locations.list({
      parent: accountName ?? undefined,
      readMask: 'name,title,storeCode,categories,latlng,websiteUri',
    });

    return locations.data.locations || [];
  }

  async updateProfile(clientId: string, data: { description?: string; phone?: string; websiteUrl?: string; secondaryCategories?: string[]; serviceAreas?: any[] }) {
    // Ponytail backend validators for REQ-M1-15
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        throw new Error('Invalid phone number: must be between 10 and 15 digits.');
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
          throw new Error('Description rejected: contains more than 50% uppercase letters (ALL-CAPS linter).');
        }
      }
    }

    if (data.secondaryCategories && data.secondaryCategories.length > 9) {
      throw new Error('Cannot exceed 9 secondary categories per GBP requirements.');
    }

    if (data.serviceAreas && data.serviceAreas.length > 20) {
      throw new Error('Cannot exceed 20 service areas per GBP requirements.');
    }

    // In a real scenario, this would push updates to Google via OAuth client
    // For now, return a successful validation response
    return { success: true, message: 'Profile data passed strict validation.' };
  }
}
