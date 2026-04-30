export interface StructuralPattern {
    name: string;
    confidence: number;
    evidence: string[];
    description: string;
}
export declare function analyzeStructuralPatterns(fromRef: string, toRef: string): StructuralPattern[];
//# sourceMappingURL=semantic-patterns.d.ts.map