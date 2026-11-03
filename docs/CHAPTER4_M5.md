# Chapter 4 Mission 5 "Canyon Basin" (campaign-35): design and implementation notes

Status: implemented, **not committed**, awaiting PO review and the human playtest. Worktree `G:\work\ark\arkhero-chapter4-m5`, branch `chapter4/m5-canyon-basin`, created from main `d68af0b`. The M4 worktree was not touched.
Playtest: `npm run dev -- --port 5351` then `http://127.0.0.1:5351/?debug=1&level=35` (or `?debug=1&chapter=4&mission=5`). Chapter 4 is still "coming soon" in the menus; only the dev launch reaches it.
Every balance value is provisional until the human playtest.

## 1. Idea

M1 = take a camp. M2 = a camp behind a gate. M3 = a camp in a river, then choose a front. **M5 = two camps on two roads, both needed, while a Raider Hero hits what you hold.**

A mesa splits a canyon basin into a North Road and a South Road. Each road has a Crimson camp. The Crimson Keep is shielded while Crimson holds **either** camp. A Defender Hero guards the Rim Camp; a Raider Hero rides out from the Crimson courtyard and hunts Azure Banners, then Azure towers in the camps, then the Azure Keep.

Built from existing parts only:

- each camp is M1's post: the Banner, the raise time, the ruin repair, the Elites on the first capture and the build circle;
- the Defender is M1's Hero: Warden while his camp is Crimson, Raider of that camp once it is Azure;
- the Raider is Chapter 3 M6's released Hero (`MatchHero`), with M1's Raider targeting;
- the forward Barracks pad is M3's island pad rule;
- the Azure Barracks limit is Chapter 3's (`azure.limit`).

There is no War Cart, no gate and no Gatehouse. No new mechanic was added; the single-post code now handles a list of camps.

## 2. Layout (1920 x 1152, grid 48)

New battlefield `canyon-basin` with Canyon sandstone art. It reuses Meadow's Azure Keep (330,600), Crimson Keep (1610,600), territory, reserved cell and respawn row.

```
x:   0        768  912                1344            1920
y 0  +---------+=====================================+
     |         |  NORTH WALL (cliff)                 |
y192 |         +-----+----------------------+--------+
     |  Azure  |   North Road   RIM CAMP [T][T] [Y] |
y432 |  plain  |     +----------------------+        |
     |  Keep   |     |        MESA          | Crimson|
     |  (330)  |     |                      | Keep   |
y768 |         |     +----------------------+ (1610) |
     |         |  South Road  BASIN [T][T]       [Y] |
y960 |         +----+   bowl  +---------------------+
y1056|              +=========+   SOUTH WALL         |
```

| piece | x0 | y0 | x1 | y1 |
|---|---|---|---|---|
| north wall | 768 | -Inf | 1920 | 192 |
| south wall west | 768 | 960 | 1008 | +Inf |
| south wall, Basin bowl | 1008 | 1056 | 1248 | +Inf |
| south wall east | 1248 | 960 | 1920 | +Inf |
| mesa (`look: 'mesa'`) | 912 | 432 | 1344 | 768 |

- North Road: y 192 to 432 (240 px). South Road: y 768 to 960 (192 px), widening to y 1056 in the Basin bowl.
- Crimson towers, all on cell centres (a tower on a cell edge has no attack cell for a soldier): Rim holders (1272,264) and (1272,360); Basin holders (1176,840) and (1176,936); courtyard towers at each road's exit, (1464,264) and (1464,936).
- Build circles: Rim (1200,312) r 120; Basin (1056,888) r 144.
- The three opening Azure Vanguards stood where the mesa is, so they now start on the plain at (864,504), (864,696) and (744,600).
- Art: the mesa is drawn as a plateau with a rim and a cliff face (a new presentation-only `look: 'mesa'`; Canyon's spire painter would have drawn it as a flat slab). Painted trails mark both roads and join them at each end. The Canyon painter now also draws `trails`, which only this battlefield uses.

## 3. Level data (campaign-35)

| setting | value |
|---|---|
| waves | M1-M3's: [6,6,6,6,7,7,8,8] every 25 s from 10 s, 1 allied per wave, slots (1776,480) and (1776,720); the slots feed one road each |
| start | 0 Gold, 100 Wood, 10 Iron |
| Rim Camp | flag (1176,312), ring 96, ruin col 26 row 5 (the first holder's cell), Banner 2,000 HP, raise 4 s, repair 60% in 5 s, 2 Elites on the first capture from (1776,480) |
| Basin Camp | flag (1080,888), ring 96, ruin col 24 row 17, the same Banner, repair and Elites, from (1776,720); no Hero |
| Defender | M1's Hero (833 HP, 80 damage, armour 20): anchor (1224,360), guard 220, respawns at (1512,312) after 30 s |
| Raider | the same stats: released at 75 s at (1512,888), returns 45 s after each death |
| Azure Barracks | limit **2**; Mission 3's three home pads plus one in the Basin Camp (col 21 row 20), closed until the Basin Camp is Azure |
| Crimson Keep | armed (as in M1-M3), shielded while either camp is Crimson |
| mission | phase `capture` (Capture the Rim Camp, Capture the Basin Camp: both latch), then phase `assault` (destroy the Crimson Keep) |

Rules as the player sees them:

- **Shield:** the Keep is shielded while any camp is not Azure. Losing a Banner shields it again until that camp is retaken. The capture objectives latch, but the plate follows the live state ("Recapture the Basin Camp").
- **Defender:** stands at the Rim Camp and fights anything Azure within 220 px. Once the Rim Camp is Azure he hunts its Banner, then the Azure towers in its circle, then the Azure Keep (exactly M1's Hero).
- **Raider:** from 75 s he hunts the nearest standing Azure Banner in either camp, then the nearest Azure tower inside an Azure camp's circle, then the Azure Keep. He comes back 45 s after each death. There is no separate sortie timer: the respawn delay is what makes his attacks periodic.

## 4. What changed

- `src/data/matchSetup.ts`: `posts` (two or more camps, each with an `id` and a `name`; the camp `hero` is optional and at most one camp may have it). A match `hero` is allowed beside camps as the Raider. The single-post validation is unchanged and is shared by both paths.
- `src/data/mission.ts`, `src/simulation/Mission.ts`: a `capture` objective may name a camp (`post: 'rim'`). This is required with several camps and rejected with a single post.
- `src/simulation/Simulation.ts`: `camps` and `postStates` replace the single post throughout: placement, territory, repair price and time, Banner and Elites, and the shield (all camps must be Azure). Heroes are kept in a map by unit id, so the Defender and the Raider respawn independently. With several camps, the Banner, the Elites and the post events carry the camp id (`c4-banner-rim`, `red-ca-basin-0`, `{camp:'basin'}`).
- `src/simulation/GameState.ts`: `PostState.id`, an optional `anchor`/`guard`, `GameState.posts` (several-camp matches only; `post` is then the first camp, the same object), and the `camp` field on post events.
- `src/simulation/Movement.ts`: the Hero branch handles a list of camps (the Defender belongs to the camp with an anchor; the Raider hunts every camp).
- `src/data/combat.ts`: `raiderId = 'red-raider'`.
- `src/world/battlefield.ts`, `src/world/battlefieldArt.ts`, `src/scenes/Battle.ts`: the battlefield, its art, the mesa look and Canyon trails, both camps drawn with their own labels and ruins, and the Hero names "Defender Hero" and "Raider Hero" (same sprite as the Crimson Hero; no new art).
- `src/scenes/HUD.ts`: notices name their camp; the shield notice names the camps still Crimson; the Raider's release is announced; there is one minimap ring per camp. The plate stays in compact mode for a several-camp match ("Capture both camps", "Capture the Rim Camp", "Recapture the Basin Camp", "Destroy the Crimson Keep").
- `src/data/campaignLevels.ts`: `canyonBasinLevel` (campaign-35).
- Tests: `tests/campaign-level-35.cjs` (10 tests), `tests/support/basinBot.cjs`, and allow-lists in five existing tests (campaign-35, canyon-basin). Browser: `scripts/verify-canyon-basin.mjs` (24 checks); stills are in `docs/screenshots/canyon-basin/`.

M1-M3 behave exactly as before: a single `post` still produces the same state (`state.post`, `c4-banner`, `red-ca-N`, events without `camp`), and their suites and browser checks pass unchanged.

## 5. Verification

All run on this worktree (2026-11-03):

- `npm run build` (tsc --noEmit + vite build): green (only the existing chunk-size warning).
- `npm test`: **1122/1122** (baseline on `d68af0b`: 1112/1112; +10 in `campaign-level-35.cjs`).
- `scripts/verify-canyon-basin.mjs`: 24/24 (headless Chrome, SwiftShader, 960 x 540 and 844 x 390).
- Regression browser checks against this worktree's server: Forest Edge 31/31, Cliff Pass 22/22, River & Island 15/15, objective hints 40/40, achievements 37/37 (stills redirected to the scratchpad, so their tracked screenshots are unchanged).

Not done: a performance run on real hardware (headless SwiftShader frame rates mean nothing), and the human playtest.

## 6. Bot results (information only, not balance sign-off)

`node tests/support/basinBot.cjs '<options>'`. The bot is deterministic: crit seeds do not change a run, only its options do. Cap: 900 s.

| plan | result | shield down | Banners lost | Guardian deaths | Defender / Raider deaths | Raider damage to the Azure Keep | Azure Keep minimum |
|---|---|---|---|---|---|---|---|
| Basin first, North Road (default) | win 351 s | 290 s | 2 | 6 | 3 / 5 | 0 | 3000 |
| Basin first, South Road | win 496 s | 290 s | 5 | 7 | 6 / 7 | 0 | 3000 |
| Rim first, North Road | win 456 s | 319 s | 5 | 6 | 8 / 6 | 1040 | 1564 |
| Rim first, South Road | win 534 s | 319 s | 7 | 7 | 10 / 7 | 1040 | 1564 |
| rush (ignores the Heroes) | win 364 s | 215 s | 2 | 5 | 5 / 5 | 0 | 3000 |
| no home tower | win 347 s | 193 s | 2 | 4 | 7 / 5 | 0 | 2784 |
| recall radius 300 | win 314 s | 219 s | 1 | 5 | 4 / 5 | 0 | 3000 |
| no Raider (control) | win 356 s | 191 s | 0 | 5 | 6 / 0 | 0 | 3000 |
| no repair, no forward towers | 900 s cap | 444 s | 14 | 11 | 12 / 13 | 240 | 2760 |
| turtle (2 forward towers per camp first) | 900 s cap | 217 s | 8 | 7 | 19 / 14 | 160 | 2840 |

Reading (bot behaviour only):
- Every assault plan wins, in 314-534 s (M1-M3 bots: about 230-280 s), so M5 should run longer than M1-M3 for a human too.
- **Rim first is clearly harder**: the Defender keeps retaking his camp's Banner, and the Raider reaches the Azure Keep once (1,040 damage). The key position behaves as one.
- **The Raider is the main source of lost Banners**: the no-Raider control loses none and breaks the shield 100 s sooner.
- **Building and repairing matter**: without them the bot loses Banners again and again and never finishes (no defeat either, but no win).
- The turtle timeout is a bot artefact: it waits for forward towers the Raider keeps destroying. It shows that the forward camps stay under pressure.
- Waves deal most of the Banner damage on the default plan; the Raider and the Defender deal the rest.

## 7. Decisions taken in this slice (PO please confirm)

1. **Both camps break the shield** (rather than either one). This makes both roads and the Defender's camp matter, and gives the Raider a clear threat: a broken Banner restores the shield. The alternative ("either camp") is a one-line rule change in `updatePost`, but it would let a player skip the Defender entirely.
2. **The Raider's attacks are periodic through his respawn** (first release at 75 s, 45 s respawn). There is no sortie timer, which would be a new behaviour. If he is never killed, he keeps attacking.
3. **The Rim Camp is the Defender's key position**: it is the forward camp, near the courtyard. The Basin Camp is the rear camp, with the forward Barracks pad and more room to build.
4. **Each road ends under a courtyard tower** (650 HP), so both final assault routes have something to break.
5. **campaign-35** is the Mission 5 slot. campaign-34 (M4) lives only in the M4 worktree. Chapter 4 stays "coming soon".

## 8. Known limitations and merge notes

- The Defender and the Raider share the Crimson Hero sprite; only their labels differ.
- The opening Azure Vanguards walk up the North Road and die early to the Defender and the Rim towers (the existing AI marches them on the Crimson Keep).
- **Merge with M4:** M4's uncommitted work changes the same files (`Simulation.ts`, `Movement.ts`, `HUD.ts`, `Battle.ts`, `matchSetup.ts`, `battlefield.ts` and the same test allow-lists). Expect conflicts. Land M4 first, then rebase M5 and re-run both missions' checks.
