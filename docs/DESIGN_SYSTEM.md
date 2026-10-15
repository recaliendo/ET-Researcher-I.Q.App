# Design system

**Positioning:** a research terminal with the editorial clarity of a scientific publication. No UFO imagery, no conspiracy styling, no decorative motion, no credibility scores.

## Tokens

All tokens live on `:root` in [src/app/globals.css](../src/app/globals.css) and are redefined for dark mode (`[data-theme="dark"]` and `prefers-color-scheme`).

| Group | Tokens |
|---|---|
| Type | `--font-serif` (display, headings, key numbers), `--font-sans` (UI, body), `--font-mono` (IDs, hashes). Scale `--text-xs` … `--text-3xl` |
| Surface | `--bg`, `--surface`, `--surface-2`, `--line`, `--line-strong` |
| Ink | `--ink`, `--ink-2`, `--muted` |
| Accent | `--accent`, `--accent-soft`, `--accent-ink` |
| Status | `--green` established/passed · `--amber` blocked/illustrative/unverified · `--red` gap/retracted · `--blue` educational/informational, each with a `-soft` background |
| Charts | `--chart-1` observation/instrument lane and primary series · `--chart-2` recovery/custody lane and secondary series · `--chart-track` |
| Space & shape | `--space-1` … `--space-7` (4–48 px), `--radius`, `--radius-sm`, `--shadow` |

## Evidence-status language

| Badge | Use |
|---|---|
| Research result · v0.8 (green) | Calculations and records from the imported corpus |
| Educational demonstration (blue) | Simulations that use no research data |
| Illustrative scenario · not evidence (amber) | Adjustable assumptions, e.g. proof-chain rates |
| BLOCKED / NOT ESTABLISHED (amber) | Conclusions the evidence cannot yet support |
| Analyst review pending (amber) | Automated proposals awaiting human review |
| Red dashed node | Missing proof-chain link |

## Components

`SectionHeader`, `Panel`, `Note` (info / warning / success), `Badge`, `SourceLink` (external, `rel=noopener noreferrer`), `RecordList` (accessible disclosure list of any record), `Fields`, `Empty`, finding cards, feed cards, task cards, sliders, segmented controls and tabs.

## States

Loading skeleton with status text; empty states explain *why* (private, not imported, filters); errors keep evidence status unchanged and offer retry; source unavailability is shown per provider with last error and next attempt.

## Accessibility

Skip link, landmark navigation with `aria-current`, visible focus rings, keyboard-operable controls (native buttons, selects, ranges), `aria-pressed` toggles, `role=tablist`, dialog with Escape to close, text alternatives for every chart, an accessible list beside the provenance graph, reduced-motion support, and colour never used as the only signal.

## Layout

Sidebar + content at ≥ 960 px; off-canvas navigation below. Single-column cards at ≤ 620 px with 16 px gutters. Tables scroll inside their container; the page never scrolls horizontally.
