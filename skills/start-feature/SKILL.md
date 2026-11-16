---
name: start-feature
description: Use this skill whenever the user wants to start, begin, or kick off a new feature, bug fix, or non-trivial change — "let's build X", "start a feature", "new branch for X", "set up a worktree for X". Enforces a minimum bar (goal + approach + verification) before any code, shows an Environment/Plan summary for one go-ahead, then creates the branch/worktree and sets the commit strategy. Hands off to create-pull-request when the work is done. Does NOT define PR format.
---

# Start Feature

Gets a change started correctly: a clear definition of done, an agreed approach, a way to verify it, an isolated worktree, and a branch named to convention. Stops before any code is written.

Scope is deliberately narrow. PR title/body/stacking format lives in `create-pull-request`; capturing ideas as issues lives in `brain-dump-to-issues`. Don't duplicate either here.

## 1. Triage

Decide if the change is **trivial** (typo, one-line fix, config tweak, no design choices). If so, say "Trivial, skipping plan." in one line, ask for a one-sentence goal if it isn't obvious, then skip to step 6 using a plain branch (no worktree, no summary block).

Anything else is a **feature**: run every step.

## 2. Gate — three things the user must supply

Do not create a branch or touch code until all three exist.

1. **Goal** — at least one testable "done when…" statement (the acceptance criteria).
2. **Approach** — a short plan: what changes, where, and the main risk. A few bullets, not an essay.
3. **Verification** — for **each** goal statement, a concrete check that proves it: a test command, a manual step, or an observable result. Not just "run the tests".

If any is missing, **interview the user** with `AskUserQuestion` (concrete branching decisions) or plain questions until all three exist. Do not draft them for the user and ask for sign-off — the user writes the substance, you tighten it. Never fabricate goals, approach or checks to fill a gap.

## 3. Pre-flight

Do these before showing the summary, so the summary reports real state. Report problems; never hide them.

- **Sync the base.** Default base is the repo's default branch. `git fetch origin`, then fast-forward the local base to `origin/<base>`:
  - Current checkout is on the base: `git merge --ff-only origin/<base>`
  - Otherwise: `git fetch origin <base>:<base>` (fast-forwards a branch that isn't checked out)
  - If it can't fast-forward (local base has diverged, or a dirty tree blocks it), **stop and ask**. Never reset, rebase or force the base.
- **Current checkout state:** `git status --short`. Uncommitted changes stay where they are — a new worktree starts clean, so they aren't carried over. Say so.
- **Single PR or stack?** Decide now so branches are cut from the right base. If stacking, follow the base/naming rules in `create-pull-request`; each layer gets its own worktree.

## 4. Before-work summary — the one go-ahead

Show this block in chat, filled in with real values, then ask for a single go-ahead. Environment is a **preview** of what will be created.

```
# Environment
- Repo:      <repo>  (base: <base> @ <short sha>)
- Branch:    <type>/<issue#>-<slug>   (new, from <base>)
- Worktree:  <path>   (via Herdr | git worktree)
- Sync:      up to date with origin/<base>  |  fast-forwarded N commits
- Checkout:  <N uncommitted files stay behind | clean>

# Plan
- Goal:
  - <done when…>
- Approach:
  - <what changes, where, main risk>
- Verification:
  - <goal 1> → <check>
```

On go-ahead, create everything (steps 5–6) without further prompting. If the user changes something, update the block and ask again once.

The block is **chat only** — don't save the summary as a block anywhere.

## 5. Persist the plan

Goal and verification must survive a context reset.

- **Issue exists** (user gave a number/URL): append them to the issue body or a comment.
- **No issue**: don't prompt for one. Put them in the body of the first commit. `create-pull-request` can lift them into the PR Intent and How to Verify sections.

## 6. Branch and worktree

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

After creation, confirm the actual branch and worktree path against the summary, and tell the user the coding session should run **from that directory**, not the original checkout.

## 7. Commit strategy

- Small commits, one per logical step, each leaving the tree in a working state.
- Conventional Commits format: `<type>(<scope>): <description>`.
- No Claude attribution (`Co-authored-by`, "Generated with…") in commits, matching the `create-pull-request` rule.
- Don't squash, amend, or force-push without being asked.

## 8. Hand off and cleanup

- When the work is done, run the Verification checks, then hand off to `create-pull-request`. Don't draft PR text here.
- After the PR merges, offer cleanup: with Herdr, `herdr worktree remove --workspace <ID>`; otherwise `git worktree remove <path>`. Then delete the local branch. Always ask first — removal discards the checkout. Never use `--force` unless the user asks.

## Hard rules

- No branch, worktree, or code before the summary (step 4) is confirmed, except for trivial changes.
- Never invent goal, approach or verification content.
- Never reset, rebase, or force the base branch to make it "up to date".
- Never pick the issue number, type, or base branch by guessing — read them from what the user gave or the repo, or ask.
- Only close or remove Herdr workspaces and worktrees this skill created.
