# Three layers — suit, skills, tools

Mixing these names creates fog. They do different jobs.

| Layer | One line | Example |
|-------|----------|---------|
| **Skills** | Instructions the agent reads and follows | Ship-ready steps; register → mint → pin |
| **Suit** | Automatic plant on the host (hooks + mill config) | Before-write gate; `foundry inspect` |
| **Tools** | Things you invoke (CLIs, MCP) | Registry MCP; `foundry gate` |

A skill can describe a loop no tool exposes. A suit hook can run with no skill open. A tool can exist that skills never mention — do not treat legacy processor pipelines as the factory OS.

## Thin release spine
1. Before write/spawn — host pre-tool gate (when worn)  
2. After write — light postprocessor (on in current plants)  
3. Commit / push — git hooks on the **product** repo  
4. Before tag/publish — `foundry gate` then `gate --verify-only`  
5. Wear check — `foundry inspect`  
6. Docs — `foundry docs-check` (+ live URL checks when agents must read the site)

## Grok Bot note
This host is not a fake “deny every bad tool” floor. Skills + reviewer proof carry the rules; suit hooks help when worn.

## PreToolUse (cold-seat proof)
Fasten plants Grok plugin hooks and `pre-tool-use.js` is runnable. Chat auto-invoke is host-dependent — see `GROK-HOOK-PROOF.md`. Do not invent a PreToolUse floor inside the assistant.
