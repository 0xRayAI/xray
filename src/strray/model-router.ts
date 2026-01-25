import * as fs from 'fs';
import * as path from 'path';

interface ModelConfig {
    model_routing?: Record<string, string>;
    model_default?: string;
    model_fallback?: string;
    available_models?: string[];
    deprecated_models?: string[];
}

class ModelRouter {
    private configPath: string;
    private config: ModelConfig;
    private availableModels: string[];

    constructor(configPath?: string) {
        this.configPath = configPath || path.resolve(process.cwd(), '.opencode', 'oh-my-opencode.json');
        this.config = this.loadConfig();
        this.availableModels = this.discoverModels();
    }

    private loadConfig(): ModelConfig {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(configData);
        } catch {
            // Provide defaults if config not found
            return {
                model_routing: {},
                model_default: "openrouter/xai-grok-2-1212-fast-1",
                model_fallback: "openai/gpt-4o-mini"
            };
        }
    }

    private discoverModels(): string[] {
        const defaultModels = [
            "openrouter/xai-grok-2-1212-fast-1",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "anthropic/claude-3-5-sonnet-20241022",
            "google/gemini-pro-1.5",
            "google/gemini-flash-1.5",
            "meta/llama-3.1-70b-instruct",
            "mistral/mistral-7b-instruct"
        ];

        const configModels = this.config.available_models || [];
        return [...new Set([...defaultModels, ...configModels])];
    }

    getValidatedModel(agentType?: string): string {
        // 1. User preference (future enhancement)
        const userModel = this.getUserPreference();
        if (userModel && this.isModelAvailable(userModel)) {
            return userModel;
        }

        // 2. Agent-specific model routing
        if (agentType && this.config.model_routing?.[agentType]) {
            const agentModel = this.config.model_routing[agentType];
            if (this.isModelAvailable(agentModel)) {
                return agentModel;
            }
        }

        // 3. Framework default
        const defaultModel = this.config.model_default || "openrouter/xai-grok-2-1212-fast-1";
        if (this.isModelAvailable(defaultModel)) {
            return defaultModel;
        }

        // 4. Ultimate fallback
        const fallbackModel = this.config.model_fallback || "openai/gpt-4o-mini";
        return fallbackModel;
    }

    private getUserPreference(): string | null {
        // Check for user-specific config (future enhancement)
        return null;
    }

    private isModelAvailable(model: string): boolean {
        if (this.config.deprecated_models?.includes(model)) {
            return false;
        }
        return this.availableModels.includes(model);
    }
}

// Export singleton instance
export const modelRouter = new ModelRouter();
export default modelRouter;