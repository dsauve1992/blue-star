#!/usr/bin/env bash
set -uo pipefail

ITERATIONS="${1:-3}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG_DIR="${LOG_DIR:-$REPO/../blue-star-worktrees/designer-logs}"
MAX_BACKLOG=20

ALLOWED_TOOLS=(
  "Read" "Edit" "Write" "Glob" "Grep" "Skill"
  "Bash(gh issue:*)" "Bash(gh project:*)" "Bash(gh label:*)"
  "Bash(git:*)" "Bash(npm:*)" "Bash(npx:*)" "Bash(node:*)"
  "Bash(ffmpeg:*)" "Bash(lsof:*)" "Bash(kill:*)" "Bash(docker ps:*)"
  "Bash(cp:*)" "Bash(mkdir:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(grep:*)"
)

mkdir -p "$LOG_DIR"
cd "$REPO"

backlog_size() {
  gh project item-list 3 --owner dsauve1992 --limit 200 --format json \
    --jq '[.items[] | select(.status=="Backlog")] | length'
}

for i in $(seq 1 "$ITERATIONS"); do
  if ! backlog=$(backlog_size); then
    echo "Stopping: gh could not read the board (run 'gh auth login' and check the project scope)."
    exit 1
  fi
  if [ "$backlog" -ge "$MAX_BACKLOG" ]; then
    echo "Stopping: $backlog tickets in Backlog (limit $MAX_BACKLOG). Triage or close some first."
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
