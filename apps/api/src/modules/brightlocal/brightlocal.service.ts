import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CredentialsService } from '../security/credentials.service';

@Injectable()
export class BrightlocalService {
  private readonly apiUrl = 'https://tools.brightlocal.com/seo-tools/api/v4';

  constructor(private credentialsService: CredentialsService) {}

  async getCitationAudits(organizationId: string, locationId: string) {
    const apiKey = await this.credentialsService.getOrgCredential(organizationId, 'BRIGHTLOCAL');
    
    try {
      // Mocking the fetch call structure for BrightLocal API
      const response = await fetch(`${this.apiUrl}/lsc/report/get?api-key=${apiKey}&location-id=${locationId}`);
      
      if (!response.ok) {
        throw new Error('BrightLocal API Error');
      }

      return await response.json();
    } catch (e) {
      throw new HttpException('BrightLocal API Integration not fully configured', HttpStatus.NOT_IMPLEMENTED);
    }
  }
}
