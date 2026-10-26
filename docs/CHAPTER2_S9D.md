# Chapter 2 S9D — Lane commitment and Crimson Keep protection (Level 14)

Branch `chapter2/s8-level-14`, baseline `3d74905` (S9C). Status: implemented, awaiting owner review. Not committed.

Human playtests of S9C showed two bypasses: a Guardian standing at the Crimson spawn held most of a wave (units spawn inside its aggro reach, so lanes were abandoned), and the inert Crimson Keep could be destroyed (ending nothing, but closing the Shop for the rest of the match). Victory stays Build 3 Towers + Defeat 8 Waves; no Keep-destruction victory was added.

## Changes (both opt-in, default off, enabled on Level 14 only)

1. **Lane commitment** — `WaveLaneSplit.commit?: boolean` (`src/data/encounters.ts`). A committed unit carries `unit.flank.commit` (`GameState.ts`).
   - `flankSuspended` never suspends a committed unit (`Flank.ts`).
   - `Movement.ts`: the unit's flank is ended first (reached / passed / 600-tick timeout / no waypoint, the existing `flankEnd`) even if it is in combat, so commitment is bounded by `FLANK.timeout`. While committed, the unit does not acquire or keep the Guardian as a target (`pursue()`), so Guardian hits cannot hold it. It still attacks any non-Guardian target in reach. A Taunt still applies (explicit status).
   - After release the unit is an ordinary minion: acquire/retaliate/leash rules and constants are untouched.
2. **Crimson Keep protection** — `MatchSetupOverrides.crimsonKeepInvulnerable?: boolean`, `MatchSetup.crimsonKeepInvulnerable`. The Keep gets `invulnerable: true` in `Simulation.armKeeps`; `canAttackOn` (`Combat.ts`) rejects it as a target for every attacker, and the central `hit()` ignores damage to it. The entity, battlefield schema and mission objectives are unchanged. It is rejected together with `crimsonKeepArmed`.
3. Level 14 sets `commit: true` on all six lane waves and `crimsonKeepInvulnerable: true`.

Not changed: Levels 1–13, Level 15, global aggro or damage constants, enemy damage, progression, saves. Technical debt recorded, not fixed: on other levels the Shop closes permanently once an unprotected Crimson Keep is destroyed (`ArtifactTransactions.ts` `artifactAccessReasonOn`).

## Verification

- Focused tests (all pass): `flank`, `lane-split`, `campaign-level-14`, `campaign-level-12-13`, `campaign-levels`, `campaign-levels-9-10`, `campaign-level-11`, `keep-defense`, `match-setup`, `campaign`, and the new `lane-commit` (7 tests). `tsc --noEmit` clean. The full suite was not run.
- Replay equivalence: a scratch script hashed bot matches (log + final state) for Levels 1–13 and Full Battle, active and parked, on a build of `3d74905` and on this tree: all 28 hashes identical. Level 14 with both flags off is also identical to the S9C build.
- Browser (headless Chrome, real campaign path, seed 3): Level 14 briefing to battle; 1500 ticks of attack orders on the Crimson Keep left it at 3000/3000 with no damage event and the Shop gate unchanged; wave notices 3 and 4 correct; 10 of 10 tagged units committed; no runtime errors. The Guardian was placed beside the Keep by a harness shortcut.

## Level 14 matrix (shared bot; towers at `[15,5] [15,18] [16,5]`; seeds 1–4)

Each cell is the range over seeds 1–4. "S9C" = commit off, Keep unprotected (the committed baseline); "S9D" = current. Crossings are tagged units that crossed a bank (N/S), of 27–35 tagged.

| Guardian | Build | Result | Time | G deaths | Towers lost | Tower damage | Azure Keep damage | Crossed N/S | Crimson Keep damage |
|---|---|---|---|---|---|---|---|---|---|
| active (620,600) | S9C | 4 victories | 240–249 s | 0 | 1–2 | 1354–1900 | 0 | 18–21 / 14–17 | 378 |
| active | S9D | 4 victories | 239–260 s | 0 | 2–3 | 1504–2598 | 0 | 18–21 / 14–17 | 0 |
| forward (1330,600) | S9C | 4 victories | 239–240 s | 1 | 0 | 328–592 | 0 | 4–6 / 4–6 | 288 |
| forward | S9D | 4 victories | 237–266 s | 0 | 1–3 | 1044–2582 | 0 | 14–20 / 4–7 | 0 |
| parked | S9C | 4 defeats | 212–235 s | 0 | 6–7 | 4142–4550 | 1484–1492 | 15–19 / 10–16 | 378 |
| parked | S9D | 4 defeats | 189–255 s | 0 | 4–8 | 2912–5200 | 1478–1498 | 14–19 / 6–17 | 0 |

Observations:
- Forward Guardian: tower damage rises about 3–5x and the Guardian no longer dies at the spawn; the match is still won. Committed units were released within at most 232 ticks (limit 600); none was left stuck.
- South crossings stay low (4–7) with a forward Guardian because the Guardian kills most tagged units on their way (21–24 of 35 in seeds 1 and 3). Commitment stops it holding them; it does not stop it killing them.
- Active Guardian is slightly harder (extra tower loss on seed 3, 3 lost) but still wins by a wide margin; the Azure Keep was never damaged in any winning run.
- Parked still always loses, as in S9C.
- The S9C protocol's Level 14 "easy" feedback is not re-measured by the bot; a human re-playtest is the right next check.
