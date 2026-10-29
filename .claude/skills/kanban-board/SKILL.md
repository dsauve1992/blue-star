---
name: kanban-board
description: Shared reference for the "blue-star kanban board" (GitHub Projects v2 #3, owner dsauve1992) - commands to create tickets, read the Ready column and move tickets between Status columns. Used by fix-one-thing, architect-review and implement-next; load it before touching the board.
---

# Blue Star kanban board

Project number `3`, owner `dsauve1992`, repo `dsauve1992/blue-star`.
Status options: `Backlog`, `Ready`, `In progress`, `In review`, `Done`. Other fields: `Priority` (P0/P1/P2), `Size` (XS-XL).

Who moves what: proposers create tickets in `Backlog`; the user drags to `Ready`; `implement-next` moves `Ready` -> `In progress` -> `In review`; the user merges and moves to `Done`. Never move a ticket out of a column you do not own.

Look IDs up at runtime, never hardcode them:

```bash
PROJECT_ID=$(gh project view 3 --owner dsauve1992 --format json --jq .id)
gh project field-list 3 --owner dsauve1992 --format json \
  --jq '.fields[] | select(.name=="Status" or .name=="Priority" or .name=="Size") | {name, id, options: [.options[] | {name, id}]}'
```

Helper (works in bash and zsh) to set a single-select field by names:

```bash
PROJECT_ID=$(gh project view 3 --owner dsauve1992 --format json --jq .id)
set_field(){ local item=$1 field=$2 opt=$3
  local fid=$(gh project field-list 3 --owner dsauve1992 --format json --jq ".fields[]|select(.name==\"$field\")|.id")
  local oid=$(gh project field-list 3 --owner dsauve1992 --format json --jq ".fields[]|select(.name==\"$field\")|.options[]|select(.name==\"$opt\")|.id")
  gh project item-edit --project-id "$PROJECT_ID" --id "$item" --field-id "$fid" --single-select-option-id "$oid" >/dev/null; }
```

Create a ticket in Backlog (new items already land in Backlog; setting it explicitly is harmless). Write the body with a heredoc into a file first, never an unfed `cat >`:

```bash
URL=$(gh issue create --repo dsauve1992/blue-star --title "$TITLE" --body-file "$BODY_FILE" --label agent-proposed --label "$CATEGORY_LABEL")
ITEM_ID=$(gh project item-add 3 --owner dsauve1992 --url "$URL" --format json --jq .id)
set_field "$ITEM_ID" Status Backlog; set_field "$ITEM_ID" Priority P2; set_field "$ITEM_ID" Size S
```

Create the `agent-proposed` label once if missing: `gh label create agent-proposed --color 5319e7 2>/dev/null || true`.

List items by status:

```bash
gh project item-list 3 --owner dsauve1992 --limit 200 --format json \
  --jq '.items[] | select(.status=="Ready") | {id, number: .content.number, title: .content.title, priority, size}'
```

Count the Backlog: pipe the list above with `select(.status=="Backlog")` into `jq -s length`.

Move a ticket: `gh project item-edit` with the Status field ID and the target option ID (same call as above).

Ticket body format (proposers write it, `implement-next` consumes it - it must be self-contained):

```
## Problem
What is wrong or missing, with evidence (file:line, failing behaviour, evidence video).
## Proposed change
The smallest change that fixes it, naming the files and functions to touch.
## Out of scope
What this ticket deliberately does not touch.
## Verification
Tests to add or run; for UI/behaviour changes, the flow to exercise in the running app.
## Category
test | refactor | bug | security | ux | architecture | devops
```

If a `gh project` call fails with a missing-scope error, the token needs `read:project` and `project`; stop and report instead of working around it.

## Evidence video

A proposer whose ticket category is `bug` or `ux`, and whose problem can be seen in the running app, must attach a short video that shows the problem happening. The video is the proposer's proof of intent: the reader sees the bug or the weak interaction before reading the plan, and `implement-next` replays the same flow afterwards.

Not applicable, no video and no placeholder: `architecture`, `devops`, `refactor`, `test`, and anything with no visible behaviour. A `bug` with no UI surface (backend or API only) gets a reproduction in the Problem section instead: a failing test, or the exact `curl` and its output, and one sentence saying why there is no video. A finding you cannot reproduce on screen is not filed.

Recording:

1. Reproduce through the `run` skill's stage environment with Playwright and the saved session. Write the script under the scratchpad, never in the repo, with `recordVideo: { dir, size: { width: 1440, height: 900 } }` (use 390x844 for a mobile problem) and `slowMo: 400`. Walk the exact flow: navigate, pause 1-2 s on the area, perform the interaction, pause on the wrong result. Keep it 10-30 s.
2. Convert it:

   ```bash
   ffmpeg -y -i problem.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart problem.mp4
   ffmpeg -y -i problem.webm -vf "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" problem.gif
   ```

   Keep the GIF under ~8 MB (lower fps or width if needed).
3. Commit `problem.gif` and `problem.mp4` to branch `qa-media/proposals` under `docs/qa/proposals/<slug>/` from a temporary worktree of that branch (push that branch, never `main`). Embed the GIF inline in the Problem section through its `https://raw.githubusercontent.com/dsauve1992/blue-star/qa-media/proposals/docs/qa/proposals/<slug>/problem.gif` URL and link the mp4.
4. In Verification, name the flow to replay and what it must show once fixed.

## Agent workflow contract

Each stage runs as one Claude session per ticket, started by the user or by any scheduler. Labels, Status and comment markers are the only shared state. A launcher may add the claim label (or move the Status) before starting a session; a skill that finds its claim missing makes it itself, and never removes a label it did not add.

Stages, in order:

| Stage | Skill | Picks up | Claim label | Ends with |
|---|---|---|---|---|
| Propose | `fix-one-thing`, `architect-review`, `devops-review` | schedule | none | new `Backlog` ticket, label `agent-proposed` |
| Triage | `triage-ticket` | `Backlog` + `agent-proposed`, no `triaged` | `triage` | `triaged` plus Status `Ready`; or issue closed as not planned plus Status `Done`; or label `needs-human` |
| Implement | `implement-next` | `Ready` | Status `In progress` | PR open, Status `In review` |
| PR review | `pr-review` | `In review`, no `pr-reviewed` | `pr-review` | PR merged, Status `Done`; or label `needs-human` |

Other labels: `agent-error` is set by a launcher when a session died or never started (remove it and the claim label to re-arm). `needs-human` means the agents stopped and wait for the user; no stage picks the ticket up again until the user removes it.

Debates leave a readable record as GitHub comments. Every turn is one comment starting with its role in bold on the first line: `**[SKEPTIC]**`, `**[MAINTAINER]**`, `**[PRODUCT]**` (triage), `**[DEFENDER]**`, `**[REVIEWER-1]**`, `**[REVIEWER-2]**` (PR review). The last line of a comment is a stance, alone on its line: `STANCE: APPROVE`, `STANCE: OBJECT` or `STANCE: DEFER-TO-TICKET` (defender only, meaning the change moves to a new Backlog ticket). A party has approved only if its **latest** comment ends in `STANCE: APPROVE`.

The same GitHub account posts every comment, so a GitHub "approve" review is impossible; the markers above are the approval.
