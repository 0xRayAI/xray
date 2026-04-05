/**
 * SEO Utilities
 *
 * Helper functions for SEO-related operations.
 * Provides schema validation, URL parsing, and meta tag generation.
 */
/**
 * Parse a URL and extract SEO-relevant components
 */
export declare function parseUrlForSeo(urlString: string): {
    hostname: string;
    pathname: string;
    isSecure: boolean;
    slug: string;
};
/**
 * Generate a slug from a title
 */
export declare function generateSlug(title: string): string;
/**
 * Calculate readability score (Flesch-Kincaid approximation)
 */
export declare function calculateReadability(text: string): {
    score: number;
    grade: string;
};
/**
 * Validate JSON-LD schema structure
 */
export declare function validateJsonLd(schema: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=seo-utils.d.ts.map