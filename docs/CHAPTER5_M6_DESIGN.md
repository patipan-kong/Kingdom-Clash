# Chapter 5 M6: The Crimson Throne — revised design proposal (not implemented, awaiting final PO approval)

Revision 2, after PO review ("REVISE DESIGN"). Design and feasibility only: no gameplay, no commit of this file, nothing built. Every number is a starting candidate for the human Galaxy S24 playtest; bot runs are evidence only. M5 (committed `97a5f09`) and Chapters 1-4 are untouched, and M5 balance is not modified.

## PO-approved direction (kept)

Title "The Crimson Throne"; Final Counteroffensive concept; Hero Cap stays **2**; Lord 1.2x HP, 1.1x damage, 45 s respawn; Commanders 240 s and 330 s; Throne Gate 3,000 HP; M5 map systems and assets reused with different placement and flow; Chapter 5 stays Coming Soon; difficulty about 9.5/10; clear time 11-14 min; at least two viable approaches; no new systems or dependencies.

## Feasibility findings (checked against the code)

### 1. Can the Chapter 3 Warlord release and respawn support the Lord? — Partly. Release in a camps mission is a blocker without a small core change.

What the Warlord is: `setup.hero` (spawn, delayTicks, respawnTicks) plus `setup.garrison.after`. When the named gate dies (`Simulation.ts` ~554) the Hero is scheduled; `heroDue` spawns him at `spawn`; on each death he is rescheduled `respawnTicks` later while the Crimson Keep stands (~561). He marches on the Azure Keep (`Movement.ts` ~72).

Why it does not carry over to a mission with outposts, as the code stands:

- **Registration:** the gate-triggered Hero is registered under `heroId` only when the match has **no camps** (`Simulation.ts` 167). With camps, `setup.hero` registers the **Raider** (`raiderId`), released `delayTicks` after the *start*, not by a gate.
- **Trigger:** the gate hook (554) only schedules `heroId`, and in a camps mission `heroId` is the South Warden (M4/M5), which is already on the field.
- **Behaviour:** the "march on the Keep and fight nothing else" branch is guarded by `!camps.length` (`Movement.ts` ~72). With camps, a non-Commander Hero behaves as a **Raider**: Banners first, then Azure outpost towers, then the Keep.
- **Stats:** `heroDue` spawns plain `crimsonHero` stats (833 HP, 80 damage, armor 20, speed 95). The only existing HP/damage multipliers are the Commander ones (`MatchCommander.hp/damage`), which come with warnings, rest timers and a flank lane, none of which a gate-released Lord needs. **1.2x HP / 1.1x damage cannot be expressed today.**
- **Respawn:** 45 s is plain data (`respawnTicks` 1350), no change.

What this means for the Lord:

| Option | Gate-released | Marches on Keep | 1.2x / 1.1x | 45 s respawn | Core change |
|---|---|---|---|---|---|
| A. Reuse as is (Raider with camps) | no (timed from start) | no (hunts Banners/towers first) | no | yes | none |
| **B. Minimal core extension (recommended)** | yes | yes | yes | yes | ~10 lines |
| C. Drop the Lord, use Elite garrison waves | n/a | n/a | n/a | n/a | none (does not meet the brief) |

**Option B, needs PO approval before any Simulation edit.** An optional `MatchHero.lord?:{hp,damage}` (absent changes nothing). When present: (1) the Hero is registered for the gate trigger even though camps exist, (2) he marches on the Azure Keep even with camps (the `!camps.length` guard also accepts "is a Lord"), (3) `heroDue` applies the hp/damage multipliers the way `commanderDue` already does (`Object.assign(u,{maxHp,hp,damage})`). The Warden-versus-Lord id clash is avoided by registering the Lord under `raiderId` and having the gate hook also read that entry, or by removing the South Warden from M6 (see map section). Chapter 3 M6 and Chapter 4/5 missions set no `lord`, so they are unchanged; tests will pin that. This is of the same size and kind as M5's `wreckAtStart`/`post` extension.

Without approval I will not touch core code, and the fallback is Option A with a timed Raider-style Lord at stock stats, which misses the brief's gate beat; I would not recommend it.

### 2. Commander release versus Gate destruction and Lord activation

- Commanders are **independent of the gate**: `firstTick` and `restTicks` only (`commanderDue`). They are released by time (and re-warned `restTicks` after each death while the Keep stands). There is no gate-linked Commander release, so none is proposed.
- The Lord is gate-triggered, so his timing is the player's choice. The M5 bot data says the gate falls at **226-261 s** (median) in the normal plans (159 s for a direct rush that then loses). With the Marshal at **240 s** that is **the middle of the Marshal's window** for a typical run.
- The Marshal was killed 24-50 s after release in the inspected M5 runs, so he is usually down by about 265-290 s; the Shadowblade arrives at **330 s**. Commanders return after each death (60 s / 40 s rest) while the Keep stands, so waiting longer does not escape them.

Consequences, stated honestly:

| Gate falls | Lord arrives | Overlap |
|---|---|---|
| Before 240 s ("early breakthrough") | before the Marshal | Lord alone for a short time, then Lord + Marshal if the Lord is not yet dead |
| About 290-330 s ("methodical", after the Marshal, before the Shadowblade) | in the quiet window | Lord alone, then Shadowblade at 330 s |
| After 330 s | with the Shadowblade and any returning Marshal | Commanders recur: unavoidable late |

So "avoid unavoidable simultaneous Marshal + Shadowblade + Lord" is **achievable but only if the player times the gate**, and a window of about 40 s (290-330 s) is tight. To make it comfortable without touching the approved timings, the levers are data only: a **longer Marshal rest** (for example 90 s instead of 60 s) so the Marshal does not return before the Lord is handled, and a **smaller Last Stand garrison** at the Throne Gate (3 Elites instead of 4) since the Lord is the new climax. Both are for the PO to confirm; M5's own values are unchanged.

### 3. Can the M5 map geometry support distinct counterattack routes? — Yes, with data only.

`last-stronghold` is the Crimson Fortress geometry, which has `flankVia` waypoints north (792,288) and south (792,888) and two outside wave slots (1776,480)/(1776,720). The existing wave rules `flanks` (a wave sent by one road, all units or raiders) and `lanes` (a wave split between roads) work in a garrison/Commander match (the matchSetup validator imposes no restriction against either). M2 used `flanks`.

Staged counterattacks, data only (waves arrive 30 s, 60 s... after the first wave at 30 s):

| Stage | Wave (time) | Route |
|---|---|---|
| 1 | 3 (90 s) | south road only, all units |
| 2 | 5 (150 s) | north road only, all units |
| 3 | 7 (210 s) | split between both roads (`lanes`), just before the Marshal |

The Marshal and Shadowblade then pick their roads by the existing rules (the Shadowblade targets the Barracks farthest from the Guardian). The Ballista, the War Cart and both outposts keep their M5 meaning, so the two approaches below stay available.

To feel distinct from M5 with the same assets: different placements of the Azure Barracks pads (one pad closer to each outpost than M5), the forward towers at different cells, a Throne Gate of 3,000 HP with 3 Elites on its fall, and no second Warden in the South Outpost (it removes the id clash above).

## Revised mission proposal

| Item | Candidate |
|---|---|
| Level | `campaign-46`, Chapter 5 slot 6, "The Crimson Throne" (stays Coming Soon) |
| Terrain | Crimson Fortress geometry as a data variant (as M5), a new `crimson-throne` id aliasing its art |
| Start | 100 Gold, 200 Wood, 30 Iron |
| Hero Cap / Barracks cap | 2 / 2 (PO) |
| Objectives | capture North and South Outposts, then destroy the Crimson Keep; the Keep stays shielded until both are Azure |
| Throne Gate | 3,000 HP, Last Stand 3 Elites (PO to confirm) |
| Crimson Lord | Crimson Hero stats x1.2 HP, x1.1 damage, released by the gate, respawn 45 s (Option B) |
| Commanders | Iron Marshal 240 s, Shadowblade 330 s; Marshal rest 90 s proposed, Shadowblade 40 s unchanged |
| Waves | M5's [7,7,8,8,9,9,10,10], first at 30 s, every 30 s, staged flanks as above |
| Siege | Ballista (North) and War Cart (South) exactly as M5 |

## Two viable approaches (kept)

1. **Early breakthrough:** siege first (Ballista and cart), break the Throne Gate before the Marshal arrives, then race the Keep while heroes under Defend hold the Lord off. High risk, fastest.
2. **Methodical:** outposts, Barracks and towers first, absorb the staged counterattacks and the Marshal, then break the gate in the 290-330 s window with Commanders handled. Slower, safer.

A direct rush on the gate still cannot win while the outposts hold the Keep shielded (M5 rule).

## Risks and blockers

- **Blocker:** the Lord needs Option B (a small core extension) or the brief is not met. PO approval needed.
- The 290-330 s clean window is narrow; the Marshal rest lever and a smaller Last Stand are data levers to widen it.
- Staged flanks plus a Lord raise the peak live unit count (M5 peaked at 26-31 against 40).
- Iron stays the binding resource (about 15/min); M6 adds no economy.
- The bots use the Warlord/Lord only if the support file is extended; bot results remain evidence only and the S24 playtest decides balance.

## Decisions requested

1. Approve Option B (optional `MatchHero.lord`, ~10 lines in `matchSetup.ts`/`Simulation.ts`/`Movement.ts`), or choose A or C.
2. Marshal rest 90 s (data-only) and Throne Gate Last Stand 3 Elites, or keep 60 s and 4.
3. Staged flank waves 3/5/7 as proposed.
4. No South Warden in M6.

## After approval

Data first (`campaign-46`, battlefield variant, art alias), the minimal `lord` extension, a test file in the style of `campaign-level-45.cjs` (Lord released only by the gate, not by time; 1.2x/1.1x; 45 s respawn; marches on the Keep with camps; Chapter 3 M6 and M5 unchanged; Commanders and Lord coexist; flank stages; validation), list-test updates, an adapted bot, a 780x360 browser script, the full suite, then stop for PO review. No commit, merge, push or deploy until reviewed.
