/**
 * StringRay Context Size Validator
 *
 * Prevents system prompt bloat by validating and rejecting context-injection attempts
 * that would exceed token budgets.
 *
 * @version 1.0.0
 * @since 2026-03-03
 */
/**
 * Default configuration settings
 */
const DEFAULT_CONFIG = {
    maxSystemPromptLength: 4000, // Max system prompt length
    maxCodexContextLength: 2000, // Max codex terms (reduced from 7000)
    maxTotalPromptLength: 8000, // Maximum total token budget
    enableCompression: true, // Enable automatic compression
    preventDuplicateContent: true, // Prevent duplicate context blocks
};
/**
 * Estimate text size in tokens (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Detect duplicate content patterns
 */
function detectDuplicatePatterns(content) {
    const patterns = [
        // Multiple version blocks
        /StrRay Codex Context v[\d.]+.*?Source: [\s\S]*?---/g,
        // Duplicate ASCII art
        /═+/g,
        // Repeated framework banners  
        /StringRay Framework v[\d.]+.*?Successfully Loaded/g,
        // Multiple interweaves/lenses sections
        /Interweaves:|Lenses:|Anti-patterns:/g
    ];
    const duplicates = [];
    patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && matches.length > 1) {
            duplicates.push(`Found ${matches.length} instances of pattern: ${pattern}`);
        }
    });
    return duplicates;
}
/**
 * Compress codex content by keeping only essential terms
 */
function compressCodexContent(content, maxLength) {
    if (content.length <= maxLength)
        return content;
    // Split content into lines and keep only essential parts
    const lines = content.split('\n');
    const essentialLines = [];
    let currentLength = 0;
    // Prioritize: essential terms first, then metadata, then non-critical content
    const essentialKeywords = [
        'Progressive Prod-Ready Code',
        'No Patches/Boiler/Stubs/Bridge Code',
        'Resolve All Errors',
        'Prevent Infinite Loops',
        'Type Safety First',
        'Core Terms:',
        'Essential Rules:',
        'Universal Development Codex'
    ];
    // Add essential content first
    for (const line of lines) {
        if (currentLength + line.length >= maxLength)
            break;
        // Prioritize lines with essential keywords
        if (essentialKeywords.some(keyword => line.includes(keyword))) {
            essentialLines.push(line);
            currentLength += line.length;
        }
    }
    // Add remaining content if space permits
    for (const line of lines) {
        if (currentLength + line.length >= maxLength)
            break;
        if (!essentialLines.includes(line)) {
            essentialLines.push(line);
            currentLength += line.length;
        }
    }
    const compressed = essentialLines.join('\n') + '\n... (content optimized for token efficiency)';
    return compressed;
}
/**
 * Validate context size and detect bloat
 */
export function validateContext(context, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const warnings = [];
    let compressionApplied = false;
    // Estimate token count
    const sizeInTokens = estimateTokenCount(context);
    const exceedsBudget = sizeInTokens > finalConfig.maxTotalPromptLength;
    // Check for duplicate content
    if (finalConfig.preventDuplicateContent) {
        const duplicates = detectDuplicatePatterns(context);
        if (duplicates.length > 0) {
            warnings.push("Duplicate content patterns detected:");
            warnings.push(...duplicates);
        }
    }
    // Check for ASCII art (major token consumer)
    const asciiArtLines = context.split('\n').filter(line => line.includes('═') || line.includes('╔') || line.includes('╝'));
    if (asciiArtLines.length > 2) {
        warnings.push(`Excessive ASCII art detected (${asciiArtLines.length} lines, ~${asciiArtLines.length * 50} tokens)`);
    }
    // Check codex-specific bloat
    if (context.includes('Universal Development Codex') && sizeInTokens > 3000) {
        warnings.push("Codex context may be too verbose (>3000 tokens)");
    }
    // Apply compression if needed and enabled
    let optimizedContent = context;
    if (exceedsBudget && finalConfig.enableCompression) {
        optimizedContent = compressCodexContent(context, finalConfig.maxTotalPromptLength);
        compressionApplied = true;
        warnings.push(`Content compressed to ${estimateTokenCount(optimizedContent)} tokens`);
    }
    // Additional size-based warnings
    if (sizeInTokens > finalConfig.maxTotalPromptLength * 0.9) {
        warnings.push(`Context approaching token limit (${sizeInTokens}/${finalConfig.maxTotalPromptLength})`);
    }
    return {
        isValid: !exceedsBudget,
        sizeInTokens,
        exceedsBudget,
        warnings,
        compressionApplied,
        optimizedContent: compressionApplied ? optimizedContent : undefined
    };
}
/**
 * Validate context collection (multiple contexts combined)
 */
export function validateContextCollection(contexts, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    // Combine all contexts
    const combinedContext = contexts.join('\n\n');
    // Validate combined context
    return validateContext(combinedContext, finalConfig);
}
/**
 * Prevent system prompt bloat middleware
 */
export function preventSystemPromptBloat(context, onWarning) {
    const validation = validateContext(context, {
        maxSystemPromptLength: 3000,
        enableCompression: true,
        preventDuplicateContent: true
    });
    // Log warnings if callback provided
    if (onWarning) {
        validation.warnings.forEach(warning => onWarning(warning));
    }
    // Return optimized content or original if validation passes
    return validation.optimizedContent || context;
}
/**
 * Utility function to check if a prompt is likely to cause overflow
 */
export function isPromptLikelyToOverflow(prompt) {
    // Heuristic checks for known bloat patterns
    const bloatIndicators = [
        // Multiple version blocks
        /StrRay Codex Context v[\d.]+.*?StrRay Codex Context v[\d.]+/s,
        // Extremely long prompts (>12,000 tokens)
        prompt.length > 48000,
        // Multiple ASCII art banners
        /═+/g,
        // Repeated context sections
        /Terms Loaded: \d+.*?Terms Loaded: \d+/s
    ];
    return bloatIndicators.some(indicator => {
        if (typeof indicator === 'string') {
            return prompt.includes(indicator);
        }
        else if (indicator instanceof RegExp) {
            return indicator.test(prompt);
        }
        return false;
    });
}
/**
 * Generate a safe system prompt template
 */
export function generateSafeSystemPrompt(baseTemplate, additionalContext, maxTokens = 6000) {
    // Check if additional context causes overflow
    const contextValidation = validateContext(additionalContext, {
        maxTotalPromptLength: maxTokens
    });
    if (!contextValidation.isValid) {
        // Use minimal context only
        const minimalContext = additionalContext.split('\n').slice(0, 10).join('\n');
        const finalPrompt = `${baseTemplate}\n\n${minimalContext}`;
        return {
            prompt: finalPrompt,
            safe: true
        };
    }
    const finalPrompt = `${baseTemplate}\n\n${additionalContext}`;
    return {
        prompt: finalPrompt,
        safe: estimateTokenCount(finalPrompt) <= maxTokens
    };
}
//# sourceMappingURL=context-validator.js.map