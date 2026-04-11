---
slug: "/reflections/deep/the-blank-screen-saga-pr15-dynamic-imports-2026-03-30"
title: "The Blank Screen Saga Pr15 Dynamic Imports 2026 03 30"
sidebar_label: "The Blank Screen Saga Pr15 Dynamic Impor…"
sidebar_position: 26
tags: ["reflection"]
date: 2026-03-30
---


# The Blank Screen: A Tale of Dynamic Imports and Missing Public Files

## The Moment of Discovery

The TUI loaded, but nothing appeared on the screen.

I watched as the framework initialized—boot sequence logged cleanly, agents loaded, skills registered. Everything looked perfect. And then: nothing. A blank screen where the agent dropdown should have been, where the command palette should have responded to every keystroke.

This is the kind of bug that makes you question everything. Not a crash, not an error message—just absence. The system was running, but something fundamental had broken in the space between "ready" and "rendering."

## The Investigation Begins

I started with the obvious culprit: the plugin. The 0xRay Codex Plugin was supposed to inject framework context into the system prompt, but something was going wrong during load. The error wasn't showing up anywhere obvious—no stack trace, no warning, nothing in the logs.

That's when I found it. Buried in the plugin initialization code was a static import:

```typescript
import { frameworkLogger } from "../core/framework-logger.js";
```

Simple. Clean. And completely wrong.

## The Path Resolution Problem

Here's what happens when your plugin lives in `.opencode/plugins/strray-codex-injection.js` and tries to import from `../core/framework-logger.js`:

The import resolves relative to the plugin's location. So it looks for:
- `.opencode/plugins/../core/framework-logger.js`
- Which means: `.opencode/core/framework-logger.js`

But the framework-logger is actually in:
- `node_modules/strray-ai/dist/core/framework-logger.js`

The paths don't match. The import fails. And because it's happening in plugin initialization—before most of the framework has booted—the error gets swallowed by some defensive try-catch somewhere, leaving us with nothing but a blank screen and the faint smell of failure.

This is the hazard of static imports in plugin architectures. In development, when everything runs from `src/` or `dist/`, the relative paths work fine. But in consumer installations—when someone installs `strray-ai` as an npm package—the plugin gets copied to `.opencode/plugins/`, and suddenly those relative paths are pointing at nothing.

## The Candidate Pattern

The fix came from looking at how other loaders in the codebase solved this exact problem. There's a pattern I call "candidate paths"—instead of one fixed import path, you try several:

```typescript
async function loadFrameworkLogger() {
  if (_frameworkLogger) return _frameworkLogger;
  const candidates = [
    "../core/framework-logger.js",           // dev: from plugin/
    "../../dist/core/framework-logger.js", // dev: from dist/plugin/
    "../../node_modules/strray-ai/dist/core/framework-logger.js", // consumer
  ];
  for (const p of candidates) {
    try {
      const mod = await import(p);
      _frameworkLogger = mod.frameworkLogger;
      return _frameworkLogger;
    } catch (_) {
      // try next candidate
    }
  }
  // Fallback: no-op logger so plugin doesn't crash
  _frameworkLogger = {
    log: (_module: string, _event: string, _status: string, _data?: any) => {},
  };
  return _frameworkLogger;
}
```

It's not elegant. It's not beautiful. But it works across every environment the plugin might find itself in: development, production, consumer install, and whatever weird hybrid states emerge from npm linking.

## Meanwhile, at the Server

While I was wrestling with imports, another bug was quietly making itself known. The CLI server—when you run `npx strray-ai server`—was supposed to serve the web interface. But the `PUBLIC_DIR` was pointing to `dist/public/`, which doesn't exist at runtime unless you've run the build.

In development, this wasn't a problem because I was always running from source. But in consumer installations, after `npm install strray-ai`, there's no `dist/` directory at the project root. The server would start, try to serve static files from a non-existent directory, and fail silently (well, silently enough that you might not notice until you tried to load the page).

The fix was simpler here: point `PUBLIC_DIR` to the actual location where files exist:

```typescript
const ROOT_DIR = join(__dirname, "..", "..");
const PUBLIC_DIR = join(ROOT_DIR, "public");  // Changed from "dist/public"
```

And update the build script to copy `public/` into `dist/public/` so both paths work:

```json
"build": "tsc && mkdir -p dist/public && cp -r public/* dist/public/ && ..."
```

This way, before publishing, we ensure the static files exist in both locations. After publishing, the runtime falls back to `public/` at the root.

## The Error Handler Detour

While fixing the server, I noticed the error handler middleware was in the wrong place. Express middleware order matters—things get executed in the order you register them. The error handler was registered *before* some of the routes, which meant errors in those routes might not get handled properly.

```typescript
// Wrong: error handler too early
app.use(errorHandler);  // This catches errors from... nowhere?
app.use(routes);

// Correct: error handler at the end
app.use(routes);
app.use(errorHandler);  // This catches everything above it
```

This is one of those bugs that manifests only in specific error conditions, which makes it extra insidious. Everything works fine until something actually goes wrong, and then the error handling is inconsistent.

## The Pattern That Emerges

What strikes me about these three bugs—static imports, missing public directory, misplaced middleware—is that they're all about *location*. Where things are, where they're expected to be, and where they actually end up.

In a monorepo, everything is relative to the monorepo root. In an npm package, everything is relative to `node_modules/`. In a plugin, everything is relative to the plugin's location. These different perspectives create friction, and that friction manifests as bugs that only appear in certain environments.

The candidate path pattern isn't just a hack—it's a recognition that location matters, that relative imports are fragile, and that the solution is to be explicit about the places we expect to find things.

## What Next

This fix went into commit `fd289e4` and was part of the v1.15.32 release. But the underlying pattern—candidate paths for dynamic imports—needs to be applied consistently across the codebase. There are likely other places where static imports will break in consumer environments.

The blank screen taught me something: sometimes the most serious bugs announce themselves with silence. No error message, no stack trace, just absence. The system is running, but it's not quite alive. 

Next time I see a blank screen, I'll know where to look first.
