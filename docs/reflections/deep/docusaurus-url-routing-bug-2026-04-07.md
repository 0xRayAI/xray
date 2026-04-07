---
title: "Docusaurus URL Routing Bug - Missing /StringRay/ Prefix"
description: "Users getting 404 when accessing docs without proper baseUrl prefix"
tags: [bug, documentation, docusaurus, routing]
---

# Docusaurus URL Routing Bug

**Date:** 2026-04-07  
**Priority:** Medium  
**Status:** Documented

## Problem

Users are getting 404 when accessing docs using URL format:
- ❌ `https://htafolla.github.io/docs/introduction`
- ❌ `https://htafolla.github.io/docs/guides/getting-started`

## Root Cause

Docusaurus is configured with:
- `baseUrl: '/StringRay/'`
- `routeBasePath: 'docs'`

This means all docs require BOTH the baseUrl AND routeBasePath:
- ✅ `https://htafolla.github.io/StringRay/docs/introduction/`
- ✅ `https://htafolla.github.io/StringRay/docs/guides/getting-started/`

## Impact

- Users trying to access docs without `/StringRay/` prefix get 404
- Homepage redirects to `/docs/introduction` which works, but direct links without prefix fail
- Documentation confusion about correct URL structure

## Solution Options

1. **Keep current config** - Document that URLs must include `/StringRay/` prefix
2. **Change baseUrl to '/'** - Would make docs available at root, but conflicts with landing page
3. **Add redirect rules** - Configure web server to redirect `/docs/*` to `/StringRay/docs/*`

## Correct URLs

All docs require the full path:
```
https://htafolla.github.io/StringRay/docs/<doc-path>/
```

## Files Involved

- `docs-site/docusaurus.config.ts` - baseUrl and routeBasePath configuration
- `docs-site/sidebars.ts` - navigation structure

## Resolution

This is a documentation/usability issue, not a code bug. Users need to be informed to use the full URL with `/StringRay/` prefix.
