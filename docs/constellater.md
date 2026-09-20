# Constellater

An idea for a reusable Astro integration: author data in local SQLite, publish
reproducible static output and small runtime projections, and keep the database
out of deployed Workers.

**Status:** exploration / future project. No package has been extracted or
published. This document records the design discussion following the tracker’s
SQLite migration; it is not a commitment to a public API.

## The problem worth extracting

The tracker’s integration is not primarily a database query wrapper. It establishes
**data ownership and execution boundaries**:

1. An editable, local SQLite working database.
2. A deterministic, reviewed SQL dump as the build input.
3. An isolated database restored from that dump for each build.
4. Read-only archive access during Node prerender.
5. Small generated metadata projections available to Worker components.
6. Explicit dev invalidation after validated edits.
7. Runtime guards and artifact checks that prevent accidental database deployment.

Production does not need the authoring database or a database service. Changes
ship through an explicit dump/review/build workflow rather than becoming live
immediately.

For the current implementation, see [the visual architecture guide](data-system.html)
and [the maintenance guide](../data/README.md).

## Could this have been an Astro live collection?

**The database-reading portion could be exposed through a live loader, but that
would not replace most of this integration.**

A live collection is primarily a read API abstraction. Implement `loadCollection`
and `loadEntry`, return records and optional cache hints, and callers use
`getLiveCollection` and `getLiveEntry`. Loader types and optional collection schemas
provide typing and validation.

| Concern                           | Snapshot integration                  | Live collection                       |
| --------------------------------- | ------------------------------------- | ------------------------------------- |
| Production data                   | Reviewed build snapshot               | Request-time reads                    |
| Deployment needs database access  | No                                    | Yes, or access to its service         |
| Working DB versus canonical dump  | Explicitly managed                    | Application responsibility            |
| Editing, migrations, transactions | Maintenance tooling                   | Not supplied by collections           |
| Types and validation              | Plain records and explicit validators | Loader types and optional schemas     |
| Refresh and caching               | Explicit dev reload; immutable build  | Request-time behavior and cache hints |

Live collections return data without persisting it in Astro’s build-time content
store. They are intended for data that needs to be fresh when a page is requested.
They do not automatically provide write APIs, migration management, transaction
policies, or a reproducible publishing workflow.

### The runtime still determines which database driver works

A live loader does not make `node:sqlite` available in a Cloudflare Worker. A
Worker-side loader needs an appropriate backend, such as D1, a compatible remote
database client, or an HTTP service. A Node deployment with suitable filesystem
persistence could use local SQLite.

Collection API choice and database/runtime choice are separate decisions.
Constellater’s proposed niche deliberately avoids a production database dependency.

### What about static collections?

SQLite can also feed a **build-time collection loader**. That is the more natural
collection alternative for static, database-backed content.

The tracker chose plain records and an explicit snapshot boundary, not because
collections inherently prevent good performance. Its Node-only collection control
was essentially as fast as its SQLite implementation. The major dev speedup came
from moving prerendering out of workerd and into Node.

A build-time loader may be the right reusable package for users who want familiar
Astro content APIs, schemas, rendering helpers, and build-time ingestion. A separate
snapshot/projection integration is more interesting when strict deployment
boundaries and explicit data publication are central requirements.

## When live collections are a good fit

- Product inventory or frequently changing content-shaped records.
- CMS draft previews that should not require a rebuild.
- Reusable Astro loaders whose users benefit from familiar configuration,
  filtering, validation, and cache hints.

They are less compelling when an application primarily needs complex relational
queries, aggregates, mutations, and transactions. Direct database functions or an
ORM may be clearer. These approaches can coexist; choosing a collection API need
not dictate the application’s entire data architecture.

The tracker’s NBA live-data path could itself be wrapped in a live loader. It would
still need its NBA semantics, KV compatibility checks, stale fallback, and error
policy. A collection wrapper would not replace those responsibilities.

### Version and caching caveat

The Astro blog deep dive below describes the **experimental Astro 5.10 API**.
The current guide consulted during this discussion describes newer behavior,
including applying loader cache hints with `Astro.cache.set()` in Astro 7.

Cache hints are not a substitute for application-specific caching rules. Check the
current API and adapter capabilities before implementing a loader; do not copy the
older experimental configuration unchanged.

## Why virtual modules in the current implementation?

Generated JSON would work for the small metadata snapshot. Virtual modules provide
lifecycle convenience, not an intrinsic performance advantage:

- No generated source file to ignore, clean up, or accidentally treat as authoritative.
- Vite requests new module source after explicit invalidation.
- Build generation reads the isolated canonical snapshot, not the working DB.
- The archive facade can export functions with a private database path.

JSON would still need generation, refresh wiring, and the Node-only archive facade.
A reusable package should revisit this tradeoff rather than treating virtual
modules as a defining requirement.

## An open-source direction

**Start with a reference implementation, not a universal database adapter.**

The useful promise would be:

> Local relational authoring → reviewed snapshot → static output and deliberately
> small runtime projections, with enforceable deployment boundaries.

Before extracting a package:

1. Try the approach in a second, unrelated application to find genuinely reusable
   behavior rather than parameterizing every tracker-specific decision.
2. Remove NBA-specific schema, validation, archival rules, names, and artifact
   assumptions. Generic transport and lifecycle code should not own domain rules.
3. Make database/dump paths and runtime projections configurable. Define who owns
   generated types and how callers obtain typed records or query functions.
4. Define snapshot consistency, cleanup on failure, non-overwriting restore,
   transaction, notification, and concurrent-editor contracts.
5. Decide whether maintenance commands belong in the package, a companion tool,
   or the consuming application.
6. Establish an Astro/Vite/adapter support matrix, including clean builds, dev
   refresh, deferred-component failures, shutdown, and artifact checks.
7. Document guard limitations honestly: architectural enforcement is not a sandbox
   against malicious or deliberately disguised imports.

Do not automatically move Cloudflare adapter construction into the package.
Explicit adapter configuration can keep data ownership separate from deployment
policy. Likewise, do not promise that application-specific artifact scanning is a
universal proof of safe bundles.

For general request-time database content, a **live loader is usually the smaller,
more familiar reusable package**. Constellater would solve a different problem:
reproducible local-data publishing without a deployed database.

## References

- [Astro content collections: live collections](https://docs.astro.build/en/guides/content-collections/#live-content-collections)
- [Live Content Collections: A Deep Dive](https://astro.build/blog/live-content-collections-deep-dive/) — historical experimental API discussion
- [Current implementation](../data/integration.ts)
- [Runtime boundary](../data/runtime-boundary.ts)
- [Tracker system theory](../THEORY.md)
