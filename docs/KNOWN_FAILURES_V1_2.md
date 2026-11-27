# V1.2 known unit-test failures

Full suite on the final code (`db4d556`, 2026-11-27): **1,726 tests, 1,705 pass, 21 fail.**
V1.1 (`b67cbd3`) on the same machine: 1,707 tests, 19 fail.

| Group | Count | Status |
|---|---|---|
| Inherited from V1.1 | 18 | Same test names with identical error, expected and actual values |
| New in V1.2 (`wave-spawn-starvation.cjs`) | 3 | Deferred by the product owner; no gameplay or assertion changes |
| Failed on V1.1, passes now | 1 | `campaign-13 active Guardian`, fixed by the B1–B5 test corrections |

## New: `tests/wave-spawn-starvation.cjs` (3), deferred

They drive Mission C1M2 (Fortify the Crossing) with the Guardian pinned on the Crimson spawn slot `(1380,600)`.
They fail with the gameplay commit (`03fb90c`) alone and pass on the Desktop-only branch.

| Line | Test | Failure |
|---|---|---|
| 21 | the deferral still holds for ten seconds, then the entry spawns, so nothing is dropped or lost | the entry is no longer queued while it should still be held |
| 34 | a delayed backlog is released one entry at a time, never all in one tick | 3 spawns in one tick, expected 1 |
| 43 | wave announcements keep the exact clock whether or not a unit blocks a slot, and the objective stays six waves | the pinned and undisturbed runs report different announcement lists |

What a limited probe of the pinned scenario showed (Guardian pinned from 60 s):

- In V1.1 no Crimson tower reaches that slot. In the approved B-series battlefield, seven do.
- The Guardian dies on the slot repeatedly. The bursts of up to three spawns happen in exactly those ticks, when the blocker disappears.
- The match ends in defeat at tick 4666; the V1.1 run does not end that early.
- Undisturbed, V1.1 and V1.2 give the same spawn count (32), at most one spawn per tick, and the same first six announcement ticks.
- The spawn-release code in `Simulation.ts` is unchanged from V1.1.

Not established: whether the bursts can happen on V1.1 under other conditions, and the exact cause of the line 21 and 43 failures.
**Player-facing effect:** a Guardian who dies while standing on that Crimson slot can release up to three held enemies at once.

## Inherited from V1.1 (18)

| File | Tests |
|---|---|
| `campaign-level-20.cjs` | Level 20 matrix: the Shop order is a real choice |
| `campaign-level-21.cjs` | bot, early raid at 5 s |
| `campaign-level-36.cjs` | the bot defends and wins with and without the third Barracks |
| `campaign-levels-6-8.cjs` | Breach the Front on either flank; two Archer Towers at home first |
| `campaign-levels-9-10.cjs` | Level 9: without Vanguard Charge the mission never completes |
| `campaign.cjs` | Full Battle replays the Stage 1 match exactly |
| `golden-simulation.cjs` | goldens `chapter1-level-06`, `chapter1-level-10`, `full-battle` |
| `last-warlord.cjs` | Phase E balance (Phase A and Phase D abilities: split Heroes); Phase E tactics `guardian`, `heroes` |
| `match-setup.cjs` | legacy golden replay; MatchSetup equivalence; harness mutations; no configuration leaks |

`campaign-level-24.cjs` failed once at file level in an earlier integration run under heavy load. It did not recur in the final run.
