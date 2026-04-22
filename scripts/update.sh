#!/usr/bin/env bash
# update.sh — Unified content update orchestrator for all sources.
#
# Usage:
#   ./scripts/update.sh                       # All sources incrementally
#   ./scripts/update.sh --source ecfr         # One source
#   ./scripts/update.sh --source ecfr,fr      # Multiple sources
#   ./scripts/update.sh --skip-deploy         # All sources, local only
#   ./scripts/update.sh --deploy-only         # Push existing output for all sources
#
# Source-specific pass-through args:
#   --ecfr-titles 1,17      Pass --titles 1,17 to update-ecfr.sh
#   --ecfr-all              Pass --all to update-ecfr.sh
#   --ecfr-skip-highlights  Pass --skip-highlights to update-ecfr.sh
#   --fr-days 3             Pass --days 3 to update-fr.sh
#   --fr-from YYYY-MM-DD    Pass --from to update-fr.sh
#   --fr-to YYYY-MM-DD      Pass --to to update-fr.sh
#   --usc-force             Pass --force to update-usc.sh
#   --usc-skip-highlights   Pass --skip-highlights to update-usc.sh
#
# Execution order: eCFR → FR → USC
# Each source's script handles its own change detection and early exit.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Parse arguments ---

SOURCES=""
SHARED_ARGS=""
SKIP_DEPLOY=false
DEPLOY_ONLY=false
ECFR_ARGS=""
FR_ARGS=""
USC_ARGS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCES="$2"
      shift 2
      ;;
    --skip-deploy)
      SHARED_ARGS="$SHARED_ARGS $1"
      SKIP_DEPLOY=true
      shift
      ;;
    --deploy-only)
      SHARED_ARGS="$SHARED_ARGS $1"
      DEPLOY_ONLY=true
      shift
      ;;
    # eCFR pass-through
    --ecfr-titles)
      ECFR_ARGS="$ECFR_ARGS --titles $2"
      shift 2
      ;;
    --ecfr-all)
      ECFR_ARGS="$ECFR_ARGS --all"
      shift
      ;;
    --ecfr-skip-highlights)
      ECFR_ARGS="$ECFR_ARGS --skip-highlights"
      shift
      ;;
    # FR pass-through
    --fr-days)
      FR_ARGS="$FR_ARGS --days $2"
      shift 2
      ;;
    --fr-from)
      FR_ARGS="$FR_ARGS --from $2"
      shift 2
      ;;
    --fr-to)
      FR_ARGS="$FR_ARGS --to $2"
      shift 2
      ;;
    # USC pass-through
    --usc-force)
      USC_ARGS="$USC_ARGS --force"
      shift
      ;;
    --usc-skip-highlights)
      USC_ARGS="$USC_ARGS --skip-highlights"
      shift
      ;;
    --help|-h)
      sed -n '2,/^$/{ s/^# //; s/^#$//; p }' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

if [ "$SKIP_DEPLOY" = true ] && [ "$DEPLOY_ONLY" = true ]; then
  echo "Error: --skip-deploy and --deploy-only are mutually exclusive."
  exit 1
fi

# Default: all sources
if [ -z "$SOURCES" ]; then
  SOURCES="ecfr,fr,usc"
fi

should_run() {
  echo "$SOURCES" | grep -qw "$1"
}

FAILED=""
SUCCEEDED=""

# Defer sitemap regeneration to a single post-run step below. Without this,
# each source script would regenerate the full sitemap index (covering every
# source's URLs) and rsync it — 3x redundant work on a full update run.
export LEXBUILD_DEFER_SITEMAP=1

REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load deploy config (for final sitemap rsync below)
if [ -f "$SCRIPT_DIR/.deploy.env" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.deploy.env"
fi

# --- Run sources ---

if should_run "ecfr"; then
  echo "===== eCFR Update ====="
  echo ""
  if "$SCRIPT_DIR/update-ecfr.sh" $ECFR_ARGS $SHARED_ARGS; then
    SUCCEEDED="$SUCCEEDED ecfr"
    echo ""
  else
    ECFR_EXIT=$?
    echo ""
    echo "WARNING: eCFR update failed (exit code $ECFR_EXIT)"
    FAILED="$FAILED ecfr"
    echo ""
  fi
fi

if should_run "fr"; then
  echo "===== FR Update ====="
  echo ""
  if "$SCRIPT_DIR/update-fr.sh" $FR_ARGS $SHARED_ARGS; then
    SUCCEEDED="$SUCCEEDED fr"
    echo ""
  else
    FR_EXIT=$?
    echo ""
    echo "WARNING: FR update failed (exit code $FR_EXIT)"
    FAILED="$FAILED fr"
    echo ""
  fi
fi

if should_run "usc"; then
  echo "===== USC Update ====="
  echo ""
  if "$SCRIPT_DIR/update-usc.sh" $USC_ARGS $SHARED_ARGS; then
    SUCCEEDED="$SUCCEEDED usc"
    echo ""
  else
    USC_EXIT=$?
    echo ""
    echo "WARNING: USC update failed (exit code $USC_EXIT)"
    FAILED="$FAILED usc"
    echo ""
  fi
fi

# --- Post-run: regenerate sitemap index once, covering all sources ---

if [ -n "$SUCCEEDED" ] && [ "$SKIP_DEPLOY" = false ]; then
  echo "===== Regenerating unified sitemap index ====="
  echo ""
  ( cd "$REPO_ROOT/apps/astro" && npx tsx scripts/generate-sitemap.ts ) || {
    echo "WARNING: sitemap regeneration failed"
    FAILED="$FAILED sitemap"
  }

  if [ "$DEPLOY_ONLY" = true ] || [ "$SKIP_DEPLOY" = false ]; then
    if [ -n "${VPS_HOST:-}" ]; then
      SITEMAP_FILES=("$REPO_ROOT/apps/astro/public"/sitemap*.xml)
      [ -f "$REPO_ROOT/apps/astro/public/robots.txt" ] && SITEMAP_FILES+=("$REPO_ROOT/apps/astro/public/robots.txt")
      if [ ${#SITEMAP_FILES[@]} -gt 0 ] && [ -e "${SITEMAP_FILES[0]}" ]; then
        echo "    Syncing sitemaps to VPS"
        rsync -avz "${SITEMAP_FILES[@]}" "${VPS_HOST}:~/lexbuild/apps/astro/public/" || FAILED="$FAILED sitemap-rsync"
        rsync -avz "${SITEMAP_FILES[@]}" "${VPS_HOST}:~/lexbuild/apps/astro/dist/client/" || FAILED="$FAILED sitemap-rsync"
      fi
    fi
  fi
  echo ""
fi

# --- Summary ---

if [ -n "$FAILED" ]; then
  echo "===== Update complete with failures:$FAILED ====="
  exit 1
else
  echo "===== All updates complete ====="
fi
