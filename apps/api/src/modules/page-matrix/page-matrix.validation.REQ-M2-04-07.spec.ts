import { Test, TestingModule } from '@nestjs/testing';
import { PageMatrixService } from './page-matrix.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@rankforge/database', () => {
  return {
    prisma: {
      client: {
        findUnique: jest.fn(),
      },
      pageMatrixEntry: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      leadLogEntry: {
        create: jest.fn(),
      },
    },
    LeadSource: {
      GBP_CALL: 'GBP_CALL',
      FORM_SUBMISSION: 'FORM_SUBMISSION',
      GBP_WEBSITE: 'GBP_WEBSITE',
    },
  };
});

import { prisma } from '@rankforge/database';

describe('PageMatrix Validations & Checklist (REQ-M2-04 to REQ-M2-07)', () => {
  let service: PageMatrixService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PageMatrixService],
    }).compile();

    service = module.get<PageMatrixService>(PageMatrixService);
    jest.clearAllMocks();
    delete process.env.PAGESPEED_API_KEY;
    delete (global as any).fetch;
  });

  describe('validateTemplateBlocks', () => {
    it('should throw BadRequestException if location page misses "real jobs" block', () => {
      // Missing 'real jobs' block
      const content = JSON.stringify({
        intro: 'Hello intro',
        services: 'plumbing services',
        reviewExcerpts: 'great team',
        logistics: 'open 24h',
        faqs: 'q & a',
      });

      expect(() => service.validateTemplateBlocks(content)).toThrow(
        'Mandatory content block missing: real jobs.',
      );
    });

    it('should pass template validation if all required blocks exist', () => {
      const content = JSON.stringify({
        intro: 'Hello intro',
        services: 'plumbing services',
        'real jobs': 'see our work',
        reviewExcerpts: 'great team',
        logistics: 'open 24h',
        faqs: 'q & a',
      });

      expect(() => service.validateTemplateBlocks(content)).not.toThrow();
    });
  });

  describe('validateSchemaJson', () => {
    it('should throw if schema context is missing or invalid', () => {
      const schema = JSON.stringify({
        '@type': 'LocalBusiness',
        name: 'Plumber Pro',
        telephone: '12345',
        address: {},
        geo: { latitude: 10, longitude: 20 },
      });
      expect(() => service.validateSchemaJson(schema)).toThrow(
        'Schema @context must be schema.org.',
      );
    });

    it('should throw if schema geo coordinates are missing', () => {
      const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'Plumber Pro',
        telephone: '12345',
        address: {},
      });
      expect(() => service.validateSchemaJson(schema)).toThrow(
        'Schema geographic coordinates (geo.latitude, geo.longitude) are required.',
      );
    });

    it('should succeed with correct Google LocalBusiness rich schema', () => {
      const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'Plumber Pro',
        telephone: '12345',
        url: 'https://example.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '123 Main',
          addressLocality: 'Dubai',
          addressRegion: 'Dubai',
          postalCode: '00000',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 10.5, longitude: 20.3 },
      });
      expect(() => service.validateSchemaJson(schema)).not.toThrow();
      expect(() => service.evaluateRichResultsSchema(schema)).not.toThrow();
    });

    it('should reject unsupported rich result schema types', () => {
      const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        name: 'Plumber Pro',
        telephone: '12345',
        url: 'https://example.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '123 Main',
          addressLocality: 'Dubai',
          addressRegion: 'Dubai',
          postalCode: '00000',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 10.5, longitude: 20.3 },
      });
      expect(() => service.evaluateRichResultsSchema(schema)).toThrow(
        'Rich Results schema must use a Google-supported LocalBusiness subtype.',
      );
    });
  });

  describe('getChecklistDetails & updateEntry status pub block', () => {
    it('should block transition to PUBLISHED if checklist details fail (NAP mismatch)', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Plumber Pro',
        phone: '1234567890',
        address: '123 Main St, New York',
      });

      (prisma.pageMatrixEntry.findUnique as jest.Mock).mockResolvedValue({
        id: 'entry1',
        clientId: 'client1',
        slug: 'test-slug',
        pageType: 'LOCATION_PAGE',
        primaryKeyword: 'plumber',
        content:
          '<title>Plumber Page</title><h1>Plumber H1</h1>viewport analytics intro services real jobs review excerpts logistics faqs', // misses NAP strings
        schemaJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Plumber Pro',
          telephone: '1234567890',
          url: 'https://example.com/test-slug',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '123 Main St',
            addressLocality: 'New York',
            addressRegion: 'NY',
            postalCode: '10001',
          },
          geo: { '@type': 'GeoCoordinates', latitude: 1, longitude: 2 },
        }),
      });

      (prisma.pageMatrixEntry.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.updateEntry('client1', 'entry1', { status: 'PUBLISHED' }),
      ).rejects.toThrow('Pre-launch checklist failed.');
    });

    it('should allow transition to PUBLISHED if all checklist checks pass', async () => {
      process.env.PAGESPEED_API_KEY = 'test-pagespeed-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          loadingExperience: {
            metrics: {
              LARGEST_CONTENTFUL_PAINT_MS: { category: 'FAST' },
              INTERACTION_TO_NEXT_PAINT: { category: 'FAST' },
              CUMULATIVE_LAYOUT_SHIFT_SCORE: { category: 'FAST' },
            },
          },
          lighthouseResult: {
            categories: {
              performance: { score: 0.95 },
            },
          },
        }),
      }) as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Plumber Pro',
        phone: '1234567890',
        address: '123 Main St',
        website: 'https://example.com',
      });

      (prisma.pageMatrixEntry.findUnique as jest.Mock).mockResolvedValue({
        id: 'entry1',
        clientId: 'client1',
        slug: 'test-slug',
        pageType: 'LOCATION_PAGE',
        primaryKeyword: 'plumber',
        content:
          '<title>Plumber</title><h1>Plumber</h1> Plumber Pro 1234567890 123 Main St viewport analytics intro services real jobs review excerpts logistics faqs',
        schemaJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Plumber Pro',
          telephone: '1234567890',
          url: 'https://example.com/test-slug',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '123 Main St',
            addressLocality: 'New York',
            addressRegion: 'NY',
            postalCode: '10001',
          },
          geo: { '@type': 'GeoCoordinates', latitude: 1, longitude: 2 },
        }),
      });

      (prisma.pageMatrixEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pageMatrixEntry.update as jest.Mock).mockResolvedValue({
        id: 'entry1',
        status: 'PUBLISHED',
      });

      const result = await service.updateEntry('client1', 'entry1', {
        status: 'PUBLISHED',
      });
      expect(result.status).toBe('PUBLISHED');
      expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
        'pagespeedonline/v5/runPagespeed',
      );
    });

    it('should block transition to PUBLISHED if PageSpeed is not configured', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
        businessName: 'Plumber Pro',
        phone: '1234567890',
        address: '123 Main St',
        website: 'https://example.com',
      });

      (prisma.pageMatrixEntry.findUnique as jest.Mock).mockResolvedValue({
        id: 'entry1',
        clientId: 'client1',
        slug: 'test-slug',
        pageType: 'LOCATION_PAGE',
        primaryKeyword: 'plumber',
        content:
          '<title>Plumber</title><h1>Plumber</h1> Plumber Pro 1234567890 123 Main St viewport analytics intro services real jobs review excerpts logistics faqs',
        schemaJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Plumber Pro',
          telephone: '1234567890',
          url: 'https://example.com/test-slug',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '123 Main St',
            addressLocality: 'New York',
            addressRegion: 'NY',
            postalCode: '10001',
          },
          geo: { '@type': 'GeoCoordinates', latitude: 1, longitude: 2 },
        }),
      });

      (prisma.pageMatrixEntry.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.updateEntry('client1', 'entry1', { status: 'PUBLISHED' }),
      ).rejects.toThrow('PAGESPEED_API_KEY is not configured');
    });
  });

  describe('trackConversion', () => {
    it('should create a LeadLogEntry on tracked quote form submission', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      (prisma.leadLogEntry.create as jest.Mock).mockResolvedValue({
        id: 'lead1',
        clientId: 'client1',
        source: 'FORM_SUBMISSION',
      });

      const result = await service.trackConversion(
        'client1',
        'FORM_SUBMISSION',
        50.0,
        'user@example.com',
      );
      expect(result.source).toBe('FORM_SUBMISSION');
      expect(prisma.leadLogEntry.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          source: 'FORM_SUBMISSION',
          value: 50.0,
          contactInfo: 'user@example.com',
        },
      });
    });

    it('should throw BadRequestException if source enum is invalid', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client1',
      });
      await expect(
        service.trackConversion('client1', 'INVALID_SOURCE'),
      ).rejects.toThrow('Invalid conversion source');
    });
  });
});
