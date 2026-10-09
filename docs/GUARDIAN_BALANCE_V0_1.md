# Guardian Balance v0.1 — Option A approved for playtesting

9 October 2026 · **Option A approved for implementation and playtesting, NOT final gameplay balance.**

## Product Owner approval record — 9 October 2026

The Product Owner approved Option A for the first Phase 2B implementation. Approval covers its XP rewards, +60 HP/+3 Attack/+1 armor per level, HP-fraction adjustment, all Q/W/E/R rank values, targeting, status, passive, shield and Fortitude policies. There is no mana system and no skill damage against structures or bases. XP eligibility is recent positive damage within300 ticks or living proximity within240 world units with LOS; dead recent participants qualify. Integer shared XP uses deterministic remainder assignment, includes eligible LV20 heroes in the divisor and discards their share.

Q is a single-target stun; W redirects targets while preserving attacks; E stops at the first relevant unit or obstacle with no phasing/knockback; R protects allied units rather than structures. Passive gives near-base armor and Fortitude unlocks atLV18/LV20. The specified XP thresholds, existing skill rank gates and total20-point budget remain unchanged. **Extended Combat Test is approved as a separate future phase and is excluded from Phase 2B.** No new waves, rosters or long-match mode are authorized now.

Historical proposal tables and source labels below are preserved verbatim for traceability. PROPOSED means the origin of a value; **Option A values/policies now have approval for implementation/playtesting**. Option B remains an unapproved alternative. All calculated scenarios remain offline estimates, not verified gameplay balance. The references to pending approval/current Phase 2A behavior describe the original design baseline; this record supersedes them for Phase 2B authorization.

Phase 2A foundation: `c81af4147e577f65cd25396c9b5029b8f9c8d0be`, committed with `feat: implement hero progression foundation` and pushed to `origin/main`. Before this document was created, HEAD/upstream/remote matched and the working tree was clean. Finalization passed 112 automated tests, 119 browser checks on each build, production build and diff checks. See [finalization](phase2a/finalization.json).

**Recommendation: Option A, Conservative.** Keep the inherited basic attack and footprint, add modest growth, targeted control, a short charge and a protective zone. Use cooldowns without mana. Do not give skills damage against structures or bases, healing, attack resets or invulnerability. Even this option needs a stronger or longer encounter to test late-game danger: the existing Guardian already overwhelms the six-minion prototype.

All new numbers below are **PROPOSED**, including the recommendation. The current game still awards no normal XP and Q/W/E/R remain visual previews. This document changes none of that.

## 1. Goals and evidence boundaries

Guardian is a durable melee frontline hero. Q stops one threat, W draws a small group away from allies, E engages or retreats without crossing obstacles, and R protects nearby allies for a short window. The near-base armor passive rewards defending. Skill Points should offer a choice between control, mobility and protection rather than an obvious damage-only path.

On mobile, use one target for Q, self-centered W/R and directional E. Keep the approved HUD, camera, sprites, terrain and joystick. Necessary aim/status feedback should accurately represent world footprints without redesigning the visuals. Give enemies opportunities to attack between casts, leave the zone, use walls to break targeting and punish a failed charge.

Evidence labels used throughout:

- **SPECIFIED**: original 01/02/03/04/05/06/07/09 documents. Their balance numbers are starting values, not proven balance.
- **IMPLEMENTED**: data and behavior at the Phase 2A commit above, including earlier prototype assumptions.
- **PROPOSED**: this design's unapproved values and policies.
- **CALCULATED**: arithmetic or offline model outputs using explicitly identified implemented/proposed inputs. These are estimates, never measured gameplay results.

External research supports principles, not these numbers. Riot's [counterplay discussion](https://www.leagueoflegends.com/en-gb/news/dev/quick-gameplay-thoughts-may-14/) describes tactical responses and weaknesses appropriate to a champion's strengths. Its [clarity article](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/) emphasizes communicating gameplay, prioritizing major effects and reducing visual noise. Our inference is to make the charge direction and zone boundary readable and preserve cooldown windows; no League balance values are imported.

## 2. Existing rules and values

Reviewed all eight requested original specifications, [Phase 2A plan](PHASE_2A_PLAN.md), and current progression, simulation, combat, movement, collision, construction, economy, match and layout data.

| Rule/value | Label | Source and implication |
|---|---|---|
| LV1–20; one point initially and one per level; total 20 | SPECIFIED + IMPLEMENTED | 02; `data/progression.ts` / `simulation/Progression.ts` |
| Next threshold `80 + 25 × (LV−1)`; stop XP at LV20 | SPECIFIED + IMPLEMENTED | 02; repeated threshold consumption implemented |
| Q/W/E ranks 1–5 at LV1/3/5/7/9; R ranks 1–3 at LV6/11/16 | SPECIFIED + IMPLEMENTED | 02 calls regular gates a proposal; user explicitly requires retaining them in this design |
| Two special stat ranks; no additional skill slot | SPECIFIED | Effects/gates absent; two points currently remain unspendable |
| Participation or assistance, no mandatory last hit; share XP among eligible heroes | SPECIFIED | 02; positive-damage participation hook implemented, reward policy absent |
| Normal XP rewards `{}`; assistance radius undefined; no stat growth | IMPLEMENTED | Phase 2A deliberately avoided invented data |
| Shield Bash / Taunt / Charge / Guardian Zone; passive armor near base | SPECIFIED + IMPLEMENTED names | 02; names/render previews exist, functional effects do not |
| Physical/magic: `raw × 100/(100+max(0,armor))`; direct ignores armor | SPECIFIED + IMPLEMENTED | 02; `Combat.ts`; same armor currently covers both physical and magic |
| Stun, Slow, Burn, Shield; source/duration/stacking; stronger Burn refreshes | SPECIFIED | Functional status system not implemented; this kit does not add Burn |
| Respawn `min(25,5+0.8×(LV−1))` seconds; full HP, safe spawn, 2s protection ending on attack | SPECIFIED + IMPLEMENTED | LV1 150 ticks; LV20 606 ticks; preserve XP/ranks |
| Fixed 30 Hz; pause/background freeze; Build/Shop 0.25 timeScale | SPECIFIED + IMPLEMENTED | 06/07; one authoritative GameState and clock |
| World grid 48; 40×24; four-neighbor routes; dynamic radius collision | SPECIFIED + IMPLEMENTED | 04; world positions independent of presentation projection |
| HP/armor/damage/attack timings below | IMPLEMENTED assumptions | `combat.ts`; not original hero/minion balance specifications |
| Guardian HP1200, armor20, ATK80, speed280, radius20, range90 | IMPLEMENTED | Melee unit range currently measures center distance |
| Guardian attack cooldown23 ticks, windup6 ticks | IMPLEMENTED | 0.7667s interval, 0.2s windup; windup is inside the cooldown interval |
| Both minion factions HP240, armor0, ATK18, speed95, radius12, range48 | IMPLEMENTED | One shared melee profile; no ranged/siege/boss stats exist |
| Minion cooldown30 ticks, windup9 ticks | IMPLEMENTED | 1s interval, 0.3s windup |
| Wooden Wall HP400, cost25 Wood, build60 ticks | SPECIFIED + IMPLEMENTED | 04; armor0 implemented; 1×1 footprint |
| Archer Tower HP650, cost80 Wood/10 Iron, build150 ticks | SPECIFIED + IMPLEMENTED | 04; armor0 implemented; 1×1 footprint |
| Archer range240, damage18 each24 ticks; windup0 | SPECIFIED range/damage/interval + IMPLEMENTED | 5 cells; 22.5 raw sustained DPS |
| Bases HP3000, armor0, damage0, 3×3 footprint | IMPLEMENTED | Inherited approved display, not original specified numeric HP; attack range uses closest base edge |
| Initial three allies; red3 at tick1, red3 + allied3 at tick240; no further waves | IMPLEMENTED | `combat.ts` / `layout.ts`; two finite waves, second at 8s |
| 40 minions/faction, 30 towers/faction | SPECIFIED + IMPLEMENTED caps | 04/07; not a promise that the current stage spawns this many |
| Initial Gold250/Wood180/Iron30; income Wood2/s, Iron0.25/s; minion Gold15 | SPECIFIED + IMPLEMENTED | 03; XP proposals do not modify Gold |
| Siege Gold35, boss Gold150 | SPECIFIED only | 03; enemy types not implemented; never use these as implicit XP |
| Campaign target8–15min; Free Play Quick5–8/Standard10–15/Epic20–30min | SPECIFIED targets | 01/05; current assault is a short slice, not either implemented mode |
| Preview timers Q3.2/W4.2/E2.8/R6 seconds | IMPLEMENTED visual timings only | Not approved functional cooldowns; replace only after balance approval |
| Preplaced little tower/walls are illustrative static obstacles | IMPLEMENTED limitation | They do not attack. Constructed towers are authoritative, blue-only today |

## 3. Missing rules and specification tensions

Originals lack enemy XP amounts, assistance distance/window, level stat growth/HP policy, every functional skill coefficient, cast geometry, cooldown, resource rule, passive strength and special-stat effects. Ranged/siege/boss combat profiles, enemy hero/building rosters, capture objectives and continuing waves are also absent from current code.

There is no required mana design. We propose none. Regular rank gates originated as a specification proposal but are implemented and explicitly required by this request; retain them. Team XP sharing is specified even though only one hero exists; design future sharing without implementing extra heroes. Original campaign/free-play durations cannot be achieved by balancing four skills against two finite waves and a passive 3000-HP base. A future approved stage/defender schedule is needed; it is not included in this design's gameplay work.

## 4. Proposed XP and stat growth

### XP rewards — entire table PROPOSED

| Eligible enemy/objective | Option A | Option B | Scope/eligibility |
|---|---:|---:|---|
| Current ordinary melee minion | 60 | 80 | Enemy life ends by valid combat; both future factions use same reward |
| Future ordinary ranged minion | 60 | 80 | Same budget, pending combat profile; no new enemy type implemented |
| Future siege minion | 120 | 160 | More durable objective pressure; provisional until HP/DPS known |
| Future boss minion | 300 | 400 | One reward pool per life; provisional, not minion-multiplied |
| Future opposing hero | `min(300,120+10×victimLV)` | `min(400,160+15×victimLV)` | Per unique life; no reward on disconnect, friendly or scripted cleanup |
| Enemy completed combat tower destroyed | 80 | 100 | One lifetime reward; current enemy towers not implemented |
| Wall, economic building, construction site | 0 | 0 | Avoid cheap structure-farming; no new Gold rule |
| Future first hostile/neutral capture of a map objective | 120 | 160 | Once per team/objective/match; no repeated recapture farming; inactive until objective exists |
| Base destruction / victory / defeat | 0 | 0 | Ends match; do not award post-terminal progression |
| Friendly, summoned, decorative or despawned units | 0 | 0 | Data must explicitly identify reward-eligible lives |

**PROPOSED eligibility:** positive HP damage in the last 10 simulation seconds (300 ticks), or alive within 240 world units (5 cells) at death with unobstructed LOS to the death position and normal visibility eligibility. Distance is center-to-center for units, nearest footprint edge for structures. Merely casting Taunt or absorbing damage does not count as damage participation; nearby protectors still receive assistance XP. No last-hit requirement; allied minion/tower last hits are valid.

An already dead hero may receive XP for its recent positive damage, but not proximity assistance. Respawn deadline remains the one recorded at death even if that award raises level; next death uses the new level. Full-HP respawn uses current derived maxHP. Protection blocks damage participation when actual damage is zero; proximity can still qualify.

Divide the reward among distinct eligible heroes: integer floor of pool/count, assign remainders in stable hero-ID order. Include eligible LV20 heroes in the divisor but discard their share, avoiding automatic XP funneling. This is an explicit proposed sharing policy requiring approval. No eligible hero means the pool is discarded, not stored. One present Guardian receives the whole pool.

Reward key = match ID + target spawn/life ID + reward category. A revived hero or reused pool slot gets a new life ID. Ignore duplicate death events, late events after terminal, despawns and invalid/nonfinite/negative/fractional amounts. Clear participation and ledgers on new match; expire old damage entries; revalidate enemy faction at damage and death. Source destruction during construction yields zero. Keep XP separate from the Gold transaction. Multi-level awards repeatedly consume thresholds and issue points exactly once. Record actual gained level/consumed XP for UI; LV20 has XP0 and no LV21.

### XP progression — CALCULATED, no formula change

Counts below are cumulative from fresh LV1, fully eligible solo ordinary kills. A wave means **three** ordinary minions; whole-wave counts round up and may overshoot the threshold.

| LV reached | XP to next LV | Cumulative XP | A kills (60 each) | A whole waves | B kills (80 each) |
|---:|---:|---:|---:|---:|---:|
| 1 | 80 | 0 | 0 | 0 | 0 |
| 2 | 105 | 80 | 2 | 1 | 1 |
| 3 | 130 | 185 | 4 | 2 | 3 |
| 4 | 155 | 315 | 6 | 2 | 4 |
| 5 | 180 | 470 | 8 | 3 | 6 |
| 6 | 205 | 650 | 11 | 4 | 9 |
| 10 | 305 | 1620 | 27 | 9 | 21 |
| 11 | 330 | 1925 | 33 | 11 | 25 |
| 16 | 455 | 3825 | 64 | 22 | 48 |
| 17 | 480 | 4280 | 72 | 24 | 54 |
| 20 | — | 5795 | 97 | 33 | 73 |

Formula for cumulative XP to LV L: `80×(L−1) + 25×(L−1)×(L−2)/2`. From LV5 specifically, 180 XP means three A minions to the next level; LV10 needs six, LV19 needs nine. Existing six kills would yield A360 XP → LV4/45 XP of155, or B480 → LV5/10 of180. Actual Phase 2A remains LV1/XP0. Even B cannot unlock R with the current finite roster, which needs 650 XP.

**Hypothetical pacing, PROPOSED assumption only:** three enemies every20s with immediate kills gives A540 XP/min. At 50% eligibility, ~270 XP/min: LV6 ~2.4min, LV10 ~6min, LV16 ~14.2min, LV20 ~21.5min. At 100%, those times halve; an 8min match offers4320 XP → LV17, while 50% offers2160 → LV11. B gives720/360 XP/min at 100%/50%, reaching LV20 in ~8.0/16.1min. Travel, roster variation and kills delayed past the next spawn reduce these rates. XP sharing between two eligible heroes halves each rate. Wave cadence is an analysis variable, **not permission to change the current schedule or implement Campaign/Free Play**.

Recommendation: keep A60 to demonstrate real early progression first. Use an explicitly approved extended encounter to test R and late ranks. Do not inflate ordinary XP to ~967 per minion merely to force LV20 from six kills, or to109 merely to force R: that would collapse early decisions in the short fixture.

### Stat growth and current HP — PROPOSED

| Value | A, recommended | B |
|---|---:|---:|
| Fresh LV1 HP / ATK / armor | 1200 / 80 / 20, retain implemented baseline | Same |
| Each additional LV | +60 maxHP / +3 ATK / +1 armor | +70 maxHP / +4 ATK / +1 armor |
| Speed / radius / range / attack interval / windup | Retain 280 / 20 / 90 / 23 ticks / 6 ticks | Same |
| Level-up HP policy | Preserve HP fraction, round down to 0.01 HP | Same |
| Skill damage scaling | Flat rank tables; no ATK/AP coefficient | Same |

Example A: 600/1200 HP → LV2 becomes630/1260, not free full healing. Dead stays HP0. Process multiple levels once against old fraction/final maxHP. Persist fractional authoritative HP consistently; no per-render recalculation. Apply the same fraction policy to special upgrades. No regeneration, life steal, kill heal or cast heal. Level-up increases absolute remaining HP somewhat but does not restore missing percentage; survival simulations below hold level fixed and exclude this small level-up gain.

**Near-base passive, PROPOSED both options:** +5 armor within240 world units of the closest footprint edge of the living allied main base, with LOS excluding the recipient base itself. Recompute each tick; immediately remove on leaving, base death or hero death. Guardian only; no stacking per base, no healing, no resource cost and no additional skill slot. At LV1 EHP becomes1500 rather than1440: a 4.2% local increase. At LV20 A it adds117 EHP. Use derived armor, never repeatedly add/subtract mutable base stats.

## 5. Complete Q/W/E/R rank tables

Every effect/cooldown/range/duration in this section is **PROPOSED**. Rank counts/gates are retained **SPECIFIED + IMPLEMENTED**. Seconds always mean simulation seconds; cooldown conversion is seconds×30. All table timings are exact integer ticks. No skill costs HP, mana, Gold, Wood or Iron; each rank costs the specified one Skill Point once.

### Q — Shield Bash

Active single-target physical strike and stun. Focused interruption, not a wave clear. No splash radius (0). Range90 world units, center-to-center; same reach as existing basic attacks. Cast windup0.2s/6 ticks; normal movement remains available. A target must be an alive visible enemy hero/minion in range with LOS at acceptance and impact; no auto-retarget on disappearance. Invalid initial target consumes nothing; a target escaping during windup can make the cast miss after cooldown was spent.

| Rank | Unlock LV | A physical damage | A cooldown s | Stun s, A/B | B physical damage | B cooldown s |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 80 | 10 | 0.5 | 120 | 8 |
| 2 | 3 | 95 | 9.5 | 0.6 | 140 | 7.5 |
| 3 | 5 | 110 | 9 | 0.7 | 160 | 7 |
| 4 | 7 | 125 | 8.5 | 0.8 | 180 | 6.5 |
| 5 | 9 | 140 | 8 | 0.9 | 200 | 6 |

Walls, towers, bases and allies cannot be targeted. Neither damage nor stun goes through blocking geometry. Stun cancels the victim's current attack/cast windup and prevents movement/attack/cast for its duration; it never resets the attack-ready tick. Q does not reset Guardian's basic cooldown. Counterplay: break range/LOS during windup, fight during its8–10s recovery, or spread threats so one stun cannot stop all attacks. Risk: excessive attack cancellation on one priority unit; track interrupted attacks separately from nominal stun uptime.

Mobile: tap uses valid selected enemy, otherwise nearest legal enemy with stable ID tie-break. Drag selects a legal unit under the ground-space reticle within24 world units of its center; invalid release gives feedback and spends nothing. No target means no cast, never an auto-walk order.

### W — Taunt

Active self-centered protection/control. Damage0; damage type none; cast range0, radius144 (3 cells). Windup0.2s/6 ticks. At impact, each alive visible enemy hero/minion in radius with LOS is independently taunted. A self cast with no enemy is allowed and spends its cooldown, so blind timing has a cost. No bonus damage, armor, damage reduction, silence or attack-speed reduction.

| Rank | Unlock LV | A/B taunt duration s | A/B cooldown s |
|---:|---:|---:|---:|
| 1 | 1 | 1.0 | 12 |
| 2 | 3 | 1.1 | 11.5 |
| 3 | 5 | 1.2 | 11 |
| 4 | 7 | 1.3 | 10.5 |
| 5 | 9 | 1.4 | 10 |

Taunted units target Guardian using normal range, navigation and attack timings; **they can still attack Guardian**. Cancel a windup aimed at someone else, preserving readyTick; do not cancel one already aimed at Guardian. No immediate free strike. Do not force enemies through walls or water, or replace a required breach plan with an impossible route. Future enemy hero movement/attack intents follow the forced target; skills are not silenced, so a legal movement skill may escape. Forced target ends if Guardian dies, becomes protected/invalid, loses LOS for more than0.2s, or the victim moves beyond192 units; return to normal AI with its normal decision budget. Towers, structures and bases are immune.

Mobile tap/drag release casts at self; drag into cancel zone cancels. No aim direction. Counterplay: attack the taunter, stand outside radius, block LOS or exploit its10–12s downtime. Risk: elite/boss immunity is not currently specified; future roster must explicitly declare susceptibility, not silently apply universal immunity.

### E — Charge

Active directional movement plus one physical impact and movement slow. Windup0.2s/6 ticks; direction fixed when accepted. Move at600 world units/s (20/tick), up to the selected rank's maximum below. Shorter aimed distance allowed. No splash radius: swept gameplay circle radius20, enemy contact at sum of world radii. First enemy contact stops the charge, deals damage once and applies slow. Allies also stop the charge, without damage/slow; no pushing allies or passing their centers. No knockback, teleport, phasing, invulnerability or attack reset.

| Rank | Unlock LV | A damage | A cooldown s | Max travel world units | Slow %, A/B | Slow duration s | B damage | B cooldown s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 40 | 14 | 144 | 20 | 0.8 | 60 | 12 |
| 2 | 3 | 50 | 13.5 | 168 | 25 | 0.8 | 75 | 11.5 |
| 3 | 5 | 60 | 13 | 192 | 30 | 0.8 | 90 | 11 |
| 4 | 7 | 70 | 12.5 | 216 | 35 | 0.8 | 105 | 10.5 |
| 5 | 9 | 80 | 12 | 240 | 40 | 0.8 | 120 | 10 |

Final step clamps to remaining distance; maximum travel lasts0.24–0.4s before tick quantization, plus windup. Slow affects movement only, not attacks. Sweep the exact circle against units and terrain/structure footprints in ≤4-unit substeps or equivalent continuous collision. Stop before contact with any wall, base, tower, scenery, water or world edge. Charge stops straight rather than terrain-sliding around a corner. Units take priority only if their contact distance precedes terrain; simultaneous contacts resolve obstacle first then stable unit ID. A unit hit requires LOS at impact. No structural/base impact damage. Do not modify the grounded collision system or add Arcade Physics authority.

If no direction or the initial intended segment is blocked at zero travel, reject without cooldown. If a structure is built in the remaining path after acceptance, stop safely and keep the spent cooldown. New movement intents are remembered during the dash and resume after it; joystick release clears remembered intent. Dash overrides displacement for at most12 movement ticks, while Q/W/R allow normal joystick movement. Mobile tap aims toward current legal target, then last nonzero joystick direction; neither available means invalid. Drag explicitly selects direction/distance; cancel gesture consumes nothing.

Counterplay: allies/units can screen, structures block travel, the Guardian is vulnerable throughout and has12–14s recovery. Risk: bridge blockage and charge collision require real-browser testing; arithmetic cannot validate this geometry.

### R — Guardian Zone

Active stationary protective zone, centered on Guardian at windup completion. Cast range0; radius192 (4 cells); windup0.3s/9 ticks. Damage0; type none. Not a channel; normal movement permitted during/after cast. R gives a one-time temporary shield to living allied heroes/minions inside with LOS at creation, plus armor to living allied heroes/minions while inside with LOS. Structures/bases receive neither, avoiding a repeated turtle shield on a 3000-HP base.

| Rank | Unlock LV | A shield HP | A cooldown s | A/B duration s | A/B aura armor | B shield HP | B cooldown s |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6 | 120 | 55 | 4.0 | +10 | 150 | 45 |
| 2 | 11 | 180 | 50 | 4.5 | +15 | 225 | 42 |
| 3 | 16 | 240 | 45 | 5.0 | +20 | 300 | 39 |

Each eligible recipient is granted the shield **once**, capped at30% of that recipient's maxHP (current minion cap72). Late entrants gain armor but no shield. Leaving the zone loses armor immediately; the initial shield persists until consumed or the zone's original expiry. Reentering never refills it. Shield applies after armor to physical/magic damage; proposed direct damage ignores armor and bypasses shield. Source Guardian death/terminal removes the zone and all its remaining sourced shields next authoritative tick. Recipient death clears shield permanently. Refreshing/overlapping the same named shield chooses the larger remaining amount, never adds or refills per tick; same named armor aura takes the strongest, not sum. The base passive and one zone armor bonus may add.

Mobile tap/drag release casts at self; cancel zone gesture costs nothing. Counterplay: leave the zone, target unshielded structures, wait4–5s, displace the fight, or interrupt the0.3s windup. No sustained heal or invulnerability. Risk: max-rank R is a large minion survival spike even with72-HP cap; verify protected minions do not permanently block choke points.

## 6. Shared targeting, status, resource and lifecycle rules — PROPOSED

There is no mana bar/resource. Rank0, cooldown, dead/paused/terminal state, invalid target/direction, another cast or stunned state reject without changing cooldown. One cast command per unique match/request ID; no repeated effect or spend on double tap. First valid cast breaks respawn protection, like attack; invalid gestures do not. Cooldown starts on accepted command, not UI press; a miss or interruption after acceptance retains it. Common cast lock0.3s/9 ticks plus any still-active windup/dash prevents concurrent casts. Cooldowns update on the same 30 Hz clock; no reductions in this kit. On rank-up, existing readyTick remains unchanged; the next accepted cast uses the new rank. Effect rank/stats are snapshotted at acceptance.

Valid casting cancels Guardian's unfinished basic windup, preserves its readyTick and attack intent; it never resets or accelerates basic attacks. No basic strike resolves while casting/dashing. After recovery, normal targeting/attack windup resumes. External Stun, death and terminal cancel windup/dash with no impact/refund. Ordinary incoming damage does not interrupt. Q/W/R move normally; E windup holds position for0.2s, then charge, then resumes current joystick intent. Release/cancel/background/shutdown must not leave remembered movement or aim active.

Duration endpoints are half-open: active for `startTick <= tick < expiresTick`; expired statuses clear before movement and attacks on expiresTick. Stun suppresses actions; taunt changes targets without suppressing attacks; slow reduces movement. Same-name stun/taunt uses the later expiry, not summed duration; competing taunt source uses newest acceptance tick then stable ID. Same-name slow uses strongest magnitude and later expiry, without multiplying. Future slows clamp to at most50%; no speed0. Stun takes precedence over taunt actions, while taunt duration still runs. Simultaneous skills/damage resolve in stable source/request-ID order. No indefinite refresh from effects emitted every frame.

Death clears temporary statuses, active cast/dash, zone/shields and input. It preserves ranks, XP, stat upgrades and cooldown readyTicks; cooldowns continue during death on the shared clock, with no respawn refresh. Restart resets everything, including IDs/ledgers. Pausing/background freezes cast, status, cooldown and respawn; reset accumulator without simulating elapsed offline time. Terminal cancels/frees effects and rejects late commands. Pointer cancellation before acceptance costs nothing; cancellation after authoritative acceptance stops aiming only, not a committed effect. Minion targeting returns to its existing pipeline after control, preserving navigation invalidation/breach behavior.

## 7. Two special stat upgrades — PROPOSED

Use two ranks of **Fortitude** in the existing allocation panel, not a fifth active skill/button. Rank1 unlocks LV18; rank2 LV20; one Skill Point each. Each grants +5% of level-derived maxHP and +3 armor. Percentages add on the growth-only HP baseline: rank2 =110%, not compounded110.25%; excludes items/aura/shields. Preserve current HP fraction, including HP0 on death.

Why not only LV20? LV18 provides a late defensive choice for a player who saved a point, while LV20 completes the budget. Earlier than18 would compete with early skill discovery and amplify the already strong starting tank. No point is free: a LV18 player must delay another rank if buying Fortitude. Q/W/E/R still cost18 total; Fortitude costs2; exact total20. At LV20 A, rank2 gives2574 HP/45 armor, physical EHP3732.3 versus3252.6 without it (+14.7%). With passive+R3 armor70, EHP4375.8 for five seconds, plus at most240 shield (=408 raw physical EHP at that armor). This is temporary strength, not healing.

Both options use identical Fortitude. Do not implement inventory interactions until that system is separately approved. If the owner prefers LV20-only, both ranks may be allocated then with the same bonuses; timing changes require approval, not the point budget.

## 8. Combat calculations — CALCULATED, not gameplay measurements

Use A growth, implemented opponents and attack timings. No passive, skills, special upgrades, level-ups during fight, travel or defense regeneration unless explicitly noted. Armor0 opponents; basic attacks cannot miss; each attack has uninterrupted LOS. Current minion/tower HP and damage are not increased with hero level.

`Physical EHP = HP × (1+armor/100)`; `Guardian DPS = ATK×30/23`; minion DPS18; Archer DPS22.5. Do **not** add windup to the cooldown for sustained DPS: current readyTick is recorded at attack start. First ideal hit after6 ticks; nth lethal hit after `6 + (n−1)×23` ticks from attack acceptance. A newly started fixed simulation accepts on tick1, adding1/30s to the time measured from tick0.

| Guardian LV | HP | Armor | ATK | Physical EHP | Basic DPS | Minion240 TTK s | Wall400 TTK s | Tower650 TTK s | Base3000 TTK s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1200 | 20 | 80 | 1440 | 104.35 | 1.73 | 3.27 | 6.33 | 28.57 |
| 5 | 1440 | 24 | 92 | 1785.6 | 120.00 | 1.73 | 3.27 | 5.57 | 24.73 |
| 10 | 1740 | 29 | 107 | 2244.6 | 139.57 | 1.73 | 2.50 | 4.80 | 21.67 |
| 20 | 2340 | 39 | 137 | 3252.6 | 178.70 | 0.97 | 1.73 | 3.27 | 16.30 |

These tower comparisons clone the currently implemented Archer profile onto an enemy; such a tower does not currently spawn. Wall TTK assumes a legal enemy wall and LOS excludes the struck structure itself, as in existing combat. Base attacks measure nearest footprint edge. Direct damage EHP is raw HP, not the armor-adjusted column.

| LV | Survival vs1 stationary minion s | vs3 s | vs6 s | vs1 Archer s | Guardian +2 allied minions DPS | Bare base time, continuous DPS approximation s |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 80.0 | 26.7 | 13.3 | 64.0 | 140.35 | 21.38 |
| 5 | 99.2 | 33.1 | 16.5 | 79.36 | 156.00 | 19.23 |
| 10 | 124.7 | 41.6 | 20.8 | 99.76 | 175.57 | 17.09 |
| 20 | 180.7 | 60.2 | 30.1 | 144.56 | 214.70 | 13.97 |

Survival assumes enemies never die; actual fights shorten incoming DPS as kills occur. Support adds36 DPS only while both allies survive, are in range and attack the same objective. One allied Archer adds22.5 DPS against enemies, or **125% of one minion's DPS**, at range240; W can keep minions from hitting allies while Q interrupts one threat. R protects minions but cannot shield the Archer itself. Intercepting threats before they reach the tower is the intended cooperation.

Representative legal point paths (not forced builds): LV1 Q1; LV5 Q3/W1/E1; LV10 Q5/W2/E2/R1; LV20 Q5/W5/E5/R3/Fortitude2. All respect level gates and current point totals. Their A Q+E raw burst is80 /150 /190 /220 respectively (LV1 has no E). At max ranks, Q+E+one basic =357 raw single-target physical damage, enough for one240-HP minion; neither skill damages buildings. At LV10 the scenario below instead uses Q3/W3/E3/R1, exactly10 points.

Q stun duty cycle (no overlapping casts) ranges A5% at rank1 to11.25% at rank5; B6.25–15%. W forced-target duty ranges8.3–14%, but is not attack denial. R uptime A7.3–11.1%, B8.9–12.8%; shielding is one grant, not duration-scaled repeated healing. E slow movement duty A5.7–6.7%, B6.7–8%. Stun plus taunt cannot create permanent attack denial in this kit: enemies attack the Guardian during W. External future heroes could change this; do not claim global multihero CC balance.

Power breakpoints: ATK crosses120 at A LV15, changing a minion from three basic hits to two, and ATK100 at LV8 changes a400-HP wall from five hits to four. R unlock at6, R shield cap on minions, Fortitude18/20 and level-up fraction gains deserve separate observation. Base defense is already too weak in these fixed-profile calculations for a late-game tank; neither option alone fixes match pacing.

## 9. Offline scenarios A–E

Ran a separate deterministic 30 Hz event model, without importing/changing gameplay. Implemented HP/damage/armor/cooldowns/windups, proposed A level growth. All participants start full HP and immediately in attack range, stationary with LOS. Guardian focuses stable red IDs, then hypothetical tower, then base; allies focus the same sequence. Enemies focus Guardian unless the alternate is stated. Process Guardian, allies, enemies in stable order; dead targets cancel windups, readyTicks persist. No travel, collision, targeting distance, miss, reinforcements, passive, level-up, special stat ranks or skills except E scenario's stated combo. These assumptions are optimistic for the attacker and must not be called a simulated actual match.

Reproduction on this workspace: ignored [calculator](../test-results/guardian-balance/calculate.mjs) and [numeric output](../test-results/guardian-balance/calculations.json), run `node test-results/guardian-balance/calculate.mjs`. They are research scratch artifacts, not committed gameplay tools. The formulas, initial conditions and full result summary are preserved here for review.

| Scenario | Inputs | Model result | Interpretation |
|---|---|---|---|
| A | LV1 vs1 minion, basics | 1.77s; Guardian1170/1200 HP; enemy dead | Current baseline wins with only30 HP lost; early kit does not need large burst |
| B | LV5 +2 allies vs3 minions; all reds focus hero | 5.33s; Guardian1309.35/1440; both allies240 HP | Tanking retains allies' damage; no abilities required to win |
| B alternate | Same, reds focus first ally then remaining allies | 5.33s; Guardian1440; allies78/240 and240/240 | W can preserve a vulnerable ally, but shifting all damage onto Guardian has a real cost |
| C | LV10 vs3 /6 minions | 6.37s /13.27s; HP1558.60 /1098.14 of1740 | Wave size doubles but accumulated damage grows more than linearly; current3-unit wave is mild |
| D | LV20 vs3 /6 minions +650-HP Archer +3000-HP base | 24.77s /29.37s; HP2106.91 /1744.32 of2340 | Even an added fixed-profile tower cannot make this a threatening late-game defense |
| D support | Six defenders +tower/base, with2 allied minions | 26.30s; Guardian1757.27; both allies survive full HP | Support helps, but these opponents remain underpowered; no reinforcement uncertainty modeled |
| E reference | LV10 vs3 minions, basics only | 6.37s; damage taken181.40 HP | Comparison at fixed level |
| E Q/W/E/R | LV10 Q3/W3/E3/R1 vs3 minions | 6.07s; damage taken55.81 HP; raw skill impact170 | Mostly protection/control, not a large wave clear; cast time competes with basic attacks |

E schedule: accept E at tick1, first dash contact at8 for60; accept Q10, impact16 for110 and stun through tick36; W19, impact25 redirects targets already aiming at Guardian; R28, effect37 grants120 shield/+10 armor for120 ticks. The9-tick shared lock is respected. Player deliberately holds basic attacks until tick38, after the cast chain; first basic resolves44. All three enemies already start in melee range; E geometry is an illustrative one-step contact, not a collision simulation. W has no extra DPS/denial here because reds already attack the hero. Slow has no effect on stationary attacks. R shields only Guardian for the recorded hero-HP comparison; no allies present. This model assumes accepted casts cannot be interrupted, so it is a favorable protection bound, not a functional-skill verification.

Unknown defenders' HP/armor/types, path lengths, positioning and wave schedule prevent a credible exact full-match outcome. For an immediate bare-base opportunity, calculations range16–29s Guardian-only at LV20/LV1; introducing travel or reinforcement can increase or reverse that outcome. For a held defense, six existing minions supply108 raw DPS and one Archer22.5; LV20 A with no kills can sustain that combined stream for ~24.9s. The static model then kills defenders, removing that pressure. A future roster must replenish or threaten flanks before calling this balanced.

## 10. Option A versus Option B

| Choice | A — Conservative | B — Action-oriented |
|---|---|---|
| Ordinary XP | 60; six kills reachLV4 | 80; six kills reachLV5 |
| LV20 growth-only HP/ATK/armor | 2340 /137 /39 | 2530 /156 /39 |
| LV20 physical EHP /basic DPS | 3252.6 /178.70 | 3516.7 /203.48 |
| Q5+E5 raw burst | 220; needs a basic to kill240-HP minion | 320; combo kills it without basic |
| R3 protection | 240 hero shield, minions capped72, +20 armor/5s every45s | 300 hero shield, same minion cap/aura, every39s |
| Identity/strength | Defense, interception, meaningful recovery; less structural power | Stronger engagements, more frequent visible skill use, faster XP |
| Risks | Some early casts feel restrained; current enemies still too weak | More solo dominance, XP snowball and trivial minion burst; less team reliance |
| Implementation complexity | Shared targeting/status/charge/zone systems | Same systems and scope; numeric variant, not an additional feature set |

Keep W, geometry, passive, lifecycle, point gates and Fortitude the same for both; complete alternative Q/E/R numbers are in the rank tables. B bare-base LV20 TTK14.77s versus A16.30s; early/mid growth increases pressure despite all skills being structure-ineligible. Neither option permits reducing specified points/gates or replacing the approved visuals.

**Recommend A for the first functional iteration**, with a playtest gate before adopting it as balanced. It introduces the least additional damage on top of an already powerful baseline, makes W/R useful near allied troops and preserves a clear cooldown window. It does not promise 8–15-minute matches. If A feels dull, first test cast responsiveness and enemy pressure before moving wholesale to B.

## 11. Risks and mitigations requiring validation

- **Trivial base destruction:** inherited base has no attack and only3000 HP; max-level basic alone takes16.3s. Q/E cannot hit structures and R cannot shield them, but this is insufficient for the long-match target. A later separately approved defender/roster/pacing pass is necessary.
- **Overprotection:** passive+R+Fortitude briefly approaches4784 raw physical EHP at LV20 when including the240 shield. R lasts5s with40s off-window, grants once, cannot heal, and disappears on source death. Confirm future equipment does not defeat these limits.
- **Infinite sustain/farming:** no regen/heal/reentry shields or wall XP; finite per-life XP keys and objective once-per-match ledger. Level-up fraction gains are finite19 times, not per hit or per frame.
- **Permanent control:** one0.9s stun every8s maximum A; W redirects attacks rather than stuns. Future CC stacking/elite immunity needs an explicit roster policy. Do not silently exempt current ordinary minions.
- **Power spikes/crowd blockage:** LV15 two-hit basic breakpoint, R's72-HP minion shield, and charge at a crowded bridge could amplify an existing choke. Preserve unit separation/route behavior and test retreat/escape, not just successful engagement.
- **XP sharing/availability:** lost eligibility or too much sharing can prevent R; the current two-wave stage cannot test R normally. Approve a longer encounter instead of hiding a developer award in gameplay evidence.
- **Taunt AI:** do not override wall breaching with an unreachable forced target, cancel attacks every tick or award participation from zero damage. Record target transitions and use existing AI budgets.

## 12. Approval decisions and conflicts

Top five decisions before implementation:

1. Approve **A versus B**, all XP/growth/rank tables, no-mana design and explicit restriction of Q/E damage to units.
2. Approve XP eligibility: 10s damage window, 240-unit LOS assistance, dead recent participants, integer shared pool and discard of LV20 shares.
3. Approve control/collision details: Q single target, W taunt without attack denial, E stops on allies/first enemy/terrain, no phasing/knockback/reset.
4. Approve protection/stat policy: HP-fraction growth, +5 near-base passive, one-grant capped R shield, direct-damage shield bypass, and Fortitude gates18/20.
5. Select the **future validation encounter/pacing scope**: retain the six-minion short slice and accept LV4-only normal testing first, or authorize a separate extended defender/wave roster to test R/LV20. No schedule/base-stat change is authorized by this document.

Other explicit decisions: should future bosses resist control; should preplaced decorative structures ever become combat objects; when will enemy towers/heroes/capture objectives enter scope; and should cancelled accepted casts receive a partial refund (recommend no)? Until answered, ordinary current minions are fully susceptible, illustrative objects remain obstacles, unsupported objectives stay inactive and no refund is granted.

Unresolved original-specification tensions: regular rank gates were introduced as a proposal but are required here; long campaign/free-play duration targets do not fit this slice; special-stat gate timing and Shield/direct-damage interaction are not specified. No original rule forces mana or new slots. All choices above are flagged PROPOSED rather than silently amending the original files.

## 13. Implementation-ready data recommendations — PROPOSED, not code changes

Keep a single balance profile selected in data, with `version`, `status: proposed|approved`, `option`, `tickRate:30` and source commit. Do not load a proposed profile into production without approval. Validate every rank-array length and integer tick endpoint before scene creation.

| Data record | Required fields | Recommended invariant |
|---|---|---|
| Hero growth | baseHP/ATK/armor, growthPerLevel, HPAdjustmentPolicy, rounding | Derived from LV; no accumulated per-frame mutation |
| XP policy | rewardByRosterId, assistRadius240, participationTicks300, sharing/cap/dead policies | No defaults inferred from Gold; absent enemy profile fails validation for a reward-enabled roster |
| Reward life | matchId, spawnLifeId, category, team, rewardEligible, positiveDamageByHeroTick | One reward transaction per life/category; stable remainder assignment |
| Skill rank | unlockLV, damageType/amount, cooldownTicks, windupTicks, range, radius, durationTicks, targetMask, LOS, resourceCost0 | Exact5/5/5/3 entries; positive finite ranges; none type only with0 damage |
| Cast policy | globalLockTicks9, movementPolicy, acceptedCancelPolicy, snapshotRank, requestId | Command validation before spend; authoritative accepted event |
| Charge | distanceByRank, speed600, worldRadius20, contactPolicy, terrainSweepMaxStep4 | Cannot cross obstacles or units; final-step clamp |
| Status instance | id, sourceLifeId, targetLifeId, start/expiryTick, magnitude, stackingRule, type | Finite duration; no duplicate application/event; dead-life references cannot persist |
| Zone | centerWorld, radius192, created/expiryTick, sourceLifeId, shieldGrantedLifeIds | Grant ledger once; aura evaluated by geometry/LOS; cleanup on source death |
| Shield | remaining, expiry, sourceZoneId, maxHpCap0.30, directBypass | Never heals HP; no reentry refill; same-name maximum |
| Passive | kindNearBaseArmor, radius240, armor5, LOS, recipientGuardian | Computed bonus, not mutable repeated addition |
| Fortitude | maxRank2, gates[18,20], additiveHpFraction0.05, armorPerRank3 | Same20-point ledger; excludes item/aura HP |
| Hero runtime | skillReadyTicks, activeCast/dash, statuses, zone references, known ranks | GameState authority, shared Clock; restart resets |

Separate derived armor/HP from base stats and temporary effects. Avoid adding Phaser timers/physics as a second rules engine. Reuse damage, structure LOS, navigation, movement collision and progression transactions. Add ability damage only through the existing authoritative damage/death/reward pipeline so ally last hits and event ordering remain consistent. Damage events should include type, raw/mitigated amount, shield absorbed, actual HP loss and source cast ID; XP must use actual positive HP loss per the proposed participation policy. HUD observes accepted casts/readyTicks, never decrements its own authoritative cooldown or awards XP.

## 14. Acceptance criteria for a future functional-skills task

These are future tests, **not claims of completed validation**:

1. Normal initial rank allocation followed by actual Q damage/stun; exact mitigated HP loss and legal/no-target feedback without developer XP injection.
2. Normal six-minion XP earning to LV4 with A, last hits by allies/tower, assistance/dead-window boundaries, duplicates/pooling lives, sharing remainder, zero-wall XP, cap and multi-level points. Approved extended encounter required for normal R and LV20 evidence.
3. Q out-of-range/LOS rejection and escaping target; W forces a legal hero target without suppressing incoming attacks and returns to normal AI after expiry/source death.
4. E hits first enemy once; allied units, blocked walls/water/bridge banks and mid-charge construction stop it safely; no jitter/overlap/phasing; responsive joystick resume/release and existing navigation/breaching preserved.
5. R shield absorbs once, expires, cannot refill through reentry/overlap, excludes structures, caps minion shield72, and cleans up on source/recipient death. Passive changes exactly at240-unit edge and base death.
6. Every rank gate/max-rank/point total including Fortitude; exact HP fraction after level/stat upgrade and dead level-up; no ability/upgrade resets readyTicks or produces healing loops.
7. Pause/background/Build slow motion, interrupted casts, death/respawn, terminal and repeated UI Restart cover skill timers/statuses/zone listeners/pools. Protection breaks only on accepted combat action.
8. Deterministic state/events across30/60 render partitions and entity insertion order, including simultaneous hits, effects expiring on a damage tick and duplicate command IDs.
9. Actual-browser960×540 and844×390 gameplay: joystick + Attack + drag/tap/cancel skills, at least3 simultaneous pointers, ≥48 CSS px targets, no console/assets errors, before/after authoritative HP/status screenshots. Fixture-only late ranks must be labeled supplemental; no fake claims of normal progression.
10. Record player decisions, incoming/outgoing damage, ally survival, CC duration, cast misses and match duration. Target A solo LV1 ordinary duel ~1.7–2s without skills and no full-health restore; reject permanent CC, infinite shield or unintended structural skill damage. The long-match target requires an approved roster, not a hardcoded result timer.

Run all existing automated/browser suites and build before accepting later gameplay changes; physical mobile/WebView performance remains a separate verification requirement. The original proposal was uncommitted/unpushed for Product Owner review; the subsequent approval record authorizes committing this design only before Phase 2B. Original specifications, gameplay code and approved assets were not modified during Stage 2.
