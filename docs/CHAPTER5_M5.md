# Chapter 5 M5: The Last Stronghold — implementation report (uncommitted, awaiting PO review)

Status: implemented on `scratch/c5-allied-hero` on top of the local M4 WIP and the main merge (`eeda8e9`). Not committed, pushed, merged or deployed. Design: `docs/CHAPTER5_M5_DESIGN.md` (PO approved, with the decisions below). Every balance value is provisional; bot results are evidence only and the Galaxy S24 playtest decides balance. M1-M4 and Chapters 1-4 are unchanged.

## Values as built (PO-locked unless noted)

| Item | Value |
|---|---|
| Level | `campaign-45`, Chapter 5 slot 5, "The Last Stronghold" (Chapter 5 stays Coming Soon) |
| Terrain | `last-stronghold`: Crimson Fortress geometry, M4 tower ids, plus forward towers `c5-sally-north` (1320,504) and `c5-sally-south` (1320,696); art alias of Crimson Fortress |
| Start | 100 Gold, 180 Wood, 25 Iron; Hero Cap 2; Barracks cap 2; pads: 3 home, (20,7) North, (18,18) South |
| Waves | M4's [7,7,8,8,9,9,10,10], first 30 s, every 30 s (later waves follow the existing late-wave rule) |
| Commanders | Iron Marshal 210 s, Shadowblade 300 s (warnings 6 s ahead; rest 60 s / 40 s; M4 stats) |
| Gate | Fortress Gate 2500 HP, Last Stand: 4 Elites; outposts: 2 Elites on first capture, South Warden (as M4) |
| Ballista | ruin cell (24,5) in the North Outpost circle, repaired at the camp percent (60%: 84 Wood + 18 Iron, 150 ticks), only while the North Outpost is Azure (existing rule) |
| War Cart | wreck on cell (20,19) in the South Outpost circle from tick 0, locked until the South Outpost is Azure, 160 Wood + 40 Iron, 150 ticks, one repair per run, orders: Fortress Gate then the Keep, follows within 300 px |

Two values moved while implementing, both from measurements rather than taste:
- **Ballista cell (24,5), not the design's (22,7).** From (1080,360) the line to the gate clips the Crimson Ridge corner (no line of sight). From (24,5) it reaches the gate (413 px) and the forward north tower.
- **Forward towers at (1320,504)/(1320,696), not 456/744.** At y=456 the best Ballista cell sat exactly 240 px (tower range) from the tower; at 504 the Ballista (280 px away) outranges it and survives (520 HP intact while killing it in 10 shots, then 2500 -> 1170 gate HP in 90 s).

## Core extension (PO approved)

- `src/data/matchSetup.ts`: `MatchCart` gains optional `wreckAtStart?:true` and `post?:string`; validated (`post` must be a post id and needs `wreckAtStart`; `wreckAtStart` may only be `true`) and copied. Absent fields change nothing.
- `src/simulation/Simulation.ts` (~8 lines): `initFortress` places `state.cartWreck` on `sites[0]` at tick 0; `updateFortress` queues no Crimson cart when `wreckAtStart` and refuses to start the repair while `cartLocked` (`post` not Azure); one getter `cartLocked`. The repair job, Azure cart unit, escort, order, combat and the single-wreck rule are the existing Chapter 4 code. Movement, Combat and GameState are untouched.
- Chapter 4: campaign-34 sets neither field; test asserts no wreck at tick 0, the Crimson cart still spawns at 900 and its setup carries no new field.

## UI (narrow, coordinated)

Sol Light's worktree (`codex/chapter5-ui-prototype`) was read first: it changes only chapter/briefing/menu files, none of `Battle.ts` or `HUD.ts`; no conflict found.
- `Battle.ts`: the wreck ring now draws in missions that have camps (it never drew there: `drawSites` returned early whenever `state.post` existed). In missions with camps it has its own Graphics and text array so it cannot wipe or hide the camp labels, and reads "CAPTURE THE SOUTH OUTPOST FIRST" (grey, dashed) while locked. Missions without camps (Chapter 4 M4) still use `postArt` and `postTexts` exactly as before, which the existing Chapter 4 browser scripts read.
- `HUD.ts`: the capture notice adds "repair the Ballista" (North) or "repair the War Cart" (South) in shield missions.

## Verification

- TypeScript clean; production build OK.
- `tests/campaign-level-45.cjs`: 16 tests. Wreck at tick 0 and no Crimson cart (1); repair blocked until the South Outpost is Azure, nothing paid (2); unlocks, 160W + 40I, 150 ticks, one Azure cart, short-of-iron wait (3, 3b); repaired once, a dead Azure cart leaves nothing and cannot be paid for again (4); Azure-owned, structures only, follows within 300 px (5); reaches and breaks the gate (6); Ballista locked then repairable by cell, reaches the forward tower and the gate (7); setup validation; campaign-34 unchanged; plus three bot tests.
- List/registry tests extended for campaign-45 (battlefield-art, campaign-level-31/41/42/43/44, chapter-view, debug-launch, frost-gate, six-missions): no behaviour change.
- `scripts/verify-last-stronghold.mjs`, 780x360 DPR 3, real taps: ALL PASS (resources and plate, locked ring text, unlocked ring with price, repair countdown, cart appears and follows, Ballista cell on screen 110 px above the panel and placed by tap, it shoots, Marshal 204/210 s and Shadowblade 294/300 s, 31 peak live units).
- Browser regression on the final tree: M4, Crimson Fortress and Canyon Basin pass. Chapter 4 Fortress Approach (`verify-fortress-approach.mjs`) has one failing check, "repair converts it to Azure at full hit points"; it fails identically on the pre-M5 baseline `eeda8e9` (checked on a throwaway worktree, since removed), so it is not caused by M5. The M4 and M5 scripts' Marshal "no warning before" check is time-sensitive (the page loop also advances the simulation); the M5 script now leaves a 1 s margin and passed twice in a row, the M4 script (committed in the local WIP) passed on rerun.
- Full automated suite: 1330 of 1330 pass (an earlier run of 1302 showed 15 failures: 12 were list tests that did not yet know campaign-45, now extended, and 3 were Node out-of-memory crashes when the session ended mid-run; the rerun is clean). TypeScript clean.

## Bot results (evidence only; start times 60/90/120/150/180 s, deterministic)

| Plan | Wins | Median win | Gate down | Guardian deaths (med) | Hero falls (med) | Keep min HP (med) |
|---|---|---|---|---|---|---|
| Guardian only | 0/5 | - | - | 4 | 0 | 0 |
| Direct rush (heroes + Barracks, no outposts) | 0/5 | - | 159 s | 5 | 13 | 0 |
| No siege | 5/5 | 361 s | 258 s | 3 | 5 | 2844 |
| North-first (Ballista, then cart) | 5/5 | 407 s | 232 s | 3 | 6 | 2694 |
| South-first (cart, then Ballista) | 5/5 | 390 s | 261 s | 3 | 4 | 2932 |
| Ballista only | 5/5 | 418 s | 260 s | 3 | 6 | 2558 |
| Cart only | 5/5 | 454 s | 261 s | 3 | 4 | 2626 |
| North-first, iron saved for siege | 5/5 | 400 s | 226 s | 3 | 6 | 1642 |
| South-first, iron saved for siege | 2/5 | 477 s | 297 s | 3 | 6 | 0 |
| Ballista only / cart only, saving | 5/5, 5/5 | 403 s / 430 s | 259 s / 272 s | 3 | 6 / 7 | 2416 / 1852 |

Peak live units 26-30 (target 40); pathing stalls at most 3 episodes (rush 2 episodes, 228 ticks).

## Findings

1. **Both orders are viable.** North-first and South-first win 5/5 in normal play. Each plan that took both outposts won.
2. **A direct rush is much harder:** it cannot win (the Keep stays shielded until both outposts are Azure), the gate falls at 159 s but the bot loses 13 heroes and 5 Guardian lives and the Keep.
3. **Siege assets do not yet buy time in bot play.** No-siege is fastest (361 s). The gate falls at about 230-260 s in every plan, mostly before an asset is in use: the Ballista was built at a median of 372 s and the cart repaired in 4 of 15 normal runs (153 s median when the bot saves iron, but then the unescorted cart dies to the waves before touching the gate in 4 of 5 saving runs). The design goal "siege is a meaningful advantage" is therefore unproven by bots; the bot attacks the gate with the Guardian and two heroes from about 3.5 minutes and never plans around the assets. This is the main human-playtest question (Open item 1).
4. **Iron is the binding resource.** Passive income is about 15 Iron per minute, so a run has roughly 25 + 15/min: a Tavern (10), two Barracks (40), tower ruin repairs (6 each), the Ballista (18) and the cart (40) cannot all be paid before about minute 6. In normal bot play iron stays between 1 and 20 all game. A player who saves for the cart repairs it at about 2.5 minutes but has no home defence at the Marshal's arrival (finding 5).
5. **South-first saving (2/5 wins): bot strategy, not a balance fault, with one real lesson.** Three of the five runs ended in defeat (Keep at 0). I traced the 150 s run in detail: the bot had 0 towers and 0 Barracks standing, its heroes had fallen and the Guardian had died one second earlier; the Iron Marshal (210 s) reached the Keep 17 s after release and destroyed it (3000 HP, all of the Keep damage) in 18 s, 35 s after release. I did not trace the other two defeats; they show the same Keep-at-0 pattern and the same saving mode. The saving mode deliberately skips home towers and the second Barracks and sends the Guardian south for the cart, and the cart died to waves unescorted. The same bot with normal spending wins 5/5. The lesson is that neglecting home is punished hard and fast, as in M4 (same Marshal stats); the Marshal alone can kill an undefended Keep in about 35 s. Whether that is too sharp is a human question (Open item 2); no change made.
6. **Commander overlap is survivable.** The Shadowblade is released while the Marshal is still alive in 1/5 (no-siege, north-first), 2/5 (south-first, ballista-only), 3/5 (cart-only) runs; all of those runs still won (Guardian deaths median 3). In every winning plan the Marshal was killed (in 24-50 s after its release in the runs inspected). Shadowblade at 300 s stays; no change.
7. **Guardian deaths** median 3 (design hypothesis 4-7): bots are not humans; the S24 playtest decides.

## Remaining human-playtest items and known risks

1. Does siege feel like a meaningful advantage when a human plans for it (escort the cart, build the Ballista early), and is the no-siege route "substantially harder" for a human?
2. Is the Marshal's speed against an undefended Keep (about 35 s from release) too sharp at 210 s, given the iron saved for assets competes with home defence?
3. The cart's fragility to waves (900 HP, armor 10) when not escorted; one repair per run (PO).
4. Ballista: placement needs the Guardian beside the pad to finish building; the capture notice and Build card both tell the player; confirm it is discoverable.
5. The five-card Build panel at 780x360 (Wall, Tower, Barracks, Ballista, Tavern): the cards read and tap correctly but "Barracks" breaks across two lines ("Barrac / ks") at the 7.2 font size. Options if you want it fixed: show the Ballista card only once the North Outpost is Azure (keeps four cards at the opening, the M4 layout), or widen the cards by trimming the Cancel column. No change made (shared Build panel).
6. South pad has 40 px of room above the panel (M4 observation); North pad and the Ballista cell are well clear (110 px).
7. Late waves (after wave 8) follow the existing late-wave rule; the first six minutes were checked, long games were not.
8. Allied Hero stall episodes from M4 observation still present at low frequency (at most 3 per run, 65 ticks).

## Changed files

Source: `src/data/matchSetup.ts`, `src/simulation/Simulation.ts`, `src/data/campaignLevels.ts`, `src/world/battlefield.ts`, `src/world/battlefieldArt.ts`, `src/scenes/Battle.ts`, `src/scenes/HUD.ts`.
Tests: new `tests/campaign-level-45.cjs`, `tests/support/strongholdBot.cjs`; list/registry updates in `tests/battlefield-art.cjs`, `campaign-level-31.cjs`, `campaign-level-41.cjs`, `campaign-level-42.cjs`, `campaign-level-43.cjs`, `campaign-level-44.cjs`, `chapter-view.cjs`, `debug-launch.cjs`, `frost-gate.cjs`, `six-missions.cjs`.
Scripts/docs: `scripts/verify-last-stronghold.mjs`, `docs/CHAPTER5_M5_DESIGN.md` (design), this report.

## How to run

`node scripts/test.mjs campaign-level-45.cjs`; browser: `STRONGHOLD_URL=http://127.0.0.1:<port>/ node scripts/verify-last-stronghold.mjs` against a dev server; the bot: `node tests/support/strongholdBot.cjs '{"plan":"north-first","startAt":2700}'` (plans: none, rush, no-siege, north-first, south-first, ballista-only, cart-only; option `save:true` saves iron for the assets).
