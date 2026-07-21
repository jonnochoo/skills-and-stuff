---
name: create-pull-request
description: Use this skill whenever the user asks to create, open, draft, or write a pull request / PR, or wants a PR description generated from a diff or branch. Produces a terse, structured PR description with required sections and a conventional-commit-style title. Trigger on phrases like "open a PR", "create a pull request", "write the PR description", "draft a PR for this branch".
---

# Create Pull Request

Generates PR titles/descriptions in a fixed format. Terse by default — no filler, no marketing language.

## Prerequisites

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated (`gh auth status`).
Used to create/update PRs and read repo/PR metadata. If `gh` is missing or unauthenticated, stop
and tell the user instead of falling back to another method.

## Stacking

Prefer stacked PRs over one large PR when the work is easily separable — keeps each PR small and reviewable.

Use a stack when:

- The change has natural phases (e.g. schema migration → backend logic → UI)
- A refactor/prep step can land separately from the feature that uses it
- The diff would otherwise be large enough to slow down review

Don't stack for a single small, cohesive change — that's just overhead.

When stacking:

- Base each PR on the previous one's branch, not `main`
- Each PR gets its own title/description following the format below, scoped only to its own diff, with the `[STACK<NN>]` tag at the end of the title (see Title section)
- Note the stack in each PR body, e.g. `Stack: STACK01 → #<prev>, STACK02 (this), STACK03 → #<next>` (or a plain ordered list if the PR numbers aren't known yet)
- Order so earlier PRs are safe to merge alone if later ones stall (no half-finished feature exposed)
- Risks/verification sections stay scoped to that PR's own changes, not the whole stack

## Pre-checks (do these first, before drafting)

1. Run tests. If they fail, stop and report the failure — do not draft a PR for failing tests unless the user explicitly overrides.
2. Run the linter. Same rule: report failures, don't paper over them.
3. Only proceed to drafting once both pass (or the user explicitly says to proceed anyway).

## Title

Conventional Commits format: `<type>(<scope>): <description>`
Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`. Use `!` or a `BREAKING CHANGE:` footer for breaking changes.

If the PR is part of a stack, format as: `<type>: <Feature> - <phase description> [STACK<NN>]`

- `<Feature>` — short name for the overall feature/bug, consistent across every PR in the stack.
- `[STACK<NN>]` — position in the stack, zero-padded to 2 digits (`STACK01`, `STACK02`, ... `STACK10`) so titles still sort correctly once a stack passes 9 phases.
- `<phase description>` — what this specific PR covers, in plain words (e.g. "add DB schema", "add UI").
- Example:
  - `feat: Add login [STACK01] - add DB schema`
  - `feat: Add login [STACK02] - add UI`
- Non-stacked PRs get no tag at all.

Conventional-commit type always leads the title — never put anything ahead of it.

## Body — always these sections, in this order

```markdown
## Intent

Why this change exists. 1-3 sentences.

## What Changed

Bullet list. Concrete, no fluff. Group by area if the diff is large.

## Risks

Bullet list. Always consider and call out (when applicable):

- New or modified code signing patterns (image signing, artifact verification, key rotation, cosign config changes)
- DB risks (migrations, schema changes, backfills, index changes, lock/downtime risk)
- Auth/permission changes
- Config or env var changes required at deploy time
- Backward compatibility / rollback risk
  If genuinely no risks apply, write "None identified."

## How to Verify

Checklist the reviewer/tester can actually run through:

- [ ] Step one
- [ ] Step two
      ...
```

## Hard rules

- Never include "Co-authored-by: Claude" or any Claude attribution, anywhere in the PR (title, body, or commit).
- Keep language terse — short sentences, bullets over prose, no restating the obvious.
- Don't invent risks or verification steps that don't apply; only include what's genuinely relevant to the diff.
