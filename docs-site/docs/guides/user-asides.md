# User Asides (parallel work tracks)

:::info Consumer guide
Start with **[Parallel Work Tracks](./parallel-work-tracks.md)** for the full Grok Build + worktree + aside mental model. This page is the MCP/state reference. Known gaps: **[Roadmap](./user-asides-roadmap.md)**.
:::

**User asides** are parallel work tracks you declare to the lead agent — like git worktrees for agent work. They are **not** [AsideContext](./aside-context.md) (internal orchestrator observation registry).

## Concepts

| Term | Meaning |
|------|---------|
| **User aside** | Scoped goal with its own plan, branch/worktree metadata, `a.*` todos |
| **AsideContext** | In-memory MCP subcontext (`spawnAside`) — implementation detail |

## State layout

```
.xray/state/
  lead-dev-plan.json          # main thread
  asides/
    suit-nft.json             # aside definition + plan
    _active.json              # which aside receives spawns
```

Todo ids are **namespaced**: `suit-nft.a.1.1` (not global `a.1.1`).

## MCP usage (no new tools)

### Intake

`xray-orchestrator` → `analyze-complexity`:

```json
{
  "userAsideId": "suit-nft",
  "userAsideTitle": "Suit-certified NFT mint",
  "worktree": "../suit-nft-worktree",
  "branch": "feat/aside-suit-nft",
  "tasks": [
    { "description": "Groover registration proof", "type": "research" }
  ]
}
```

### Activate existing aside

`orchestrate-task`:

```json
{ "description": "work aside", "userAsideId": "suit-nft" }
```

### Resume main thread

```json
{ "description": "resume main", "clearActiveAside": true }
```

## Spawn routing

When an aside is active, PreToolUse spawn gate matches todos on `{asideId}.a.*`. Session-boot exposes `activeAside`, `asideWorktree`, `asideTrapSignals`, `asideConferRecommended`.

## Config

`features.json` → `multi_agent_orchestration.user_asides.enabled` (default true).

## Accepted limitations

| Limitation | Rationale |
|------------|-----------|
| **Worktree cwd not enforced** | `worktree` / `branch` are hints for the host and subagents; PreToolUse does not chdir. Host must route Task prompts to the correct directory. |
| **Single active aside per workspace** | `_active.json` is workspace-scoped; one parallel track at a time. Use `clearActiveAside` before switching. |
| **Unscoped activation** | If `setActiveAsideId` runs without `sessionId`, any session may route to that aside until cleared (discouraged; always pass `sessionId` on intake). |
| **Synthesis writes still blocked** | Aside **spawns** bypass main synthesis checkpoint; main-track **writes** remain blocked until synthesis clears. |

## Related

- [Parallel Work Tracks](./parallel-work-tracks.md) — end-user guide (Grok Build + worktrees)
- [User Asides Roadmap](./user-asides-roadmap.md) — engineering backlog
- [AsideContext](./aside-context.md) — internal orchestrator subcontexts (different concept)
- [Features since 3.1](./features-since-3.1.md)