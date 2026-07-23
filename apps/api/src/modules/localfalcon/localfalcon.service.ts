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

    try {
      const response = await fetch(`${this.apiUrl}/scans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, lat, lng }),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
          `Local Falcon API returned ${response.status}${details ? `: ${details}` : ''}`,
        );
      }

      return await response.json();
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Local Falcon API integration failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
