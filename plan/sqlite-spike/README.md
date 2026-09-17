# SQLite spike — historical record

The prototype was proven on `chart-parity` at `bc89206`. Its implementation and
frozen evidence remain available in that Git revision and the baseline/review
records. This branch replaces the prototype and Astro collections with the real
application store; keeping two executable databases here would create ambiguous
ownership.

Use [data/README.md](../../data/README.md), [the architecture guide](../../docs/data-system.html),
and the current `tests/` suites. Old `prepare.mjs`/pilot commands in historical
performance notes describe their recorded experiments, not today's workflow.
