# NBA Surprise Teams Tracker

Tracks NBA teams that outperform their preseason betting expectations, with live
season standings and historical results. In a standard 82-game season, teams with
a preseason win total below 36 qualify by winning at least 10 games above their
line, rounded up.

**Live site:** [nbastt.grepco.net](https://nbastt.grepco.net)

## Develop locally

Install [mise](https://mise.jdx.dev/getting-started.html), then clone this repo and
run these commands from its root after reviewing `mise.toml`:

```sh
mise trust
mise install --locked
mise run setup
mise run data:restore
mise x -- pnpm start
```

Open [localhost:4321](http://localhost:4321). The dev server includes a type-check
watcher. Run `data:restore` only once per checkout; it refuses to overwrite an
existing database.

mise manages the pinned toolchain; `setup` installs dependencies, generates Worker
types, and installs Git hooks. Use pnpm, not npm, for this project.

For commands, tooling, styling, and deployment details, see the
[development reference](docs/development.md). See the
[data workflow](data/README.md) for editing season data and
[system theory](docs/THEORY.md) for an architectural overview.
