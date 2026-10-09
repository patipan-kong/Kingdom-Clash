# Phase 2C plan — Extended Combat Test

Baseline: Phase 2B commit `1d46a36` on approved Guardian Balance v0.1 (`d0ef44c`). Phase 2C Extended Combat and both visual hotfixes passed manual review and are finalized. This document preserves the original playtest proposal and hypotheses; the implemented values and observed results are recorded in [PHASE_2C.md](PHASE_2C.md). This encounter is not a final campaign stage or final balance.

Legend: **[SPEC]** taken from the original specifications or approved Guardian Balance v0.1; **[INHERITED]** already implemented in Phases 1–2B; **[NEW]** Phase 2C provisional proposal.

## 1. Existing encounter behavior (investigation)

- Two scripted waves ([INHERITED] `waves` in `src/data/combat.ts`): 3 Crimson Raiders at tick 1 and 3 more plus 3 Azure Vanguards at tick 240. Three Azure Vanguards also start next to the Guardian. Unit cap 40 per side ([SPEC] 04/07).
- Total enemy supply is six minions = 360 XP = LV4 (45 XP toward LV5). R (LV6, 650 cumulative XP) is unreachable. Match is over in about 1–2 minutes.
- **Why the base falls fast.** `base-red` has 3000 HP, armor 0, damage 0 and never attacks; no enemy tower exists ([INHERITED] limitation: "current enemy towers not implemented"). One Guardian deals 80 per 23 ticks ≈ 104 DPS, so an undefended keep falls in about 30 s once its six minions are dead; nothing contests the Guardian at the keep.
- Allied base pressure is equally weak: only six raiders ever exist.
- Spawn code drops units silently at the cap, spawns all of a wave on the same tick at fixed positions, and is a hard-coded loop in `Simulation.step`.
- Towers ([INHERITED]) are fully authoritative: 650 HP, 18 damage, range 240, 24-tick cooldown, 80 wood/10 iron, auto-target nearest enemy with LOS, 80 XP when an enemy tower is destroyed ([SPEC] approved balance, was unused). Player construction is limited to 8 cells around Azure Keep.
- Economy ([INHERITED]): +2 wood/s, +0.25 iron/s, 15 gold per enemy minion; start 250/180/30.

## 2. Architecture: explicit encounter configuration [NEW]

`src/data/encounters.ts` defines `EncounterId = 'prototype' | 'extended'` and a pure, deterministic `buildEncounter(id)` returning:

- `waves`: wave start ticks (announcement events and `spawnedWaves` counter),
- `spawns`: an ordered schedule of `{tick, team, id, x, y, wave}` entries,
- `caps` (active red/blue minions) and `deferBlocked` (queue vs. drop),
- `defenders`: pre-completed enemy structures (empty for `prototype`),
- `reserved`: spawn cells that player construction must not occupy.

`prototype` is generated from the existing `waves` data with identical ids, ticks, positions, cap 40 and drop-on-cap semantics, so Phase 1D/2B behavior is bit-for-bit reproducible. `extended` uses the same simulation, movement, navigation, combat, XP and economy code; only data differs. `Simulation` takes `(matchId, encounterId = 'prototype')`; the scene reads `?encounter=prototype|extended` (default `extended` for manual play). All existing browser scripts are pinned to `?encounter=prototype`.

Spawn processing: `spawnQueue` consumes due entries in schedule order, preserving order within each team. In `extended` a due entry is **deferred** (not dropped) while the active cap is reached or the slot is occupied (living unit within 26 units or terrain/structure collision). Restart builds a fresh `Simulation`, so queue, schedule and defenders reset; nothing advances after a terminal state, while paused, or at timeScale 0 because spawns run inside the fixed 30 Hz `step`.

## 3. Extended wave schedule [NEW, provisional]

Enemy roster: ordinary Crimson Raider only (240 HP, 18 damage, [INHERITED] stats). Twelve waves, first at 10 s, then every 40 s; each wave's minions spawn 0.8 s (24 ticks) apart at a small set of lane slots at x=1380 (east of the bridge, west of the Crimson Keep) to avoid stacking.

| Phase | Waves | Enemy per wave | Allied reinforcements per wave |
|---|---|---|---|
| Early | 1–4 | 3, 3, 4, 4 | 2 |
| Middle | 5–8 | 5, 5, 6, 6 | 2 |
| Late | 9–12 | 7, 7, 8, 8 | 2 |

Totals: 66 enemy minions (3,960 XP), 24 allied reinforcements. Active caps: 24 Crimson, 16 Azure minions. Allied reinforcements appear at x=500–552 beside Azure Keep ([INHERITED] positions). Values were chosen from the arithmetic below and then checked with a headless bot (see PHASE_2C.md); they may be revised after manual play.

## 4. Base defense [NEW, provisional]

Reuse the existing tower combat entity. The initial proposal had three towers; the reviewed implementation has **seven pre-completed Archer Towers** with the unmodified [INHERITED] tower stats, team `red`: front-north/center/south at (1464, 504/600/696), rear-north/south at (1512, 456/744), and keep-north/south at (1560, 480/720). No new attack system, no immunity, no extra base HP (3000 unchanged), no scripted damage. The existing minion AI already treats enemy towers as targets and routes/breaches through them; the Guardian auto-targets the nearest enemy including towers. Towers are destroyed through normal combat and award the approved 80 XP each (560 XP total).

Allied base: pressure comes from continuing waves (up to 8 simultaneous raiders, ≈144 DPS against Azure Keep). The player counters with the existing Build UI (towers/walls inside the 8-cell territory), allied reinforcements and the Guardian. No regeneration or repair is added; threat warning is HUD-only.

## 5. Expected XP progression

Threshold to next level = 80 + 25×(LV−1) [SPEC]; cumulative XP: LV2 80, LV3 185, LV4 315, LV5 470, **LV6 650**, LV8 1,055, LV11 1,925, LV16 3,825. A raider is 60 XP, so LV6 needs 11 kills (≈ wave 3–4 if the Guardian takes a share), LV11 33 kills. Targets: early game (waves 1–4, 14 raiders ≈ 840 XP) LV5–6; middle (waves 5–8, +22) LV9–11; late (waves 9–12, +30) LV13–16. LV20 is not required.

## 6. Expected duration (provisional hypothesis)

Waves finish spawning at 7.5 min. A reasonable player who defends early, levels, and then clears the towers and keep should finish between about 8 and 12 minutes. Duration is an observation, not enforced by timers, invulnerability or forced waiting. Early rush, turtling and stalemate outcomes are measured and reported honestly.

## 7. Navigation and collision risk

Mitigations: spawns use fixed slots validated against terrain and structures; tower footprints are single 48-unit cells outside the bridge lane; the same `blocked`/navigation code handles enemy structures (breach logic already supports `team !== unit.team`); player-placement reservation is extended to extended-mode spawn slots; the minimap and HP rendering are generic. Residual risk: crowding at the bridge with up to 40 minions; measured by peak active count and path-stat counters.

## 8. Tests and acceptance

Automated: prototype schedule unchanged; extended counts/ticks/ids; pause/timeScale; restart reset; no post-terminal spawns; caps; slot validity; deferral order; tower targeting and damage; XP across waves and R at 650 XP; victory/defeat; determinism across frame partitions; construction/resource compatibility. Browser (development and production): prototype regression suites with `?encounter=prototype`, an extended unassisted full match with real controls (movement, Attack, skills, allocation, Build) recording duration, level, XP, waves, deaths, casts, base HP timeline, damage, peak units and frame times; lifecycle/stress (pause, timeScale, death/respawn, Restart mid-wave, repeated Restart, resize, 844×390 and 960×540). Performance: headless ms/tick and browser frame time reported separately; no device claims.

Acceptance: Phase 0–2B tests and browser suites pass unchanged on `prototype`; extended reaches LV6 by ordinary kills; R is cast in real combat; the match ends only by base destruction; zero duplicate spawns, stale listeners or console errors.

## 9. Out of scope

New enemy types, bosses, ranged/siege units, new art, HUD/skill-allocation redesign (Phase 2D), campaign/free-play, artifacts, Android work, changes to Guardian Balance v0.1.
