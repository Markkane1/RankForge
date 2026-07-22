import { Test, TestingModule } from '@nestjs/testing';
import { GbpService } from './gbp.service';
import { CredentialsService } from '../security/credentials.service';

describe('GbpService Backend Validators (REQ-M1-15)', () => {
  let service: GbpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GbpService,
        {
          provide: CredentialsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<GbpService>(GbpService);
  });

  it('should allow valid profile data', async () => {
    const result = await service.updateProfile('client1', {
      phone: '1234567890',
      websiteUrl: 'https://example.com',
      description: 'A normal description',
      secondaryCategories: ['Cat1'],
      serviceAreas: ['Area1'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone lengths', async () => {
    await expect(
      service.updateProfile('client1', { phone: '123' }),
    ).rejects.toThrow('Invalid phone number');
  });

  it('should reject invalid URLs', async () => {
    await expect(
      service.updateProfile('client1', { websiteUrl: 'invalid-url' }),
    ).rejects.toThrow('Invalid URL format for website');
  });

  it('should reject ALL-CAPS description', async () => {
    await expect(
      service.updateProfile('client1', { description: 'THIS IS ALL CAPS' }),
    ).rejects.toThrow('ALL-CAPS linter');
  });

  it('should reject exceeding category limits', async () => {
    const categories = Array(10).fill('Cat');
    await expect(
      service.updateProfile('client1', { secondaryCategories: categories }),
    ).rejects.toThrow('Cannot exceed 9 secondary categories');
  });

  it('should reject exceeding service area limits', async () => {
    const areas = Array(21).fill('Area');
    await expect(
      service.updateProfile('client1', { serviceAreas: areas }),
    ).rejects.toThrow('Cannot exceed 20 service areas');
  });
});
