# Phase 1B: Building & Economy

Baseline: clean commit `c21f991` (Phase 1A). Implementation plan was recorded in [PHASE_1B_PLAN.md](PHASE_1B_PLAN.md) before coding. Original specifications remain unchanged. No commit or push was made.

## Implemented systems

- Authoritative Gold/Wood/Iron start at 250/180/30. Economy accepts simulation-owned income, construction and minion reward commands through one atomic validated ledger. Integer balances use 1/120 resource units: each 30 Hz tick produces exactly 8 subunits Wood and 1 subunit Iron. This gives 2 Wood/s and 0.25 Iron/s without fractional drift. Minions give 15 Gold once. No offline income or independent gameplay timers.
- Place commands validate type, integer cell coordinates, bounded request ID, map bounds, 8-cell radius from the blue base, exact terrain/scenery footprint intersection, static structures, staged allies, live simulation units, dynamic structures, reserved respawn/shop approach and wave spawn cells. Building management remains available while the Guardian is dead, as specified. The execution-time check closes races between preview and confirmation. Duplicate requests, rejected placements and cancelled previews spend nothing. Same-cell competing commands cannot both succeed. Archer Towers are capped at 30.
- Wooden Wall: 1 cell, 25 Wood, 400 HP, 60 construction ticks. Archer Tower: 1 cell, 80 Wood + 10 Iron, 650 HP, 150 construction ticks. Collision begins immediately. HP grows with construction and preserves accumulated damage; destroyed construction cannot complete. Towers activate only after construction, choose the nearest visible enemy independently of Guardian selection, and use existing physical mitigation, range/LOS, cooldown, damage and death events: 240 world units, 18 damage, 24 ticks per shot.
- Swept unit collision includes constructed structures. Nearby minions can attack structures through the existing combat pipeline. Destruction frees collision and removes authoritative state, sprite, HP bar and minimap marker without refunds or kill rewards.
- Build menu selects Wall/Tower, shows approved artwork and green/red cell preview with a reason, and exposes explicit Confirm/Cancel. Switching building types clears the old preview. Controlled-territory grid and Tower range preview use logical coordinates. Drag empty world space to survey while building, or use the minimap; portrait returns to the Guardian. Construction buttons scale to at least 48 CSS pixels vertically. HUD observes authoritative balances, HP and minimap positions.
- Build runs at absolute 0.25 timeScale, clears existing movement/attack intent and isolates joystick, keyboard and combat input. Pause, blur, hidden document and portrait cancel placement, clear controls and freeze simulation. Restart creates fresh resources/structures and releases listeners. Approved camera, joystick, Attack, Skill previews and top HUD layout remain.

## Files changed

- New `src/data/buildings.ts`, `src/simulation/Building.ts`, `src/simulation/Economy.ts`.
- Updated `src/simulation/{GameState,Simulation,Collision,Movement,Combat}.ts` and `src/scenes/{Battle,HUD}.ts`.
- Extended `tests/simulation.cjs`; new `scripts/verify-building.mjs`; updated `scripts/verify.mjs` and `package.json`.
- Updated README, verification and limitations; added this report, implementation plan, Phase 1B JSON browser reports and `docs/screenshots/phase1b/` captures. Phase 1A reports and captures are preserved.

## Verification and demonstration

Run `npm test`, `npm run build`, then start either `npm run dev` or `npm run preview`. Set `PROTOTYPE_URL` to its reported localhost origin. Run `npm run verify` for the existing Phase 1A control/combat checks and `npm run verify:building` for the Phase 1B demonstration. The combat regression starts a fresh match after control checks so browser scheduling delays cannot consume the hero's combat HP before the test begins.

Headless coverage includes all 22 Phase 1A tests plus initial income, resource command deduplication, affordability, successful/rejected/occupied/invalid construction, unit occupancy at execution, exact-once deductions, immediate wall collision, construction HP/damage, tower activation/range/targeting/cooldown/damage/destruction, tower cap, pause and timeScale. Browser checks additionally verify HUD/state and sprite/HP/minimap synchronization, cancellation, background interruption and restart cleanup. The deterministic browser destruction check explicitly uses an HP/enemy setup fixture; Wall/Tower placement and Tower attacks use actual UI and real wave enemies.

`npm test`: 43/43 passed, including exact completed Tower HP, building while the Guardian is dead, and partial scenery overlap. `npm run build`: strict TypeScript and Vite passed. The existing 52-check browser regression passes on development (5176) and production (4174); both waves are cleared, Gold reaches 340 and no enemy state/sprites remain. Phase 1B browser reports contain 24 checks per origin for the placement/economy demonstration, camera drag, mobile controls/targets, pause/background and renderer cleanup. All browser checks use desktop Chrome with emulated touch on 8 October 2026.

To replay the demonstration: reload in landscape, open Build, choose Wall and tap a clear cell near the blue base. Confirm and observe Wood decrease by 25 (passive income continues). Tap the occupied cell and Confirm: the reason says occupied and there is no further deduction. Choose Tower, tap another clear cell toward the bridge and Confirm: 80 Wood and 10 Iron are deducted. Cancel closes the menu and restores normal speed. After five simulation seconds, the Tower shoots nearby raiders. Pause freezes income and construction; Resume continues. Outside Build mode, joystick and Attack retain independent touch ownership.

Captures include Build menu, valid Wall preview, occupied-cell rejection and Tower combat at 960x540, plus landscape at 844x390. Review JSON reports for exact check results and resource snapshots.

## Known limitations and Phase 1C recommendation

There is no dynamic A* or rerouting, full siege planner, unit separation or base combat. Existing bridge waypoint steering remains. Enemies attack nearby constructed structures when the Guardian is not attackable; if static or dynamic obstacles prevent a safe approach, they stop/wait rather than tunnel through them. Arbitrary wall layouts can therefore stall a wave. This is a documented Phase 1B limitation, not completed dynamic navigation acceptance.

Only newly constructed Walls/Towers are authoritative. Preplaced baseline towers, walls, bases and blue minions remain staged visuals/static obstacles. Resource buildings and their node-only placement/2-per-type income rules, repair, upgrades, demolition and other building types remain deferred. Existing minion reward is implemented; siege/boss rewards await those enemy types. Construction is represented by sprite opacity and growing HP; arrows/animation/audio remain a later art pass. Desktop Chrome touch emulation is verified; physical mobile/WebView, performance and Canvas fallback are not claimed. Bundled Phaser retains Vite's large-chunk advisory.

Recommended Phase 1C: explicit navigation invalidation and safe routing/breaching tests, separation, authoritative bases and staged structures, then defense objective and restart/win/loss flow. Resource nodes/producers and repair can follow as a separate economy extension. No Phase 1C work is included here; stop for review.
