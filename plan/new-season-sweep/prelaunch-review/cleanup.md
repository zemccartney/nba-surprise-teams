# Review follow-up: bounded cleanup

Zack approved the cleanup after clarifying the intended deployment workflow and
agreeing that content testing is at a stopping point. SQLite and Knip remain
future work; no conversion or new test-runtime integration is included.

## Changes

- Removed the proposed `verify.yml`. Every deployment still runs the full build
  and whole-repository verification before preview upload or production publish.
  `DEPLOY_ENABLED` remains a **temporary cutover interlock**, to retire after
  migration. While disabled, checks are local; this is intentional, not an
  unresolved requirement for always-on CI. This supersedes R9's original fix
  recommendation and the initial test/tooling guide's separate-workflow design.
- Extracted `scripts/deployment-target.ts`. The workflow calls its CLI; Vitest
  imports the same pure classifier and smoke-tests the actual Node CLI. No YAML
  shell extraction, deployment execution or Windows-specific skip. Main versus
  main remains case-sensitive, and tags/empty refs fail.
- The workflow assigns the CLI result **before** exporting it: an `export`
  command must not mask a failing command substitution under Bash's `-e`.
- Added the small shared `tests/content-api.ts`. System tests supply the full
  freshly read dataset; helper unit tests supply only seasons/teams and their
  synthetic 50-game season. Unknown IDs return undefined, but requests for an
  omitted collection fail clearly. There is no framework-store dependency.
- Retained the working Vite configuration/filter, correcting its stale comments.
  No optimizer experiment, content-sync harness or fuller Astro API emulation.

## Verification

Completed: **65 tests in 8 files**, full credential-free build (including type,
format, lint and zizmor checks), selected workflow hook, and `git diff --check`
all pass. No browser rerun was needed for this tooling/test-only cleanup.

Run the ordinary credential-free local build:

```sh
env -u SENTRY_AUTH_TOKEN mise x -- pnpm run build
mise x -- hk check --check --step workflows -- .github/workflows/deploy.yml
```

Classifier cases cover exact main, Main, feature branches, tags and malformed
empty refs. CLI cases execute only the classifier. Existing content freshness,
population, duplicate and domain tests remain, with an added omitted-collection
contract check. Workflow wiring checks require build before both publish paths;
zizmor checks the actual YAML.

No UI behavior or application JSON changed. No new commit, push or deployment.
Actual hosted CI/Cloudflare execution remains unverified locally. See
[content-lifecycle.md](../content-lifecycle.md) for the lifecycle diagrams and
explicit future SQLite boundary; the existing data checks are the stopping
point, not the start of a database migration.
