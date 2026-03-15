#!/bin/bash
# Link CLI output into the app's content directory for local development.
# Run from apps/astro/ after running lexbuild convert-usc and convert-ecfr.
set -euo pipefail

REPO_ROOT="$(cd ../.. && pwd)"
OUTPUT_DIR="${REPO_ROOT}/output"
CONTENT_DIR="./content"

# Ensure output exists
if [ ! -d "$OUTPUT_DIR/usc" ] && [ ! -d "$OUTPUT_DIR/ecfr" ]; then
  echo "Error: No output found at $OUTPUT_DIR"
  echo "Run 'lexbuild convert-usc --all' and 'lexbuild convert-ecfr --all' first."
  exit 1
fi

# Create content directory structure
mkdir -p "$CONTENT_DIR"/{section,chapter,title}/{usc,ecfr}
mkdir -p "$CONTENT_DIR"/part/ecfr

# Symlink section-level output (the primary granularity for browsing)
if [ -d "$OUTPUT_DIR/usc" ]; then
  rm -rf "$CONTENT_DIR/section/usc"
  ln -s "$OUTPUT_DIR/usc" "$CONTENT_DIR/section/usc"
  echo "Linked USC section output"
fi

if [ -d "$OUTPUT_DIR/ecfr" ]; then
  rm -rf "$CONTENT_DIR/section/ecfr"
  ln -s "$OUTPUT_DIR/ecfr" "$CONTENT_DIR/section/ecfr"
  echo "Linked eCFR section output"
fi

# Note: chapter-level and title-level output requires running the CLI with -g chapter / -g title.
# Those are optional for local dev — the app gracefully handles missing granularity levels.

echo "Content linked. Run 'pnpm dev' to start the dev server."
