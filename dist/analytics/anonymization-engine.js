/**
 * Anonymization Engine for 0xRay Central Analytics
 *
 * Removes personally identifiable information and project-specific data
 * while preserving learning value through pattern extraction.
 *
 * @version 1.0.0
 * @since 2026-03-06
 */
import * as crypto from "crypto";
export class AnonymizationEngine {
    frameworkVersion = "1.7.2";
    /**
     * Anonymize raw reflection data
     */
    anonymize(rawData) {
        const submissionId = crypto.randomUUID();
        // Extract learning signals before removing sensitive data
        const learningSignals = this.extractLearningSignals(rawData);
        // Build anonymized reflection
        const anonymized = {
            submissionId,
            metadata: {
                submissionId,
                frameworkVersion: this.frameworkVersion,
                timestampRelative: this.anonymizeTimestamp(rawData.timestamp),
                region: this.anonymizeRegion(rawData.ipAddress) || undefined
            },
            content: {
                taskType: learningSignals.taskType,
                complexity: learningSignals.complexity,
                routedAgent: this.standardizeAgentName(learningSignals.routedAgent),
                outcome: learningSignals.outcome,
                duration: learningSignals.duration,
                confidence: learningSignals.confidence,
                emotionalContext: learningSignals.emotionalContext,
                patterns: learningSignals.patterns,
                reflectionStructure: learningSignals.reflectionStructure
            }
        };
        return anonymized;
    }
    /**
     * Extract learning signals from raw data
     */
    extractLearningSignals(rawData) {
        // Determine task type from content
        const taskType = this.detectTaskType(rawData.reflection);
        // Estimate complexity (simplified version)
        const complexity = this.estimateComplexity(rawData.reflection);
        // Extract agent name
        const routedAgent = this.extractAgentName(rawData.reflection);
        // Determine outcome
        const outcome = this.detectOutcome(rawData.reflection);
        // Estimate duration (default to 0 if not available)
        const duration = 0; // Would be extracted from logs in real implementation
        // Estimate confidence (default to 0.5 if not available)
        const confidence = 0.5; // Would be extracted from routing in real implementation
        // Extract emotional context
        const emotionalContext = this.extractEmotionalContext(rawData.reflection);
        // Extract patterns
        const patterns = this.extractPatterns(rawData.reflection);
        // Analyze reflection structure
        const reflectionStructure = this.analyzeReflectionStructure(rawData.reflection);
        return {
            taskType,
            complexity,
            routedAgent,
            outcome,
            duration,
            confidence,
            emotionalContext,
            patterns,
            reflectionStructure
        };
    }
    /**
     * Detect task type from reflection content
     */
    detectTaskType(reflection) {
        const lowerReflection = reflection.toLowerCase();
        if (lowerReflection.includes("bug") || lowerReflection.includes("fix") || lowerReflection.includes("debug")) {
            return "bug_fix";
        }
        if (lowerReflection.includes("implement") || lowerReflection.includes("feature") || lowerReflection.includes("add")) {
            return "feature_implementation";
        }
        if (lowerReflection.includes("test") || lowerReflection.includes("spec")) {
            return "testing";
        }
        if (lowerReflection.includes("deploy") || lowerReflection.includes("release")) {
            return "deployment";
        }
        if (lowerReflection.includes("refactor") || lowerReflection.includes("optimize")) {
            return "refactoring";
        }
        return "general_task";
    }
    /**
     * Estimate complexity from reflection content
     */
    estimateComplexity(reflection) {
        // Simplified complexity estimation based on length and content
        const length = reflection.length;
        const hasKeywords = [
            "complex", "difficult", "challenge", "struggle",
            "multiple", "several", "various"
        ].some(keyword => reflection.toLowerCase().includes(keyword));
        let complexity = 50; // Base complexity
        // Adjust based on length
        if (length > 500)
            complexity += 10;
        if (length > 1000)
            complexity += 15;
        // Adjust based on keywords
        if (hasKeywords)
            complexity += 20;
        // Normalize to 1-100 range
        return Math.min(100, Math.max(1, complexity));
    }
    /**
     * Detect agent from reflection content using keyword matching
     */
    extractAgentName(reflection) {
        const lowerReflection = reflection.toLowerCase();
        // First, check for direct agent mentions (highest priority)
        const directAgentMentions = [
            "enforcer", "orchestrator", "architect", "security-auditor",
            "code-reviewer", "refactorer", "testing-lead", "bug-triage-specialist",
            "researcher", "strategist", "frontend-engineer", "backend-engineer"
        ];
        for (const agent of directAgentMentions) {
            if (lowerReflection.includes(agent)) {
                return agent;
            }
        }
        // Then check for keyword matches
        const keywordAgents = {
            "bug": "bug-triage-specialist",
            "fix": "bug-triage-specialist",
            "debug": "bug-triage-specialist",
            "triage": "bug-triage-specialist",
            "issue": "enforcer",
            "problem": "enforcer",
            "error": "enforcer",
            "security": "security-auditor",
            "vulnerab": "security-auditor",
            "audit": "security-auditor",
            "refactor": "refactorer",
            "optimize": "refactorer",
            "review": "code-reviewer",
            "architect": "architect",
            "design": "architect",
            "test": "testing-lead",
            "testing": "testing-lead",
            "orchestrat": "orchestrator",
            "coordinate": "orchestrator",
            "enforce": "enforcer",
            "validat": "enforcer",
            "quality": "enforcer",
            "strateg": "strategist",
            "plan": "strategist",
            "research": "researcher",
            "find": "researcher",
            "search": "researcher"
        };
        for (const [keyword, agent] of Object.entries(keywordAgents)) {
            if (lowerReflection.includes(keyword)) {
                return agent;
            }
        }
        return "unknown";
    }
    /**
     * Detect outcome from reflection
     */
    detectOutcome(reflection) {
        const lowerReflection = reflection.toLowerCase();
        const failureIndicators = ["failed", "error", "bug", "crash", "timeout"];
        const successIndicators = ["succeeded", "completed", "finished", "resolved", "fixed"];
        const hasFailure = failureIndicators.some(indicator => lowerReflection.includes(indicator));
        const hasSuccess = successIndicators.some(indicator => lowerReflection.includes(indicator));
        if (hasFailure && !hasSuccess) {
            return "failure";
        }
        return "success";
    }
    /**
     * Extract emotional context indicators
     */
    extractEmotionalContext(reflection) {
        const lowerReflection = reflection.toLowerCase();
        // Detect struggle level
        const highStruggle = ["extremely", "very difficult", "struggled", "challenging"];
        const mediumStruggle = ["difficult", "complex", "complicated"];
        const lowStruggle = ["minor", "simple", "easy"];
        let struggleLevel = "none";
        if (highStruggle.some(word => lowerReflection.includes(word))) {
            struggleLevel = "extreme";
        }
        else if (mediumStruggle.some(word => lowerReflection.includes(word))) {
            struggleLevel = "high";
        }
        else if (lowStruggle.some(word => lowerReflection.includes(word))) {
            struggleLevel = "medium";
        }
        // Count frustration indicators
        const frustrationWords = ["frustrated", "stuck", "blocked", "confused", "unclear"];
        const frustrationIndicators = frustrationWords.filter(word => lowerReflection.includes(word)).length;
        // Detect counterfactual analysis
        const counterfactualIndicators = [
            "would have", "if i had", "what if", "could have", "should have",
            "counterfactual", "hypothetical", "alternative"
        ];
        const hasCounterfactualAnalysis = counterfactualIndicators.some(word => lowerReflection.includes(word));
        // Estimate depth score (simplified)
        const depthIndicators = [
            "inner dialogue", "counterfactual", "master's wisdom",
            "personal journey", "deep lessons", "root cause"
        ];
        const depthScore = Math.min(5, depthIndicators.filter(word => lowerReflection.includes(word)).length);
        return {
            struggleLevel,
            frustrationIndicators,
            hasCounterfactualAnalysis,
            depthScore
        };
    }
    /**
     * Extract patterns from reflection
     */
    extractPatterns(reflection) {
        const lowerReflection = reflection.toLowerCase();
        // Extract keywords
        const keywords = [];
        const possibleKeywords = [
            "bug", "fix", "debug", "error", "issue",
            "feature", "implement", "add", "create",
            "test", "spec", "verify", "validate",
            "deploy", "release", "publish", "ship",
            "refactor", "optimize", "improve", "enhance"
        ];
        possibleKeywords.forEach(keyword => {
            if (lowerReflection.includes(keyword)) {
                keywords.push(keyword);
            }
        });
        // Detect kernel pattern (simplified)
        let kernelPattern;
        if (keywords.includes("critical") && keywords.includes("path")) {
            kernelPattern = "P1-critical-path-violation";
        }
        // Estimate success rate (would be calculated from historical data in real implementation)
        const successRate = 0.85; // Default estimate
        return {
            keywordsMatched: keywords,
            kernelPattern,
            successRate
        };
    }
    /**
     * Analyze reflection structure
     */
    analyzeReflectionStructure(reflection) {
        const lowerReflection = reflection.toLowerCase();
        const hasInnerDialogue = lowerReflection.includes("inner dialogue") ||
            lowerReflection.includes("what i was thinking");
        const hasCounterfactual = lowerReflection.includes("counterfactual") ||
            lowerReflection.includes("would have happened");
        const hasMasterWisdom = lowerReflection.includes("master") ||
            lowerReflection.includes("what they knew");
        // Estimate emotional honesty (simplified)
        const emotionalWords = ["frustrated", "struggled", "stuck", "confused",
            "uncertain", "worried", "anxious", "relieved"];
        const emotionalHonestyScore = Math.min(5, emotionalWords.filter(word => lowerReflection.includes(word)).length);
        // Categorize length
        const lengthCategory = reflection.length < 500 ? "short" :
            reflection.length < 1000 ? "medium" : "long";
        return {
            hasInnerDialogue,
            hasCounterfactual,
            hasMasterWisdom,
            emotionalHonestyScore,
            lengthCategory
        };
    }
    /**
     * Standardize agent names
     */
    standardizeAgentName(agent) {
        // If agent is already a valid agent name, return it as-is
        const validAgents = [
            "enforcer", "orchestrator", "architect", "security-auditor",
            "code-reviewer", "refactorer", "testing-lead", "bug-triage-specialist",
            "researcher", "strategist", "frontend-engineer", "backend-engineer"
        ];
        if (validAgents.includes(agent)) {
            return agent;
        }
        const standardNames = {
            "enforcer": "enforcer",
            "orchestrator": "orchestrator",
            "architect": "architect",
            "security": "security-auditor",
            "auditor": "security-auditor",
            "code": "code-reviewer",
            "reviewer": "code-reviewer",
            "refactor": "refactorer",
            "testing": "testing-lead",
            "test": "testing-lead",
            "bug": "bug-triage-specialist",
            "triage": "bug-triage-specialist",
            "research": "researcher"
        };
        return standardNames[agent] || "unknown";
    }
    /**
     * Anonymize timestamp to relative time
     */
    anonymizeTimestamp(timestamp) {
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
            return diffDays;
        }
        return diffHours;
    }
    /**
     * Anonymize region from IP address
     */
    anonymizeRegion(ipAddress) {
        if (!ipAddress) {
            return undefined;
        }
        // Extract rough region (simplified - real implementation would use GeoIP)
        // This is just a placeholder for demonstration
        const ipParts = ipAddress.split('.');
        if (ipParts.length >= 2) {
            const firstOctet = parseInt(ipParts[0]);
            if (firstOctet >= 1 && firstOctet <= 126)
                return "NA"; // North America
            if (firstOctet >= 128 && firstOctet <= 191)
                return "ASIA"; // Asia
            if (firstOctet >= 192 && firstOctet <= 223)
                return "EU"; // Europe
        }
        return undefined;
    }
}
//# sourceMappingURL=anonymization-engine.js.map