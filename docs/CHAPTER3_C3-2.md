# Chapter 3 · C3-2 — Crimson Barracks and Level 22 "The Barracks Line"

Status: Level 22 now has a single open-strategy objective (destroy the Crimson Keep). Implemented on `chapter3/c3-1-sealed-pass`, uncommitted, awaiting human playtest. Every balance value is provisional. Do not merge or deploy this branch alone: the Chapter 3 Continue leak (Continue follows registration, not chapter release) now reaches Level 22 as well as Level 21.

Human playtest: `http://localhost:5173/?debug=1&chapter=3&mission=2`

## Mechanic

A Crimson Barracks is a pre-completed red `wall` with a 2 x 2 footprint, built by the same `Simulation.gate()` as the Frost Gate. It therefore blocks movement and sight, is targetable, takes Guardian damage (structure multiplier included), is removed when it dies, never attacks and gives no XP or Gold. Barracks are never mission objectives.

Spawn ownership: a level lists each Barracks with the Crimson spawn slots it owns. A slot is either one of the level's outside wave slots (`waves.redSlots`) or a garrison slot, owned by one Barracks only, and every wave slot must be owned (validated in `matchSetup`). In `Simulation.spawnDue`, before the tick, stall and cap checks, every queued red entry whose slot belongs to a dead Barracks is dropped. So a destroyed Barracks:

1. stops producing for good (queued and future entries are dropped as they appear);
2. leaves its existing minions alive;
3. does not hand its quota to the survivors (a wave's slot assignment is fixed at scheduling time);
4. cannot stall the red queue behind a blocked head entry;
5. leaves a fully dropped wave to count as defeated (`Mission.waveDefeats` needs no queued entry and no living member), so `waves-defeated` cannot soft-lock.

The garrison slots belong to the courtyard Barracks: it is unreachable until the gate falls, and destroying it ends the garrison.

## Level 22

| | |
|---|---|
| Start | 0 Gold / 0 Wood / 0 Iron |
| Waves | first at tick 300, every 750, sizes 6,6,6,6,7,7,8,8; 1 Azure ally; slots North (1536,120), South (1536,1080) alternating |
| North Barracks | `red-barracks-north` (1536,240), 2 x 2, 2,500 HP, owns (1536,120) |
| South Barracks | `red-barracks-south` (1536,960), 2 x 2, 2,000 HP, owns (1536,1080) |
| Courtyard Barracks | `red-barracks-court` (1824,432), 2 x 2, 1,500 HP, owns (1800,552) and (1704,432) |
| Guards | `red-guard-north` (1608,312), `red-guard-south` (1608,888): new Frost Citadel tower sites |
| Defenders | wall pair, inner pair, both guards (the forward pair is not used) |
| Gate / Keep | Frost Gate 3,000 HP; Crimson Keep armed |
| Garrison | after the gate, first 90 ticks later, 4 and 5 alternating every 750 ticks |
| Mission | open strategy: one phase, one objective, destroy the Crimson Keep. No tower or wave requirement, no Hold phase; victory the moment the Keep falls. Defeat only when the Azure Keep reaches 0 HP (no 50% threshold). Waves keep coming until the Keep falls |

## Changes

- `src/world/battlefield.ts`: `BattlefieldBarracks` sites and validation; Frost Citadel gains the three sites and the two guard tower sites (Level 21 names its six by id, so it is unchanged).
- `src/data/matchSetup.ts`: `MatchBarracks`, the `barracks` override and its validation; the key is absent when unused.
- `src/simulation/Simulation.ts`: builds the Barracks, extends the gate geometry check to Barracks-only setups, and drops dead Barracks' entries in `spawnDue`.
- `src/world/frostGateAppearance.ts`, `src/scenes/Battle.ts`, `src/scenes/HUD.ts`: the Crimson Keep sprite at about two thirds size with a name label; "Crimson Barracks" in the inspector; `isFrostGate` excludes Barracks; "<North/South/Courtyard> Barracks has fallen · its reinforcements have stopped".
- `src/data/campaignLevels.ts`: Level 22.
- Tests: new `tests/barracks.cjs`, `tests/campaign-level-22.cjs`, `tests/support/barracksBot.cjs` (a copy of the shared bot's driver with a routed walk home, because the shared one sticks on scenery south of the fortress); registry, progress, battlefield, debug-launch and frost-gate tests updated for Level 22 and the two extra tower sites.

## Bot evidence (preliminary; a human playtest outranks it)

Open-strategy version, real engine, recall radius 420, four towers, Shop purchases in order. The bot stays home for its first 100 s by its own choice (nothing forces it) and recalls whenever Crimson comes near the Keep.

| Strategy | Result | Time | Deaths | Level | Gold | Azure Keep lowest |
|---|---|---|---|---|---|---|
| Direct Assault (zero Barracks destroyed) | win | 5:50 | 3 | 20 | 2,905 | 2,568 |
| Cut North (guard + Barracks) then fortress | win | 6:00 | 4 | 17 | 2,155 | 3,000 |
| Cut both outside Barracks, then fortress | win | 5:53 | 3 | 15 | 1,725 | 3,000 |

An earlier hold-and-storm version of this level gave 7:25 / 5:50 / 5:16 for the same three plans and 0/6 wins for an immediate raid that ignores the Keep. Without the Hold phase nothing stops a player from raiding at once, so that opening is now a real way to lose.

## Known risks

- Cutting both outside Barracks is not slower than Direct in bot play and is safer for the Azure Keep; Direct's only reward is a stronger Guardian and more Gold. Whether Direct is "faster but riskier" must be judged in the human playtest. Levers if needed: outside Barracks HP, or a small unowned trickle slot.
- With no Hold phase a player can raid at once; the bot's immediate raid lost before, so the opening is a real decision. The Azure Keep must hold to 0 HP, which is more forgiving than the earlier 50% threshold.
- A unit standing on a living Barracks' slot stalls all red spawns (existing 26 px clearance rule).
- The Barracks art is a recoloured Keep sprite; there is no minimap marker.
- Continue leak: unchanged and unresolved.
