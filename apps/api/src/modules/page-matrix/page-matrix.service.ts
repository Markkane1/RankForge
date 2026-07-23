import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, LeadSource } from '@rankforge/database';

@Injectable()
export class PageMatrixService {
  async createEntry(
    clientId: string,
    data: {
      slug: string;
      pageType: string;
      primaryKeyword: string;
      targetArea?: string;
      priority?: number;
      status?: string;
      content?: string;
      schemaJson?: string;
    },
  ) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Cannibalization check (REQ-M2-03)
    const existing = await prisma.pageMatrixEntry.findUnique({
      where: {
        clientId_primaryKeyword: {
          clientId,
          primaryKeyword: data.primaryKeyword,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Keyword cannibalization detected: A page targeting primary keyword "${data.primaryKeyword}" already exists.`,
      );
    }

    return prisma.pageMatrixEntry.create({
      data: {
        clientId,
        slug: data.slug,
        pageType: data.pageType,
        primaryKeyword: data.primaryKeyword,
        targetArea: data.targetArea,
        priority: data.priority ?? 5,
        status: data.status ?? 'DRAFT',
        content: data.content,
        schemaJson: data.schemaJson,
      },
    });
  }

  async listEntries(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return prisma.pageMatrixEntry.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEntry(clientId: string, entryId: string) {
    const entry = await prisma.pageMatrixEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.clientId !== clientId) {
      throw new NotFoundException('Page matrix entry not found');
    }

    return prisma.pageMatrixEntry.delete({
      where: { id: entryId },
    });
  }

  async updateEntry(
    clientId: string,
    entryId: string,
    data: {
      slug?: string;
      pageType?: string;
      primaryKeyword?: string;
      targetArea?: string;
      priority?: number;
      status?: string;
      content?: string;
      schemaJson?: string;
    },
  ) {
    const entry = await prisma.pageMatrixEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.clientId !== clientId) {
      throw new NotFoundException('Page matrix entry not found');
    }

    const nextStatus = data.status || entry.status;
    const pageType = data.pageType || entry.pageType;
    const content = data.content !== undefined ? data.content : entry.content;
    const schemaJson =
      data.schemaJson !== undefined ? data.schemaJson : entry.schemaJson;

    // 1. Template validation checks for READY status (REQ-M2-04)
    if (nextStatus === 'READY' && pageType === 'LOCATION_PAGE') {
      this.validateTemplateBlocks(content);
    }

    // 2. Schema / checklist validations when publishing (REQ-M2-05, REQ-M2-07)
    if (nextStatus === 'PUBLISHED') {
      if (pageType === 'LOCATION_PAGE') {
        this.validateTemplateBlocks(content);
      }

      // JSON-LD Validator call
      this.validateSchemaJson(schemaJson);

      // Checklist evaluation
      const checklist = await this.getChecklistDetails(clientId, entryId, data);
      if (!checklist.allPassed) {
        throw new BadRequestException(
          `Publication blocked: Pre-launch checklist failed. Reasons: ${JSON.stringify(checklist.errors)}`,
        );
      }
    }

    return prisma.pageMatrixEntry.update({
      where: { id: entryId },
      data: {
        slug: data.slug,
        pageType: data.pageType,
        primaryKeyword: data.primaryKeyword,
        targetArea: data.targetArea,
        priority: data.priority,
        status: data.status,
        content: data.content,
        schemaJson: data.schemaJson,
      },
    });
  }

  validateTemplateBlocks(content: string | null) {
    if (!content) {
      throw new BadRequestException('Page content cannot be empty.');
    }

    // Check JSON or HTML format
    if (content.trim().startsWith('{')) {
      try {
        const blocks = JSON.parse(content);
        const keys = Object.keys(blocks).map((k) =>
          k.toLowerCase().replace(/\s+/g, ''),
        );
        const required = [
          'intro',
          'services',
          'realjobs',
          'reviewexcerpts',
          'logistics',
          'faqs',
        ];
        const missing = required.filter((reqKey) => !keys.includes(reqKey));

        if (missing.includes('realjobs')) {
          throw new BadRequestException(
            'Mandatory content block missing: real jobs.',
          );
        }

        if (missing.length > 0) {
          throw new BadRequestException(
            `Missing required content blocks: ${missing.join(', ')}.`,
          );
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        // Fallback to text matching if json parsing fails
        this.validateTextBlocks(content);
      }
    } else {
      this.validateTextBlocks(content);
    }
  }

  private validateTextBlocks(content: string) {
    const text = content.toLowerCase();
    const checks = {
      intro: text.includes('intro'),
      services: text.includes('services') || text.includes('service'),
      'real jobs':
        text.includes('real jobs') ||
        text.includes('jobs') ||
        text.includes('real-jobs'),
      'review excerpts':
        text.includes('review') ||
        text.includes('reviews') ||
        text.includes('excerpt'),
      logistics:
        text.includes('logistics') ||
        text.includes('hours') ||
        text.includes('delivery'),
      FAQs:
        text.includes('faq') ||
        text.includes('question') ||
        text.includes('faqs'),
    };

    if (!checks['real jobs']) {
      throw new BadRequestException(
        'Mandatory content block missing: real jobs.',
      );
    }

    const missing = Object.keys(checks).filter((k) => !checks[k]);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required content blocks: ${missing.join(', ')}.`,
      );
    }
  }

  validateSchemaJson(schemaJson: string | null) {
    if (!schemaJson) {
      throw new BadRequestException('Schema JSON-LD is missing.');
    }

    try {
      const schema = JSON.parse(schemaJson);

      // Verify Google LocalBusiness / Schema.org rules (REQ-M2-05)
      const context = schema['@context'];
      if (!context || !context.includes('schema.org')) {
        throw new BadRequestException('Schema @context must be schema.org.');
      }

      if (!schema['@type']) {
        throw new BadRequestException(
          'Schema @type is required (e.g. LocalBusiness).',
        );
      }

      if (!schema.name) {
        throw new BadRequestException('Schema business name is required.');
      }

      if (!schema.address || typeof schema.address !== 'object') {
        throw new BadRequestException('Schema postal address is required.');
      }

      if (!schema.telephone) {
        throw new BadRequestException('Schema telephone is required.');
      }

      if (
        !schema.geo ||
        typeof schema.geo !== 'object' ||
        !schema.geo.latitude ||
        !schema.geo.longitude
      ) {
        throw new BadRequestException(
          'Schema geographic coordinates (geo.latitude, geo.longitude) are required.',
        );
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        `Invalid JSON-LD schema markup: ${e.message}`,
      );
    }
  }

  evaluateRichResultsSchema(schemaJson: string | null) {
    this.validateSchemaJson(schemaJson);
    const schema = JSON.parse(schemaJson as string);
    const types = Array.isArray(schema['@type'])
      ? schema['@type']
      : [schema['@type']];
    const localBusinessTypes = [
      'LocalBusiness',
      'ProfessionalService',
      'Store',
      'Restaurant',
    ];
    const hasLocalBusinessType = types.some((type) =>
      localBusinessTypes.includes(String(type)),
    );
    if (!hasLocalBusinessType) {
      throw new BadRequestException(
        'Rich Results schema must use a Google-supported LocalBusiness subtype.',
      );
    }

    if (schema.address['@type'] !== 'PostalAddress') {
      throw new BadRequestException(
        'Rich Results schema address must be PostalAddress.',
      );
    }

    for (const field of [
      'streetAddress',
      'addressLocality',
      'addressRegion',
      'postalCode',
    ]) {
      if (!schema.address[field]) {
        throw new BadRequestException(
          `Rich Results schema address.${field} is required.`,
        );
      }
    }

    if (schema.geo['@type'] !== 'GeoCoordinates') {
      throw new BadRequestException(
        'Rich Results schema geo must be GeoCoordinates.',
      );
    }

    if (!schema.url) {
      throw new BadRequestException('Rich Results schema url is required.');
    }

    return {
      provider: 'LOCAL_RICH_RESULTS_EQUIVALENT',
      schemaType: schema['@type'],
      checkedFields: [
        '@context',
        '@type',
        'name',
        'address',
        'telephone',
        'geo',
        'url',
      ],
    };
  }

  async getChecklistDetails(
    clientId: string,
    entryId: string,
    updateData?: any,
  ) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    const entry = await prisma.pageMatrixEntry.findUnique({
      where: { id: entryId },
    });

    if (!client || !entry) {
      throw new NotFoundException('Client or page matrix entry not found');
    }

    const slug = updateData?.slug !== undefined ? updateData.slug : entry.slug;
    const content =
      updateData?.content !== undefined ? updateData.content : entry.content;
    const schemaJson =
      updateData?.schemaJson !== undefined
        ? updateData.schemaJson
        : entry.schemaJson;

    const errors: string[] = [];

    // 1. Title/Meta/H1 Uniqueness & Presence
    const h1Matches = content
      ? content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)
      : null;
    const h1Count = h1Matches
      ? h1Matches.length
      : content && content.includes('h1')
        ? 1
        : 0;
    const hasSingleH1 = h1Count === 1;
    if (!hasSingleH1) {
      errors.push('Must contain exactly one H1 tag.');
    }

    const titleMatch = content
      ? content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      : null;
    const hasTitle = !!titleMatch || (content && content.includes('title'));
    if (!hasTitle) {
      errors.push('Must contain a title tag.');
    }

    // Slug uniqueness across all client pages
    const siblingPages = await prisma.pageMatrixEntry.findMany({
      where: { clientId, id: { not: entryId } },
    });
    const isSlugUnique = !siblingPages.some((p) => p.slug === slug);
    if (!isSlugUnique) {
      errors.push(`Page slug "${slug}" is already in use by another page.`);
    }

    // 2. Schema Validation
    let schemaValid = false;
    let richResultsSchema: {
      provider: string;
      schemaType: unknown;
      checkedFields: string[];
    } | null = null;
    try {
      if (schemaJson) {
        richResultsSchema = this.evaluateRichResultsSchema(schemaJson);
        schemaValid = true;
      } else {
        errors.push('Schema JSON-LD is missing.');
      }
    } catch (e: any) {
      errors.push(`JSON-LD Validation failed: ${e.message}`);
    }

    // 3. Exact NAP Match (REQ-M2-07 check)
    let napExact = false;
    if (client.businessName && client.address && client.phone) {
      const pageText = (content || '').toLowerCase();
      const matchName = pageText.includes(client.businessName.toLowerCase());
      const matchPhone =
        pageText.includes(client.phone.replace(/[^0-9]/g, '')) ||
        pageText.includes(client.phone.toLowerCase());

      // Address verification
      const addressParts = client.address.split(',');
      const matchAddress =
        addressParts.length > 0
          ? pageText.includes(addressParts[0].trim().toLowerCase())
          : pageText.includes(client.address.toLowerCase());

      napExact = matchName && matchPhone && matchAddress;
      if (!napExact) {
        errors.push(
          'NAP (Name, Address, Phone) on page does not match canonical client details.',
        );
      }
    } else {
      errors.push(
        'Client lacks completed name, address, or phone profile details.',
      );
    }

    // 4. Mobile, Core Web Vitals, and tracking checks
    const mobileOk = content
      ? content.includes('viewport') ||
        content.includes('mobile') ||
        content.includes('responsive')
      : false;
    if (!mobileOk) {
      errors.push(
        'Page layout lacks mobile responsive configuration (viewport tag).',
      );
    }

    const cwvResult = await this.evaluateCoreWebVitals(
      this.resolvePageUrl(client.website, slug),
    );
    const cwvPass = cwvResult.pass;
    if (!cwvPass) {
      errors.push(cwvResult.error);
    }

    const trackingFires = content
      ? content.includes('gtag') ||
        content.includes('analytics') ||
        content.includes('track')
      : false;
    if (!trackingFires) {
      errors.push('Tracking scripts (Google Analytics or events) are missing.');
    }

    const allPassed = errors.length === 0;

    return {
      titleUnique: isSlugUnique,
      schemaValid,
      richResultsSchema,
      napExact,
      mobileOk,
      cwvPass,
      trackingFires,
      allPassed,
      errors,
    };
  }

  private resolvePageUrl(website: string | null, slug: string) {
    if (!website) return null;
    try {
      return new URL(
        slug.replace(/^\/+/, ''),
        website.endsWith('/') ? website : `${website}/`,
      ).toString();
    } catch {
      return null;
    }
  }

  private async evaluateCoreWebVitals(pageUrl: string | null) {
    if (!pageUrl) {
      return {
        pass: false,
        error:
          'Core Web Vitals check blocked: client website URL is missing or invalid.',
      };
    }

    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey) {
      return {
        pass: false,
        error:
          'Core Web Vitals check blocked: PAGESPEED_API_KEY is not configured.',
      };
    }

    const apiUrl = new URL(
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    );
    apiUrl.searchParams.set('url', pageUrl);
    apiUrl.searchParams.set('strategy', 'mobile');
    apiUrl.searchParams.set('category', 'performance');
    apiUrl.searchParams.set('key', apiKey);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return {
          pass: false,
          error: `Core Web Vitals check failed: PageSpeed API returned ${response.status}.`,
        };
      }

      const data = await response.json();
      const metrics = data?.loadingExperience?.metrics ?? {};
      const lighthouseScore =
        data?.lighthouseResult?.categories?.performance?.score;
      const failedMetric = [
        'LARGEST_CONTENTFUL_PAINT_MS',
        'INTERACTION_TO_NEXT_PAINT',
        'CUMULATIVE_LAYOUT_SHIFT_SCORE',
      ].find(
        (metric) =>
          metrics[metric]?.category && metrics[metric].category !== 'FAST',
      );

      if (failedMetric) {
        return {
          pass: false,
          error: `Core Web Vitals check failed: ${failedMetric} is ${metrics[failedMetric].category}.`,
        };
      }

      if (typeof lighthouseScore === 'number' && lighthouseScore < 0.9) {
        return {
          pass: false,
          error: `Core Web Vitals check failed: mobile performance score ${lighthouseScore} is below 0.90.`,
        };
      }

      return { pass: true, error: '' };
    } catch (e: any) {
      return {
        pass: false,
        error: `Core Web Vitals check failed: ${e.message}`,
      };
    }
  }

  async trackConversion(
    clientId: string,
    source: string,
    value?: number,
    contactInfo?: string,
  ) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Verify valid LeadSource enum
    const validSources = Object.values(LeadSource) as string[];
    if (!validSources.includes(source)) {
      throw new BadRequestException(
        `Invalid conversion source: ${source}. Must be one of: ${validSources.join(', ')}`,
      );
    }

    return prisma.leadLogEntry.create({
      data: {
        clientId,
        source: source as LeadSource,
        value: value ?? null,
        contactInfo: contactInfo ?? null,
      },
    });
  }
}
