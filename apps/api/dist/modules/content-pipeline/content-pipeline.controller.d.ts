import { ContentPipelineService } from './content-pipeline.service';
export declare class ContentPipelineController {
    private readonly contentPipelineService;
    constructor(contentPipelineService: ContentPipelineService);
    schedulePost(clientId: string, body: {
        gbpProfileId: string;
        title: string;
        content: string;
        scheduledAt: string;
        eventType?: string;
        ctaButton?: string;
        ctaUrl?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: string;
        content: string;
        startDate: Date | null;
        endDate: Date | null;
        gbpProfileId: string;
        ctaButton: string | null;
        ctaUrl: string | null;
        eventType: string | null;
        scheduledAt: Date | null;
        publishedAt: Date | null;
    }>;
    listScheduledPosts(clientId: string, start?: string, end?: string): Promise<({
        gbpProfile: {
            id: string;
            phone: string | null;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            description: string | null;
            lastSyncedAt: Date | null;
            gbpAccountId: string | null;
            gbpLocationId: string | null;
            gbpLocationName: string | null;
            primaryCategory: string | null;
            secondaryCategories: string | null;
            websiteUrl: string | null;
            bookingUrl: string | null;
            bookingUrlOverrideNote: string | null;
            isVerified: boolean;
            isSuspended: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: string;
        content: string;
        startDate: Date | null;
        endDate: Date | null;
        gbpProfileId: string;
        ctaButton: string | null;
        ctaUrl: string | null;
        eventType: string | null;
        scheduledAt: Date | null;
        publishedAt: Date | null;
    })[]>;
    updateScheduledPost(clientId: string, postId: string, body: {
        title?: string;
        content?: string;
        scheduledAt?: string;
        status?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: string;
        content: string;
        startDate: Date | null;
        endDate: Date | null;
        gbpProfileId: string;
        ctaButton: string | null;
        ctaUrl: string | null;
        eventType: string | null;
        scheduledAt: Date | null;
        publishedAt: Date | null;
    }>;
    deleteScheduledPost(clientId: string, postId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: string;
        content: string;
        startDate: Date | null;
        endDate: Date | null;
        gbpProfileId: string;
        ctaButton: string | null;
        ctaUrl: string | null;
        eventType: string | null;
        scheduledAt: Date | null;
        publishedAt: Date | null;
    }>;
    generateContentDraft(clientId: string, topic: string, primaryKeywords: string[]): Promise<{
        title: string;
        content: string;
        ctaButton: string;
        ctaUrl: string;
    }>;
    syncSearchVisibility(clientId: string, query: string): Promise<{
        query: string;
        clientName: string | null;
        organicPosition: number;
        inLocalPack: boolean;
        snippetText: string;
        visibilityScore: number;
        competitors: {
            name: string;
            position: number;
        }[];
        lastScrapedAt: Date;
    }>;
    scanStaleContent(clientId: string): Promise<{
        scannedCount: number;
        updated: any[];
    }>;
}
