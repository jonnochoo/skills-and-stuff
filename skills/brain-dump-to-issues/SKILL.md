---
name: brain-dump-to-issues
description: Use this skill when the user pastes a freeform dump of todos/ideas and wants them turned into GitHub issues quickly, tagged with a conventional-commit change type, priority, and (when they exist) area labels, split into Tasks vs Epics. Trigger on phrases like "turn these into issues", "create github issues from this list", "log these as tasks", "make an epic for X", "brain dump these to github".
---

# Brain Dump to Issues

Turns a messy paste of todos into properly tagged GitHub issues, fast. Optimized for speed of
capture, not upfront planning — epics get logged as quickly as tasks. Breaking an epic into
phases/sub-issues is a separate, later step (a different skill), not this one.

## Prerequisites

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated (`gh auth status`). If
`gh` is missing or unauthenticated, stop and tell the user instead of falling back to another
method.

## Step 1 — Determine the target repo

Default to the repo of the current directory (`gh repo view`). If the cwd isn't a repo, or `gh
repo view` fails/is ambiguous, ask the user which repo (`owner/name`) instead of guessing.

## Step 2 — Split the dump into discrete issues

Read the whole paste, then split it into one issue per distinct idea/todo. A single sentence can
still contain two separate issues; a paragraph can be one issue. Use judgment, not line breaks.

For each issue, classify **Task vs Epic**:

- **Epic** — implies multiple phases, spans multiple PRs, or is a broad feature/initiative (e.g.
  "overhaul auth", "support multi-tenant billing", "migrate X to Y").
- **Task** — a single, concretely actionable unit of work.
- Default to **Task** when ambiguous — don't over-classify small things as epics.

## Step 3 — Cross-reference existing issues

Before writing bodies or picking labels, fetch context from the repo:

```
gh issue list --state open --limit 100 --json number,title,labels
```

Use this for two things:

- **Grouping** — if a new Task plausibly belongs under an existing open Epic (title starts with
  `[EPIC]`), note it as a candidate relation. Match on real thematic overlap (same feature area,
  same subsystem), not superficial keyword hits.
- **Label signal** — if existing issues about a similar topic already carry an area label, treat
  that as a stronger signal than guessing from wording alone when picking the area label in Step
  6.

This is a suggestion pass, not an auto-link. Any candidate relation gets surfaced in the Step 7
preview as `relates to #N` so the user can confirm or drop it per item — never write `Relates to
#N` into a body without it having appeared in the confirmed preview first.

## Step 4 — Determine change type (Tasks only)

Classify every **Task** by conventional-commit type — the same vocabulary
[create-pull-request](../create-pull-request/SKILL.md) uses for PR titles, so an issue's type
still lines up once someone opens the PR that closes it:

`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`

This becomes the `type:*` label in Step 6 and also decides which body shape to use in Step 5.
**Epics do not get a change type** — an epic usually spans several types (feat + docs + test),
so forcing one onto it is misleading. Epics only ever get priority + area labels.

## Step 5 — Write title and body

- **Title prefix**: every issue title starts with `[EPIC]` or `[TASK]`, e.g. `[TASK] Fix null
  check in payment webhook`. Always present, no exceptions — this is what makes Task/Epic
  scope searchable/filterable without relying on labels or repo-specific issue-type features.
- **Body shape depends on the Step 4 change type** (Tasks only — Epics always use the lightweight
  freeform shape below regardless of anything else):

  - **`type:fix` → Bug shape:**
    ```markdown
    **Expected:** <what should happen>
    **Actual:** <what happens instead>
    **Steps to reproduce:** <only if the dump actually gives steps>
    ```
  - **`type:feat` → User story shape:**
    ```markdown
    **Story:** As a user, I want <capability>[, so that <benefit>].
    **Acceptance criteria:** <only if the dump enumerates specific conditions>
    - [ ] ...
    ```
  - **Everything else (`chore`/`refactor`/`docs`/`test`/`perf`/`ci`/`build`) → Generic task
    shape:**
    ```markdown
    **What:** <description, elaborated from the dump in your own words>
    **Why:** <only if the dump states a reason>
    ```
  - **Epic → lightweight freeform:** capture the idea as-is, 1-3 sentences, no headers. Do not
    add a forced phase breakdown, checklist of sub-issues, or planning section — that's out of
    scope for this skill.

  **Never fabricate a bracketed field.** If the dump doesn't support a field (no stated benefit,
  no repro steps, no acceptance criteria, no reason), omit that line entirely — don't invent
  content to fill the shape, and don't leave a visible placeholder like "N/A" or "TBD".

## Step 6 — Labels

Three dimensions. Do not add status or size labels.

**Type** — from Step 4, Tasks only:

Before creating any issues, run `gh label list` once. If any of `type:feat`, `type:fix`,
`type:chore`, `type:refactor`, `type:docs`, `type:test`, `type:perf`, `type:ci`, `type:build` is
missing from the repo, create it (`gh label create "type:X" --color <hex> --description "..."`)
— once per missing label, not per issue. This is a fixed canonical set (same as priority below),
not repo-specific guessing, so creating missing ones is fine.

**Priority** — always applied, inferred from wording:

- `priority:p0` — urgent/blocking/critical language
- `priority:p1` — important/soon
- `priority:p2` — default when nothing signals urgency either way
- `priority:p3` — "whenever"/"someday"/"nice to have"/explicitly low priority

Same rule: run `gh label list` once, create any missing `priority:p0`–`p3` label
(`gh label create "priority:pN" --color <hex> --description "..."`) once per missing label, not
per issue. Suggested colors: p0 `d73a4a` (red), p1 `e99695` (orange), p2 `fbca04` (yellow), p3
`c5def5` (light blue).

**Area** — prefer what already exists; propose new only when confident, and only with confirmation:

- Use the same `gh label list` output to see what area/component labels the repo already has
  (naming varies per repo). These are usually vertical/feature-domain slices (e.g. `area:auth`,
  `area:billing`, `area:search`) rather than horizontal/layer slices (`area:backend`,
  `area:frontend`) — a layer label is weak signal for the Step 3 grouping use case, since two
  unrelated features can both be "backend." When the repo's existing labels give you a real
  choice, prefer matching on feature domain over layer.
- Apply an existing area label only if an issue clearly matches it, using both the label's own
  name and the Step 3 signal (how similar existing issues are already labeled) to decide.
- If nothing in the existing label set fits, only propose creating a new area label when you're
  confident it names a real, reusable feature domain (not a one-off). Surface the proposal in the
  Step 7 preview the same way as a relation candidate — it needs explicit confirmation before any
  `gh label create` runs. **If unsure, don't propose — skip the area dimension for that issue
  entirely.** Skipping is always safe; a wrong invented label causes sprawl the user didn't ask
  for.

## Step 7 — Preview before creating (single confirmation)

Creating issues is visible to others and not cleanly reversible (closing isn't deleting), so
batch it behind one confirmation — not one prompt per issue.

Show the user a plain list of everything about to be created:

```
1. [TASK] Fix null check in payment webhook — type:fix, priority:p1, area:billing — relates to #123 [EPIC] Support multi-tenant billing
2. [EPIC] Support multi-tenant billing — priority:p2, area:billing (new label, needs confirmation)
...
```

Wait for explicit go-ahead before running any `gh issue create` calls. If the user wants to edit,
drop, reclassify, or drop a suggested relation or proposed new area label for an item, adjust and
re-show the list rather than creating partially.

## Step 8 — Create and report

If any proposed new area label was confirmed in Step 7, create it first
(`gh label create "area:X" --color <hex> --description "..."`, once per confirmed label). Then
loop `gh issue create --repo <owner/name> --title "..." --body "..." --label "..." --label "..."`
per issue. For any item with a confirmed relation from Step 3/7, add a `Relates to #N` line in
its body. After creation, report back the created issue URLs/numbers, grouped by Task/Epic — no
extra commentary needed.

## Hard rules

- Never create a new area label without it first appearing as a proposal in the confirmed Step 7
  preview — and only propose one when confident it names a reusable feature domain; otherwise skip
  the area dimension.
- Never apply a `type:*` label to an Epic — change type is Tasks-only.
- Never fabricate a bracketed body field (benefit, repro steps, acceptance criteria, reason) —
  omit the line if the dump doesn't support it. No invented content, no "N/A"/"TBD" placeholders.
- Never force a phase/sub-issue breakdown onto an Epic — capture the idea, nothing more.
- Never write `Relates to #N` into a body unless that relation appeared in the confirmed preview.
- One confirmation for the whole batch, not per-issue.
- Terse bodies — no forced boilerplate beyond the type's body shape, no restating the title.
- Never include "Co-authored-by: Claude" or any Claude attribution in issue title or body.
