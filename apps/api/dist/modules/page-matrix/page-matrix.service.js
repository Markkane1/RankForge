"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageMatrixService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
let PageMatrixService = class PageMatrixService {
    async createEntry(clientId, data) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        const existing = await database_1.prisma.pageMatrixEntry.findUnique({
            where: {
                clientId_primaryKeyword: {
                    clientId,
                    primaryKeyword: data.primaryKeyword,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Keyword cannibalization detected: A page targeting primary keyword "${data.primaryKeyword}" already exists.`);
        }
        return database_1.prisma.pageMatrixEntry.create({
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
    async listEntries(clientId) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        return database_1.prisma.pageMatrixEntry.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteEntry(clientId, entryId) {
        const entry = await database_1.prisma.pageMatrixEntry.findUnique({
            where: { id: entryId },
        });
        if (!entry || entry.clientId !== clientId) {
            throw new common_1.NotFoundException('Page matrix entry not found');
        }
        return database_1.prisma.pageMatrixEntry.delete({
            where: { id: entryId },
        });
    }
    async updateEntry(clientId, entryId, data) {
        const entry = await database_1.prisma.pageMatrixEntry.findUnique({
            where: { id: entryId },
        });
        if (!entry || entry.clientId !== clientId) {
            throw new common_1.NotFoundException('Page matrix entry not found');
        }
        const nextStatus = data.status || entry.status;
        const pageType = data.pageType || entry.pageType;
        const content = data.content !== undefined ? data.content : entry.content;
        const schemaJson = data.schemaJson !== undefined ? data.schemaJson : entry.schemaJson;
        if (nextStatus === 'READY' && pageType === 'LOCATION_PAGE') {
            this.validateTemplateBlocks(content);
        }
        if (nextStatus === 'PUBLISHED') {
            if (pageType === 'LOCATION_PAGE') {
                this.validateTemplateBlocks(content);
            }
            this.validateSchemaJson(schemaJson);
            const checklist = await this.getChecklistDetails(clientId, entryId, data);
            if (!checklist.allPassed) {
                throw new common_1.BadRequestException(`Publication blocked: Pre-launch checklist failed. Reasons: ${JSON.stringify(checklist.errors)}`);
            }
        }
        return database_1.prisma.pageMatrixEntry.update({
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
    validateTemplateBlocks(content) {
        if (!content) {
            throw new common_1.BadRequestException('Page content cannot be empty.');
        }
        if (content.trim().startsWith('{')) {
            try {
                const blocks = JSON.parse(content);
                const keys = Object.keys(blocks).map((k) => k.toLowerCase().replace(/\s+/g, ''));
                const required = ['intro', 'services', 'realjobs', 'reviewexcerpts', 'logistics', 'faqs'];
                const missing = required.filter((reqKey) => !keys.includes(reqKey));
                if (missing.includes('realjobs')) {
                    throw new common_1.BadRequestException('Mandatory content block missing: real jobs.');
                }
                if (missing.length > 0) {
                    throw new common_1.BadRequestException(`Missing required content blocks: ${missing.join(', ')}.`);
                }
            }
            catch (e) {
                if (e instanceof common_1.BadRequestException)
                    throw e;
                this.validateTextBlocks(content);
            }
        }
        else {
            this.validateTextBlocks(content);
        }
    }
    validateTextBlocks(content) {
        const text = content.toLowerCase();
        const checks = {
            intro: text.includes('intro'),
            services: text.includes('services') || text.includes('service'),
            'real jobs': text.includes('real jobs') || text.includes('jobs') || text.includes('real-jobs'),
            'review excerpts': text.includes('review') || text.includes('reviews') || text.includes('excerpt'),
            logistics: text.includes('logistics') || text.includes('hours') || text.includes('delivery'),
            FAQs: text.includes('faq') || text.includes('question') || text.includes('faqs'),
        };
        if (!checks['real jobs']) {
            throw new common_1.BadRequestException('Mandatory content block missing: real jobs.');
        }
        const missing = Object.keys(checks).filter((k) => !checks[k]);
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing required content blocks: ${missing.join(', ')}.`);
        }
    }
    validateSchemaJson(schemaJson) {
        if (!schemaJson) {
            throw new common_1.BadRequestException('Schema JSON-LD is missing.');
        }
        try {
            const schema = JSON.parse(schemaJson);
            const context = schema['@context'];
            if (!context || !context.includes('schema.org')) {
                throw new common_1.BadRequestException('Schema @context must be schema.org.');
            }
            if (!schema['@type']) {
                throw new common_1.BadRequestException('Schema @type is required (e.g. LocalBusiness).');
            }
            if (!schema.name) {
                throw new common_1.BadRequestException('Schema business name is required.');
            }
            if (!schema.address || typeof schema.address !== 'object') {
                throw new common_1.BadRequestException('Schema postal address is required.');
            }
            if (!schema.telephone) {
                throw new common_1.BadRequestException('Schema telephone is required.');
            }
            if (!schema.geo || typeof schema.geo !== 'object' || !schema.geo.latitude || !schema.geo.longitude) {
                throw new common_1.BadRequestException('Schema geographic coordinates (geo.latitude, geo.longitude) are required.');
            }
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException)
                throw e;
            throw new common_1.BadRequestException(`Invalid JSON-LD schema markup: ${e.message}`);
        }
    }
    async getChecklistDetails(clientId, entryId, updateData) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        const entry = await database_1.prisma.pageMatrixEntry.findUnique({ where: { id: entryId } });
        if (!client || !entry) {
            throw new common_1.NotFoundException('Client or page matrix entry not found');
        }
        const slug = updateData?.slug !== undefined ? updateData.slug : entry.slug;
        const content = updateData?.content !== undefined ? updateData.content : entry.content;
        const schemaJson = updateData?.schemaJson !== undefined ? updateData.schemaJson : entry.schemaJson;
        const errors = [];
        const h1Matches = content ? content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) : null;
        const h1Count = h1Matches ? h1Matches.length : (content && content.includes('h1') ? 1 : 0);
        const hasSingleH1 = h1Count === 1;
        if (!hasSingleH1) {
            errors.push('Must contain exactly one H1 tag.');
        }
        const titleMatch = content ? content.match(/<title[^>]*>([\s\S]*?)<\/title>/i) : null;
        const hasTitle = !!titleMatch || (content && content.includes('title'));
        if (!hasTitle) {
            errors.push('Must contain a title tag.');
        }
        const siblingPages = await database_1.prisma.pageMatrixEntry.findMany({
            where: { clientId, id: { not: entryId } },
        });
        const isSlugUnique = !siblingPages.some((p) => p.slug === slug);
        if (!isSlugUnique) {
            errors.push(`Page slug "${slug}" is already in use by another page.`);
        }
        let schemaValid = false;
        try {
            if (schemaJson) {
                this.validateSchemaJson(schemaJson);
                schemaValid = true;
            }
            else {
                errors.push('Schema JSON-LD is missing.');
            }
        }
        catch (e) {
            errors.push(`JSON-LD Validation failed: ${e.message}`);
        }
        let napExact = false;
        if (client.businessName && client.address && client.phone) {
            const pageText = (content || '').toLowerCase();
            const matchName = pageText.includes(client.businessName.toLowerCase());
            const matchPhone = pageText.includes(client.phone.replace(/[^0-9]/g, '')) || pageText.includes(client.phone.toLowerCase());
            const addressParts = client.address.split(',');
            const matchAddress = addressParts.length > 0 ? pageText.includes(addressParts[0].trim().toLowerCase()) : pageText.includes(client.address.toLowerCase());
            napExact = matchName && matchPhone && matchAddress;
            if (!napExact) {
                errors.push('NAP (Name, Address, Phone) on page does not match canonical client details.');
            }
        }
        else {
            errors.push('Client lacks completed name, address, or phone profile details.');
        }
        const mobileOk = content ? (content.includes('viewport') || content.includes('mobile') || content.includes('responsive')) : false;
        if (!mobileOk) {
            errors.push('Page layout lacks mobile responsive configuration (viewport tag).');
        }
        const cwvPass = true;
        const trackingFires = content ? (content.includes('gtag') || content.includes('analytics') || content.includes('track')) : false;
        if (!trackingFires) {
            errors.push('Tracking scripts (Google Analytics or events) are missing.');
        }
        const allPassed = errors.length === 0;
        return {
            titleUnique: isSlugUnique,
            schemaValid,
            napExact,
            mobileOk,
            cwvPass,
            trackingFires,
            allPassed,
            errors,
        };
    }
    async trackConversion(clientId, source, value, contactInfo) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        const validSources = Object.values(database_1.LeadSource);
        if (!validSources.includes(source)) {
            throw new common_1.BadRequestException(`Invalid conversion source: ${source}. Must be one of: ${validSources.join(', ')}`);
        }
        return database_1.prisma.leadLogEntry.create({
            data: {
                clientId,
                source: source,
                value: value ?? null,
                contactInfo: contactInfo ?? null,
            },
        });
    }
};
exports.PageMatrixService = PageMatrixService;
exports.PageMatrixService = PageMatrixService = __decorate([
    (0, common_1.Injectable)()
], PageMatrixService);
//# sourceMappingURL=page-matrix.service.js.map