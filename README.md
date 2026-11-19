# Sunset Platinum — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/oxdfahmad/gta6-trophy-guide-01/rank.svg)](https://make.fun/c/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/oxdfahmad/gta6-trophy-guide-01/reward.svg)](https://make.fun/c/gta6-trophy-guide-01/leaderboard)

An offline web app that guides and tracks all 55 PlayStation 5 trophies of Grand Theft Auto VI: the official list with a saved checklist, filters, a spoiler setting, a six-phase roadmap to the platinum, the missable trophy flagged, and a guide for every trophy in our own words, with its sources.

## What it is

- **The official list, whole.** All 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden — each with its official name, description and grade exactly as PlayStation publishes them, in `app/data/trophies.json`.
- **A tracker that saves.** Tick a trophy off and it stays ticked (localStorage). Export your progress to JSON and import it back on any device.
- **Filters that actually help.** Search by name or description; filter by kind (story, side missions, activities, races, collectibles, stunts, robberies, exploration, combat, money, 100% completion, odd moments), by grade, by status (earned / not yet / missable only); sort by official order, grade, name or kind.
- **A spoiler setting that works.** Story trophies stay hidden — name, description and guide — until you earn them. It is on by default and can be switched off any time.
- **A roadmap to the platinum.** Six phases, in order: the story, the stranger strands, activities and races, robberies and money, collectibles and exploration, then the odd moments and the 100% cleanup. Around 200 hours, by the usual launch-era estimates.
- **Missables, flagged honestly.** Only one trophy is reported as possibly missable — Positive Mental Attitude (meditate at every spot; Lucia's Chapter 1 balcony spot is reported to vanish after that chapter). The guide says plainly where a hidden trophy's exact trigger is still unconfirmed at launch instead of guessing.
- **Offline, always.** Static files under `app/`, no build step, no network request at run time. Open `app/index.html` in desktop Chrome with the network off and everything works.

## The look

Our own Vice City sunset look: deep dusk purple, a pink-to-orange sunset gradient, gold and teal accents. No Rockstar logo, no official artwork, no game screenshot, no official font.

## How the guide is organised

- **Checklist** — all 55 trophies with their official name, description and grade, a tick box each, and a detail pane that shows the full guide and its sources for the trophy you pick.
- **Roadmap** — six phases in order, each with its trophy count and how many of them you have earned.
- **Missables & Risks** — the one possibly missable trophy, why it is risky, and the three save habits that protect a playthrough (manual save per chapter, meditate on sight, no cheats before the credits).
- **Sources** — where every fact comes from, so a reader can check the official list and the cross-checks for themselves.

Progress lives only in your browser. Nothing is uploaded, nothing is tracked, and the app makes no network request at all — it even works with the network off.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) first validates `app/data/trophies.json` — exactly 55 trophies, the 1/2/6/46 grade split, every trophy with a name, description and a real guide — then copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-frontend.ts` library.

## Sources

Every trophy name, description and grade is the official PlayStation 5 list as published on PlayStation Network, taken 18 November 2026 from Exophase and cross-checked with PSNProfiles and TrueAchievements (see the Sources tab in the app, and the per-trophy source lists in `app/data/trophies.json`). The guides are written in our own words and cite their sources per trophy; they never copy another guide's text.

## License

MIT — see [LICENSE](LICENSE).
