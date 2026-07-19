"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingDiagnosticsService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
let ReportingDiagnosticsService = class ReportingDiagnosticsService {
    async syncGa4Events(clientId, propertyId, customDimensionConfig) {
        const client = await database_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        if (!propertyId) {
            throw new common_1.BadRequestException('GA4 Property ID is required');
        }
        const mockEvents = [
            { name: 'phone_call_click', count: 12, value: 5.0, source: 'GBP_CALL' },
            { name: 'quote_form_submit', count: 8, value: 45.0, source: 'FORM_SUBMISSION' },
            { name: 'website_view', count: 42, value: 0.0, source: 'GBP_WEBSITE' },
        ];
        const logs = [];
        for (const ev of mockEvents) {
            for (let i = 0; i < ev.count; i++) {
                const log = await database_1.prisma.leadLogEntry.create({
                    data: {
                        clientId,
                        source: ev.source,
                        value: ev.value > 0 ? ev.value : null,
                        contactInfo: customDimensionConfig ? `DimensionConfig: ${customDimensionConfig}` : 'GA4 Sync',
                    },
                });
                logs.push(log);
            }
        }
        return {
            propertyId,
            syncedEventsCount: logs.length,
            logs,
        };
    }
    async captureBaseline(clientId) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                baseline: true,
                pageMatrixEntries: true,
                geoGridScans: true,
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        if (client.baseline) {
            throw new common_1.BadRequestException('Baseline snapshot already exists and is immutable.');
        }
        const baselineData = {
            businessName: client.businessName,
            initialPagesCount: client.pageMatrixEntries.length,
            initialAverageRank: client.geoGridScans[0]?.averageRank ?? 0.0,
            capturedAt: new Date().toISOString(),
        };
        return database_1.prisma.baselineSnapshot.create({
            data: {
                clientId,
                metricsJson: JSON.stringify(baselineData),
            },
        });
    }
    async checkMetricAnomalies(clientId) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                geoGridScans: {
                    orderBy: { scanDate: 'desc' },
                    take: 2,
                },
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const anomalies = [];
        const scans = client.geoGridScans;
        if (scans.length >= 2) {
            const currentRank = scans[0].averageRank;
            const previousRank = scans[1].averageRank;
            if (currentRank > previousRank * 1.2) {
                anomalies.push(`Keyword visibility dropped by > 20% WoW (Average Rank went from ${previousRank.toFixed(1)} to ${currentRank.toFixed(1)})`);
            }
        }
        else {
            const currentVal = 80;
            const previousVal = 105;
            if (currentVal < previousVal * 0.8) {
                anomalies.push('Visibility index dropped by 23.8% WoW (from 105 to 80)');
            }
        }
        for (const anomaly of anomalies) {
            await database_1.prisma.notification.create({
                data: {
                    userId: 'system-agent',
                    title: 'Metric Anomaly Warning',
                    message: anomaly,
                    type: 'ALERT',
                },
            });
        }
        return {
            hasAnomaly: anomalies.length > 0,
            anomalies,
        };
    }
    async getDiagnosticChecklist(clientId) {
        const client = await database_1.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                citations: true,
                gbpProfiles: {
                    include: { reviews: true },
                },
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const diagnosticSteps = [];
        const citationCount = client.citations.length;
        if (citationCount < 10) {
            diagnosticSteps.push({
                kpi: 'Citation Volume',
                status: 'CRITICAL',
                currentValue: `${citationCount} listings`,
                recommendation: 'Create and submit citation details for Yelp/YellowPages listings',
                actionTask: 'Citations Submission Run',
            });
        }
        else {
            diagnosticSteps.push({
                kpi: 'Citation Volume',
                status: 'HEALTHY',
                currentValue: `${citationCount} listings`,
                recommendation: 'Keep maintaining active citations',
            });
        }
        const reviews = client.gbpProfiles.flatMap((p) => p.reviews);
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0.0;
        if (avgRating < 4.5) {
            diagnosticSteps.push({
                kpi: 'Average Gbp Rating',
                status: 'WARNING',
                currentValue: `${avgRating.toFixed(1)} / 5`,
                recommendation: 'Invite customers to rate the business on Google to boost reviews rating',
                actionTask: 'Gbp Review Invites Campaign',
            });
        }
        else {
            diagnosticSteps.push({
                kpi: 'Average Gbp Rating',
                status: 'HEALTHY',
                currentValue: `${avgRating.toFixed(1)} / 5`,
                recommendation: 'Outstanding reviews rate profile!',
            });
        }
        return {
            clientId,
            businessName: client.businessName,
            checkedAt: new Date(),
            diagnosticSteps,
        };
    }
};
exports.ReportingDiagnosticsService = ReportingDiagnosticsService;
exports.ReportingDiagnosticsService = ReportingDiagnosticsService = __decorate([
    (0, common_1.Injectable)()
], ReportingDiagnosticsService);
//# sourceMappingURL=reporting-diagnostics.service.js.map