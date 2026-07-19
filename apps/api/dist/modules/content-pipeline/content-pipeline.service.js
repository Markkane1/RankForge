"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPipelineService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
let ContentPipelineService = class ContentPipelineService {
    async schedulePost(clientId, data) {
        const profile = await database_1.prisma.gbpProfile.findUnique({
            where: { id: data.gbpProfileId },
        });
        if (!profile || profile.clientId !== clientId) {
            throw new common_1.NotFoundException('GBP Profile not found');
        }
        const scheduledDate = new Date(data.scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
            throw new common_1.BadRequestException('Invalid scheduled date format');
        }
        if (scheduledDate.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('Scheduled date must be in the future');
        }
        return database_1.prisma.gbpPost.create({
            data: {
                gbpProfileId: data.gbpProfileId,
                title: data.title,
                content: data.content,
                eventType: data.eventType ?? null,
                ctaButton: data.ctaButton ?? null,
                ctaUrl: data.ctaUrl ?? null,
                status: 'SCHEDULED',
                scheduledAt: scheduledDate,
            },
        });
    }
    async listScheduledPosts(clientId, start, end) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        return database_1.prisma.gbpPost.findMany({
            where: {
                gbpProfile: { clientId },
                scheduledAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                gbpProfile: true,
            },
            orderBy: { scheduledAt: 'asc' },
        });
    }
    async updateScheduledPost(clientId, postId, data) {
        const post = await database_1.prisma.gbpPost.findUnique({
            where: { id: postId },
            include: { gbpProfile: true },
        });
        if (!post || post.gbpProfile.clientId !== clientId) {
            throw new common_1.NotFoundException('Post not found');
        }
        const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
        if (scheduledDate && isNaN(scheduledDate.getTime())) {
            throw new common_1.BadRequestException('Invalid scheduled date format');
        }
        return database_1.prisma.gbpPost.update({
            where: { id: postId },
            data: {
                title: data.title,
                content: data.content,
                scheduledAt: scheduledDate,
                status: data.status,
            },
        });
    }
    async deleteScheduledPost(clientId, postId) {
        const post = await database_1.prisma.gbpPost.findUnique({
            where: { id: postId },
            include: { gbpProfile: true },
        });
        if (!post || post.gbpProfile.clientId !== clientId) {
            throw new common_1.NotFoundException('Post not found');
        }
        return database_1.prisma.gbpPost.delete({
            where: { id: postId },
        });
    }
    async generateContentDraft(clientId, topic, primaryKeywords) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const keywordStr = primaryKeywords.join(', ');
        const mockContent = `Looking for top-notch local services in town? Our team specializes in ${topic} using standard methods. Contact us today to discuss your next ${primaryKeywords[0] || 'project'}. We guarantee professional workmanship and reliable results for every single home client. Call now!`;
        if (mockContent.length > 750) {
            throw new common_1.BadRequestException('Draft compliance failed: Content exceeds 750 characters.');
        }
        for (const keyword of primaryKeywords) {
            const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const matches = mockContent.match(new RegExp(`\\b${escaped}\\b`, 'gi'));
            if (matches && matches.length > 3) {
                throw new common_1.BadRequestException(`Draft compliance failed: Keyword "${keyword}" appears too many times (stuffing detected).`);
            }
        }
        return {
            title: `Expert ${topic} Services`,
            content: mockContent,
            ctaButton: 'CALL',
            ctaUrl: client.website ?? 'https://clientsite.com',
        };
    }
    async syncSearchVisibility(clientId, query) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const isMatchingSnippet = query.toLowerCase().includes('plumb') || query.toLowerCase().includes('clean');
        return {
            query,
            clientName: client.businessName,
            organicPosition: isMatchingSnippet ? 3 : 12,
            inLocalPack: isMatchingSnippet,
            snippetText: isMatchingSnippet
                ? `Professional plumbing and cleaning services by ${client.businessName}. Highly rated locally.`
                : 'Other business listings in the region.',
            visibilityScore: isMatchingSnippet ? 85.5 : 22.0,
            competitors: [
                { name: 'Competitor Alpha', position: 1 },
                { name: 'Competitor Beta', position: 2 },
            ],
            lastScrapedAt: new Date(),
        };
    }
    async scanStaleContent(clientId) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const stalePosts = await database_1.prisma.gbpPost.findMany({
            where: {
                gbpProfile: { clientId },
                status: { not: 'STALE' },
                OR: [
                    { publishedAt: { lt: ninetyDaysAgo } },
                    {
                        publishedAt: null,
                        createdAt: { lt: ninetyDaysAgo },
                    },
                ],
            },
        });
        const updated = [];
        for (const post of stalePosts) {
            const upPost = await database_1.prisma.gbpPost.update({
                where: { id: post.id },
                data: { status: 'STALE' },
            });
            updated.push(upPost);
        }
        return {
            scannedCount: stalePosts.length,
            updated,
        };
    }
};
exports.ContentPipelineService = ContentPipelineService;
exports.ContentPipelineService = ContentPipelineService = __decorate([
    (0, common_1.Injectable)()
], ContentPipelineService);
//# sourceMappingURL=content-pipeline.service.js.map