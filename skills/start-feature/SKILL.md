---
name: start-feature
description: Use this skill whenever the user wants to start, begin, or kick off a new feature, bug fix, or non-trivial change — "let's build X", "start a feature", "new branch for X", "set up a worktree for X". Enforces a minimum bar (acceptance criteria + agreed approach) before any code, then creates the branch/worktree and sets the commit strategy. Hands off to create-pull-request when the work is done. Does NOT define PR format.
---

# Start Feature

Gets a change started correctly: a clear definition of done, an agreed approach, an isolated worktree, and a branch named to convention. Stops before any code is written.

Scope is deliberately narrow. PR title/body/stacking format lives in `create-pull-request`; capturing ideas as issues lives in `brain-dump-to-issues`. Don't duplicate either here.

## 1. Triage

Decide if the change is **trivial** (typo, one-line fix, config tweak, no design choices). If so, say "Trivial, skipping plan." in one line, ask for a one-sentence acceptance criterion if it isn't obvious, then skip to step 4 using a plain branch (no worktree).

Anything else is a **feature**: run every step.

## 2. Gate — two hard blockers

Do not create a branch or touch code until both exist and the user has confirmed them.

1. **Acceptance criteria** — at least one testable "done when…" statement.
2. **Approach** — a short plan: what changes, where, and the main risk. A few bullets, not an essay.

If either is missing, **interview the user** with `AskUserQuestion` (concrete branching decisions) or plain questions until both exist. Do not draft them for the user and ask for sign-off — the user writes the substance, you tighten it. Never fabricate criteria to fill the gap.

When both are in hand, restate them back in one block and get a single go-ahead.

## 3. Pre-flight checks

Report problems; none of these are blockers on their own, but never hide them.

- Working tree state of the current checkout (`git status --short`). Uncommitted changes stay where they are — a new worktree starts clean, so they are not carried over. Tell the user.
- Base branch is up to date: `git fetch`, then compare the base with its upstream. Default base is the repo's default branch.
- Single PR or stack? Decide now so branches are cut from the right base. If stacking, follow the base/naming rules in `create-pull-request`; each layer gets its own worktree.

## 4. Persist the gate output

Acceptance criteria and approach must survive a context reset.

- **Issue exists** (user gave a number/URL): append them to the issue body or a comment.
- **No issue**: don't prompt for one. Keep them in chat, and put them in the body of the first commit. `create-pull-request` can lift them into the PR Intent section.

## 5. Branch and worktree

**Branch name:** `<type>/<issue#>-<slug>`, e.g. `feat/42-login-form`. With no issue, drop the number silently: `feat/login-form`. `<type>` is a Conventional Commits type (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`). Slug is lowercase, hyphenated, ≤5 words.

**Worktrees are the default for features** (not for trivial changes). Location: a sibling of the repo, `../<repo>.worktrees/<slug>`, so nothing lands inside the repo and needs ignoring.

Pick the mechanism:

1. **Herdr is available** — `herdr` is on PATH and `herdr status server` shows the server running. Create the worktree as a Herdr workspace:

   ```sh
   herdr worktree create --branch <type>/<issue#>-<slug> --base <base-ref> \
     --path ../<repo>.worktrees/<slug> --label <slug> --focus
   ```

   Read the JSON response for the workspace id and path; don't guess them. Do not pass `--trust-repository` unless the user has verified the repository.
2. **Herdr missing or server not running** — plain git:

   ```sh
   git worktree add -b <type>/<issue#>-<slug> ../<repo>.worktrees/<slug> <base-ref>
   ```

   Tell the user Herdr wasn't used and why.
3. **Trivial change** — `git switch -c <branch> <base-ref>` in place.

If the branch already exists or is checked out in another worktree, stop and ask — don't force or reuse silently.

After creation, tell the user the worktree path and that the coding session should run **from that directory**, not the original checkout.

## 6. Commit strategy

- Small commits, one per logical step, each leaving the tree in a working state.
- Conventional Commits format: `<type>(<scope>): <description>`.
- No Claude attribution (`Co-authored-by`, "Generated with…") in commits, matching the `create-pull-request` rule.
- Don't squash, amend, or force-push without being asked.

## 7. Hand off and cleanup

- When the work is done, hand off to `create-pull-request`. Don't draft PR text here.
- After the PR merges, offer cleanup: with Herdr, `herdr worktree remove --workspace <ID>`; otherwise `git worktree remove <path>`. Then delete the local branch. Always ask first — removal discards the checkout. Never use `--force` unless the user asks.

## Hard rules

- No branch, worktree, or code before the gate (step 2) passes, except for trivial changes.
- Never invent acceptance criteria or approach content.
- Never pick the issue number, type, or base branch by guessing — read them from what the user gave or the repo, or ask.
- Only close or remove Herdr workspaces and worktrees this skill created.
