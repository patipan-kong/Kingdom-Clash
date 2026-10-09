# Phase 2B implementation plan

Approved design commit `d0ef44c1c340f0ed53ced3b5c135b18f92cd9632` was pushed and HEAD/upstream/remote matched with a clean tree before implementation. Option A is approved for implementation/playtesting, not final balance. Original specifications and visuals are preserved.

1. Add approved, validated rank data, Fortitude allocation, life-scoped XP participation/sharing and fraction-preserving derived growth.
2. Add authoritative cast/zone/status state and a renderer-independent Guardian skill system. Reuse damage/death/rewards, grounded terrain/unit footprints, LOS, navigation and the fixed 30 Hz clock.
3. Integrate tick-bound expiration, cast acceptance/windups, charge sweeps, taunt targeting, shields/aura and lifecycle cleanup without attack resets.
4. Replace player-facing previews with real tap/drag/cancel commands, authoritative cooldown/rank/status feedback and Fortitude in the allocation interface. Preserve existing artwork/layout.
5. Preserve prior test cases; migrate only obsolete Phase 2A no-reward/preview expectations explicitly superseded by approved functionality. Add focused deterministic integration tests and actual-browser normal progression/QWE; label R/high-level fixtures supplemental.
6. Run all automated tests, original regression/construction/navigation/collision/match/lifecycle browser checks, new skills checks on both builds, production build and diff checks. Report evidence and limitations; leave Phase 2B uncommitted/unpushed.

Risks: accepted casts must cancel basic windups without resetting readyTick; pause must freeze committed effects; charge must stop straight at unit/terrain contact; taunt must retain necessary breach behavior and permit attacks; zone grants must be once per life and cleaned on death/terminal; growth must not heal dead heroes or accumulate buffs. Six finite enemies cannot normally unlock R. No extended schedule, roster, campaign/free-play, artifacts, new heroes or Android work.
