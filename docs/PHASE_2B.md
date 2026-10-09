# Phase 2B — Functional Guardian, Option A

9 October 2026. Approved for implementation/playtesting, not final balance. Phase 2B is uncommitted and unpushed for manual review.

## Approval and scope

Design approval commit: **d0ef44c1c340f0ed53ced3b5c135b18f92cd9632**, message `docs: approve guardian balance v0.1 for playtesting`, pushed to the existing `origin/main`. HEAD/upstream/remote matched and the tree was clean before implementation. Phase 2A `c81af4147e577f65cd25396c9b5029b8f9c8d0be` remains in history. Original specification files 01–10, assets, wave schedule, economy, camera and unit footprints are unchanged. The approval document retains historical proposal labels and Option B for traceability.

## Authoritative implementation

The simulation remains fixed at30 Hz. Phaser sends commands and displays state/events; no Phaser timers or secondary physics system determine skill outcomes. See [implementation plan](PHASE_2B_PLAN.md).

- Ordinary enemy melee minion life:60 XP. Positive actual HP damage within300 ticks, or living proximity within240 world units with LOS, qualifies; recent dead participants qualify. No last-hit requirement. Match/spawn-life/category reward IDs deduplicate deaths and protect reused entity IDs. Friendly units, Wall farming, despawns, absent reward profiles and terminal commands grant nothing. Sorted distinct hero IDs receive integer quotient/remainder shares; eligible LV20 heroes remain in the divisor and discard their share. Only Guardian is currently registered as a playable recipient; multi-hero arithmetic/eligibility infrastructure is tested without adding heroes. Existing15 Gold per enemy death is preserved.
- LV1 HP1200/Attack80/Armor20; each level adds60/3/1 throughLV20. Derived stats recompute without accumulation. Growth and Fortitude preserve living HP fraction, rounded down to0.01 after final growth; dead HP stays0. Respawn uses current derived full maxHP. Initial point1 plus19 level points gives20 total. Original thresholds80+25×(LV−1) and skill rank gates remain unchanged.
- Casts validate learned rank, target/range/LOS, cooldown, life, duplicate ID, stun and shared9-tick lock. Cooldown starts on acceptance and rank snapshots. Accepted casts cancel basic windups without resetting basic readyTick or attack intent; the full9-tick recovery also blocks new basic windups. Q/W/R permit movement; E holds movement through windup/dash then resumes input. Death/stun interrupts without refund; pause freezes committed casts/statuses/cooldowns; slow motion scales simulation time. Death retains cooldowns; Restart creates fresh progression/life/skills.

| Skill | Approved Option A behavior |
|---|---|
| Q Shield Bash | Five ranks:80/95/110/125/140 physical damage;300/285/270/255/240 cooldown ticks;15/18/21/24/27 stun ticks. Single enemy hero/minion within90,6-tick windup. Acceptance and impact validate original target/life/LOS; no auto-retarget or structure damage. |
| W Taunt | Five ranks:360/345/330/315/300 cooldown ticks;30/33/36/39/42 taunt ticks;6-tick windup,144 radius, no damage. Redirects targeting while preserving attacks, cooldowns, route/breach rules. Source death/life/protection, distance>192 or LOS loss>6 ticks ends it; normal AI resumes. |
| E Charge | Five ranks:40/50/60/70/80 physical damage;420/405/390/375/360 cooldown ticks;144/168/192/216/240 max distance.6-tick windup,600 world units/s. Continuous circle contact and terrain substeps≤4 world units stop straight at first unit/obstacle. Enemy hit once applies20/25/30/35/40% movement Slow for24 ticks; allies stop harmlessly. No sliding, phasing, knockback, invulnerability, attack reset or structure damage. Zero-direction/initially blocked path rejects without cooldown. |
| R Guardian Zone | LV6/11/16 ranks:1650/1500/1350 cooldown ticks,9-tick windup,120/135/150 duration ticks, radius192. Stationary completion position;120/180/240 shield once per initial eligible living allied hero/minion life, capped at30% maxHP;10/15/20 armor while inside with LOS. Structures excluded. Late entrants get aura only; leaving/reentry never refills shield. Same named buffs use strongest rather than sum. Direct damage bypasses shield/armor. Source/recipient death, expiry and terminal cleanup remove temporary state. |

Passive: +5 armor within240 of the living allied base footprint edge with LOS, excludes that base from its own LOS obstruction, removes immediately on exit/base death and never stacks. Fortitude uses the existing allocation panel, gatesLV18/LV20, one point per rank, additive5% of level-derived HP plus3 armor each. LV20/F2 maxHP2574 and baseline armor45. No fifth active button, mana, healing or regeneration.

Statuses use half-open tick lifetimes. Slow retains strongest/later expiry, capped50%; stun retains later expiry; taunt uses newest source and stable source ID tie-break while retaining later expiry. Shields absorb mitigated HP damage once; damage events expose raw/mitigated/absorbed/actual amounts and cast ID.

## Input and presentation

Q tap prefers selected legal target then nearest legal; drag uses a ground-space target reticle and invalid release spends nothing. E tap chooses legal target direction or last nonzero movement direction; drag selects direction/distance from the actual touch start, including off-center touches. Red cancel ring and pointer cancellation abort before acceptance. Shared lock gives one accepted cast under simultaneous releases. Independent joystick/skill pointers retain ownership on844×390. Cooldowns, ranks, XP/level/points and unavailable/casting/stun/death states reflect simulation state; status labels and stationary zone outline provide feedback using existing artwork. Labels use14-pixel text and separate Guardian/minion heights so their shield feedback does not occupy the same row. Fortitude lives in the allocation panel.

## Files

New: `src/data/guardian.ts`, `src/simulation/GuardianSkills.ts`, `Statuses.ts`, `XPRewards.ts`, `tests/guardian-skills.cjs`, `scripts/verify-skills.mjs`, this report and plan. Updated: progression data/ledger, GameState, Simulation, Movement, Battle, HUD, AbilityButton, package scripts, README/verification/limitations, progression tests and two browser scripts. Original112 test cases remain: obsolete Phase2A no-normal-XP/preview assumptions were migrated to approved behavior, with an absent-profile zero-XP case retained. Existing browser assertions remain except formerly independent preview cooldowns now assert the required shared cast lock.

## Verification and gameplay evidence

Final results are recorded in the next section. Normal gameplay and supplemental evidence are explicitly separated in `docs/phase2b/skills-{development,production}.json` and screenshot filenames.

Normal: legal Q→E→W allocation is a test play path, not a forced build; E is demonstrated atLV2 while enemies remain healthy and W atLV3 in melee reach. Unchanged six enemies, stats, waves and actual movement/Attack/skill/allocation controls. XP60 transactions include allied last hits, real level growth/points/HUD, Q physical damage/stun, W redirect with enemy damage, E enemy hit/Slow, Victory and UI Restart. No fixture XP or mutated stats in this scenario.

Supplemental: labeledLV6 R andLV20 Fortitude fixtures use existing minion profile, actual skill controls and enemy damage. They verify shield120/72, absorption, stationary aura/removal/expiry, allocation, charge enemy/ally/Wall/water/bridge contact, off-center drag, three-pointer/cancel, real death,606-tick LV20 respawn, pause and repeated UI Restart. These are not ordinary high-level progression evidence.

The final unit/build checks passed179 tests (112 existing +67 new), with0 failed/skipped; strict TypeScript and Vite production build passed. Vite retains the inherited large bundled-Phaser chunk advisory.

Initial harness failures were captured under ignored `test-results/`: clicks before the next painted frame could miss allocation; the harness now waits for two render frames and enabled controls. Nearest-target E can correctly stop at an allied blocker; normal evidence uses a legal clear directional approach. Mobile off-center drags revealed a real angle bias from measuring the button center; input now measures the touch origin and collision assertions remain exact. The W harness also waits for new damage after the cast rather than an earlier event and compares HP fraction across any level-up. Two added regression checks exposed and fixed same-tick Taunt targeting: status application now assigns the winning source immediately before combat can start another windup, and an older taunt cannot steal that target/cancel its valid strike. Existing readyTick is preserved. Charge gestures use actual emulated touch events, including off-center starts and the red cancel ring. Joystick waypoint control reduces analog strength near its goal, starts emulated drags above Chromium’s gesture threshold, and awaits neutral/release acknowledgments; trajectories are retained in the skills JSON. Post-respawn navigation clears the actual blocking enemy with Attack and uses the joystick to align at the radius-safe bridge entrance. Earlier straight keyboard movement correctly slid around that enemy, leaving the bridge lane; this was a harness route error, not terrain phasing. No gameplay damage assertions were skipped or weakened.

## Final verification results (takeover run, 9 October 2026)

All checks below were re-run by the finalizing engineer against the exact current working tree (latest source edit: Battle.ts) rather than relying on earlier handoff claims. Evidence files were regenerated in place.

| Check | Result |
|---|---|
| `npm test` (unit/integration) | 179 / 179 passed, 0 failed/skipped |
| `npm run build` (strict `tsc --noEmit` + Vite) | Passed; inherited large-chunk advisory only |
| `git diff --check` | No whitespace errors (only inherited LF→CRLF notices) |

| Browser suite | Development | Production |
|---|---|---|
| Phase 2B XP / Q-W-E / supplemental skills (`verify:skills`) | 30 / 30 | 30 / 30 |
| Progression (`verify:progression`) | 15 / 15 | 15 / 15 |
| Full match lifecycle (`verify:match`) | 16 / 16 | 16 / 16 |
| Match resize | 6 / 6 | 6 / 6 |
| Guardian collision | 9 / 9 | 9 / 9 |
| Navigation | 13 / 13 | 13 / 13 |
| Construction (phase1b-verification) | 24 / 24 | 24 / 24 |
| HUD / control regression (phase1b-regression) | 52 / 52 | 52 / 52 |

Every run recorded zero console, page, missing-asset or 4xx/5xx errors. Evidence: [skills dev](phase2b/skills-development.json), [skills prod](phase2b/skills-production.json), [lifecycle dev](phase2b/legacy/phase1d-verification-development.json), [lifecycle prod](phase2b/legacy/phase1d-verification-production.json), [collision](phase2b/legacy/guardian-collision-production.json), [navigation](phase2b/legacy/phase1c-verification-production.json), [progression](phase2b/progression/verification-production.json), [HUD regression](phase2b/legacy/phase1c/legacy/production/phase1b-regression.json), [construction](phase2b/legacy/phase1c/legacy/production/phase1b-verification.json) (development counterparts share the directories).

**Lifecycle.** Three normal matches per build with actual UI controls: Victory → Restart → Defeat → Restart → Victory. Exactly one terminal event per match; Restart restores HP, Gold 250, waves, structures and routes, removes the results overlay, blocks gameplay input while results are shown, and leaves the Phaser/DOM listener set identical to the initial match (no duplicate listeners). Skills tests additionally cover repeated UI Restart and death/respawn clearing statuses, shields and zones.

**Normal gameplay evidence (no fixtures).** Six enemy kills, 360 XP, Guardian LV4 with 45 XP toward LV5, Gold 340 (250 + 6×15), one unspent point; Q damage/stun, W redirect with enemy damage and E hit/Slow observed in real play (see `normalVictory` in the skills JSON).

**Supplemental fixture evidence.** R Guardian Zone and Fortitude (unreachable in the six-minion stage) use labeled LV6/LV20 fixtures; allied/enemy/Wall/water/bridge Charge collisions, off-center drag and three-pointer/cancel checks run on 844×390 with real controls. These are not ordinary progression evidence.

**Takeover review.** Code review of GuardianSkills/Statuses/Simulation found Taunt immediate target switching (invalid windup cleared unless the source is already the target), Charge direction measured from the actual touch origin, continuous unit/terrain contact stopping straight, per-life once-only shields (`granted` list; late entrants get aura only), life-ID-deduplicated XP, tick-based cooldowns/statuses that freeze with the paused clock, and `skills.clear()`/status wipe on death, match end and a fresh Simulation per Restart. No new defects were found and no source, test or balance changes were made during takeover. Previously fixed bugs (same-tick Taunt target steal, off-center Charge angle bias, harness frame timing) have regression coverage.

## Performance observations

A serial headless comparison rebuilt the exact approved-design/Phase2A baseline and alternated five900-tick unattended runs per version with events drained. Median baseline0.2896 ms/tick versus Phase2B0.3349 ms/tick: +0.0453 ms/tick (about15.6%) for reward/status/derived-stat processing. This is measured added cost, not a device frame-rate claim. See [headless samples](phase2b/performance-headless.json). No browser frame-time or rendered complete-match measurement was taken; the lifecycle runs only assert that unit counts, event queues and navigation work stay bounded. Physical-device performance is untested.

## Capture index

- Normal Q: [before](phase2b/screenshots/development/normal-before-q.png) / [damage and STUN](phase2b/screenshots/development/normal-after-q.png).
- Normal E: [before](phase2b/screenshots/development/normal-before-e.png) / [hit and SLOW](phase2b/screenshots/development/normal-after-e.png).
- [Normal Victory/XP](phase2b/screenshots/development/normal-victory.png).
- Supplemental [R/shield mobile](phase2b/screenshots/development/supplemental-zone-mobile.png) and [LV20/Fortitude allocation](phase2b/screenshots/development/supplemental-fortitude-mobile.png).
- Supplemental allied Charge footprint: [before](phase2b/screenshots/development/supplemental-charge-ally-before.png) / [after](phase2b/screenshots/development/supplemental-charge-ally-after.png). Enemy, Wall, water and bridge pairs share this directory; production equivalents are under `production/`.

## Known remaining issues

- Normal play cannot reach LV6, so R and Fortitude are only validated through labeled fixtures; late-game balance is unassessed.
- Single-pose art, preplaced illustrative structures and preview Shop/Army remain inherited limits.
- Charge/Q drag aiming and multitouch were verified with synthetic Playwright touch input at 844×390 and 960×540 only; no physical Android/iOS/WebView testing.
- Headless simulation overhead (~0.045 ms/tick) is not a frame-time result.
- Balance is Option A v0.1: approved for playtesting, not final.

## Manual playtest checklist

1. Start a match; allocate Q, then E, then W as levels arrive (LV1/2/3); confirm each button shows rank, cooldown and unavailable state.
2. Q: tap near an enemy (stun + damage); drag to a ground reticle; release inside the red cancel ring and confirm nothing is spent.
3. W: use in melee reach; confirm enemies turn on the Guardian, keep attacking, and revert to normal AI after expiry or when you leave 192 units.
4. E: tap (target/last direction) and drag from an off-center touch; confirm it stops straight at allies, enemies, Walls, water edges, and crosses the bridge; enemy hit applies SLOW.
5. Move with the joystick while casting; confirm independent pointers and no stuck controls.
6. Pause mid-cast and mid-status; confirm cooldowns/statuses resume where they stopped.
7. Die, wait for respawn, and Restart from Victory and Defeat; confirm no leftover status, shield or zone and full state reset.
8. Confirm six kills give 360 XP / LV4 and that Gold ends at 340 on a full clear.

## Recommendation

Proceed to manual playtesting of this uncommitted build, then run the separate Extended Combat Test phase described below before any balance tuning.

## Limits and future recommendation

The unchanged six-minion stage yields at most360 XP/LV4 (45 XP towardLV5), so normal R and late-game balance cannot be assessed. No physical Android/iOS/WebView or device performance claims. Chrome software GPU frame time includes rendering/host load; simulation update samples are reported separately. Single-pose art, illustrative preplaced small structures and preview Shop/Army remain inherited limits. Balance is not final.

Recommended separate Extended Combat Test: a finite, configurable longer encounter using only existing melee-minion profiles, with documented6/8/12-wave alternatives, measured time-toLV6/11/16/20, incoming damage/death/respawn pressure, ability uptime, defensive zone choices, friendly blockers and Wall/bridge routes. Preserve this baseline; compare repeated seeded runs and actual mobile play before approving any new timetable or tuning. No extended schedule or roster is implemented here.
