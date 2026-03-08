# StringRay Central Analytics Store Architecture

**Version:** 1.0.0  
**Date:** 2026-03-06  
**Status:** Design Document

## Executive Summary

This document outlines a privacy-first, opt-in central analytics architecture for StringRay Framework that enables collective learning while maintaining strict data privacy and consent control. The system allows projects to voluntarily contribute anonymized reflections and AI logs to a central web store, enabling the P9 Adaptive Pattern Learning system to benefit from community data.

## Problem Statement

**Current Limitations:**
- P9 Adaptive Learning only learns from individual project data
- Pattern performance insights are siloed per project
- No way to benefit from collective wisdom across multiple projects
- No mechanism to share learning while protecting privacy

**Key Requirements:**
- Opt-in consent with easy opt-out capability
- Complete anonymization of project and personal data
- No identifiable information in central store
- Immediate disable mechanism
- Value return to contributing projects

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Project                        │
│  ┌──────────────┐         ┌─────────────────────────┐  │
│  │ StringRay    │────────▶│ Analytics Manager        │  │
│  │ Framework     │         │ (Local Consent Engine)   │  │
│  └──────────────┘         └─────────────────────────┘  │
│         │                         │                      │
│         │                         ▼                      │
│         │              ┌───────────────────┐            │
│         │              │ Anonymization     │            │
│         │              │ Engine           │            │
│         │              └───────────────────┘            │
│         │                         │                      │
│         │                         ▼                      │
│         │              ┌───────────────────┐            │
│         └─────────────▶│ Consent Manager   │            │
│                        │ (Opt-in/Out)    │            │
│                        └───────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (Anonymized)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Central Analytics Store                        │
│  ┌──────────────────────────────────────────────────┐     │
│  │ API Gateway & Rate Limiter                      │     │
│  └──────────────────────────────────────────────────┘     │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Data Ingestion Pipeline                        │     │
│  │ • Schema Validation                            │     │
│  │ • Duplicate Detection                           │     │
│  │ • Quality Scoring                               │     │
│  └──────────────────────────────────────────────────┘     │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Analytics Database                              │     │
│  │ • Anonymized Reflections                      │     │
│  │ • Pattern Performance Metrics                  │     │
│  │ • Agent Success Rates                          │     │
│  │ • Learned Patterns                             │     │
│  └──────────────────────────────────────────────────┘     │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │ P9 Learning Engine                              │     │
│  │ • Pattern Performance Tracker                  │     │
│  │ • Emerging Pattern Detector                    │     │
│  │ • Pattern Learning Engine                     │     │
│  └──────────────────────────────────────────────────┘     │
│                           │                              │
└──────────────────────────┬───────────────────────────────┘
                           │
                           │ Value Return
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Contributing Projects                         │
│  • Improved Routing Patterns                              │
│  • Agent Performance Benchmarks                          │
│  • Community Best Practices                              │
│  • Early Warning System                                  │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
stringray/
├── docs/
│   ├── architecture/
│   │   └── central-analytics-store.md       # This document
│   ├── quickstart/
│   │   └── central-analytics-quickstart.md  # User guide
│   └── implementation-summary/
│       └── central-analytics-solution.md    # Implementation overview
│
├── src/
│   ├── analytics/
│   │   ├── central-analytics-client.ts       # Client-side submission
│   │   ├── anonymization-engine.ts         # Data anonymization
│   │   ├── consent-manager.ts             # Consent management
│   │   ├── value-return-engine.ts         # Community insights
│   │   └── ...
│   │
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── analytics-enable.ts        # Enable command
│   │   │   ├── analytics-disable.ts       # Disable command
│   │   │   ├── analytics-status.ts       # Status check
│   │   │   └── analytics-preview.ts      # Preview submission
│   │   └── index.ts                    # Main CLI entry point
│   │
│   └── state/
│       └── consent-state.ts              # Consent persistence
│
└── .opencode/
    ├── consent.json                       # User consent configuration
    └── analytics/
        ├── submission-queue.json          # Queued submissions
        └── local-metrics.json           # Local analytics data
```

### Git Tree for Analytics Features

```bash
# View central analytics file structure
git ls-tree -r HEAD --name-only | grep -E "analytics|consent"

# Show analytics commits
git log --oneline --all --grep="analytics"

# Track analytics file changes
git diff --stat docs/architecture/central-analytics-store.md

# Check if consent file is tracked (should be .gitignored)
git check-ignore -v .opencode/consent.json

# View analytics implementation branch structure
git tree analytics-implementation -- docs/ src/
```

### Environment Configuration Files

```
# Files added to .gitignore for privacy
.opencode/consent.json
.opencode/analytics/submission-queue.json
.opencode/analytics/local-metrics.json
.analytics/*.json
```

### Deployment Structure

```
central-analytics-server/
├── api/
│   ├── v1/
│   │   ├── analytics.ts              # Main API routes
│   │   ├── consent.ts               # Consent endpoints
│   │   ├── submission.ts            # Data submission
│   │   └── insights.ts              # Value return endpoints
│   └── middleware/
│       ├── rate-limiter.ts
│       ├── authentication.ts
│       └── validation.ts
│
├── processing/
│   ├── ingestion.ts                 # Data processing pipeline
│   ├── quality-scoring.ts           # Quality validation
│   ├── duplicate-detection.ts       # Duplicate handling
│   └── pii-stripper.ts            # PII removal
│
├── storage/
│   ├── database/
│   │   ├── reflections/
│   │   ├── metrics/
│   │   └── patterns/
│   └── backups/
│
├── learning/
│   ├── p9-pattern-tracker.ts        # Pattern performance
│   ├── emerging-detector.ts          # Pattern discovery
│   ├── learning-engine.ts           # Pattern synthesis
│   └── community-insights.ts        # Value return
│
└── config/
    ├── security.ts                 # Security policies
    ├── privacy.ts                 # Privacy rules
    └── rate-limits.ts             # Rate configuration
```

## Data Flow

### 1. Local Processing (Consumer Side)

```typescript
// Step 1: Generate anonymized data
const anonymizedData = await anonymizer.process({
  reflection: rawReflection,
  logs: frameworkLogs,
  projectId: projectConfig.id  // Will be hashed/removed
});

// Step 2: Check consent status
const consentStatus = await consentManager.getCurrentStatus();

if (consentStatus.analyticsEnabled) {
  // Step 3: Submit to central store
  await centralAnalyticsClient.submit(anonymizedData);
}
```

### 2. Central Ingestion (Server Side)

```typescript
// Step 1: Validate schema
const validation = await validateSubmission(data);
if (!validation.valid) return rejection;

// Step 2: Remove any remaining PII
const cleanedData = await piiStripper.clean(data);

// Step 3: Check duplicates
const isDuplicate = await duplicateDetector.check(cleanedData);
if (isDuplicate) return acknowledgment;

// Step 4: Store and process
await analyticsDatabase.store(cleanedData);
await p9LearningEngine.process(cleanedData);
```

## Anonymization Strategy

### What Gets Stripped

**Project-Level Data:**
- Project name
- Repository URLs
- Company names
- File paths (normalized to relative patterns)
- IP addresses
- Custom agent names

**Personal Data:**
- User names
- Email addresses
- Commit author information
- Personal identifiers
- Timestamps (normalized to relative time)

**Specific Code:**
- Actual code snippets beyond patterns
- API keys and secrets
- Proprietary business logic

### What Gets Preserved (for Learning)

**Pattern-Effective Data:**
- Agent performance metrics (success rates, confidence scores)
- Complexity ratings and outcomes
- Error patterns and frequencies
- Keyword routing effectiveness
- Emotional/struggle patterns (without names)
- Counterfactual analysis structures

**Anonymized Learning Signals:**
- "Agent X struggled with complexity Y type tasks"
- "Pattern Z keyword led to 40% success rate"
- "Error type Q occurred 15 times with agent R"
- "Reflection depth score: 8/10"

### Anonymization Implementation

```typescript
interface AnonymizedReflection {
  // Removed: project identifiers, personal info
  metadata: {
    submissionId: string;           // UUID
    frameworkVersion: string;         // Only version number
    timestampRelative: number;        // "2 hours ago" not "2026-03-06 10:30"
    region?: string;                 // Optional: coarse geography
  };
  
  content: {
    taskType: string;               // "bug_fix", "feature_implementation"
    complexity: number;              // 1-100 scale
    routedAgent: string;             // "enforcer", "architect" (standardized names)
    outcome: "success" | "failure";
    duration: number;               // Milliseconds
    confidence: number;             // 0-1 scale
    
    // Anonymized emotional context
    emotionalContext: {
      struggleLevel: "none" | "low" | "medium" | "high" | "extreme";
      frustrationIndicators: number; // Count without content
      hasCounterfactualAnalysis: boolean;
      depthScore: number;           // 0-5 scale
    };
    
    // Pattern data (no code specifics)
    patterns: {
      keywordsMatched: string[];     // ["bug", "debug", "critical"]
      kernelPattern?: string;        // "P1-critical-path-violation"
      successRate: number;
    };
    
    // Reflection structure (no content)
    reflectionStructure: {
      hasInnerDialogue: boolean;
      hasCounterfactual: boolean;
      hasMasterWisdom: boolean;
      emotionalHonestyScore: number;
      lengthCategory: "short" | "medium" | "long";
    };
  };
  
  // Removed: actual reflection text, code snippets, file paths
}
```

## Consent Management

### Implementation Design

```typescript
interface ConsentConfiguration {
  analyticsEnabled: boolean;
  consentDate: Date;
  consentVersion: string;
  lastOptOut?: Date;
  
  // Granular controls
  categories: {
    reflections: boolean;
    logs: boolean;
    metrics: boolean;
    patterns: boolean;
  };
}

class ConsentManager {
  private configPath = ".opencode/consent.json";
  
  // Enable analytics (explicit opt-in)
  async enableConsent(categories: string[]): Promise<void> {
    const config = await this.loadConfig();
    config.analyticsEnabled = true;
    config.consentDate = new Date();
    config.consentVersion = "1.0";
    
    // Enable specific categories
    categories.forEach(cat => {
      config.categories[cat] = true;
    });
    
    await this.saveConfig(config);
  }
  
  // Disable analytics (opt-out, takes effect immediately)
  async disableConsent(): Promise<void> {
    const config = await this.loadConfig();
    config.analyticsEnabled = false;
    config.lastOptOut = new Date();
    
    // Disable all categories
    Object.keys(config.categories).forEach(cat => {
      config.categories[cat] = false;
    });
    
    await this.saveConfig(config);
    
    // Immediately stop any active submission queue
    await this.stopSubmissionQueue();
  }
  
  // Check if submission is allowed
  canSubmit(category: string): boolean {
    const config = this.loadConfigSync();
    return config.analyticsEnabled && config.categories[category];
  }
}
```

### CLI Commands

```bash
# Enable analytics (interactive)
npx strray-ai analytics enable

# Enable with specific categories
npx strray-ai analytics enable --categories reflections,metrics

# Disable analytics immediately
npx strray-ai analytics disable

# Check current consent status
npx strray-ai analytics status

# View what data would be submitted (dry run)
npx strray-ai analytics preview
```

## API Schema Design

### Submission Endpoint

```typescript
POST /api/v1/analytics/submit
Content-Type: application/json
Authorization: Bearer <anonymous-submission-token>

Request Body:
{
  "submissionId": "uuid-v4",
  "frameworkVersion": "1.7.2",
  "submissionType": "reflection" | "metrics" | "patterns",
  "data": {
    // Anonymized data (see AnonymizedReflection interface)
  }
}

Response:
{
  "status": "accepted" | "rejected" | "queued",
  "submissionId": "uuid-v4",
  "message": string,
  "contributionScore": number, // Value back to project
}
```

### Consent Registration Endpoint

```typescript
POST /api/v1/analytics/consent/register
Content-Type: application/json

Request Body:
{
  "projectId": "hashed-project-id", // SHA256 of project name + salt
  "consentVersion": "1.0",
  "categories": ["reflections", "metrics"],
  "enabled": true
}

Response:
{
  "projectId": "hashed-project-id",
  "submissionToken": "jwt-token-for-future-submissions",
  "expiresAt": "2026-06-06", // 90 days
  "nextRenewal": "2026-04-06"
}
```

### Status Check Endpoint

```typescript
GET /api/v1/analytics/status/:projectId
Authorization: Bearer <submission-token>

Response:
{
  "projectStatus": {
    "isActive": boolean,
    "consentDate": string,
    "lastSubmission": string,
    "totalSubmissions": number
  },
  "communityImpact": {
    "contributions": number,
    "patternsLearned": number,
    "rank": "top-5%" | "top-10%" | "top-25%" | "participant"
  },
  "valueReturned": {
    "improvedPatterns": number,
    "newAgentInsights": number,
    "earlyWarnings": number
  }
}
```

## Value Return to Projects

### Immediate Benefits

1. **Improved Routing Patterns**
   - Access to collective agent performance data
   - Better confidence calibration across all projects
   - Updated routing patterns without manual intervention

2. **Community Benchmarks**
   - Compare your project's agent performance vs community
   - Identify underperforming areas
   - Access to best practices from successful projects

3. **Early Warning System**
   - Alerts when your project shows unusual patterns
   - Notifications of emerging issues before they become problems
   - Predictive recommendations based on community data

4. **Enhanced P9 Learning**
   - Faster pattern convergence (more data = faster learning)
   - Better detection of emerging patterns
   - More accurate confidence predictions

### Implementation

```typescript
interface CommunityInsights {
  routingRecommendations: {
    taskId: string;
    suggestedAgent: string;
    communitySuccessRate: number;
    yourSuccessRate: number;
    improvementOpportunity: number;
  }[];
  
  benchmarks: {
    agentPerformance: Map<string, number>; // Global averages
    complexityAccuracy: Map<number, number>;
    reflectionQuality: number; // Community average depth score
  };
  
  earlyWarnings: {
    patternId: string;
    description: string;
    severity: "low" | "medium" | "high";
    recommendation: string;
  }[];
}

class ValueReturnEngine {
  async getValueForProject(projectId: string): Promise<CommunityInsights> {
    // Fetch project-specific performance
    const projectMetrics = await this.getProjectMetrics(projectId);
    
    // Compare with community data
    const communityMetrics = await this.getCommunityMetrics();
    
    // Generate actionable insights
    return this.generateInsights(projectMetrics, communityMetrics);
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETED
- [x] Design anonymization engine ✅
- [ ] Implement consent management system 🔜 DESIGN ONLY (not implemented)
- [x] Create API schemas and documentation ✅
- [x] Build basic CLI commands for consent management 🔜 PARTIAL (enhanced existing analytics)

### Phase 2: Client-Side (Weeks 3-4) 🔜 NOT STARTED
- [ ] Implement anonymization pipeline
- [ ] Create submission client with retry logic
- [ ] Build consent UI/CLI interface
- [ ] Add preview functionality (what would be submitted)

### Phase 3: Server-Side (Weeks 5-6) 🔜 NOT STARTED
- [ ] Build API gateway with rate limiting
- [ ] Implement data ingestion pipeline
- [ ] Set up analytics database
- [ ] Integrate with existing P9 learning engine

### Phase 4: Value Return (Weeks 7-8) 🔜 NOT STARTED
- [ ] Implement community insights generation
- [ ] Build benchmark comparison system
- [ ] Create early warning detection
- [ ] Design project dashboard

### Phase 5: Testing & Launch (Weeks 9-10) 🔜 NOT STARTED
- [ ] End-to-end testing with privacy validation
- [ ] Load testing and performance optimization
- [ ] Documentation and tutorials
- [ ] Gradual rollout to beta testers

## Privacy & Compliance

### GDPR Compliance
- Explicit opt-in consent required
- Right to be forgotten (data deletion on request)
- Data portability (export all your data)
- Clear purpose limitation (only for pattern learning)

### Data Protection
- All data encrypted in transit (HTTPS/TLS)
- All data encrypted at rest (AES-256)
- Regular security audits
- Bug bounty program for vulnerabilities

### Transparency
- Open source anonymization code
- Public API documentation
- Regular transparency reports
- Community governance board

## Technical Considerations

### Scalability
- Rate limiting: 10 submissions/minute per project
- Queue-based processing for burst submissions
- Horizontal scaling with load balancing
- Database sharding by project hash

### Reliability
- Offline queue for submissions
- Retry logic with exponential backoff
- Idempotent submission design
- Graceful degradation when central store is down

### Data Quality
- Duplicate detection to prevent gaming
- Quality scoring to prioritize valuable data
- Automated validation of submission schema
- Spam detection and filtering

## Success Metrics

### Adoption
- Number of projects opting in
- Submission rate per project
- Retention rate (projects staying opted in)

### Learning Effectiveness
- Pattern convergence rate improvement
- Agent performance improvement in community
- Early warning accuracy
- Community value returned per submission

### Privacy Trust
- Opt-out rate (should be low)
- Privacy breach incidents (should be zero)
- User satisfaction surveys
- Compliance audit results

## Next Steps

1. **Review and Approve** - Get feedback on this architecture
2. **Create Technical Specs** - Detailed implementation specifications
3. **Build MVP** - Minimal viable product with core features
4. **Beta Testing** - Test with trusted community members
5. **Gradual Rollout** - Expand to broader community
6. **Iterate** - Improve based on feedback and usage data

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-06  
**Owner:** StringRay Architecture Team  
**Review Date:** 2026-04-06