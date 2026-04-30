export interface DeployVerificationResult {
    success: boolean;
    packageVersion: string;
    tarballPath: string;
    installDir: string;
    checks: DeployCheck[];
    duration: number;
    timestamp: string;
}
export interface DeployCheck {
    name: string;
    passed: boolean;
    output: string;
    duration: number;
}
export declare class DeployVerifier {
    private projectRoot;
    constructor(projectRoot?: string);
    verify(): DeployVerificationResult;
    quickVerify(): DeployVerificationResult;
    private runCheck;
    private exec;
    private readPackageJson;
    private cleanup;
    private result;
}
//# sourceMappingURL=deploy-verifier.d.ts.map