# CLAUDE.md

How to work in this repo. This file is the *operating procedure*; `agent/INDEX.md`
is the *project knowledge*. Keep them separate — never copy project facts into
this file.

**Before doing anything in this repo, read `agent/INDEX.md`.** Follow its
task→file routing to the one or two files relevant to the task at hand, and note
its hard-constraints list. Don't pull in the whole knowledge base; the router
exists to keep you focused.

## The loop — run this for any non-trivial task

1. **Orient.** Read `agent/INDEX.md`, follow its routing to the relevant files,
   and note the hard constraints that apply to this task.

2. **Spec.** Write a short spec before touching code: what the change is, its
   acceptance criteria (the checkable conditions for "done"), and any genuine
   open questions. One line for a trivial fix; a few lines for a feature.

3. **Gate.** Show me the spec and a brief plan — what you'll change and which
   files — then stop and wait for my go-ahead before writing code. See *Autonomy*
   for when to skip this.

4. **Build.** Implement the simplest thing that satisfies the spec. Reuse the
   patterns already in the codebase; add no abstraction, config, or
   "future-proofing" the spec didn't ask for. Work from evidence in the code —
   never invent. If something is genuinely ambiguous, leave a
   `<!-- TODO: confirm -->` marker rather than guessing.

5. **Verify (definition of done).** The change is done only when the build
   passes, the linter/formatter is clean, it behaves per the acceptance criteria,
   and nothing references something that no longer exists. State pass/fail with
   evidence. Never claim done on a failing build. (Any domain-specific done
   criteria live in `agent/INDEX.md` — apply those too.)

6. **Review.** Do one self-review pass against this file and the hard constraints
   in `INDEX.md`. Grep-verify any constraint you assert — if you claim "module A
   doesn't import module B," check that it currently doesn't. Report findings as
   Critical / Warning / Suggestion, and fix the Criticals before finishing.

7. **Sync knowledge.** If the change altered structure, routing, or a constraint,
   update `agent/INDEX.md` so the knowledge base matches the code. Append an entry
   to `agent/decisions/` *only* for a genuinely non-obvious choice that's already
   visible in the code — do not manufacture decision records.

8. **Wrap up.** Summarize: what changed, which files, the verify result, the
   review outcome, any `TODO: confirm` markers left, and anything deferred. Do not
   commit or push unless I ask.

## Autonomy

Default: stop at the gate (Step 3) for my approval. Raise autonomy — run the loop
straight through — when I say so, or for small, low-risk, well-specified changes.
Lower it — check in more often — for risky, irreversible, or fuzzy work. I'll tell
you per task; when unsure, gate.

## Principles

- **Read the router; don't duplicate it.** Project facts live in `agent/`, not here.
- **Build only what earns its existence.** The simplest thing that meets the spec wins.
- **Evidence over invention.** Build from and describe what's actually in the code;
  mark uncertainty, don't fill it with guesses.
- **The spec is the contract** the review enforces. No spec, no build.
- **Surface assumptions; ask rather than guess** on anything that genuinely matters.

## Guardrail

A pre-tool hook blocks destructive commands (e.g. `rm -rf`). If you hit a block,
stop and tell me — never work around the guard.
