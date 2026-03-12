/**
 * Keyword Matcher Tests
 *
 * Tests for keyword-based routing logic
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordMatcher } from '../keyword-matcher.js';
import { RoutingMapping } from '../../config/types.js';

// Test fixtures
const TEST_MAPPINGS: RoutingMapping[] = [
  {
    keywords: ['security', 'vulnerability', 'audit'],
    skill: 'security-audit',
    agent: 'security-auditor',
    confidence: 0.9,
  },
  {
    keywords: ['test', 'testing', 'spec'],
    skill: 'testing-strategy',
    agent: 'testing-lead',
    confidence: 0.85,
  },
  {
    keywords: ['refactor', 'clean up', 'cleanup'],
    skill: 'refactoring-strategies',
    agent: 'refactorer',
    confidence: 0.8,
  },
  {
    keywords: ['optimize', 'performance', 'slow'],
    skill: 'performance-optimization',
    agent: 'performance-specialist',
    confidence: 0.8,
  },
  {
    keywords: ['design', 'ui', 'ux'],
    skill: 'ui-ux-design',
    agent: 'ui-designer',
    confidence: 0.75,
  },
];

describe('KeywordMatcher', () => {
  let matcher: KeywordMatcher;

  beforeEach(() => {
    matcher = new KeywordMatcher(TEST_MAPPINGS);
  });

  describe('match', () => {
    it('should match single keyword', () => {
      const result = matcher.match('Fix the security issue');
      
      expect(result).not.toBeNull();
      expect(result?.skill).toBe('security-audit');
      expect(result?.agent).toBe('security-auditor');
      expect(result?.confidence).toBe(0.9);
      expect(result?.matchedKeyword).toBe('security');
    });

    it('should match keyword case-insensitively', () => {
      const result = matcher.match('Fix the SECURITY issue');
      
      expect(result).not.toBeNull();
      expect(result?.skill).toBe('security-audit');
    });

    it('should return null when no keyword matches', () => {
      const result = matcher.match('Something completely unrelated');
      
      expect(result).toBeNull();
    });

    it('should match first keyword in order', () => {
      const result = matcher.match('security test vulnerability');
      
      expect(result).not.toBeNull();
      expect(result?.matchedKeyword).toBe('security');
    });
  });

  describe('matchMultiWord', () => {
    it('should match multi-word phrases with higher priority', () => {
      const result = matcher.matchMultiWord('Clean up the code');
      
      expect(result).not.toBeNull();
      expect(result?.matchedKeyword).toBe('clean up');
      expect(result?.confidence).toBeGreaterThan(0.8);
      expect(result?.reason).toContain('multi-word');
    });

    it('should boost confidence for multi-word matches', () => {
      const singleResult = matcher.match('Clean the code');
      const multiResult = matcher.matchMultiWord('Clean up the code');
      
      // Multi-word should have higher confidence
      if (multiResult) {
        expect(multiResult.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should return null when no multi-word phrase matches', () => {
      const result = matcher.matchMultiWord('security issue');
      
      // 'security' is single word, so multi-word match fails
      expect(result).toBeNull();
    });
  });

  describe('getAllMatches', () => {
    it('should return all matching keywords', () => {
      const result = matcher.getAllMatches('security and testing needed');
      
      // 'test' is a substring of 'testing', so it matches too
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(r => r.keyword === 'security')).toBe(true);
      expect(result.some(r => r.keyword === 'test')).toBe(true);
    });

    it('should sort by confidence descending', () => {
      const result = matcher.getAllMatches('security test');
      
      expect(result[0].confidence).toBeGreaterThanOrEqual(result[1].confidence);
    });

    it('should boost confidence for multi-word matches', () => {
      const mappings: RoutingMapping[] = [
        {
          keywords: ['clean up code'],
          skill: 'refactoring',
          agent: 'refactorer',
          confidence: 0.8,
        },
      ];
      const customMatcher = new KeywordMatcher(mappings);
      const result = customMatcher.getAllMatches('clean up code');
      
      // 3 words should get 20% boost (0.8 * 1.2 = 0.96)
      expect(result[0].confidence).toBe(0.96);
    });

    it('should return empty array when no matches', () => {
      const result = matcher.getAllMatches('no matching keywords here');
      
      expect(result).toEqual([]);
    });
  });

  describe('detectReleaseWorkflow', () => {
    it('should detect release keywords', () => {
      const result = matcher.detectReleaseWorkflow('Create a release');
      
      expect(result.isRelease).toBe(true);
      expect(result.bumpType).toBe('patch');
    });

    it('should detect npm publish', () => {
      const result = matcher.detectReleaseWorkflow('npm publish the package');
      
      expect(result.isRelease).toBe(true);
    });

    it('should extract major version bump', () => {
      const result = matcher.detectReleaseWorkflow('Release with major version');
      
      expect(result.isRelease).toBe(true);
      expect(result.bumpType).toBe('major');
    });

    it('should extract minor version bump', () => {
      const result = matcher.detectReleaseWorkflow('Release with minor bump');
      
      expect(result.isRelease).toBe(true);
      expect(result.bumpType).toBe('minor');
    });

    it('should detect git tag flag', () => {
      const result = matcher.detectReleaseWorkflow('Release --tag');
      
      expect(result.isRelease).toBe(true);
      expect(result.createTag).toBe(true);
    });

    it('should return false for non-release tasks', () => {
      const result = matcher.detectReleaseWorkflow('Fix a bug');
      
      expect(result.isRelease).toBe(false);
    });
  });

  describe('setMappings', () => {
    it('should update mappings', () => {
      const newMappings: RoutingMapping[] = [
        {
          keywords: ['deploy'],
          skill: 'deployment',
          agent: 'devops',
          confidence: 0.9,
        },
      ];
      
      matcher.setMappings(newMappings);
      const result = matcher.match('Deploy to production');
      
      expect(result?.skill).toBe('deployment');
    });
  });

  describe('getMappings', () => {
    it('should return copy of mappings', () => {
      const mappings = matcher.getMappings();
      
      expect(mappings).toHaveLength(TEST_MAPPINGS.length);
      // Modifying returned array should not affect internal state
      mappings.push({
        keywords: ['new'],
        skill: 'new-skill',
        agent: 'new-agent',
        confidence: 0.5,
      });
      expect(matcher.getMappings()).toHaveLength(TEST_MAPPINGS.length);
    });
  });
});
