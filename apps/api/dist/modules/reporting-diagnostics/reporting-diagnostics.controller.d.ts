import { ReportingDiagnosticsService } from './reporting-diagnostics.service';
export declare class ReportingDiagnosticsController {
    private readonly reportingService;
    constructor(reportingService: ReportingDiagnosticsService);
    syncGa4Events(clientId: string, propertyId: string, customDimensionConfig?: string): Promise<{
        propertyId: string;
        syncedEventsCount: number;
        logs: any[];
    }>;
    captureBaseline(clientId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        metricsJson: string;
        capturedAt: Date;
    }>;
    checkAnomalies(clientId: string): Promise<{
        hasAnomaly: boolean;
        anomalies: string[];
    }>;
    getDiagnostics(clientId: string): Promise<{
        clientId: string;
        businessName: string | null;
        checkedAt: Date;
        diagnosticSteps: any[];
    }>;
}
