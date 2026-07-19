import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CredentialsService } from '../security/credentials.service';

@Injectable()
export class DataforseoService {
  private readonly apiUrl = 'https://api.dataforseo.com/v3';

  constructor(private credentialsService: CredentialsService) {}

  private async getAuthHeaders(organizationId: string) {
    const credsStr = await this.credentialsService.getOrgCredential(organizationId, 'DATAFORSEO');
    // Assuming credsStr is 'login:password'
    const encoded = Buffer.from(credsStr).toString('base64');
    return {
      'Authorization': `Basic ${encoded}`,
      'Content-Type': 'application/json'
    };
  }

  async getKeywordRankings(organizationId: string, keyword: string, location: string) {
    const headers = await this.getAuthHeaders(organizationId);
    
    // Simplistic integration for demonstration
    const postData = [{
      keyword,
      location_name: location,
      language_name: 'English'
    }];

    try {
      const response = await fetch(`${this.apiUrl}/serp/google/organic/live/regular`, {
        method: 'POST',
        headers,
        body: JSON.stringify(postData)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new HttpException(data, response.status);
      }
      
      return data;
    } catch (e) {
      throw new HttpException('DataForSEO API Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
