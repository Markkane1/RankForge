import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CredentialsService } from '../security/credentials.service';

@Injectable()
export class LocalfalconService {
  private readonly apiUrl = 'https://api.localfalcon.com/v1';

  constructor(private credentialsService: CredentialsService) {}

  async triggerGeoGridScan(
    organizationId: string,
    keyword: string,
    lat: number,
    lng: number,
  ) {
    const apiKey = await this.credentialsService.getOrgCredential(
      organizationId,
      'LOCAL_FALCON',
    );

    // In a real scenario, we would post to Local Falcon to start a scan
    // For now, this is the structural proxy

    try {
      // Mocking the fetch call structure for Local Falcon API
      const response = await fetch(`${this.apiUrl}/scans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, lat, lng }),
      });

      if (!response.ok) {
        // If it fails (e.g. because of dummy API key during dev), we handle it gracefully
        throw new Error('Local Falcon API Error');
      }

      return await response.json();
    } catch (e) {
      // Return a simulated structured error or fallback data for the UI if API keys aren't set up yet
      throw new HttpException(
        'LocalFalcon API Integration not fully configured',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
  }
}
