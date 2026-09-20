# Dependency security checks

## Policy

Run `mise x -- pnpm run audit` for a fresh check of the locked dependency graph.
The command is plain `pnpm audit`: production, development and optional
packages are included, with no advisory suppressions or severity overrides.
Findings and registry errors fail the gate; outages are not treated as a clean
report. This introduces an intentional network requirement into installation,
verification, and pre-commit. Retry after an outage rather than interpreting it
as an application failure or disabling the gate.

The check runs:

1. Through `postinstall` after installation (including frozen installs). pnpm can
   skip lifecycle hooks when an install is a no-op; `mise run setup` therefore
   explicitly audits afterward too. Use `pnpm run audit` for a fresh standalone
   check rather than assuming every `pnpm install` invocation reruns it.
2. At the start of `pnpm run verify`; `pnpm run build` invokes verification before
   Astro builds, and CI invokes that build before either deployment command.
3. In hk's shared checks, including every pre-commit, regardless of which files
   changed. New advisories can appear without a lockfile change.

CI still has the existing deployment interlock; this work does not enable it.
Installation and deployment each audit intentionally. A successful install is not
an indefinitely reusable security approval.

## What this does and does not protect

`pnpm audit` consults known vulnerability advisories. It is **not a malware scanner**,
does not prove packages are trustworthy, and cannot detect every newly malicious
release. The postinstall hook checks after installation; it does not quarantine
packages before download or before dependency lifecycle scripts could run.
`--ignore-scripts` bypasses that hook, not the independent verification and
pre-commit checks. A failed postinstall does not roll back already-installed files.

Existing supply-chain protections remain in `pnpm-workspace.yaml`:

- A **three-day package release cooldown** (`minimumReleaseAge: 4320`). This gives
  the ecosystem time to discover problems; it does not guarantee safety or mean
  that older packages are free of known vulnerabilities.
- Publishing-trust downgrade checks and restrictions on exotic transitive sources.
- Explicit dependency build-script permissions.
- Frozen lockfile installs in CI.

Mise separately applies a **seven-day tool release cooldown**. These are distinct
policies, not conflicting settings.

## Initial remediation

The first audit found three distinct advisories across five package entries:

| Advisory                                                                                                                 | Remediation                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [GHSA-6465-jgvq-jhgp](https://github.com/advisories/GHSA-6465-jgvq-jhgp), Sentry sensitive headers with `sendDefaultPii` | Pin `@sentry/astro` and `@sentry/cloudflare` to 10.27.0, the first patched version reported by the audit. |
| [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf), OpenTelemetry baggage allocation               | Override `@opentelemetry/instrumentation-http>@opentelemetry/core` to 2.8.0.                              |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), sharp/libheif vulnerabilities                  | Override `miniflare>sharp` to 0.35.4, matching the already-tested direct sharp version.                   |

The overrides are explicit dependency fixes, **not audit exceptions**. Remove each
when upstream no longer requires it. Astro, Vite, Wrangler and ECharts were not
upgraded as part of this remediation. Sentry's hosted reporting still needs the
existing deployment/telemetry smoke checks; local type/build success does not
prove delivery of hosted events.

An isolated trial of `pnpm audit --fix=update` also updated unrelated framework and
lint packages. That broad result was discarded. Do not run audit fix commands
blindly in the working checkout: inspect the entire manifest and lockfile diff.

## Handling a future failure

1. Read the advisory, dependency path, affected version and patched versions.
2. Assess the application/runtime exposure, but do not silently suppress findings.
3. Prefer targeted dependency updates. Use a scoped, documented override only when
   needed and verify compatibility.
4. Run the audit, full verification/build, and relevant runtime smoke tests.
5. Review manifest/lockfile changes before committing. Do not use `audit --fix` as
   a substitute for that review.

Tests exercise the pinned real auditor against a loopback registry fixture for
clean, low/moderate/high/critical findings and registry-error responses. They do
not depend on public advisory data; the actual validation gate intentionally does.
