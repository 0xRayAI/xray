/**
 * Keyword Matcher
 *
 * Extracted keyword matching logic from task-skill-router.ts
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { RoutingMapping, RoutingResult } from '../config/types.js';
import { IMatcher, KeywordMatch } from './interfaces.js';

/**
 * Keyword matcher for routing tasks based on keyword matching
 */
export class KeywordMatcher implements IMatcher {
  constructor(private mappings: RoutingMapping[]) {}

  /**
   * Match task description against keyword mappings
   * @param taskDescription - Task description to match
   * @returns Routing result or null if no match
   */
  match(taskDescription: string): RoutingResult | null {
    const descLower = taskDescription.toLowerCase();

    for (const mapping of this.mappings) {
      for (const keyword of mapping.keywords) {
        if (descLower.includes(keyword.toLowerCase())) {
          return {
            skill: mapping.skill,
            agent: mapping.agent,
            confidence: mapping.confidence,
            matchedKeyword: keyword,
            reason: `Matched keyword: ${keyword}`,
          };
        }
      }
    }
    return null;
  }

  /**
   * Match multi-word phrases with higher priority than single words
   * @param taskDescription - Task description to match
   * @returns Routing result or null if no match
   */
  matchMultiWord(taskDescription: string): RoutingResult | null {
    const descLower = taskDescription.toLowerCase();
    
    // Sort keywords by length (longest first) to prioritize multi-word matches
    const allKeywords: Array<{ keyword: string; mapping: RoutingMapping }> = [];
    
    for (const mapping of this.mappings) {
      for (const keyword of mapping.keywords) {
        allKeywords.push({ keyword, mapping });
      }
    }
    
    // Sort by keyword length descending (multi-word phrases first)
    allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);
    
    // Try to match multi-word phrases (more than one word)
    for (const { keyword, mapping } of allKeywords) {
      const words = keyword.split(/\s+/);
      if (words.length > 1 && descLower.includes(keyword.toLowerCase())) {
        // Boost confidence for multi-word matches
        const boostedConfidence = Math.min(mapping.confidence * 1.1, 1.0);
        return {
          skill: mapping.skill,
          agent: mapping.agent,
          confidence: boostedConfidence,
          matchedKeyword: keyword,
          reason: `Matched multi-word phrase: ${keyword}`,
        };
      }
    }
    
    return null;
  }

  /**
   * Get all potential keyword matches for a task description
   * @param taskDescription - Task description to analyze
   * @returns Array of all matching keywords with scores
   */
  getAllMatches(taskDescription: string): KeywordMatch[] {
    const descLower = taskDescription.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const mapping of this.mappings) {
      for (const keyword of mapping.keywords) {
        if (descLower.includes(keyword.toLowerCase())) {
          // Calculate match confidence based on word count
          const words = keyword.split(/\s+/);
          const wordCount = words.length;
          const baseConfidence = mapping.confidence;
          
          // Boost confidence for multi-word matches
          const adjustedConfidence = wordCount > 1 
            ? Math.min(baseConfidence * (1 + (wordCount - 1) * 0.1), 1.0)
            : baseConfidence;
          
          matches.push({
            keyword,
            mapping,
            confidence: adjustedConfidence,
          });
        }
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if a task description matches release-related keywords
   * @param taskDescription - Task description to check
   * @returns Release detection result
   */
  detectReleaseWorkflow(taskDescription: string): {
    isRelease: boolean;
    bumpType: 'major' | 'minor' | 'patch';
    createTag: boolean;
  } {
    const descLower = taskDescription.toLowerCase();
    
    const releaseKeywords = [
      'release', 'npm publish', 'publish to npm', 'bump and publish', 
      'ship it', 'ship to npm', 'publish package', 'release to npm',
      'bump version', 'version bump'
    ];
    
    const isRelease = releaseKeywords.some(keyword => 
      descLower.includes(keyword.toLowerCase())
    );
    
    if (!isRelease) {
      return { isRelease: false, bumpType: 'patch', createTag: false };
    }
    
    // Extract version bump type if specified
    let bumpType: 'major' | 'minor' | 'patch' = 'patch';
    if (descLower.includes('major')) bumpType = 'major';
    else if (descLower.includes('minor')) bumpType = 'minor';
    else if (descLower.includes('patch')) bumpType = 'patch';
    
    const createTag = descLower.includes('--tag') || descLower.includes('git tag');
    
    return { isRelease, bumpType, createTag };
  }

  /**
   * Update the mappings used by this matcher
   * @param mappings - New mappings to use
   */
  setMappings(mappings: RoutingMapping[]): void {
    this.mappings = mappings;
  }

  /**
   * Get current mappings
   * @returns Current routing mappings
   */
  getMappings(): RoutingMapping[] {
    return [...this.mappings];
  }
}
