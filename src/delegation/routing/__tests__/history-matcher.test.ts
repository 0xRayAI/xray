/**
 * History Matcher Tests
 *
 * Tests for history-based routing logic
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryMatcher } from '../history-matcher.js';

describe('HistoryMatcher', () => {
  let matcher: HistoryMatcher;

  beforeEach(() => {
    matcher = new HistoryMatcher(0.7, 3);
  });

  describe('match', () => {
    it('should return null for unknown task', () => {
      const result = matcher.match('unknown-task');
      
      expect(result).toBeNull();
    });

    it('should return null when not enough attempts', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      const result = matcher.match('task-1');
      
      expect(result).toBeNull();
    });

    it('should return null when success rate below threshold', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', false);
      matcher.track('task-1', 'agent-a', 'skill-a', false);
      
      const result = matcher.match('task-1');
      
      expect(result).toBeNull();
    });

    it('should return result when success rate meets threshold', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', false);
      
      const result = matcher.match('task-1');
      
      expect(result).not.toBeNull();
      expect(result?.agent).toBe('agent-a');
      expect(result?.skill).toBe('skill-a');
      expect(result?.confidence).toBe(0.75); // 3/4 = 75%
      expect(result?.fromHistory).toBe(true);
      expect(result?.reason).toContain('75% success rate');
    });

    it('should return result with high confidence for perfect track record', () => {
      matcher.track('task-1', 'agent-b', 'skill-b', true);
      matcher.track('task-1', 'agent-b', 'skill-b', true);
      matcher.track('task-1', 'agent-b', 'skill-b', true);
      matcher.track('task-1', 'agent-b', 'skill-b', true);
      
      const result = matcher.match('task-1');
      
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(1);
    });
  });

  describe('track', () => {
    it('should create new entry for first track', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      const stats = matcher.getTaskStats('task-1');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.successRate).toBe(1);
    });

    it('should update existing entry', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', false);
      
      const stats = matcher.getTaskStats('task-1');
      expect(stats?.count).toBe(2);
      expect(stats?.successRate).toBe(0.5);
    });
  });

  describe('trackResult', () => {
    it('should be alias for track', () => {
      matcher.trackResult('task-1', 'agent-a', 'skill-a', true);
      
      const stats = matcher.getTaskStats('task-1');
      expect(stats?.count).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return all task statistics', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-2', 'agent-b', 'skill-b', false);
      
      const stats = matcher.getStats();
      
      expect(stats).toHaveLength(2);
      expect(stats[0].taskId).toBeDefined();
      expect(stats[0].successRate).toBeDefined();
      expect(stats[0].count).toBeDefined();
      expect(stats[0].agent).toBeDefined();
    });

    it('should return empty array when no history', () => {
      const stats = matcher.getStats();
      
      expect(stats).toEqual([]);
    });
  });

  describe('getTaskStats', () => {
    it('should return stats for specific task', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      const stats = matcher.getTaskStats('task-1');
      
      expect(stats).not.toBeNull();
      expect(stats?.taskId).toBe('task-1');
      expect(stats?.agent).toBe('agent-a');
    });

    it('should return null for unknown task', () => {
      const stats = matcher.getTaskStats('unknown');
      
      expect(stats).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all history', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.clear();
      
      expect(matcher.size()).toBe(0);
      expect(matcher.getTaskStats('task-1')).toBeNull();
    });
  });

  describe('clearTask', () => {
    it('should remove specific task', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-2', 'agent-b', 'skill-b', true);
      
      matcher.clearTask('task-1');
      
      expect(matcher.getTaskStats('task-1')).toBeNull();
      expect(matcher.getTaskStats('task-2')).not.toBeNull();
      expect(matcher.size()).toBe(1);
    });
  });

  describe('size', () => {
    it('should return number of tracked tasks', () => {
      expect(matcher.size()).toBe(0);
      
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      expect(matcher.size()).toBe(1);
      
      matcher.track('task-2', 'agent-b', 'skill-b', true);
      expect(matcher.size()).toBe(2);
    });
  });

  describe('loadHistory / exportHistory', () => {
    it('should load and export history', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      const exported = matcher.exportHistory();
      
      const newMatcher = new HistoryMatcher();
      newMatcher.loadHistory(exported);
      
      const stats = newMatcher.getTaskStats('task-1');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.agent).toBe('agent-a');
    });
  });

  describe('setMinSuccessRate', () => {
    it('should update threshold', () => {
      matcher.setMinSuccessRate(0.5);
      
      // Track with 66% success rate (2/3)
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', false);
      
      const result = matcher.match('task-1');
      
      // 66% > 50%, so should match now
      expect(result).not.toBeNull();
    });
  });

  describe('setMinAttempts', () => {
    it('should update minimum attempts', () => {
      matcher.setMinAttempts(2);
      
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      const result = matcher.match('task-1');
      
      expect(result).not.toBeNull();
    });
  });

  describe('getTopAgents', () => {
    it('should return top performing agents', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      matcher.track('task-2', 'agent-b', 'skill-b', false);
      matcher.track('task-2', 'agent-b', 'skill-b', false);
      matcher.track('task-2', 'agent-b', 'skill-b', false);
      
      matcher.track('task-3', 'agent-c', 'skill-c', true);
      matcher.track('task-3', 'agent-c', 'skill-c', false);
      matcher.track('task-3', 'agent-c', 'skill-c', true);
      
      const topAgents = matcher.getTopAgents();
      
      // All 3 agents have >= 3 attempts (tracking by different task IDs doesn't aggregate)
      expect(topAgents.length).toBeGreaterThanOrEqual(2);
      expect(topAgents[0].agent).toBe('agent-a'); // 100% success
    });

    it('should respect limit parameter', () => {
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      matcher.track('task-1', 'agent-a', 'skill-a', true);
      
      matcher.track('task-2', 'agent-b', 'skill-b', true);
      matcher.track('task-2', 'agent-b', 'skill-b', true);
      matcher.track('task-2', 'agent-b', 'skill-b', true);
      
      const topAgents = matcher.getTopAgents(1);
      
      expect(topAgents).toHaveLength(1);
    });
  });
});
