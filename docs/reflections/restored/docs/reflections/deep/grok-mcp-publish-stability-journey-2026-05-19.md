# Grok MCP Handshake Crisis to Stability: A Multi-Session Journey

**When:** May 19, 2026 (intense multi-hour debugging session, building on prior work)  
**What:** Finally stabilizing first-class Grok CLI MCP integration for StringRay after repeated publish and handshake failures  
**The Core Struggle:** Why did clean source fixes keep failing to deliver working MCP handshakes for consumers?  
**The Resolution:** Understanding the gap between source changes, prepare-consumer corruption, and how the internal MCP client registry actually resolved paths at runtime.

---

## The Starting Point

We had already done significant work on the Grok CLI integration. Entry-point guards had been added to the problematic MCP servers to prevent stdout pollution. The `strray-governance` and `strray-skills` servers were registered via `grok mcp add` in the user's local config.

Yet the problem kept recurring:

> "handshake failed (connection closed: initialize response)"

Even after publishing new versions and having users install `strray-ai@latest`, fresh consumer environments would still see the two meta MCP servers fail to initialize when Grok tried to launch them.

This was the third or fourth wave of this class of problem. Each time we thought we had fixed it in source, something in the published artifact or the runtime path resolution would undo the win.

## Session Chronology and Investigation Arc

### Phase 1: "It's Just the Guards" (Early Realization)

We started by assuming the issue was purely the missing entry-point guards. Several knowledge-skills servers (and some others) had unconditional `new Server().run()` at module load time. When Grok spawned them as stdio children for the MCP handshake, any top-level code that wrote to stdout would corrupt the JSON-RPC channel.

We added the classic guard:

```ts
const entryPoint = path.resolve(process.argv[1] ?? "");
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  // start server
}
```

This was necessary and correct. But it was not sufficient.

### Phase 2: The Publish Pipeline Smoking Gun

The user (and the previous AI instance) eventually isolated the real culprit in the consumer preparation script.

`scripts/node/prepare-consumer.cjs` contained `fixMCPServerImports()`, which did naive string replacements on the already-compiled `dist/mcps/**/*.js` files:

```js
content = content.replace(/from "\.\.\/\.\.\/core\//g, 'from "../../dist/core/"');
```

This logic was written while thinking about the *source* layout (`src/mcps/...` importing `../../core/...` which resolves to `src/core/`).

After `tsc`, those files lived in `dist/mcps/knowledge-skills/`. The relative path `../../utils/shutdown-handler.js` was *already* correct — it pointed at `dist/utils/`.

The replacement turned correct paths into `../../dist/utils/...`, which, once the package was installed in `node_modules/strray-ai/`, resolved to the catastrophic `node_modules/strray-ai/dist/dist/utils/...`.

This single function was responsible for shipping broken MCP server artifacts in multiple releases. Every time we published, the very servers Grok was supposed to launch were importing from non-existent paths.

**The fix:** We removed `fixMCPServerImports()` entirely. TypeScript's output was already correct for consumers.

### Phase 3: The Runtime Resolution Problem (The Deeper Layer)

Even after cleaning the publish pipeline, we discovered another systemic issue.

The `ServerConfigRegistry` (and by extension the `MCPClientManager`) had this logic:

```ts
const basePath = process.env.STRRAY_DEV_PATH
  ? process.env.STRRAY_DEV_PATH
  : 'node_modules/strray-ai/dist';
```

In a development checkout, this meant that even with perfect local `dist/` builds, the framework would spawn MCP servers from whatever happened to be in `node_modules/strray-ai/dist` — usually an older published version.

This is why "the source was updated but the tests were still failing." The registry was ignoring the local tree.

**The architectural fix:** We added a proper `"strray"` section to `package.json`:

```json
"strray": {
  "dist": "dist",
  "mcpServersPath": "dist/mcps",
  "frameworkRoot": "."
}
```

Then rewrote the resolver in `server-config-registry.ts` to walk upward from the current module using `import.meta.url`, find the nearest `package.json` that declared the `strray` field, and use the paths declared there. `STRRAY_DEV_PATH` remained as an explicit override.

This was the correct long-term solution: the package itself now declares where its built artifacts live.

### Phase 4: The Activity Log as Diagnostic Instrument

Throughout the day, the `frameworkLogger` (writing to `logs/framework/activity.log`) became the primary oracle.

We repeatedly saw patterns like:

- `governance-mcp-parse-failed` with `textPreview: "Tool govern_proposals executed on governance server"`
- `mcp-client initialized with 0 tools`
- Repeated fallback to `needs_revision`

These were not random. They were the observable symptoms of the two root causes above (corrupted published servers + wrong runtime resolution).

When we finally got a clean consumer install of 1.22.66 and ran the full test suite (health, validate, status, plus direct `InferenceCycle.governExternalProposals`), the log showed the healthy path for the first time in many attempts:

- `real-transport-success`
- Actual delegation to skill servers + Dynamo Solar SSOT
- `governance-mcp-primary-path` with real decisions
- No generic fallback strings

The activity log turned what had been a mysterious "handshake sometimes fails" into a precise, reproducible failure mode we could chase to ground.

## Technical Deep Dives

### Why the Generic Fallback Was So Dangerous

In `mcp-client.ts`, when the client could not (or chose not to) use real transport, and was not in pure MCP mode, it would return:

```ts
{
  content: [
    { type: 'text', text: `Tool ${toolName} executed on ${serverName} server` }
  ]
}
```

This string was then passed to `parseGovernanceMcpResponse`, which did `JSON.parse(text)`. It always failed, producing the warning and forcing `needs_revision`.

This was a silent degradation path. The system didn't crash hard; it just quietly stopped trusting its own governance layer.

### The Difference Between Grok-Registered MCPs and Internal mcpClientManager

An important realization: the Grok CLI registrations (`grok mcp add strray-governance ...`) and the *internal* `MCPClientManager` used by InferenceCycle are two different invocation paths.

- Grok registrations use the user's `~/.grok/config.toml` + direct stdio spawning.
- The framework's `mcpClientManager` uses its own `ServerConfigRegistry` + connection pool.

Fixes that made Grok handshakes work did not automatically make the internal governance calls work, and vice versa. We had to satisfy both surfaces.

### The Consumer vs. Dev Mental Model

One of the most persistent sources of confusion was the difference between:

1. Running from a clean `~/strray-consumer-test` after `npm install strray-ai@latest`
2. Running from the source tree at `~/dev/stringray` while `node_modules/strray-ai` still contained an older tarball

Many "the fix didn't work" moments were actually "we tested against the wrong installed bits."

The addition of the `strray` field + the smarter resolver was the first mechanism that made the framework itself able to distinguish these two worlds reliably.

## Lessons Learned

1. **Publishing pipelines are part of the architecture.** Treating `prepare-consumer.cjs` as "just a packaging detail" was a category error. It was mutating the actual runtime artifacts.

2. **Path resolution must be declarative.** Hardcoding `node_modules/<name>/dist` is fragile the moment you have both development and consumption scenarios. The package should declare its own layout.

3. **Activity logging is a first-class observability tool.** The structured `frameworkLogger` entries turned an opaque integration problem into a searchable, filterable trace. Without it, we would have been guessing much longer.

4. **Consumer testing must be first-class.** Running the full governance test from a fresh `npm install` in a throwaway directory revealed problems that `npm link` or running from source never would have.

5. **Version numbers on package.json are not enough.** The published 1.22.64 tarball had the right version number but catastrophically wrong contents because of the build-time mutation step. You have to verify the actual artifacts.

## Current State and Forward Path

As of the 1.22.66 release and the fixes landed in source:

- Fresh consumer installs get working `strray-governance` and `strray-skills` MCPs that Grok can successfully handshake with.
- The internal InferenceCycle can now successfully call through the governance MCP and receive real structured decisions instead of generic fallbacks.
- The `strray` configuration in package.json gives both the framework and future tooling a reliable way to locate built artifacts regardless of whether the package is being developed or consumed.

Remaining work is mostly polish and hardening:
- Making the internal MCP client more aggressive about preferring real transport for governance servers.
- Possibly surfacing better diagnostics when the generic fallback path is taken.
- Ensuring future releases continue to be built with the corrected prepare-consumer script.

## Personal Reflection

This day (and the preceding work it built on) was a masterclass in the difference between "the code in my editor is correct" and "the artifact that reaches a user actually works."

There were multiple moments of "we fixed it in source, why is it still broken?" that were genuinely disorienting until we internalized the full pipeline from `git push` through `prepare-consumer` through `npm publish` through a consumer's `node_modules` through the runtime registry resolver.

The biggest emotional shift came when we stopped treating the consumer test directory as an afterthought and started treating it as the primary environment where the product had to succeed. Once we did that, the right questions became obvious: "What is actually in the tarball?" and "What paths will this code see when it runs after `npm install`?"

That perspective shift — combined with the removal of the well-intentioned but destructive import fixer and the addition of a proper declarative layout in package.json — is what finally moved the needle from "mostly working in dev" to "reliably working for users."

This was not a glamorous refactor. It was plumbing, observability, and disciplined separation between development and consumption concerns. But it was necessary, and the system is meaningfully more trustworthy because of it.

---

*Written in the immediate aftermath of the 1.22.66 verification runs and the final clean activity.log traces. The monitors were still open.*
