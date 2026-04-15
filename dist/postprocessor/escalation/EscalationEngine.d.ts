/**
 * Escalation Engine for Post-Processor
 * Handles incident reporting, manual intervention triggers, and alerting
 */
import { PostProcessorContext, EscalationResult, IncidentReport, MonitoringResult } from "../types.js";
export interface EscalationConfig {
    manualInterventionThreshold: number;
    rollbackThreshold: number;
    emergencyThreshold: number;
    alertChannels: string[];
    incidentReporting: boolean;
    reportingEndpoints?: ReportingEndpoint[];
}
export interface ReportingEndpoint {
    name: string;
    url: string;
    type: "webhook" | "pagerduty" | "slack" | "email" | "custom";
    enabled: boolean;
    priorityThreshold?: "low" | "medium" | "high" | "critical";
    headers?: Record<string, string>;
}
export interface AlertMessage {
    level: "info" | "warning" | "error" | "critical";
    title: string;
    message: string;
    context: PostProcessorContext;
    metadata?: Record<string, unknown>;
}
export interface IncidentReportPayload {
    incident: IncidentReport;
    formattedMessage: string;
    affectedSystems: string[];
    recommendedActions: string[];
}
export declare class EscalationEngine {
    private config;
    private incidents;
    private reportingHistory;
    constructor(config?: Partial<EscalationConfig>);
    /**
     * Evaluate if escalation is needed based on failure context
     */
    evaluateEscalation(context: PostProcessorContext, attempts: number, error: string, monitoringResults: MonitoringResult[]): Promise<EscalationResult | null>;
    /**
     * Create a detailed incident report
     */
    private createIncidentReport;
    /**
     * Report incident to configured external systems
     */
    private reportIncidentToExternalSystems;
    /**
     * Send incident to a specific endpoint
     */
    private sendToEndpoint;
    /**
     * Build incident payload for reporting
     */
    private buildIncidentPayload;
    /**
     * Format incident message for external systems
     */
    private formatIncidentMessage;
    /**
     * Get recommended actions based on severity
     */
    private getRecommendedActions;
    /**
     * Send to Slack webhook
     */
    private sendToSlack;
    /**
     * Send to PagerDuty
     */
    private sendToPagerDuty;
    /**
     * Send generic webhook
     */
    private sendWebhook;
    /**
     * Send email notification (placeholder - would need SMTP configuration)
     */
    private sendEmail;
    /**
     * Get color for severity level (for Slack attachments)
     */
    private getSeverityColor;
    /**
     * Get reporting history
     */
    getReportingHistory(): ReadonlyArray<{
        incidentId: string;
        endpoint: string;
        success: boolean;
        timestamp: number;
        response?: string;
    }>;
    /**
     * Clear reporting history
     */
    clearReportingHistory(): void;
    /**
     * Add reporting endpoint dynamically
     */
    addReportingEndpoint(endpoint: ReportingEndpoint): void;
    /**
     * Remove reporting endpoint
     */
    removeReportingEndpoint(name: string): boolean;
    /**
     * Get configured reporting endpoints
     */
    getReportingEndpoints(): ReportingEndpoint[];
    /**
     * Send alerts through configured channels
     */
    private sendAlerts;
    /**
     * Send alert to specific channel
     */
    private sendAlertToChannel;
    /**
     * Get emoji for alert level
     */
    private getAlertEmoji;
    /**
     * Map escalation level to severity
     */
    private mapLevelToSeverity;
    /**
     * Map escalation level to alert level
     */
    private mapLevelToAlertLevel;
    /**
     * Get incident report by ID
     */
    getIncidentReport(incidentId: string): IncidentReport | undefined;
    /**
     * Get all active incidents
     */
    getActiveIncidents(): IncidentReport[];
    /**
     * Resolve an incident
     */
    resolveIncident(incidentId: string, resolution: string): boolean;
    /**
     * Get escalation statistics
     */
    getStats(): {
        totalIncidents: number;
        activeIncidents: number;
        escalationsByLevel: Record<string, number>;
    };
}
//# sourceMappingURL=EscalationEngine.d.ts.map