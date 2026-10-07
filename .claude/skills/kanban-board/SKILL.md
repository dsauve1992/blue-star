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
What is wrong or missing, with evidence (file:line, failing behaviour, screenshot).
## Proposed change
The smallest change that fixes it, naming the files and functions to touch.
## Out of scope
What this ticket deliberately does not touch.
## Verification
Tests to add or run; for UI/behaviour changes, the flow to exercise in the running app.
## Category
test | refactor | bug | security | ux | architecture
```

If a `gh project` call fails with a missing-scope error, the token needs `read:project` and `project`; stop and report instead of working around it.
