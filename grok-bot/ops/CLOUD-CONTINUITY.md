# Cloud agents — when and how

SSOT for cloud vs suited seats. Fit for purpose. No theater.

## Default: suited seats first
Named agents (implementer, reviewer, coordinator) already have suits, memory, live docs, and machine access. Prefer them for:
- routing, review, merge, deploy, live checks
- thin edits, ops docs, proof cards
- anything that needs fleet context

Do **not** spin a cloud to redo what a suited seat can do with context. That wastes credits and throws away the suit.

## When to use a cloud
Only for **heavy multi-file code work in a git repo** that needs an isolated coding VM:
- non-trivial feature, fix, or refactor on a remote repo
- worktree/PR the seat should not hand-edit on main
- long build/test loops better on the cloud machine

## When not to
- docs, checklists, board notes
- restating CI or reviewing an open PR (reviewer reads the PR)
- deploy, publish, Railway, curls
- Light/Normal work the implementer can do locally
- a second cloud on a track that already has one

## Continuity
1. Same problem / same PR / same ship track → **resume** that cloud (`bc-…`). Keep its branch.
2. Genuinely new outcome → **launch** new.
3. One cloud per ship track unless work is truly independent.
4. Before launch: list recent clouds; resume if lineage exists.
5. Seats must not each spawn a duplicate for the same PR.

Defect: new `bc-…` for a follow-up that could have been a reply.

## Handoff
```
need code change?
  no  → seat (or nothing)
  yes → thin + seat can PR cheaply?
          yes → implementer, no cloud
          no  → implementer launches or resumes ONE cloud
                cloud opens/updates PR
                implementer attaches evidence
                Strict? → reviewer on the PR (not another cloud)
                PASS → implementer merge + deploy + live proof
                coordinator boards material deltas only
```

**Cloud owner:** implementer. Coordinator may point at a track; does not puppeteer or re-brief a duplicate.

**Into cloud:** goal · repo · branch/PR · constraints · acceptance tests · resume id if same track.  
**Out of cloud:** PR URL · head SHA · what to Verify — then seats take over.

Clouds cut metal. Seats run the company.
