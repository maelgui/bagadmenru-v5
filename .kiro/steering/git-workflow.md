# Git Workflow

## Branching and PRs — hard rules

- **Every feature or fix branch starts from up-to-date `origin/main`.** Fetch
  first, then branch from the remote ref — never from a local `main` that may
  be stale, and never from another feature branch:

  ```bash
  git fetch origin main
  git worktree add ../bagadmenru-v5-worktrees/<slug> -b <type>/<slug> origin/main
  ```

- **Every PR targets `main`.** No stacked PRs (a PR based on another PR's
  branch). GitHub does not retarget a PR's base when the base branch is merged
  without being deleted: merging a stack PR-by-PR lands the top PRs into
  already-merged ghost branches instead of `main`, and the work silently never
  ships. This happened on 2026-09-12 (PRs #1306/#1307 stranded off `main`,
  re-landed by #1310).

- **When work depends on an unmerged branch**, wait for that branch to reach
  `main`, then start from fresh `origin/main`. If the dependency is urgent,
  coordinate the merge first instead of stacking.

- If two in-flight branches touch the same files, prefer finishing and merging
  one before starting the other over building the second on top of the first.

## Commits — one commit = one feature

- **A PR carries a single commit containing the complete feature or fix.**
  The history is the deliverable, not the reasoning chain: design iterations,
  lint fixups, regenerated files and review corrections are squashed into the
  feature commit, never left as separate commits.
- Before opening a PR, squash the branch to one commit with a message that
  says what changed and why (body welcome for context and tradeoffs).
- Addressing review feedback: amend the feature commit and push with
  `git push --force-with-lease origin <feature-branch>`. Force-with-lease on
  the feature branch only — never any form of force on `main`.

## Worktrees

Every feature or sizeable fix gets its own worktree instead of switching
branches in the main checkout.

- All worktrees live in one dedicated folder: `../bagadmenru-v5-worktrees/<slug>/`,
  `<slug>` in kebab-case (e.g. `logout-all`, `multi-account`).
- Branch naming: `feat/<slug>` for features, `fix/<slug>` for fixes.
- Before creating one, run `git worktree list` — reuse an existing worktree for
  the same feature instead of duplicating it.
- Cleanup once merged: `git worktree remove ../bagadmenru-v5-worktrees/<slug>`
  then `git worktree prune`. Never remove a worktree holding uncommitted work
  without explicit confirmation.

## Opening the PR

1. `git status` — everything committed, single squashed commit (see above).
2. `git push -u origin <type>/<slug>` (standalone command).
3. `gh pr create --title "<concise title>" --body "<summary, tests run,
   pending points>"` — the PR targets `main`.
4. Show the returned PR URL. Ask for confirmation before pushing and opening
   the PR.
5. Never push directly to `main`/`master`.
