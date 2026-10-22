# Chapter 2 S7 — Wave-specific flanking

Branch `chapter2/s7-flanking`, baseline `69551a2` (S6). Status: implemented and browser-smoked. No campaign level uses it yet (Level 14 is a later milestone). No change to A* tie-breaks, targeting priority, Raider stats, Mobile UI or any existing level.

## What it is

An opt-in, authored, deterministic flank: a wave can send some of its units round the north or the south bank of the pond first, then on to the Azure Keep as before. Only tagged units flank. Everything else, on every battlefield and in every existing level, behaves exactly as before.

## Data

- `WaveRules.flanks?: {wave, lane: 'north'|'south', units: 'raiders'|'all'}[]` (`src/data/encounters.ts`, set through `matchSetup(..., {waves:{flanks}})`). `raiders` tags the Desert Raiders of that wave (they already take the last indices of a wave), `all` every Crimson unit of it. Allies are never tagged. A wave without an entry never flanks.
- `matchSetup` validation (`Invalid flanks`): extended encounter only, a whole scripted wave number, one entry per wave, lane `north` or `south`, units `raiders` or `all`, the battlefield must define a waypoint for that lane, and `raiders` needs a wave that has Raiders.
- `Battlefield.flankVia?: {north?, south?}` (`src/world/battlefield.ts`). Oasis defines `north (1032, 312)` and `south (1032, 888)`: cell centres on each bank beside the pond, mirrored about the Keep row. Meadow and Canyon Pass define none, so they cannot be flanked (a flank config naming them is rejected).
- `SpawnEntry.lane` is set only on tagged spawns. `Encounter.waves[i].flank` carries the wave's flank. `Unit.flank = {lane, startTick}` exists only on a tagged unit while its flank lasts; no other unit gets the key, so existing state and golden fixtures are unchanged.
- The Simulation constructor throws if a used waypoint is missing or blocked for radius 12 (Crimson and Raiders) or 20 (the margin the navigation tests use).

## Lifecycle (`src/simulation/Flank.ts`)

1. **Assigned** at spawn, with `startTick` = the spawn tick. The waypoint is the battlefield's `flankVia[lane]`.
2. **Routing**: in `Movement.ts`, after the "already in range" check, a unit with a flank (and no wall breach in progress) plans to the waypoint through the same `Navigation.route` search (a `waypoint` argument replaces the target; no breach plan). Any enemy in attack range is attacked first, as always; targets are still chosen by the existing rules.
3. **Suspended** (normal routing that tick, flank kept) while the unit's current target is a non-Keep enemy within 160 px, so a Guardian, tower, wall or ally close to it is answered by the existing rules. The Keep never suspends a flank.
4. **Released for good** (`unit.flank` cleared), whichever comes first:
   - *reached*: within 48 px of the waypoint;
   - *passed*: at least 48 px west of the waypoint and within 200 px of its y (both conditions, not x alone), so a crowd sliding round the waypoint still ends;
   - *timeout*: 600 ticks (20 s) since spawn, counted even while suspended;
   - *no waypoint* for the lane on this battlefield;
   - *unreachable*: Navigation finds no route to the waypoint; the unit is released that tick and routes to its target normally.
5. Normal routing resumes immediately after release. Nothing is random.

## Telegraph

The existing `wave` event gains an optional `flank: {lane, units}` for a flanking wave. The HUD's existing wave notice appends it: `Enemy wave 4 · Raiders flank the south bank`. A wave without a flank is announced as before.

## Tests (`tests/flank.cjs`)

Defaults untouched (no lane or flank key anywhere in the existing setups or an unflanked Level 12 run); validation; the exact tagged spawns; tagged units cross by their bank (south units reach y > 780, north units y < 420) while untagged units keep the existing route; the wave event; lifecycle boundaries for `flankEnd` and `flankSuspended`; the 600 tick timeout; waypoint reachability from every Crimson slot and on to the Keep for radius 12 and 20; blocked or missing waypoints rejected at construction; an enclosed (unreachable) waypoint released at once; combat priority (a tagged Raider attacks a Guardian standing on its way); replay determinism and that the flank changes the match.

## Not done / risks

- No Level 14 yet, so no gameplay balance for flanks. The earlier probe found that five flanking Raiders did not damage the Keep or towers with the current Vanguards, allies and Guardian, so the flank only matters once a level makes it matter.
- The 160 px suspend distance and 600 tick timeout are provisional.
- Browser smoke (S7 final gate, desktop Chrome 960x540, dev server): a scratch-injected Oasis match (not a registered level) with wave 4 south-flanking its Raiders showed "Enemy wave 4 · Raiders flank the south bank" for about 4.9 s, and both tagged Raiders crossed the south bank (y about 792-797, below the pond at y 780) with no runtime errors. Evidence was kept outside the repository. The smoke made the Keep unbreakable and cleared earlier Crimson units so an unrelated "Azure Keep under attack" notice did not take the shared notice slot.
- A wave notice shares one HUD notice slot with higher-priority alerts: if the Azure Keep is already under attack when a flank wave spawns, the existing slot rules can show the Keep alert instead (observed in the first smoke attempt). This is existing behaviour, not changed here.
- Real-device (phone/tablet) performance is untested; only the desktop timing probe in the S7 report was measured.
- Only Oasis has waypoints.
