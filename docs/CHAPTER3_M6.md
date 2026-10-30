# Chapter 3 · M6 — Mission 6 "The Frost Warlord"

Status: Game Director PASS (2026-10-30): gameplay approved and balance locked as implemented. Committed on `chapter3/m6-frost-warlord` (off `chapter3/m5-fallen-outposts` 96cde4c), not pushed, merged or deployed. Chapter 3 stays Coming Soon.

Human playtest (dev server only): `http://127.0.0.1:5261/?debug=1&chapter=3&mission=6` (`?debug=1&level=26` is the same mission).

## Human playtest and Director approval

- First attempt: defeat after rushing the Crimson Keep (the Warlord reached the Azure Keep first).
- Second attempt: **victory in 7:24**, the Guardian died 3 times. Plan: 2 Azure Towers and 3 Azure Barracks, destroy the 2 outer Crimson Barracks, buy the HP / ATK / Critical / Hammer upgrades, clear the enemy towers and walls, then attack the Crimson Keep.
- The Guardian held a narrow wall opening by attacking the enemies as they approached.

Director decision: M6 gameplay approved and the current balance locked. Guardian chokepoint defence is legitimate gameplay and needs no balance change; navigation is not redesigned.

### Chokepoint sanity check (no navigation change)

Probe on the real Level 26 with an unkillable Guardian parked in an opening for 90 s after the first wave (the Inner Gate opening with both gates down, the north gap, the south gap). Enemies attack at every opening: 333 / 765 / 481 hits on the Guardian from 11 / 16 / 12 distinct attackers. Soldiers within 250 px of the Guardian that stood still out of range did so for 0-71 ticks (at most 2.4 s) and were queueing behind a neighbour; none stayed stuck. Units far from the Guardian that stood still were fighting Azure defenders at home. No navigation bug found.

## What it is

The Twin Walls battlefield (Mission 4's, unchanged) with a new threat. The **Frost Warlord**, the Crimson Hero, waits in the courtyard behind the Inner Gate. He is released the moment the Inner Gate falls, walks out of the fortress and marches on the **Azure Keep**; he fights nothing on the way, and when he dies he returns 30 s later at his courtyard spawn for as long as the Crimson Keep stands. The garrison that rallies with him is made of **Crimson Elite Soldiers** (480 HP). The single objective is still **Destroy the Crimson Keep**; the Azure Keep reaching 0 HP is defeat. Azure Barracks: up to three (the default; Mission 5 stays at two).

Breaking the Inner Gate is therefore a choice: it opens the road to the Crimson Keep and starts the Warlord's march. The Outer Gate, the three Barracks and the Warlord himself are optional.

## Approved balance (Director)

| | |
|---|---|
| Crimson Hero | 833 HP (85% of the Guardian's 980 at level 1), 80 damage, armor 20, speed 95 px/s, range 48, same cooldown/windup as the Guardian |
| Respawn | 30 s (900 ticks) after each death, while the Crimson Keep stands; at the courtyard spawn (1560, 744) |
| Elite Soldier | 480 HP, 18 damage, speed 95: the Crimson soldier with twice the HP |
| Azure Barracks | up to 3, costs and soldiers unchanged |

Kill rewards are not part of the approved balance: the Hero gives 150 XP (a Crimson soldier 60); the Elite 60 XP; gold is the ordinary Crimson kill reward for both.

## Engine changes (small, all reuse)

1. **Archetypes** (`combat.ts`): `MinionArchetype` gains `crimson-elite` and `crimson-hero`, with their stats; `minionStatsOf` returns them. No new unit class: both are red minions, so combat, collision, navigation and the Crimson cap all apply.
2. **March** (`Movement.ts`, one line): a `crimson-hero` unit targets the Azure Keep and clears any breach plan, so it ignores the Guardian, towers and Barracks. A Guardian Taunt still holds it (the Taunt target wins).
3. **Release and respawn** (`Simulation.ts`, `MatchSetup.hero`): the Hero is released when the garrison starts (the Inner Gate, the existing trigger), `delayTicks` later, at `spawn` or the nearest free spot beside it; each death schedules a return `respawnTicks` later, and no return once the Crimson Keep is dead. He walks out; there is no teleport. `checkGates` validates the spawn like a garrison slot (blocked, outside the sealed area, or unable to reach the Azure Keep are rejected).
4. **Elite garrison** (`MatchGarrison.archetype`): garrison spawns carry the archetype.
5. HUD: "The Frost Warlord is loose · he marches on the Azure Keep" on release and each return; "Azure Keep under attack" (at most once every 8 s). The Warlord and the Elite Soldier have their own sprites (below); the normal Crimson Soldier is unchanged.

No earlier level has a `hero` or an Elite garrison; Missions 1-5 are untouched (a test pins it).

## Verified

- `npx tsc --noEmit` clean; `npm run build` green (existing chunk-size warning only); `npm test` 1,033 / 1,033 (M5 was 1,021; +12 in `tests/campaign-level-26.cjs`, plus count-only edits for Mission 6 in `barracks`, `campaign-level-21/23/24/25`, `campaign-progress`, `chapter-view`, `debug-launch`, `frost-gate`, `six-missions`).
- Real browser (`?debug=1&chapter=3&mission=6`): loads Battle + HUD on `twin-walls`; opening the Inner Gate releases the Warlord, he walks to the Azure Keep and the HUD shows "Azure Keep under attack"; no console errors.
- Focused tests: released only by the Inner Gate (not the Outer Gate, a Barracks or a tower), once, in the courtyard; the longest per-tick step is under 5 px (no teleport); out of the gate in under 10 s and in range of the Azure Keep in 15-35 s (measured about 22-23 s); every Hero hit lands on the Azure Keep; respawn exactly 30 s after a death, at the spawn, and never after the Crimson Keep falls; the garrison is Elite (480 HP) and ordinary waves stay 240 HP; the data validation rejects a Hero with no garrison, bad spawn, delay or respawn, a wrong archetype, or a spawn on a wall or outside the sealed area.

## Bot diagnostics (real Level 26; shared recall-and-rebuild bot; one deterministic run each)

| Plan | Result | Inner Gate fell | Hero | Azure Keep lowest |
|---|---|---|---|---|
| Direct (bastions, Outer Gate, court bastions, Inner Gate, Keep) | **defeat** at 282 s | 232 s | released once, never killed, 3,000 Keep damage | 40 |
| Gap road (Outer Gate ignored) | victory at 422 s | 245 s | released 3x, killed 3x, 2,240 Keep damage | 760 |

Reading: the shared bot recalls only when Crimson come within 420 px of the Azure Keep. The Warlord needs about 23 s to arrive and about 29 s of uninterrupted hits to destroy the Keep, so a bot that leaves home loses the direct race, and the gap-road run wins only narrowly. The bot never built a third Azure Barracks (the economy is about 2 wood and 0.27 iron per second, so a Barracks costs roughly 75 s of iron); the Barracks target of 2 or 3 changed nothing here. This is a signal that the Warlord is a real threat, not a difficulty verdict: it is for the human playtest.

## Known risks

- **Difficulty is unmeasured by humans.** With 833 HP and four towers the home defence alone may not kill him inside the 29 s a Keep takes; a player who never recalls loses. If the playtest finds it too harsh, the levers are Hero HP or speed, the respawn delay, or the Inner Gate's HP (when the race begins).
- **A third Azure Barracks rarely exists before about 300-400 s** (resource economy), so the unlocked cap seldom binds.
- The Warlord ignores towers while walking, so towers hurt him but never distract him; a Taunt is the only way to turn him.
- A Guardian standing in the Inner Gate plugs it; the Warlord then needs about 14 s to get out and can die at the door (seen in the probe).
- Elite Soldiers are garrison-only (4 and 5 every 750 ticks after the Inner Gate falls); the ordinary waves stay ordinary.
- Art: single static sprites cut out of the concept sheet, not frame animation. The game has no per-unit animation, facing or attack frames (units slide, damage numbers and rings show combat), so the sheet's walk and attack frames were not used. The sheet's painted style is darker and more detailed than the cartoon Crimson soldier; the contrast helps tell them apart but they do not match. The cut-out edges are clean at game scale; a few stray shadow pixels remain under the Warlord's feet.
- `scripts/verify-chapters.mjs` still stops at the removed Quick Play button (already failing on `main`).

## Visual differentiation (Director request)

- `public/assets/crimson-warlord.png` (411 x 300) and `public/assets/crimson-elite.png` (218 x 300), RGBA, cut from `art/source/m6-warlord-concept-sheet.png` (the approved concept sheet, kept as the source). Loaded with the other unit art in `Battle.ts`; sizes in `src/world/crimsonEliteAppearance.ts` (Warlord 1.9x, Elite 1.5x the Crimson sprite height). The Warlord: red-black heavy armor, white fur mantle, red cape, oversized axe. The Elite: red-black armor, spear and shield. `minion-red.png` and the normal Crimson Soldier are untouched.
- Strictly visual: the sprite size follows the picture, the collision radius (20 for the Warlord, 12 for the rest), hit points and every other value are unchanged; the Warlord health bar is the Guardian's width, the Elite's a little wider than a soldier's.
- Verified in the browser at 844 x 390 (mobile landscape, device scale 2) with all three types fighting the Guardian: the Warlord reads as the boss (about twice a soldier), the Elites as tall dark spearmen, the normal soldiers as the bright red ones. No console errors.

## Changes

- `src/data/combat.ts`: archetypes, stats, `heroId`. `src/data/progression.ts`: Hero XP. `src/data/matchSetup.ts`: `MatchHero`, `MatchGarrison.archetype`, validation.
- `src/simulation/Movement.ts`: the march. `src/simulation/Simulation.ts`: release, respawn, Elite garrison, spawn validation.
- `src/data/campaignLevels.ts`: `frostWarlordLevel` (campaign-26). `src/scenes/Battle.ts`, `src/scenes/HUD.ts`: sprites, names and sizes, HUD messages.
- `public/assets/crimson-warlord.png`, `public/assets/crimson-elite.png`, `art/source/m6-warlord-concept-sheet.png`, `src/world/crimsonEliteAppearance.ts` (visual only).
- `tests/campaign-level-26.cjs` (12 tests) and the count-only updates listed above.
