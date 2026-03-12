/**
 * Content Mappings
 *
 * Maps content creation and marketing tasks to content creator and growth strategist.
 * Includes copywriting, SEO, marketing, and content strategy.
 */

import type { RoutingMapping } from '../types.js';

export const CONTENT_MAPPINGS: RoutingMapping[] = [
  // ===== Antigravity Skills =====
  {
    keywords: [
      "copywriting",
      "marketing copy",
      "landing page copy",
      "headline",
      "advertising copy",
      "cta copy",
      "seo content",
      "blog post",
      "meta description",
      "product description",
      "social media copy",
      "email copy",
    ],
    skill: "copywriting",
    agent: "content-creator",
    confidence: 0.98,
    category: "content",
    priority: "high",
  },
  {
    keywords: [
      "pricing strategy",
      "saas pricing",
      "monetization",
      "pricing model",
      "price optimization",
    ],
    skill: "pricing-strategy",
    agent: "growth-strategist",
    confidence: 0.98,
    category: "content",
    priority: "high",
  },
  {
    keywords: [
      "rag",
      "vector database",
      "embedding",
      "chunking",
      "retrieval",
      "vector db",
      "pinecone",
      "weaviate",
      "chroma",
    ],
    skill: "rag-engineer",
    agent: "researcher",
    confidence: 0.98,
    category: "content",
    priority: "high",
  },
  {
    keywords: [
      "prompt engineering",
      "prompt-optimization",
      "few-shot",
      "chain-of-thought",
    ],
    skill: "prompt-engineering",
    agent: "researcher",
    confidence: 0.98,
    category: "content",
    priority: "high",
  },

  // ===== User-friendly aliases =====
  {
    keywords: ["marketing", "campaign", "growth", "conversion", "pricing"],
    skill: "content-marketing-strategy",
    agent: "growth-strategist",
    confidence: 0.95,
    category: "content",
    priority: "high",
  },
  {
    keywords: ["content", "write content", "blog", "article", "seo", "copy"],
    skill: "copywriting",
    agent: "content-creator",
    confidence: 0.9,
    category: "content",
    priority: "medium",
  },

  // ===== SEO =====
  {
    keywords: ["seo", "search engine", "keyword", "meta", "ranking", "google"],
    skill: "seo-consultant",
    agent: "seo-consultant",
    confidence: 0.95,
    category: "content",
    priority: "high",
  },

  // ===== Marketing =====
  {
    keywords: ["marketing", "campaign", "brand", "growth", "conversion", "cta"],
    skill: "growth-strategist",
    agent: "growth-strategist",
    confidence: 0.9,
    category: "content",
    priority: "high",
  },

  // ===== Mobile =====
  {
    keywords: ["mobile", "ios", "android", "react native", "flutter", "app"],
    skill: "mobile-development",
    agent: "mobile-developer",
    confidence: 0.95,
    category: "content",
    priority: "high",
  },
];
