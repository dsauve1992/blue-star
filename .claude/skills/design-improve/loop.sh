#!/usr/bin/env bash
set -uo pipefail

ITERATIONS="${1:-3}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG_DIR="${LOG_DIR:-$REPO/../blue-star-worktrees/designer-logs}"
MAX_OPEN_PRS=10

ALLOWED_TOOLS=(
  "Read" "Edit" "Write" "Glob" "Grep" "Skill"
  "Bash(gh pr list:*)" "Bash(gh pr create:*)" "Bash(gh pr view:*)"
  "Bash(git:*)" "Bash(npm:*)" "Bash(npx:*)" "Bash(node:*)"
  "Bash(ffmpeg:*)" "Bash(lsof:*)" "Bash(kill:*)" "Bash(docker ps:*)"
  "Bash(cp:*)" "Bash(mkdir:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(grep:*)"
)

mkdir -p "$LOG_DIR"
cd "$REPO"

open_designer_prs() {
  gh pr list --repo dsauve1992/blue-star --state open --search "head:designer/" \
    --json number --jq length
}

for i in $(seq 1 "$ITERATIONS"); do
  if ! open=$(open_designer_prs); then
    echo "Stopping: gh could not list PRs (run 'gh auth login')."
    exit 1
  fi
  if [ "$open" -ge "$MAX_OPEN_PRS" ]; then
    echo "Stopping: $open designer PRs open (limit $MAX_OPEN_PRS). Merge or close some first."
    exit 0
  fi

  log="$LOG_DIR/$(date +%Y%m%d-%H%M%S)-run-$i.log"
  echo "[$i/$ITERATIONS] Starting fresh session -> $log"
  if ! claude -p "/design-improve" --allowedTools "${ALLOWED_TOOLS[@]}" > "$log" 2>&1; then
    echo "[$i/$ITERATIONS] claude exited non-zero; see $log"
    exit 1
  fi
  tail -n 5 "$log"
done
