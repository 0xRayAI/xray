/**
 * SEO Utilities
 *
 * Helper functions for SEO-related operations.
 * Provides schema validation, URL parsing, and meta tag generation.
 */
import { URL } from "url";
/**
 * Parse a URL and extract SEO-relevant components
 */
export function parseUrlForSeo(urlString) {
    try {
        const url = new URL(urlString);
        const pathname = url.pathname === "/" ? "" : url.pathname;
        const slug = pathname.split("/").filter(Boolean).join("-").toLowerCase();
        return {
            hostname: url.hostname,
            pathname: url.pathname,
            isSecure: url.protocol === "https:",
            slug,
        };
    }
    catch {
        return {
            hostname: "",
            pathname: "",
            isSecure: false,
            slug: "",
        };
    }
}
/**
 * Generate a slug from a title
 */
export function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
/**
 * Calculate readability score (Flesch-Kincaid approximation)
 */
export function calculateReadability(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const syllables = words.reduce((count, word) => {
        return count + countSyllables(word);
    }, 0);
    if (words.length === 0 || sentences.length === 0) {
        return { score: 0, grade: "N/A" };
    }
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    let grade;
    if (score >= 90)
        grade = "Very Easy";
    else if (score >= 80)
        grade = "Easy";
    else if (score >= 70)
        grade = "Fairly Easy";
    else if (score >= 60)
        grade = "Standard";
    else if (score >= 50)
        grade = "Fairly Difficult";
    else if (score >= 30)
        grade = "Difficult";
    else
        grade = "Very Difficult";
    return { score: Math.round(score), grade };
}
function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length <= 3)
        return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}
/**
 * Validate JSON-LD schema structure
 */
export function validateJsonLd(schema) {
    const errors = [];
    if (!schema["@context"] || schema["@context"] !== "https://schema.org") {
        errors.push("Missing or invalid @context");
    }
    if (!schema["@type"]) {
        errors.push("Missing @type");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=seo-utils.js.map