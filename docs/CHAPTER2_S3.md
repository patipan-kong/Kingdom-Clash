# Chapter 2 S3 — Desert Raider (specification, awaiting approval)

Branch `chapter2/s3-desert-raider`, worktree `G:/work/ark/arkhero-chapter2-s3`, based on `chapter2/s2c-canyon-integration` at `a6920b0`. The mobile worktree is untouched. **Status: specification only; no code is written.**

## Scope

Add a fast, fragile **Desert Raider** enemy archetype on the existing red-minion infrastructure. Mechanics, stats and spawn plumbing only. No new AI, no flanking, no Level 11–14 content.

Out of scope: Levels 11–14 (Level 11 is the first Canyon playable slice and not necessarily the Raider introduction; Level 13 adds two Raiders per wave from Wave 3; Level 14 adds mixed enemies and north-route flanking), flanking (S5), mobile HUD, campaign menus, result screens, new painted art, any Chapter 1 behaviour change.

## Stats

| | Crimson (existing `minionStats`) | Desert Raider |
|---|---|---|
| HP | 240 | **130** (provisional) |
| Speed | 95 | **150** (provisional) |
| Damage | 18 | **14** (provisional) |
| XP on kill | 60 | **40** (provisional) |
| Radius | 12 | **11** (provisional; see decision D1) |
| Armor | 0 | 0 (preserved) |
| Range / cooldown / windup | 48 / 30 / 9 | 48 / 30 / 9 (preserved) |
| Gold on kill | 25 (waves 1–12), 10 (wave 13+) | same rule, unchanged |

All Raider numbers are provisional and live in one data table so balance changes touch one place.

## Architecture

- `kind` stays `'minion-red'`. Every `kind==='minion-red'` and `startsWith('minion')` check (movement, aggro, retaliation, Guardian skills, towers, burn, banner, mission rosters, caps) therefore applies unchanged.
- New optional `archetype?: 'desert-raider'` on `Unit` and `SpawnEntry`. **Absent means Crimson.** Crimson units and spawns never carry the key, so Chapter 1 and golden state hashes are byte-identical.
- Stats come from an archetype table in `src/data/combat.ts` (`crimson` is the existing `minionStats`, Raider is the new row).
- Raider counts are added to wave definitions as an optional `raidersPerWave` (absent = none).
- Raider ids keep the `red-w{n}-{i}` format. This keeps `crimsonWaveOf`, the Battle visual cleanup (`id.startsWith('red-')`), and wave tracking working.
- Visual: a sand-coloured texture recoloured at load from the existing `minion-red` image, using the same recolour pattern as `tower-red` and the Canyon dry foliage. Display name "Desert Raider".

## Reward accounting (checked against the baseline)

- **Gold:** `Economy` rewards by `crimsonMinionGold(lifeId)`, which reads only the wave number from the id. Because gold is preserved and ids are unchanged, **no gold code changes**: a Raider pays 25 in waves 1–12 and 10 from wave 13. The recovered design needs no gold change.
- **XP:** `XPRewards.award` reads `enemyXp[target.kind]`, which would pay 60 for a Raider. This must become archetype-aware (Raider 40). This is a real change.
- **Mission validation:** `validateMission` bounds tower damage by `crimsonSpawns × minionStats.maxHp` and reachable level by `crimsonSpawns × 60`. With Raiders both would be wrong (too high). It must receive total Crimson-family HP and XP computed from the spawn list. The kill-count bound is unchanged.
- **Tower damage / kill objectives** (`tower-kills`, `waves-defeated`) key on `minion-red` and the wave roster, so Raiders count as ordinary Crimson kills with no change.
- **Guardian damage:** `crimsonMinionRawVsGuardian` already takes `source.damage`, so Raider damage flows through the existing variant scaling. A Raider hits the Guardian for the variant-scaled 14, not 14 flat.

## Wave composition

Add optional `raidersPerWave: number[]` to `WaveRules` and the `waves` override in `matchSetup`. Absent or all-zero produces exactly today's spawn list.

Proposed rules (decisions D2–D4 below):
- Raiders are **part of** the wave's total (`enemyPerWave[n-1]`), not added to it. A wave of 5 with 2 Raiders is 3 Crimson + 2 Raiders, so wave size, caps (24 red), spawn stagger and the existing balance are unchanged.
- Raiders take the **last** indices of the wave. They spawn at the end of the stagger and then catch up because they are faster.
- Beyond the array (continuous or `until-objectives` waves) the last value repeats, clamped to the wave size.
- Validation: whole numbers ≥ 0, each ≤ that wave's total, array not longer than `enemyPerWave`.

Level 13's "two per wave from Wave 3" is then expressible as `raidersPerWave:[0,0,2]` and is not implemented in S3.

## Decisions that need your approval

- **D1. Radius 11.** The brief says "visual radius 11", but `Unit.radius` drives collision, navigation and spawn clearance, and `Navigation` builds a separate grid per distinct radius. **Recommend:** collision radius stays 12 (no second navigation grid, no change to Canyon routing or the accepted 1.37× exception) and 11 is applied as the render scale of the Raider sprite and footprint. If you want a physical radius of 11, say so and S3 will measure the Canyon benchmark.
- **D2. Included in or added to the wave total?** Recommend **included**, as above. Added Raiders would raise wave size and could hit the 24 cap.
- **D3. Placement within the wave.** Recommend **last indices**.
- **D4. Repeat rule after the array.** Recommend **repeat the last value**.
- **D5. `Unit.archetype` visible in state.** Recommend **yes**, optional and omitted for Crimson, so renderer, mission and XP can read it without lookups.

## Implementation plan and file scope

1. `src/data/combat.ts`: archetype stat table; `minionStats` stays exported and equal to Crimson.
2. `src/simulation/GameState.ts`: optional `archetype` on `Unit`.
3. `src/data/encounters.ts`: optional `archetype` on `SpawnEntry`; `raidersPerWave` on `WaveRules`; `extendedWaveSpawns` and `extendedWaveRules` copy and use it.
4. `src/data/matchSetup.ts`: accept and validate `raidersPerWave` in the `waves` override and the `until-objectives` rule.
5. `src/simulation/Simulation.ts`: `unit()` and `spawnOpen` take stats from the spawn's archetype and set `archetype` only when it is not Crimson.
6. `src/data/progression.ts` and `src/simulation/XPRewards.ts`: archetype-aware XP.
7. `src/data/mission.ts` (and its call in `matchSetup.ts`): HP and XP totals from the spawn list.
8. `src/scenes/Battle.ts`, `src/world/layout.ts`, `src/world/battlefieldArt.ts` or a small recolour helper: sand texture and name.
9. Tests: new `tests/desert-raider.cjs` (stats, spawn composition, XP, gold unchanged, mission validation, determinism, no key on Crimson units). Existing golden fixtures must pass **without regeneration**.
10. This document gets an implementation record at the end.

Not touched: `Movement.ts`, `MinionAggro.ts`, `Navigation.ts`, `GuardianSkills.ts`, `Economy.ts`, `campaignLevels.ts`, HUD, menus, result screens.

## Verification plan (after approval)

Typecheck; focused tests only (`desert-raider`, golden, mission, match-setup, canyon-pass); golden fixtures diff by 0 lines; the Canyon benchmark with no Raiders must equal S2c, and a Raider-mixed run reported separately; no commit until reviewed.

## Known follow-ups (not S3)

- Real desert artwork (the recolour is a placeholder).
- Level 11–14 content and the S5 north-route flanking.
- Raider balance retune from human playtests; all numbers above are provisional.
- Real-device performance measurement.

## Implementation record

Approved decisions: D1 radius 11 is visual only (collision stays 12, no new navigation grid); D2 Raiders are inside the wave total; D3 last indices; D4 repeat the last value, clamped, empty or absent means none; D5 optional `archetype`, omitted for Crimson.

Implemented in `combat.ts` (`desertRaider`, `minionStatsOf`), `GameState.ts`, `encounters.ts` (`raidersPerWave`, `raidersInWave`), `matchSetup.ts` (override, validation, HP and XP totals), `mission.ts`, `progression.ts` (`enemyXpOf`), `XPRewards.ts`, `Simulation.ts`, `Battle.ts`, `layout.ts` and the new `world/desertRaiderAppearance.ts`. Tests: `tests/desert-raider.cjs`.

Verification: `desert-raider.cjs` 11/11; `golden-simulation.cjs` 8/8 without regeneration (`tests/golden` unchanged); `match-setup.cjs` and `mission.cjs` pass; `npm run build` (typecheck and production build) passes; `git diff --check` clean. The full suite and the browser matrix were not run. The sand recolour has not been viewed in a browser.
