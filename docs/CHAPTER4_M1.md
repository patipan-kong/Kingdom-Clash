# Chapter 4 · Mission 1 — Forest Edge (campaign-31)

Status: implemented, **uncommitted** in worktree `G:/work/ark/arkhero-chapter4-m1` (branch `chapter4/m1-forest-edge`, off `main` @ baa8f57). Not pushed, not deployed. Awaiting human playtest; no balance change until then.

## The loop: Capture → Repair → Defend → Advance

| Step | What the player does | What the engine does |
|---|---|---|
| Capture | Destroys the camp's two watchtowers, then stands within 96 px of the flag (the ring) | A 1 × 1 Azure Banner (a `wall` with `banner: true`, 2,000 HP) starts at once and finishes 4 s later. Crimson units treat it as a target while it rises and afterwards. |
| Repair | Opens Build, selects Tower, taps the ruin (cell 24,11), confirms | A tower on that cell is charged 60% (48 Wood, 6 Iron) and takes 150 ticks (5 s). It is never instant. |
| Defend | Holds the Banner against waves, the first-capture Elites and the Hero | Lose the Banner → the camp is Crimson again: building there stops, the Keep is shielded again. Structures already built **stay Azure**. |
| Advance | Takes the Crimson Keep | The Keep is unshielded only while the camp is Azure. The first mission phase (Capture) is latched; the second (Destroy the Keep) wins. |

## Approved values (all provisional)

Banner 2,000 HP / 4 s · 4 Elites on the **first** capture only (never again) · Hero 833 HP, Warden within 260 px of his anchor while Crimson holds the camp, Raider once it is Azure (Banner first, then Azure towers in the camp, then the Azure Keep), 30 s respawn at (1752,600) · repair 60% / 5 s · waves `[6,6,6,6,7,7,8,8]` every 25 s from 10 s · flanks on waves 3 and 6 via the south trail · start 100 Wood, 10 Iron · Keep shielded whenever Crimson controls the camp.

## What changed

Data (everything Chapter 4 adds is opt-in through `MatchSetup.post`; no earlier level has one)
- `src/data/matchSetup.ts` — `MatchPost` (flag, ring, circle, holders, ruin, Banner HP and raise time, repair, counterattack, Hero) with validation.
- `src/data/mission.ts` — new `capture` objective (a latched condition; needs a post).
- `src/data/campaignLevels.ts` — `forestEdgeLevel` (campaign-31, two phases: capture, assault).
- `src/data/campaignChapters.ts` — Chapter 4 "The Conquered Lands", **`coming-soon`**. See risks.
- `src/world/battlefield.ts` — `forest-edge` (forest barriers with `look: 'forest'`, camp circle as the one outpost, two camp towers, south flank waypoint).
- `src/world/battlefieldArt.ts`, `src/world/bannerAppearance.ts` — forest art entry and the Banner texture.

Simulation
- `Simulation.ts` — `initPost`, `updatePost` (raise, capture, loss, failed raise, shield, counterattack), `inTerritory` (the camp circle is Azure ground only while the post is Azure), repair placement (`repairSite`, `placementQuote`), `heroRule` (M6's Hero or the post's).
- `Movement.ts` — Crimson minions target a Banner; the Crimson Hero follows the Warden/Raider rules when `state.post` exists. Without a post the Chapter 3 behaviour is byte-for-byte the old branch.
- `ConstructionCosts.ts`, `Economy.ts`, `Building.ts` — an optional cost factor composed with the Crown's before the single rounding. Mission.ts reads the capture.
- `GameState.ts` — optional `state.post`, `Unit.banner`, `post` events.

UI
- `Battle.ts` — forest painter; camp ring (dashed red while Crimson, solid blue while Azure) with a label; capture-point ring and prompt ("destroy the camp towers first" → "stand in the ring" → "raising the banner · Ns"); the ruin with a "REPAIR TOWER · 48W 6I · 5s" tag; build grid shows the ruin cell in gold once repairable; the Hero is named "Crimson Hero".
- `BuildPanel.ts` — a tower on the ruin reads "Repair Tower · 48 W · 6 I" and "Repair the ruined tower · confirm".
- `HUD.ts` — toasts (raising / captured / lost / failed / repairing), minimap ring for the camp coloured by owner. The objective plate already shows "Capture the Forest Camp · 0/1" then "Destroy the Crimson Keep · 0/1".

Tests and tooling
- `tests/campaign-level-31.cjs` (25 tests), `tests/support/forestBot.cjs` (production-bound regression bot), `scripts/verify-forest-edge.mjs` (browser walk-through, 26 checks).
- Existing tests that asserted exact chapter / level / battlefield lists were updated for Chapter 4 and campaign-31 (`battlefield-art`, `chapter-view`, `debug-launch`, `frost-gate`, `six-missions`).

## Bot regression (not human results)

Five bot variants (recall 360/480 × home towers 1/2, plus 420/1), win time in seconds. Scratch-probe medians in brackets.

| Plan | Wins | Times | Lost Banner | Azure Keep min HP |
|---|---|---|---|---|
| conquer (repair + 2 forward) | 5/5 | 244–315 (274) | 1–3 | 3000 |
| repair only | 5/5 | 249–335 (276) | 1–3 | 3000 |
| forward only | 5/5 | 240–312 (274) | 1–3 | 3000 |
| no building | 5/5 | 322–353 (348) | 2–4 | 3000 |
| rush | 5/5 | 216–323 (285, 4/5) | 0–3 | 3000 |
| turtle (4 forward) | 5/5 | 278–543 (473) | 1–5 | 3000 |

Same ordering as the probe: building one thing is worth about 75 s, more is not, turtling is slowest. The Azure Keep was never touched in any bot run; a human who leaves home will be punished harder than the bot is (the bot recalls at 360–480 px).

## Known risks (for the playtest)

1. **A Guardian standing in the ring raises a new Banner the moment the old one dies**, so recapture costs 4 s and no walking. The pressure to lose the camp therefore comes from killing the Guardian, not the Banner. Matches the probe's bot but unproven for humans.
2. **Chapter 4 shows as a fourth "Coming soon" card** on the chapter list (it scrolls into view). Needed because chapter validation refuses a registered level without a chapter slot. Continue never targets it (the sequence stops at the first unreleased chapter; tested). To hide the card, register campaign-31 differently or drop the card; nothing else depends on it.
3. **Repair uses the ordinary Build panel** (Tower → tap the ruin → Confirm), not a dedicated button. Fewer moving parts, but a first-time player may not find it. The ruin is tagged in the world and the toast says "repair the tower".
4. **The Warden also attacks Azure structures within 260 px of his anchor**, including the repaired tower and forward towers. Intended, but it makes the camp's own towers his first targets.
5. The camp circle has 26 cells; 13 are open at tick 0 (units, trees and the two holders take the rest) and up to 20 once the holders are gone. The approved "14-cell" figure is this same circle.
6. The Banner is a solid 1 × 1 block on the north edge of the road. Units path around it (the bots do); a unit parked on the flag cell delays a capture until it moves.
7. Only the M1 window exists at runtime; the shared Chapter 4 map (provisionally 3840 × 2304 with 1920 × 1152 mission windows) is design only, as instructed.
8. Not measured: frame time on a real phone (the forest is about 150 tree sprites, no per-frame cost beyond the camp overlay).

## Local testing

```
cd G:\work\ark\arkhero-chapter4-m1
npm run dev -- --port 5271          # node_modules is a junction to the main worktree's
```
Open `http://127.0.0.1:5271/?debug=1&level=31` (or `?debug=1&chapter=4&mission=1`). The debug launch skips the unlock check and records nothing. Dev server only.

Suggested manual path: kill the two towers at the east edge of the camp (the Hero will fight you at the camp; his anchor is the middle of the road) → step into the glowing ring → survive 4 s → open Build, pick Tower, tap the ruin → hold the camp while the four Elites arrive → take the Crimson Keep. Then try losing the Banner on purpose and check the camp, the shield and the build rules flip back, and that nothing you built changes sides.

Checks:
```
node scripts/test.mjs campaign-level-31.cjs      # the M1 tests, ~30 s
node scripts/test.mjs                            # full unit suite
npm run build
FOREST_URL=http://127.0.0.1:5271/ node scripts/verify-forest-edge.mjs   # needs the dev server; stills in docs/screenshots/forest-edge
node tests/support/forestBot.cjs '{"plan":"turtle","forward":4}'          # one bot run; prints a summary
```

## Playtest 1 follow-up (two human attempts, both over 7 minutes, no victory): Barracks, balance, performance

Still uncommitted, not pushed, not deployed. Only the Barracks changed gameplay; the Banner, repair, Elite counterattack, Hero (833 HP, 30 s respawn) and waves are as approved.

**Barracks.** `forestEdgeLevel` now carries `azure:{pads:azurePads,initial:[],limit:1}`: Mission 3's three pads around the Azure Keep, none standing at the start, one at a time. It is the Chapter 3 system untouched (120 Wood, 20 Iron, 5 s build, two soldiers 3 s and 4 s after completion, each replaced free 15 s after it dies, soldiers follow the Guardian). No Elite Barracks. The Build panel shows its third card because the match has pads. A saving player can afford it at about 40 s (start is 100 Wood, 10 Iron). Tests: three new in `tests/campaign-level-31.cjs`; browser: `scripts/verify-forest-edge.mjs` builds one through the real panel.

**Bot comparison** (5 variants each, win time in seconds; the bot is not a human, and it never lost the Azure Keep in any run):

| Plan | Win times | Median | Guardian deaths |
|---|---|---|---|
| conquer, no Barracks | 244 249 252 270 315 | 252 | 4-5 |
| conquer, Barracks late (only when the bot had spare Wood) | same, 1 of 5 built it | 252 | 4-5 |
| conquer, Barracks first | 244 267 291 307 319 | 291 | 4-6 |
| turtle, no Barracks | 278 341 349 492 543 | 349 | 4-7 |
| turtle, Barracks first | 382 383 475 502 521 | 475 | 5-6 |
| no towers at all, no Barracks | all five DEFEAT at 156-173 s | | |
| no towers at all, Barracks | 5/5 wins, 293-312 s | 307 | 5 |

The Barracks is not free for a player who also wants towers: 120 Wood first delays the first tower by about 40 s, so a tower-first bot gets slower; for a player who builds nothing else it is the difference between losing and winning. The bots lose the Guardian 4 to 7 times in every plan and the Crimson Hero dies 5 to 12 times, so the Hero respawn loop is the pressure, not the Keep.

**Hero respawn 30 s -> 45 s (evaluated, NOT applied).** Barracks first: conquer 291 -> 228 s median, Guardian deaths 4-6 -> 4; turtle 475 -> 338 s, Guardian deaths 5-6 -> 4; all 5/5 wins. Without a Barracks, 45 s alone is mixed (one variant dropped the Azure Keep to 2,352). It is the first lever to pull if the next playtest still feels too hard: change `respawnTicks:900` to `1350` in `forestEdgeLevel` and nothing else.

**Performance** (software-rendered headless Chrome, so read ratios, not absolute FPS):
- The simulation is not the long-run bottleneck: 0.3 to 0.6 ms per tick (worst 12 ms once at start) with the bot over a 9-minute match; unit count never exceeded 16 in any bot run (Crimson minion cap is 24, Azure 16).
- Nothing grows with time: an 8-minute real-time soak (`scripts/soak-forest-edge.mjs`) held Battle display objects at 178-184, tweens 0, textures 248-254, JS heap flat, FPS flat.
- Cost grows with the crowd: a CPU profile (`scripts/profile-forest-edge.mjs`) with 49 live units spent about a third of its busy main-thread time in `Geometry.blocked`/`clearSegment`/`lineOfSight` (steering and line-of-sight tests), tripling the per-frame JS time (10 -> 30 ms) from 18 to 49 units. The waves never stop (`until-objectives`), so a player who cannot clear them saturates the caps at about 24 Crimson + 16 Azure + Hero + Guardian; that is the likeliest source of "lag worsens as the battle continues". This is pre-existing code shared with Chapters 1-3 and was not changed.
- Static render cost: Forest Edge draws about 138 tree images; it is 19 FPS in this environment against 25-27 for Chapters 3 M1/M5, but its JS time per frame (8 ms) is no higher than Twin Walls (9.4 ms): the gap is raster cost, not script. Large static Graphics replays (11k to 31k commands per frame) are the same on every level.
- I could not reproduce growth over time on a real device. The overlay (below) shows the live unit count next to FPS in the next playtest, which will confirm or refute the crowd explanation.

**Performance overlay.** With `?debug=1` the HUD shows `NN FPS · X.X ms (max N) · N units` at the top right, above the minimap, updated once a second: green at 55 FPS or more, yellow at 40 to 54, red below 40. It is not interactive and has no effect on input. Without `debug=1` it does not exist.

**Not done on purpose:** no optimization of collision or rendering, no balance change besides the Barracks, no Elite Barracks.

## Tree-rendering experiment (rejected)

Baking each row of forest trees into a RenderTexture (`?forest=grouped`) measured +13-18% FPS in software-rendered headless Chrome (draw calls unchanged), but a human A/B on the development machine showed 33 FPS for both and the same stuttering. NO-GO; the prototype was reverted. The software-rendering gain did not transfer to a real GPU.

### Real-browser trace (headed Chrome, Intel UHD 730 via D3D11)

`scripts/trace-forest-edge.mjs` (headed Chrome, real GPU, CDP trace). Findings: a blank `about:blank` page's requestAnimationFrame runs at 32.3 Hz in this Chrome (the machine's active display adapter is "Microsoft Remote Display Adapter" at 32 Hz), and the game's frames are locked to 31.2 ms (p95 31.7, worst 32, 0 frames over 50 ms) with 7, 15, 27 and 42 live units. Main thread busy 35-41% of the frame (about 11-13 ms scripting), GPU process 14-17%, minor GC about 6 ms per 10 s. The 33 FPS is the display cadence, not game cost.
