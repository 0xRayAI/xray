#!/bin/bash
# Docs Sync Script
# Syncs docs/ to docs-site/docs/ for Docusaurus build

set -e

echo "📄 Syncing docs to docs-site..."

# Remove old docs-site/docs
rm -rf docs-site/docs

# Copy docs to docs-site
cp -r docs docs-site/

echo "✅ Docs synced to docs-site/docs"
echo "   Run 'cd docs-site && npm run build' to build Docusaurus site"