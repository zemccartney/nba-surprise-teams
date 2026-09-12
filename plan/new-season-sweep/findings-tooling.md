# Findings: tooling migration (pnpm, lefthook, ESLint 10, Node)

_Researched 2026-09-07. Registry facts checked with `npm view` that day. Corrections from doing it are under "What actually happened" at the end; Node 26 was chosen over 24._

## pnpm

- `latest` is **12.3.4** (Rust rewrite, Aug 2026). `latest-11` 11.26.0, `latest-10` 10.34.5. The pagemeta config is pnpm-10 era and needs updating either way.
- All settings go in `pnpm-workspace.yaml`; `packages:` may be omitted for a single package. **`.npmrc` is auth/registry only since v11**: `engine-strict` there is ignored → `engineStrict: true` in the workspace file.
- `onlyBuiltDependencies` **removed in v11** → `allowBuilds: { pkg: true|false }`. Codemod: `pnpx codemod run pnpm-v10-to-v11`. pnpm 12 hard-errors on unknown keys.
- `strictDepBuilds` defaults **true** in v11+: unreviewed build scripts make `pnpm install` exit non-zero. That would fail CI. Packages with postinstall in this stack: `esbuild`, `workerd`, `@sentry/cli`, `lefthook`. All ship binaries as optional deps and their scripts no-op when resolved, so `allowBuilds: { esbuild: false, workerd: false, "@sentry/cli": false, lefthook: false }` is enough; they just must be listed. `sharp` has no install script now.
- Defaults in v11+: `minimumReleaseAge` 1440 (becomes strict when set explicitly), `blockExoticSubdeps` true. `trustPolicy` off by default.
- `pnpm audit --prod` audits prod deps only; ignores are GHSA-based.

## lefthook 2.x (2.1.12)

- 2.0 breaking: `exclude` globs only; `skip_output` → `output`; `only`/`skip` `run:` uses `sh`.
- npm postinstall runs `lefthook install -f` but **skips when `CI` is set**; binary comes via optional deps so no `allowBuilds` needed for the binary. Add `"prepare": "lefthook install"`.
- `glob_matcher: doublestar` still matters (default `**` needs ≥1 dir).
- Sketch:

```yaml
glob_matcher: doublestar
pre-commit:
  parallel: true
  jobs:
    - name: eslint
      glob: "**/*.{js,mjs,ts,tsx,astro,json}"
      run: pnpm exec eslint --fix --flag unstable_native_nodejs_ts_config {staged_files}
      stage_fixed: true
    - name: prettier
      run: pnpm exec prettier --write --ignore-unknown {staged_files}
      stage_fixed: true
    - name: typecheck
      run: pnpm exec astro check
    - name: test
      run: pnpm exec vitest run
```

## ESLint 10 (10.10.0)

- **`eslint.config.ts` is still behind `--flag unstable_native_nodejs_ts_config`** (no jiti needed on Node 24 with the flag). Put the flag in the npm scripts and lefthook.
- `includeIgnoreFile` is exported from `eslint/config` since 10.4 → drop `@eslint/compat`.
- v10: config lookup starts from each linted file's dir; `eslint:recommended` gains `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`; removed `context.getFilename()` etc.
- Plugins:
  - eslint-plugin-astro **3.x**: ESLint ≥10, Node ≥24.16, ESM-only, parser on `@astrojs/compiler-rs`, config key is `configs.recommended`.
  - unicorn **74**: needs ESLint ≥10.4; `no-array-for-each`→`no-for-each`, `prevent-abbreviations`→`name-replacements`; ~100 new rules since 62. Expect a `--fix` then triage pass.
  - perfectionist **5**: ESM-only; drops deprecated option shapes.
  - eslint-plugin-package-json **1.x**: removes `valid-package-definition`; adds `valid-packageManager` and many `valid-*`; peer `@eslint/json ≥1`.
  - @eslint/json **2**: consumer config unchanged.
  - typescript-eslint **8.69**: no v9; TS peer `<6.1`.
  - **eslint-plugin-react 7.37.5: peer `^9.7` only; broken on ESLint 10, fix PR unreleased.** eslint-plugin-jsx-a11y: peer `^9`, project declared unmaintained Aug 2026. → both go away with React.
  - eslint-plugin-react-refresh 0.5.6 and @vitest/eslint-plugin 1.6.27 are fine.

## npm-check-updates 23

`-p pnpm` works; `--cooldown 7d`; README says it reads pnpm's `minimumReleaseAge` from `pnpm-workspace.yaml` (precedence when both set unverified).

## Node 24

Active LTS; **Maintenance from 2026-10-20** (Node 26 becomes LTS 2026-10-28). Latest 24.20.0. `node:sqlite` is **release candidate**, not stable. Type stripping stable since 24.12 (erasable syntax only), so `node script.ts` works without tsx for this repo's `erasableSyntaxOnly` code.

## Gotchas in the order they'd bite

1. Pick the pnpm major first; port the pagemeta config (`allowBuilds`, `engineStrict` in workspace file).
2. Root `engines` must admit the build image's Node (24.18.0 today); `>=22 <23` fails there.
3. `strictDepBuilds`: list the four postinstall packages or CI install fails.
4. Set `PNPM_VERSION` in the CF build config to match `packageManager`.
5. `minimumReleaseAge` strict → same-day `pnpm add` fails; align `ncu --cooldown`.
6. lefthook: `prepare` script, since postinstall is CI-skipped.
7. ESLint 10 peers: react/jsx-a11y have none; unicorn ≥66 needs ESLint ≥10.4; astro ≥2 needs Node ≥24.16.
8. `eslint.config.ts` needs the flag in every invocation.
9. `PUBLIC_DEPLOY_ENV` on Workers Builds: derive from branch or run two Workers.
10. No commit-message skip on Workers Builds; use build watch paths.

## What actually happened (2026-09-07, see log.md Step 3)

- `sharp` **does** have an install script (0.33.5 and 0.34.4 both in the tree); it needs `allowBuilds: { sharp: false }`. The four listed above were right.
- `trustPolicy: no-downgrade` rejected `semver@6.3.1` and `vite@6.4.1` (backports without provenance). `trustPolicyIgnoreAfter` (v10.27, minutes) and `trustPolicyExclude` (v10.22) exist; used 1 year + one exclusion.
- `pnpm import` converts `package-lock.json` with zero version drift; do that rather than a fresh resolve.
- A nested project needs its own `pnpm-workspace.yaml` to stop pnpm walking up to the root's.
- Cloudflare Pages build image v3: default pnpm 10.11.1, `PNPM_VERSION` to override; `packageManager` self-selection handles it. Node via `NODE_VERSION` or `.node-version`; precedence undocumented, so remove the env var.
- pnpm 11's lockfile is still `lockfileVersion: '9.0'`.
- `pnpm install` over an existing npm `node_modules` leaves npm's hoisted transitive packages behind, so undeclared imports keep working until a clean install. Delete `node_modules` first, then scan for bare imports not in `package.json`.

## Queued (decided 2026-09-08)

- Deps round: drop `tsx` (`node archiver/script.ts`; Node 26 strips types, `erasableSyntaxOnly` already on, no relative imports in script.ts); ncu 23.
- ESLint 10 round: vitest 5 (needs Vite ≥ 6.4, satisfied), eslint-plugin-import-x 4.17 (+ typescript-eslint ≥ 8.56, eslint-import-resolver-typescript; disable `import-x/order`, ignore `astro:*` in `no-unresolved`; `no-extraneous-dependencies` is the rule that would have caught the phantom imports).
- sqlite work: the vacuous vitest run in fresh checkouts (content store only written by dev/build).
- ESLint 10 round, added 2026-09-09: `eslint-plugin-jsx-a11y` did **not** leave with React. `eslint-plugin-astro`'s `jsx-a11y-strict` config uses it to lint `.astro` templates, so it stays until that round decides whether the unmaintained plugin is worth keeping for Astro files.
