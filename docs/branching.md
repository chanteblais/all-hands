# Branching strategy

Ported from the camp repo (`glaum-camp-website/docs/branching.md`) 2026-08-26 —
same rules, same reasons; the incidents that motivated them happened there and
the guards came along. Deliberately chill: `main` always deploys cleanly and
every non-trivial change is one visible, revertable unit.

## The rules

1. **`main` is the deployable truth.** Once a remote + Vercel exist, pushing
   `main` deploys production. Never push `main` with something half-done in it.
2. **Branch for anything non-trivial.** Short-lived, named `type/slug`:
   `feat/…` · `fix/…` · `ux/…` · `docs/…` · `chore/…`, or
   `session/YYYY-MM-DD-<topic>` when scope is unclear.
3. **Verify before merging:** `npx tsc --noEmit` passes and you've clicked
   through the affected pages on a local dev server. For any board shape
   change, also `npm run verify-quantities` against a copy of real state.
4. **Merge with `--no-ff`, then delete the branch.**
   (`git log --first-parent main` reads as a changelog.)
5. **Tiny tweaks may go straight to `main`** (copy edits, one-liners) — the
   pre-commit hook asks for `ALLHANDS_ALLOW_MAIN=1` on those, deliberately.
6. **Migrations ride the branch that needs them.** Apply to prod at
   merge+deploy time; note the number in the merge commit message. Print the
   full SQL in the chat summary (standing task in `CLAUDE.md`).
7. **Want eyes on something before it ships?** Push the branch — Vercel builds
   a preview URL per branch — then merge when happy.

## Parallel sessions — one checkout is ONE git context

Branches belong to the *checkout*, not the session (camp repo, learned
2026-07-02). Rules, unchanged:

1. The main checkout belongs to one git-active session at a time; check
   `git branch --show-current` before your first git command — a branch you
   didn't create means someone else owns the checkout.
2. A second concurrent session uses `git worktree`
   (`git worktree add ../all-hands-<slug> -b <type>/<slug>`, or the EnterWorktree
   tool). **Env files don't come along**: symlink `.env.local` in before
   starting a dev server there. In a worktree, every Read/Edit/Write path must
   contain the worktree's directory — an absolute shared-root path silently
   edits the shared checkout (camp repo, 2026-07-08 incident).
3. **Never `git add -A` / `git add .` / `git stash` in the shared checkout.**
   Stage explicit paths only.
4. Read-only sessions need no branch and no worktree.
5. Commit work-in-progress to the feature branch; never leave the shared
   checkout dirty between turns.
6. Release `main` the moment you're done with it (a worktree parked on `main`
   blocks every other session's merge).

## Commit guards (pre-commit hook)

Versioned at `.githooks/pre-commit`; a **fresh clone runs
`git config core.hooksPath .githooks` once** (worktrees inherit it).

1. **No `.claude/` bookkeeping in commits** (`launch.json` excepted).
2. **No direct commits to `main`** — the crossed-session tripwire (a session
   that thinks it's in the camp repo or glaum-ca lands here and stops loudly).
   Deliberate rule-5 tweaks: `ALLHANDS_ALLOW_MAIN=1 git commit …`. Normal
   `--no-ff` merges are unaffected. (`--no-verify` bypasses hooks; don't.)

## Claude sessions

Every session branches before its first edit. Merge `--no-ff` after
verification, delete the branch, and push `main` **once Chante has signed
off** ("looks good" / "merge it" covers the deploy). Before pushing: docs
folded into every outgoing commit, migrations applied with their code,
`git log --first-parent origin/main..main` reviewed. When in doubt, don't —
leave the push to Chante.
