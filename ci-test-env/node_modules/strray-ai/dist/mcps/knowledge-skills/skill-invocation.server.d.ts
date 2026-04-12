declare class SkillInvocationServer {
    private server;
    constructor();
    private setupToolHandlers;
    private skillMetrics;
    /**
     * Record skill invocation outcome for adaptive learning
     */
    private recordSkillOutcome;
    private handleListSkills;
    private handleInvokeSkill;
    private handleSkillCodeReview;
    private handleSkillSecurityAudit;
    private handleSkillPerformanceOptimization;
    private handleSkillTestingStrategy;
    private handleSkillProjectAnalysis;
    private handleSkillDatabaseDesign;
    private handleSkillDevopsDeployment;
    private handleSkillApiDesign;
    private handleSkillUiUxDesign;
    private handleSkillDocumentationGeneration;
    private handleSkillStoryteller;
    run(): Promise<void>;
}
export { SkillInvocationServer };
//# sourceMappingURL=skill-invocation.server.d.ts.map