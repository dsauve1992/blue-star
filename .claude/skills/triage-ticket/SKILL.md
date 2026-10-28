---
name: triage-ticket
description: Decide whether ONE agent-proposed Backlog ticket on the Blue Star kanban board is justified, through a three-voice discussion (skeptic, maintainer, product), then move it to Ready, reject it, or hand it to the user. Never edits code. Use when asked to triage a proposed ticket, or to run the scheduled triage.
---

# Triage ticket (three-voice decision on a proposed ticket)

Decides exactly one ticket per run. Load `kanban-board` first for the board commands, the comment markers and the stance lines.

You are the **moderator**. You run the three voices as subagents and post each turn on the issue; you do not argue a side and you never change code. The voices read the code, never edit it.

## Voices

- **SKEPTIC**: argues against. Is the problem real (verify the cited `file:line` still says what the ticket claims, `git log` for a recent fix)? Is it a duplicate of an open or closed ticket? Is the evidence a guess? Does the video actually show the problem the ticket claims, or something else or nothing? What does the change risk breaking?
- **MAINTAINER**: owns the codebase. Is the proposed change the smallest one, does it fit `backend-patterns` and the module boundaries, is it under ~150 changed lines, is "Out of scope" honest, is the "Verification" section enough to prove it works?
- **PRODUCT**: the single daily user, a swing trader. Looking at the video as the trader would: does this make reading the market or acting on a position safer or faster, or avoid a silent wrong number? A correct-but-irrelevant cleanup is low value, not a reason to reject by itself.

Each voice reads the ticket, watches its evidence video (step 2), reads the relevant code, the open backlog (`gh issue list`) and the previous comments, and must cite `file:line` or a ticket number for every claim. A claim it cannot back is dropped.

## Steps

1. **Resolve the ticket.** The issue number is given to you. Make sure the ticket carries the `triage` label (add it if missing; a launcher may already have). Read the issue body and its comments. If it has no Problem / Proposed change / Out of scope / Verification sections, comment what is missing, add `needs-human`, stop.
2. **Prepare the evidence.** A `bug` or `ux` ticket with a visible problem must embed a video (see `kanban-board` "Evidence video"). Subagents cannot play video, so turn it into frames: download the `.mp4` linked in the Problem section into the scratchpad and extract one frame per second, at most 20 (`ffmpeg -i problem.mp4 -vf "fps=1,scale=960:-1" -frames:v 20 frame-%02d.png`). Hand the voices the frame paths; each must `Read` them in order and cite what it sees with the frame number (`frame 07: the toggle shows "on" while the list is empty`). If the ticket needs a video and has none, or the file cannot be downloaded, the SKEPTIC objects on the ground "evidence missing"; the other voices judge on the text alone. Exempt categories and backend-only bugs (a failing test or `curl` transcript instead) need no frames.
3. **Round 1.** Run the three voices in parallel on the ticket and the frames. Post each result as its own issue comment (`gh issue comment`), first line `**[SKEPTIC]**` etc., last line a stance: `STANCE: APPROVE` (justified as written), or `STANCE: OBJECT` (not justified, or needs changes; state exactly which).
4. **Round 2, only if the stances differ.** Each dissenting voice gets the other voices' comments and answers them; each other voice may revise. Post the new comments. If a voice proposes a rewording that would make the ticket acceptable, the moderator may edit the issue body to apply it, quoting the change in a `**[MODERATOR]**` comment, then asks the dissenters to restate their stance. A third round is never run.
5. **Decide.**
   - **All three `STANCE: APPROVE`** (after any rewording): justified.
   - **Two or more `STANCE: OBJECT` on the same ground** (not real, duplicate, wrong approach, too large): rejected.
   - **Anything else**, including a lone dissenter who still objects, or objections on different grounds: undecided, goes to the user.
6. **Apply the decision.** Post a `**[MODERATOR]**` comment with the verdict, the deciding reasons and the dissent if any, then:
   - Justified: add the label `triaged`, set Priority and Size if the voices agreed on a different value than the ticket, and move the ticket to `Ready`.
   - Rejected: add `triaged`, close the issue as not planned (`gh issue close <n> --reason "not planned"`), move it to `Done`.
   - Undecided: add `needs-human`; leave it in `Backlog`. Do not add `triaged`.
7. Stop. Do not start another ticket.

## Rules

- One ticket per run. The moderator never overrules the voices' arithmetic: the verdict follows step 4 mechanically.
- Never move a ticket to `Ready` without all three approving. Never close a ticket on fewer than two objections.
- A ticket that is a duplicate of an open one is rejected with a link to the original in the verdict.
- Do not implement, review a PR, or change anything outside the issue and the board.
- If `gh` fails with a missing-scope error, stop and report instead of working around it.
