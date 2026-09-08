# New-season sweep: round log

One entry per verified round. Newest first. Each entry says what changed, what
the baseline comparison showed, and what was decided.

## 2026-09-08 — Step 2: register the 2026-27 season

`seasons.json` gains id `2026`, 2026-10-20 to 2027-04-11 (NBA schedule released
2026-08-13). 43 days before opening night, inside the 90-day rule. Per the
lifecycle in MAINTENANCE.md the home page now shows the countdown; `/2025` is
still reachable directly. Episode fields and team seasons follow when the
surprise-teams episode airs and odds are posted, expected late September.

Also this round: the `tailwind-removal` branch deployed to a Pages preview and
was captured as `runs/2026-09-08-preview-tailwind`; every diff against prod is
data-driven (2025 archived) or the About embed, which captures now block.

## 2026-09-07 — Step 1: finish the Tailwind removal

**Starting point.** The uncommitted March working tree already had Tailwind's
packages and config removed and 27 files converted to scoped CSS with tokens.
Types, lint, format, and build were green. Visually it was not equivalent: every
page was taller and several components had drifted.

**Root causes found by the baseline diff, in order of impact:**

1. Tailwind's `text-*` utilities set `font-size` _and_ `line-height`; the
   migration only set `font-size`, so text fell back to the body's 1.5. Fixed by
   adding paired `--text-*--line-height` tokens and a `line-height` next to all 72
   font-size usages (block-aware script; the one block that already had a
   line-height was skipped).
2. The reset had been swapped for a Josh Comeau-style reset, but the markup
   assumed Tailwind's preflight: headings inherit size/weight, links inherit
   color, lists unstyled, padding zeroed, `border: 0 solid`. Replaced with a
   preflight-derived reset. Also dropped the new reset's own opinions that the
   original never had (`text-wrap: balance` on all headings, `text-wrap: pretty`
   on paragraphs, `-webkit-font-smoothing`).
3. `md:container` includes a 1536px cap (`2xl`); the migration stopped at 1280px.
   Added the breakpoint, and a 1920px viewport to the baseline to catch this class
   of thing.
4. Standings legend cell: `space-y-2` on a `<td>` had become `display: flex` on
   the cell, which breaks the table row. Now `> * + * { margin-top }`.
5. Stats table: `md:w-1/3` on the over/under column had lost its media query.
6. 404 title: `!leading-snug` (1.375) had become 1.25.
7. Chart tooltip logos: `drop-shadow-lg` used Tailwind v3's value; corrected to
   v4.1's.
8. `<Typography class="content-narrow">`: Astro forwards the parent's scope
   attribute through rest props, and Typography didn't spread them, so the
   parent-scoped class never matched. About page rendered full width.
9. Team stats table: the original styled `tbody th` inside the Table component
   via nested selectors that Tailwind's pipeline happened to flatten past Astro's
   scoping. Without Tailwind, the nested rules scope to the wrong file and Astro
   emits `:global()` inside a nested block literally (invalid CSS). Rewrote as
   top-level scoped selectors on our own `tr th` cells, with `:global(thead)`
   for the one element that lives in table.astro. Higher specificity than the
   Table's compact rule, so no source-order dependence.

**Deliberate deviation:** the About page's two `~ Heading ~` dividers were
inconsistent in the original ("Missing Seasons" left-packed, "Shortened Seasons"
centered). Both are centered now. Only visible at 1536px and wider.

**Result:** all 11 pages pixel-identical to the Tailwind build at 390, 768, 1440,
and 1920px. CSS shipped drops from ~38 KB to ~17 KB per page; inlined component
styles add ~8–12 KB of HTML per page; net payload down ~0.5% on content pages and
~27% on pages with no islands. See `plan/baseline/runs/2026-09-07-*`.

**Also in this round:** `plan/baseline/` capture + compare tooling; research
write-ups (`findings-astro-upgrade.md`, `findings-tooling.md`); README "Styling"
section; the two untracked local JSON configs sorted so the pre-commit hook
passes.

**Baseline tooling lessons:** third-party embeds (Apple Podcasts) paint on their
own schedule, so screenshots block cross-origin requests by default; Recharts
animates on mount and ignores reduced-motion, so captures settle 2s after
scrolling; a naive pixel diff flags everything below a vertical shift, so when
heights differ, compare the two screenshots rather than the diff.
