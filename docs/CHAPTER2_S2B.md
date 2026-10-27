# Chapter 2 S2b — Canyon Pass rendering

Result: **approved after review**, on `chapter2/s2b-canyon-rendering` from `1b35ef6`. Simulation, geometry, campaign data, save data and golden fixtures are unchanged.

## What changed

- **Art registry** (`src/world/battlefieldArt.ts`, D7). Pure data, keyed by every registered battlefield id; a battlefield without art fails the typecheck, and an unknown id throws instead of falling back to Meadow's river.
  - Meadow: each prop uses its own texture, untinted, with the Chapter 1 shadow; the Chapter 1 minimap colours.
  - Canyon Pass: sand ground and road from the existing `path` texture. Props are baked once from the existing textures with dried foliage (`dryFoliagePixels`, the same canvas pattern as `tower-red`); rocks are also tinted warm. No new binary assets.
  - `visibleRect` clips open-ended barriers to the world for the painters.
- **Battle** draws terrain, scenery, static entities, grid outlines and building territory from `simulation.field`.
  - Meadow terrain (`createMeadowTerrain`) is the Chapter 1 drawing, unchanged.
  - Canyon terrain is painted from the field's own barrier rectangles, so every cliff edge is the collision edge, with all decoration inside the rectangle:
    - a barrier open to the top is a cliff whose face rises from its lower edge (the north lane's wall);
    - one open to the bottom shows a rim along its upper edge;
    - a free-standing barrier is the spire, a 60 px crag depth-sorted at its front edge. Units in the south lane draw over it; units in the north lane pass behind it.
  - Fixed: Meadow's two pre-placed walls are no longer drawn, or outlined, on Canyon, where they do not exist.
  - `renderedFieldId` records which field's art was drawn, for verification.
- **HUD minimap** draws the active field. Meadow keeps its river, bridge and lane band (`meadowMinimap`). Any other field draws its barriers at their exact rectangles; scenery and static entity dots come from the field.
- **Dev-only Canyon launch** (D5, `src/world/battlefieldLaunch.ts`). `battlefieldFromSearch(search, dev)` returns `canyon-pass` only when `dev` is true and `battlefield` is exactly one registered id; otherwise `meadow`.
  - Battle passes `import.meta.env.DEV` and reads it for quick play only; Meadow keeps passing the bare encounter id.
  - `MainMenu` direct-launches on `?battlefield=` in dev only.
  - Campaign levels, the staged fixture and Full Battle never read it.

## Verification

`npm run verify:canyon` (`scripts/verify-canyon-pass.mjs`) needs a dev server (`CANYON_URL`). Two optional servers add sections:
- `BASELINE_URL`: a dev server of the pre-S2b build, for the Meadow before/after comparison.
- `PRODUCTION_URL`: `vite preview` of a production build, for the override checks.

Stills are deterministic: the Battle and HUD scenes are paused, the simulation is stepped by hand to tick 600, sprites, minimap and camera are synced, then the frame is captured. Two S2b captures of the same still are compared first, to prove the environment is stable.

| Section | Result |
|---|---|
| Meadow before/after vs `1b35ef6` (spawn, bridge, minimap, mobile spawn) | 0 differing pixels in each |
| Screenshot determinism (S2b vs S2b) | 0 differing pixels |
| Canyon art: no water, bridge or ghost walls; 24/24 props in Canyon art; minimap rock and open lanes | pass |
| Restart rebuilds Canyon art | pass |
| Full Battle and campaign Level 1 on Meadow, even with the dev query | pass |
| Production build: query ignored, Meadow drawn, no warning, no direct launch | pass |
| Live play, 10 s: sprites at `worldToView` of simulation positions, no unit inside a barrier | pass |
| Body-blocking scenarios (below) | pass |
| Joystick against both cliffs and the spire | pass |

### Body-blocking and minion movement (Canyon, 7,200 ticks, Guardian held at full HP)

The hold starts once no unit stands on the hold point; `teleportHero` checks static geometry only, and `blue-1` opens 20 px from the east mouth. Each scenario captures 12 frames, every 15 ticks, from the first Crimson minion passing x 1180.

| Guardian holds | Crimson crossings at x 960 (north / south) | Crimson exits past x 800 | Longest targetless stand | Overlaps | Inside a barrier |
|---|---|---|---|---|---|
| (400,300), out of the way | 7 / 2 | 9 | 2 ticks | 0 | 0 |
| North lane (960,528) | 14 / 0 | 0 | 1 tick | 0 | 0 |
| South lane (960,672) | 8 / 13 | 6 | 1 tick | 0 | 0 |
| West mouth (840,600) | 18 / 5 | 14 | 1 tick | 0 | 0 |
| East mouth (1060,600) | 10 / 1 | 9 | 1 tick | 0 | 0 |

With the north lane held, minions slip past the Guardian through the gaps at the lane's edges, then stop to fight it (aggro), so none exit; S2a recorded the same 0. See "North-lane hold: gameplay observation" below. With the south lane held, the wave still leaves through the north lane, and the exits match S2a's 6.

Joystick: dragged from the HUD joystick's centre, the Guardian stops at the north cliff, the south cliff and the spire, short of each inflated edge by 0.3–3 px. A move that would cross an edge is rejected whole; the check allows up to 8 px. It then slides along each edge, and its footprint never enters a barrier.

### North-lane hold: gameplay observation (for S4 playtesting)

Review check, read-only. `src/simulation`, `src/data` and the goldens diff to `1b35ef6` is empty, so S2a and S2b behave identically; S2a recorded the same 0 exits.

Guardian held at full HP at (960,528) for 7,200 ticks:

- 14 Crimson minions entered the north lane; 0 reached the south lane or left the pass.
- All 10 living Crimson minions at the end were in the pass, each targeting the Guardian at 32–48 px (attack range 48). 26,436 of 32,200 minion-ticks in the pass were spent targeting it; 4,038 were spent moving.
- Nothing was stuck: the longest stretch of one minion standing still without a target was 1 tick (19 such minion-ticks in total).
- Routes are valid: planned fresh, routes exist through the north lane (y 504) and the south lane (y 648–696), and a straight segment from the east mouth to the west mouth is clear on both lanes. The planner ignores units, so the Guardian's body never changes a route.
- Cause: Gameplay v0.3 aggro. A Crimson minion within attack reach keeps fighting a Guardian even while the pursuit leash is being ignored. The test Guardian is reset to full HP every tick and never dies, so the fight never ends. With the Guardian out of the way, 9 Crimson minions leave (8 north, 2 south in that run).
- Verdict: expected aggro, not a navigation or geometry defect. A real Guardian can die, retreat or kill the minions. For S4 playtests, watch whether a sustained north-lane block feels too strong; no change is made here.

### Frame times (headless Chrome, SwiftShader, report only)

Frame times are 20 s of the same play from tick 1750 (`requestAnimationFrame` deltas), measured in four complete runs.

| Run | Meadow mean / p95 | Canyon mean / p95 | p95 ratio |
|---|---|---|---|
| 1 | 48.2 / 50.1 ms | 44.4 / 66.6 ms | 1.33 (flagged) |
| 2 | 49.0 / 66.7 ms | 40.2 / 50.1 ms | 0.75 |
| 3 | 49.3 / 66.7 ms | 41.7 / 50.1 ms | 0.75 |
| 4 (final) | 46.7 / 50.1 ms | 38.7 / 50.1 ms | 1.00 |

Software rendering quantises frames to whole display intervals, so the p95 flips between 50 and 66.7 ms from run to run. Canyon's mean is lower than Meadow's in every run. This needs measuring on a real GPU and device; no simulation change was made.

## Tests and gates

- `npm test`: 737/737. That is S2a's 727, plus 6 art tests, 3 launch tests and the scenes rule in the threading scan.
- Typecheck and `npm run build` pass.
- Golden fixtures are byte-identical to `1b35ef6`: `48aebb2a`, `3660a82a`, `588b885d`, `3a0dd31a` (SHA-256 prefixes). So are `src/simulation`, `src/data`, `world/battlefield.ts` and `world/layout.ts`.
- Scenes scan: 8 injected violations, all caught.
  - layout `scenery` and `blocked` imports;
  - a spread `...entities` in `drawGrid`;
  - `terrain` in the Canyon painter;
  - bare `scenery` and `entities` in the minimap;
  - a `meadow` import;
  - a namespace layout import.

### Existing browser checks (dev server, run on S2b and on `1b35ef6`)

| Script | S2b | `1b35ef6` |
|---|---|---|
| `verify-guardian-collision` | pass | pass |
| `verify-campaign-ui` | pass | pass |
| `verify-navigation` | fails: timeout at line 70 | the same failure |
| `verify-mobile-hud` | fails: "survival hierarchy, permanent objective and unobstructed feedback" | the same failure |
| `verify-context-guidance` | fails: "allocation advice after spacing" | the same failure |
| `verify-match` | flaky: timeout at the Build UI confirm step (23:587) | flaky at the same step (passed in one of three runs) |

The first three fail with identical assertions on both builds:
- `verify-navigation`: timeout at line 70, waiting for a `built-seal-` damage event;
- `verify-mobile-hud`: "960x540 unequal safe areas: survival hierarchy, permanent objective and unobstructed feedback";
- `verify-context-guidance`: "Moving with unspent initial point triggers explicit allocation advice after spacing".

`verify-match` is flaky at the same step on both builds. A diagnostic that replays the script up to that step failed 1 of 6 runs on `1b35ef6` and 1 of 6 on S2b. In every run, failures included, the wall placement at column 12 is valid (`placementReason` empty, HUD "Valid placement · confirm"), and the simulation is at tick 1–7. In the failing runs the confirm button has not yet become input-enabled when the script clicks 80 ms after the placement tap, so the click is lost and no structure appears. It is a startup timing race in the script under software rendering, not a placement fault and not a Canyon effect. Its code path was also checked directly:
- the Meadow building-mode grid is pixel-identical across the two builds;
- the same placement resolves to the same valid cell on both.

These scripts need attention outside S2b.

## Open items for review

- Canyon art is procedural and uses recoloured existing textures, with no new painted assets. Cliffs, spire and dry props are placeholders for real desert art.
- The spire is a 60 px crag, so a Guardian in the middle of the north lane stays visible. Units pressed against the spire's north face lose their feet behind it, by depth.
- Minimap: Canyon's spire is about 6 × 3 px, and the hero dot and viewport outline can cover it.
- Frame times need a real-device measurement (see above).
