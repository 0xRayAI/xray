import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { holdPlane, lookCards, seekHeldCard, CARD_PLANES } from '../../integrations/hooks/goggles-pipeline.mjs';
import { seekSkill, skillIdsFromRow } from '../../integrations/hooks/skill-seek.mjs';

describe('skill seek', () => {
  it('reads the card in order and does not use a route that is off the card', () => {
    const skills = 'routing, orchestration, processor-pipeline, delegation-gate';
    expect(skillIdsFromRow('SKILLS.md')).toEqual([]);
    expect(skillIdsFromRow('.agents/skills/routing/SKILL.md')).toEqual(['routing']);
    const both = seekSkill({
      skills,
      need: 'fix the orchestration and the delegation-gate',
    });
    expect(both).toEqual({ skill: 'orchestration', tier: 'card', confer: false });
    const offCard = seekSkill({
      skills,
      need: 'check the lock',
      taskType: 'security',
      recall: () => null,
    });
    expect(offCard).toEqual({ skill: null, tier: 'decline', confer: false });
    const onCard = seekSkill({
      skills: 'governance, enforcer, dynamo, confer',
      need: 'ship the gate',
      taskType: 'governance',
      workKind: 'feat',
    });
    expect(onCard).toEqual({ skill: 'enforcer', tier: 'card', confer: true });
    const live = seekSkill({
      skills,
      need: 'no name here',
      workKind: 'docs',
      recall: () => ({ id: 'governance' }),
    });
    expect(live).toEqual({ skill: 'governance', tier: 'plate', confer: false });
    const tie = seekSkill({
      skills,
      need: 'no name here',
      workKind: 'refactor',
      recall: () => null,
    });
    expect(tie).toEqual({ skill: null, tier: 'decline', confer: true });
  });

  it('every lens card lists three to five skills and does not point at the catalog', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-skill-list-'));
    try {
      const table = JSON.parse(
        readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'),
      );
      const names = [...CARD_PLANES, ...Object.keys(table).filter((key) => key !== 'planes' && key !== 'scope')];
      for (const name of names) {
        const shown = lookCards([name], root);
        expect(shown, name).toHaveLength(1);
        const skills = shown?.[0]?.skills ?? '';
        expect(skills, name).not.toContain('SKILLS.md');
        expect(skills, name).not.toBe('.agents/skills');
        const ids = skillIdsFromRow(skills);
        expect(ids.length, `${name} ${skills}`).toBeGreaterThanOrEqual(3);
        expect(ids.length, name).toBeLessThanOrEqual(5);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads the held card before plate recall', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-held-seek-'));
    try {
      holdPlane(root, 'routing');
      const hit = seekHeldCard(root, 'open routing', { recall: () => ({ id: 'governance' }) });
      expect(hit).toEqual({ skill: 'routing', tier: 'card', confer: false });
      const fell = seekHeldCard(root, 'nothing named', {
        workKind: 'chore',
        recall: () => ({ id: 'governance' }),
      });
      expect(fell).toEqual({ skill: 'governance', tier: 'plate', confer: false });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rewrites a filled lens before it seeks, and a plate id must be a skill', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-stale-lens-'));
    try {
      const lensDir = join(root, '.xray', 'state');
      mkdirSync(lensDir, { recursive: true });
      writeFileSync(
        join(lensDir, 'LENS.md'),
        [
          'Plane: dev',
          'Entry: package.json',
          'Exit: a change in this repo',
          'Skills: SKILLS.md',
          '',
          'Card: routing',
          'Plane: integration',
          'Entry: the dispatch',
          'Exit: the next call',
          'Skills: .agents/skills/routing/SKILL.md',
          '',
        ].join('\n'),
      );
      holdPlane(root, 'routing');
      const hit = seekHeldCard(root, 'delegation-gate', { recall: () => ({ id: 'goggles' }) });
      expect(hit).toEqual({ skill: 'delegation-gate', tier: 'card', confer: false });
      const stored = readFileSync(join(lensDir, 'LENS.md'), 'utf8');
      expect(stored).toContain('Skills: routing, orchestration, processor-pipeline, delegation-gate');
      expect(stored).not.toContain('SKILLS.md');
      expect(stored).not.toContain('.agents/skills/routing/SKILL.md');
      const declined = seekHeldCard(root, 'no such words', { recall: () => ({ id: 'goggles' }) });
      expect(declined).toEqual({ skill: null, tier: 'decline', confer: false });
      const boot = seekHeldCard(root, 'no such words', { recall: () => ({ id: 'boot' }) });
      expect(boot).toEqual({ skill: 'boot-orchestrator', tier: 'plate', confer: false });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
