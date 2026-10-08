# Phase 1A: simulation foundation and core combat

Baseline: `dc8ea269d1e9c3984abe607b49508e3189922894`, clean `main`. No commits or pushes were made. Specifications 01-10 remain the design source. Approved PNG assets, terrain, projection, camera follow, control layout and asset pipeline are preserved.

## Implemented

- Headless TypeScript GameState, validated/coalesced command queue and drain-once event pipeline. Phaser owns input, rendering, camera and temporary effects.
- Fixed 30 Hz clock: clamp real delta to 100 ms, cap catch-up at five ticks; integer ticks own all gameplay deadlines. Pause resets accumulated time and clears queued commands, movement, targeting and windups. Time scale is absolute; Build/Shop use 0.25, closing uses 1. Blur, hidden document, portrait and scene shutdown clear controls and pause. Resume requires fresh input.
- Guardian joystick/keyboard movement with normalized vectors and swept radius collision. World boundaries, river/bridge, static structures and scenery use logical footprints, independent of art dimensions.
- Attack engages automatic nearest valid enemy attacks; tapping a red minion overrides selection if attackable. Range and line of sight are checked at windup start and impact. Moving out of range cancels a strike but retains its cooldown. Enemy minions acquire the Guardian within 560 logical units, approach and attack, with a fixed bridge crossing waypoint.
- Physical/magic mitigation uses `damage * 100 / (100 + max(0, armor))`; direct damage bypasses armor. Current basic attacks are physical. HP clamps to zero. Minion deaths remove state, sprites, HP bars and minimap marks, cancel references, and emit one death and one 15 Gold reward.
- Initial three enemies spawn on tick 1 at the approved staging positions; a second three-minion reinforcement wave spawns at tick 240 (8 seconds). Six enemies total, no repeat waves.
- Guardian death clears input and attacks; LV1 respawn takes five simulation seconds, at a clear point near the blue base, with full HP and two seconds protection that ends on attack.
- HUD observes real HP, Gold, minion positions and attack cooldowns. Four skill buttons retain their original preview effects; their preview deadlines now use the same clock. They have no skill damage or status mechanics. Temporary attack rings and floating damage text use presentation tweens only.

## Balance assumptions

Specs define combat rules but do not specify Guardian/minion basic stats. `src/data/combat.ts` declares Guardian HP 1200, armor 20, speed 280, damage 80, range 90, cooldown 23 ticks, windup 6 ticks; minions HP 240, armor 0, speed 95, damage 18, range 48, cooldown 30 ticks, windup 9 ticks. Attack range measures center-to-center logical distance. XP, leveling and Guardian passive are deferred; the XP strip is labeled Phase 1B. Wood/Iron remain illustrative and no passive income runs.

## Files

- New: `src/simulation/{Clock,GameState,Collision,Movement,Combat,Simulation}.ts`, `src/data/combat.ts`, `tests/simulation.cjs`, `scripts/test.mjs`, this document.
- Updated: `src/scenes/Battle.ts`, `src/scenes/HUD.ts`, `src/ui/AbilityButton.ts`, `src/ui/UtilityButton.ts`, `scripts/verify.mjs`, `package.json`, `.gitignore`, README, LIMITATIONS, VERIFICATION, browser reports and screenshots.
- No dependency changes; tests use the existing TypeScript compiler and Node test runner. `.test-build` and `dist` are ignored generated artifacts.

## Validation results

`npm test`: 22/22 passed. `npm run build`: passed. Development and production Chrome verification: 52/52 checks each, including a targeted initial-portrait/resume check. Both gameplay runs cleared six minions with Gold 340, no enemies in state/render, and no runtime errors. See [verification details and screenshots](VERIFICATION.md).

## Manual gameplay review

1. Run `npm run dev`, open the reported localhost URL in landscape. Move with WASD/arrows or joystick. Cross the bridge; try water, a tower, walls and map edges. Camera and minimap should follow.
2. Tap Attack once. Stay near approaching raiders; tap a raider to prefer it. Move while attacking. Look for windup rings, damage numbers and decreasing real HP. A killed raider disappears from the world/minimap and adds exactly 15 Gold.
3. Wait for the reinforcement wave at eight simulation seconds. Clear six enemies; Gold should be 340. Reload to replay (no campaign/result screen).
4. Pause during movement/combat, wait, resume. HP, cooldowns and wave timing must freeze; joystick and attacks require fresh input. Background the browser or turn portrait and repeat.
5. Open Build then Shop: simulation slows to 0.25 without compounding. Close to restore normal speed. These panels still only preview future systems.
6. To check death, leave Attack disengaged near the enemies. Guardian should hide at zero HP, show a five-second respawn countdown, then return near the blue base. Pause during the countdown to verify it freezes.
7. Review landscape at 844x390 and 568x320; move while touching Attack, release outside to cancel, and verify touch cancellation clears presses.

## Remaining limitations and Phase 1B recommendation

This is a combat foundation, not the complete Phase 1 vertical slice. Blue minions, towers and bases remain staged visuals/static obstacles and do not fight. No unit separation/avoidance, dynamic navigation, wall breaching, building placement, skills, leveling, economy, artifacts, campaign, results, saves, Free Play or Android APK. Minion steering uses a static bridge waypoint and can stop at arbitrary obstacles; it does not find routes around new walls. Balance values need playtesting. Single-pose art and temporary effects remain, with no production animations or sound. No physical mobile/WebView or performance benchmark was run.

Recommended Phase 1B: add static-grid navigation and separation, combat-capable structures and bases, explicit defense objective and win/loss/restart flow, and Guardian passive/XP rules. Then take construction and navigation invalidation as a separate reviewed slice; preserve atomic command/event ownership.
