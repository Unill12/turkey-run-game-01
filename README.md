# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Unill12/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Unill12/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Turkey Run — a turkey escapes the farmer, the oven and the carving knife. A complete 2D canvas escape game: title screen, three stages (farmyard, barn, kitchen), a farmer who patrols, chases, searches and throws knives, corn to collect, haystacks to hide behind, a forest gate to reach, HUD with score / corn / lives / time / dash, and caught-or-escaped end screens with restart. Sound is synthesised with WebAudio — no audio files, no network requests.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Move with WASD or the arrow keys, dash with Space or a mouse click, M mutes, R restarts from an end screen.

## How it plays

- Grab the corn to unlock the forest gate, then reach the gate to escape to the next stage.
- The farmer patrols until he sees you — then he chases, and throws carving knives.
- Haystacks block his sight: hide behind one and he searches where he last saw you.
- Level 3 adds a lit oven. Three lives, three stages, one Thanksgiving to dodge.

## Layout

- `game/index.html` — the page; `game/src/` — one file per job: `config.js` (tuning and stages), `random.js` (seeded RNG), `input.js` (keyboard and mouse), `audio.js` (synth sound), `world.js` (levels, collision, sight), `turkey.js` (the player), `farmer.js` (the hunter AI), `particles.js` (feedback bursts), `render.js` (all drawing, HUD and screens), `shots.js` (deterministic screenshot scenes), `main.js` (state and the loop).
- `screenshots/` — renders of the game itself (title, play, end), the first the cover.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nil-gaming&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
