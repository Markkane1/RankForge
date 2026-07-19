export declare class ReportingDiagnosticsService {
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
    checkMetricAnomalies(clientId: string): Promise<{
        hasAnomaly: boolean;
        anomalies: string[];
    }>;
    getDiagnosticChecklist(clientId: string): Promise<{
        clientId: string;
        businessName: string | null;
        checkedAt: Date;
        diagnosticSteps: any[];
    }>;
}
