# Chapter 4 Mission 4 "Fortress Approach" (campaign-34): implementation notes

Branch `chapter4/m4-fortress-approach`, built on `main` `d68af0b` (M1-M3 + Achievement V1). Not committed. Every balance value is provisional until the human playtest. Chapter 4 is still a coming-soon card; only the dev launch reaches it: `npm run dev`, then `?debug=1&level=34` (or `?debug=1&chapter=4&mission=4`).

## The mission
Destroy the Crimson Keep (one objective, no capture phase, the Keep is never shielded). Everything else is optional help.

- **Map** (`fortress-approach`, 1920 x 1152 window): open Azure land west of x 1008; a cliff wall to the courtyard with the Forward Gatehouse neck (x 1008-1056), a corridor (x 1056-1344), the Main Gatehouse neck (x 1344-1392) and the courtyard with the Keep. South of the corridor a walled pocket holds the Elite Barracks and opens only onto a south road from the Azure side.
- **Crimson War Cart**: one cart spawns at (1776,600) on tick 900, 900 HP / armor 10 / speed 55 / 90 damage per second, and attacks Azure structures only (nearest first, then the Azure Keep). It never respawns.
- **Wreck**: when the Crimson cart dies its wreck stands on the nearest of three authored sites (cells 14,11 / 17,14 / 19,11). One wreck at a time. The Guardian standing within 96 px pays 160 Wood + 40 Iron once and 5 s later exactly one Azure cart stands there; the wreck is gone for good. An Azure cart that dies leaves nothing (no farming).
- **Azure cart**: attacks Forward Gatehouse, then Main Gatehouse, then the Keep, skipping any gate that is no longer Crimson's. It walks only while the Guardian is within 300 px, stops the moment he is further and resumes when he is back (Guardian-proximity escort).
- **Gatehouses** (`red-forward-gate`, `red-main-gate`, 3,000 HP, faction gates: Crimson passes, Azure must break them, soldiers assist). Each has two towers. Capture: both towers dead and the Guardian in the 120 px ring for 4 s; the gate then stands **open** to both teams. Repair (90 Wood + 20 Iron, 5 s, Guardian in the ring): the gate becomes **Azure's** at full HP, transparent to Azure and solid to Crimson, with Crimson units inside its footprint stepped out first. A destroyed gate (captured, converted or never touched) is a breach that never reverts; there is no state that blocks the way to the Keep.
- **Elite Barracks** (optional, pocket): trains 2 Crimson Elites every 45 s while Crimson (Human Playtest #1: was every 30 s; waves hold no Elites, so this is the only Elite source). Capture (its two towers dead, ring held 4 s) stops production and drops queued spawns. Repair (96 Wood + 24 Iron, 5 s) makes an Azure Elite Barracks that trains Elite soldiers (480 HP, provisional), outside the normal Barracks limit (population caps still apply). Azure soldiers use the opt-in `cellAnchor`.
- **Crimson Hero**: one Hero, Warden at (1272,600) (216 px guard) until the Forward Gatehouse is captured or destroyed, then a Raider marching on the Azure Keep; respawns at (1488,792) after 30 s.
- **Waves, start and Keep**: M2/M3's `[6,6,6,6,7,7,8,8]`, first wave tick 300, every 750 ticks, start 100 Wood / 10 Iron, one Azure Barracks stands at the start on pad (10,10) and counts toward the limit of two (Human Playtest #1: was none and a limit of one); the repaired Elite Barracks stays outside the limit.
- **Achievements** (Achievement V1, `campaign-34`): `warcart-recovered` (finished cart repair + victory) and `elitebarracks-recovered` (finished Elite Barracks repair + victory). Debug and fixture runs record nothing.

## What changed in the engine (opt-in; M1-M3 data and behaviour untouched)
- `GameState.ts`: `Unit.cart/open/eliteBarracks`, `cartWreck`, `captures`, `guard`; `structuresFor(state, team)` now hides the faction gates that team owns (and any open gate) instead of every gate from Crimson alone. For M2 and M3 (Crimson-owned gates, nobody converts them) the result is identical.
- `Simulation.ts`: `initFortress`, `leaveWreck`, `updateFortress` (walk-in jobs, capture, conversion, raid switch), `eliteDue`, `convert`; Azure attacks and sight use `structuresFor(state,'blue')`; a captured/destroyed Elite Barracks drops its queued spawns.
- `Movement.ts`: cart targeting and the Guardian-proximity gate, the Warden/Raider switch for a guard post, Azure units and the Guardian use the Azure view of the gates, `cellAnchor`.
- `matchSetup.ts`: `cart`, `captures`, `guard` (validated). `Economy.ts`: a fixed-price `repair` command. `SoldierProto.ts`: opt-in `cellAnchor`. `AzureBarracks.ts`: Elite soldiers. `Building.ts`: the Barracks limit does not count an Elite Barracks. `Navigation.ts`: open gates are part of the route cache key.
- Level / world / UI: `battlefield.ts` (`fortress-approach`), `battlefieldArt.ts`, `campaignLevels.ts` (`fortressApproachLevel`), `Battle.ts` (war-cart sprite, Gatehouse names and ownership, redraw on ownership change, wreck and capture rings), `HUD.ts` (notices), `achievements.ts` and the Battle flags.

## Tests
- `tests/m4-placement-probe.cjs` (6): every authored point open and reachable by the side that needs it.
- `tests/campaign-level-34.cjs` (15): cart, wreck, repair, escort stop/resume, target order, capture, conversion, ejection, breach, no softlock, Hero switch, Elite Barracks, alternate wins, determinism.
- `tests/achievements.cjs` (+2). `scripts/verify-fortress-approach.mjs` (browser); stills in `docs/screenshots/fortress-approach/`.

## Known limits
- No bot playthrough: the browser and simulation checks drive each mechanic directly. Difficulty and playtime are unmeasured; a human playtest is required.
- The cart reuses the Ballista sprite; wreck, gates and rings are marked by rings and labels, not new art.
- The Azure cart is not alerted to Crimson units: it hits only structures, so Crimson soldiers can kill it if the Guardian does not protect it.
- A Guardian standing on a Crimson slot of the Elite Barracks blocks the Crimson queue until it moves (same engine rule as every slot).
- The Guardian's dash (`GuardianSkills`) still treats a converted gate as solid.
