#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# push.sh  –  Stage all changes, commit with a timestamped message, and push
#             to the 'main' branch on GitHub (origin).
#
# Usage:
#   ./push.sh                          # auto-generates a commit message
#   ./push.sh "your custom message"    # use a custom commit message
# ─────────────────────────────────────────────────────────────────────────────

set -e  # exit immediately on any error

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

# ── 1. Make sure we are inside a git repo ────────────────────────────────────
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌  Not inside a git repository. Aborting."
    exit 1
fi

# ── 2. Stage everything ───────────────────────────────────────────────────────
git add -A

# ── 3. Check if there is anything to commit ──────────────────────────────────
if git diff --cached --quiet; then
    echo "✅  Nothing to commit – working tree is clean."
    exit 0
fi

# ── 4. Build commit message ──────────────────────────────────────────────────
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    COMMIT_MSG="auto: update $(date '+%Y-%m-%d %H:%M:%S')"
fi

# ── 5. Commit ─────────────────────────────────────────────────────────────────
git commit -m "$COMMIT_MSG"
echo "✅  Committed: $COMMIT_MSG"

# ── 6. Push to origin/main ───────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀  Pushing branch '$BRANCH' to origin..."
git push origin "$BRANCH"
echo "✅  Pushed to origin/$BRANCH successfully."
