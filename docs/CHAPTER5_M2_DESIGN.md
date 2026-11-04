# Chapter 5 M2: Brothers in Arms (design; implemented, see CHAPTER5_M2.md)

Status: design for PO approval. Nothing here is built, committed, pushed or deployed. Base: local commit `fabe5f6` (M1 finalized), branch `scratch/c5-allied-hero`. Every number is provisional until the bot sweep and a human playtest. Target difficulty 5/10 (M1 was 2/10).

## 0. Goal and principle

M2 is the first mission where two Allied Heroes change how the player plays: the Guardian plus two hired heroes against two Crimson Heroes, so the player must decide who defends, who assaults and who repairs. The difficulty comes from splitting duties, not from enemy HP.

Principle (PO locks 2 to 4): **only existing Crimson Hero behaviour is used**: the camp Warden/Defender, the Raider released on a timer, the first-capture Elite counterattack and the south flank wave. No new enemy AI, building, Ballista, War Cart or mechanic. The Guardian stays the only unit that repairs.

## 1. Code investigation: data-only versus system change

### 1.1 Data-only (already in the engine)

| Need | Existing system | Where |
|---|---|---|
| Hero Cap 2 | `tavern:{cap:2,roster:[...]}`; the validator accepts 1 to 3; three heroes were already tested (`tavernTest=3`) | `matchSetup.ts:204` |
| Crimson **Warden** (guards the camp) | camp `hero:{anchor,guard,spawn,respawnTicks}`: stands at his anchor, fights anything within `guard` px, 833 HP / 80 damage; becomes the camp's Raider once the camp is Azure; returns `respawnTicks` after a death | `Simulation.initPost` 176, `Movement` 56-58 |
| Crimson **Raider** (pressure on the Azure Keep) | `setup.hero:{spawn,delayTicks,respawnTicks}`: released `delayTicks` after the start; targets the nearest standing Banner, then Azure towers inside an Azure camp, then the **Azure Keep**; ignores every other unit (only a Guardian Taunt holds him) | `Simulation.initPost` 177, `heroDue`, `Movement` 71-73 (Chapter 4 M5, Canyon Basin) |
| Elite counterattack | camp `counter:{count,slots}`, once, after the first capture | Chapter 4 |
| Flank pressure on the Azure side | `waves.flanks:[{wave,lane:'south',units:'all'}]` on a map with `flankVia` | Forest Edge (Chapter 4 M1) |
| Camp, Banner, shield, ruin repair | `post` (Chapter 4) | M1, Forest Edge |
| Hero Commands, capture by a Hero, Revive, Dismiss | Phase 0 to 1B | M1 |
| Map | a data-only variant of `forest-edge` (as `old-tavern` was) | `battlefield.ts` |

Interaction already in the code that the design relies on:
- The Raider **does not fight the Defend hero**; he walks to his target and hits it. An Allied Hero ordered to Defend near the Azure Keep engages him by the Allied AI. So a Defend hero is what saves the Keep.
- Once the camp is Azure, **both** Crimson Heroes (the Warden as Raider of his camp, and the timed Raider) hunt the Banner first. The Banner is a lure: the player's assault force is where they go.
- The Keep shield follows the camp (existing).

### 1.2 One validation change (not a behaviour change)

`matchSetup.ts:153` rejects a single `post` together with `setup.hero` (`!o.hero&&!o.posts&&postOk(...)`). The Raider needs `hero` beside **one** camp. The Simulation and Movement already handle it: `initPost` registers the Raider for any non-empty `camps`, and Movement hunts `camps` (one entry works). Change needed: accept `hero` with a single `post` **when the setup has a Tavern**, the same narrow pattern as M1's single-post rule. About 1 line plus a test. Nothing in the simulation changes.

If the PO prefers zero code change: Alternative A below (two camps, Canyon Basin style) is fully data-only.

### 1.3 Needs new code (outside the locks, so not proposed)

A Crimson Hero that raids on a schedule with its own target rules, a Hero guarding the Keep entrance beyond the Warden's radius, or any Hero that reacts to Allied Heroes. Not in M2.

## 2. M2 specification

Campaign-42, Chapter 5 Mission 2, `scratch` branch work only, Chapter 5 stays Coming Soon.

### 2.1 Map: `brothers-in-arms` (data-only variant of Forest Edge)

Same 1920 x 1152 window, Azure Keep west (330, 600), Crimson Keep east (1776, 600). Keeps Forest Edge's proven geometry: one main road with the Crossroads Camp at the middle (circle 1104,600 r144; watchtowers 1176,528 and 1176,672; ruin cell 24,11) and the **south trail** (`flankVia` south 1104,984) that lets a flank wave reach the Azure side. Different decoration and a camp renamed "Crossroads Camp". Reusing the geometry means the flank route, the camp ring and the tower spacing are already tested.

### 2.2 Objectives (two phases, as M1)

1. **Capture the Crossroads Camp** (destroy two watchtowers, stand in the ring 4 s, Banner 2,000 HP).
2. **Destroy the Crimson Keep.** Shielded while Crimson holds the camp. The Azure Keep must survive. No new objective type.

The "two targets" are the camp/Keep assault in front and the Azure Keep behind: the Raider and the south flank make the rear a real front.

### 2.3 Crimson Heroes (2)

| Hero | Source | Placement | Behaviour |
|---|---|---|---|
| **Warden** | camp `hero` | anchor (1128, 540) (design said 1128, 600; that blocked the Raider, see CHAPTER5_M2.md), guard 220, spawn (1752, 600), respawn 45 s | Holds the camp. Once the camp is Azure he hunts the Banner. |
| **Raider** | `setup.hero` | spawn (1752, 600), first release **100 s**, respawn **60 s** | Marches on the Azure Keep (or the Banner once there is one). |

Both are 833 HP / 80 damage (Roland-class). A hired Roland meets one 1:1 evenly; Borin out-tanks one; Kael trades faster.

### 2.4 Waves and flanks

| Setting | Value |
|---|---|
| Waves | `[5,5,6,6,6,7,7,8]` Crimson soldiers (last entry repeats), first at 25 s, every 30 s |
| Flanks | south lane, all units, on waves 4 and 7 (about 1:55 and 3:25) |
| Allied soldiers | 1 per wave (as M1) |
| First-capture Elites | 3, once (M1: 2, Chapter 4 M1: 4) |
| Towers | the camp's two, the Crimson Keep's two front towers (as Forest Edge) |
| Barracks | none (no pad, no card): M1 finalization showed it adds UI clutter and is not the point of M2. Tray: Tower, Wall, Tavern |

### 2.5 Starting resources and Gold economy

| Item | Value |
|---|---|
| Start | **100 Gold, 140 Wood, 15 Iron** (M1: 50 / 140 / 15) |
| Tavern | 100 W + 10 I at 0:05 |
| Gold per Crimson soldier killed | 25 (existing) |

Timeline of purchases without farming (waves of 5 pay about 125 each if the player or the allied soldier kills them):

| Time | Gold (before spending) | Action |
|---|---|---|
| 0:00 | 100 | Tavern |
| about 0:45 | about 225 | wave 1 dead, hire hero 1 (Roland 150 / Borin 180 / Kael 200) |
| about 1:15 | about 200 to 275 | wave 2 dead, hire hero 2 (150 to 200) |
| 1:15 to 1:40 | | Both heroes out; every pair costs 330 to 380 Gold; the dearest pair (Borin + Kael, 380) is reached after wave 3 (about 1:45) at the latest |

Revive stays 45% (68 / 81 / 90) after 30 s. Gold still buys shop items (150 to 650), so heroes remain one choice; the second hero is affordable but not free (about the first two waves of income).

### 2.6 Encounter timeline

| Time | Event |
|---|---|
| 0:00 to 0:25 | Quiet: build the Tavern. The Warden is at his anchor, no pressure |
| 0:25 | Wave 1 (5) |
| 0:45 to 1:15 | Hire hero 1 then hero 2 |
| 1:40 | **Raider released** (about 15 s walk to the Azure Keep): the first moment Defend matters |
| 1:55 | Wave 4 flank (south trail) arrives near the Azure side |
| 2:00 to 4:00 | The player splits: Defend at the Keep, Follow in the assault, Guardian captures and repairs |
| after capture | Warden and Raider hunt the Banner; the three Elites counterattack once; the Keep is unshielded while the Banner stands |
| 5:00 to 8:00 | Assault on the Keep |

Preparation window: about 100 s from the start with only soldier waves and a stationary Warden, so the player can build the Tavern and hire both heroes before heavy pressure (PO 6, 7).

### 2.7 Expected human playtime

M1 (2/10) was 4:26 to 6:00 in human play, against a bot at 1:49 to 2:29. For 5/10 with two Crimson Heroes and a defended base: **7 to 10 minutes** human, **3 to 4.5 minutes** for the bot. Provisional; the bot is not a human result.

### 2.8 Why Defend is useful but not mandatory (PO 5)

- Useful: the Raider arrives at 1:40 and, unopposed, attacks the Azure Keep. A Crimson Hero hits 80 per 23 ticks (about 100 damage per second before armor) against a Keep of 3,000 HP: **an estimate of about 30 s to destroy it unopposed, not measured**; it must be measured in the sweep. The south flank adds soldiers near the Keep.
- Not mandatory: a player who captures the camp early pulls both Crimson Heroes to the Banner (the assault force), and a player may also kill the Raider with the Guardian plus a Follow hero as he passes. Taunt holds him. Home towers help.
- Choices: 1 Defend + 1 Follow (balanced), 2 Follow (faster, riskier Azure Keep), 2 Defend (safe, slower, thin assault).

## 3. Bot verification plan

Extend `tests/support/tavernBot.cjs` (bot only): hire a second hero, assign roles per hero, park a Defend hero beside the Azure Keep, play seeds 1 to 5 of the production level with commands only. Four strategies:

| Strategy | Intent | Acceptance (relative, not 100% win or loss) |
|---|---|---|
| 1 Defend + 1 Follow | balanced | win at least 4/5; Azure Keep min HP at least 50%; total Hero falls at most 2 per run; no stall |
| 2 Follow | fast but exposed | median time at least 10% below balanced **or** a visibly lower Azure Keep minimum (at least 25 points lower, or damaged in at least 3/5 runs) |
| 2 Defend | safe but slow | Azure Keep min HP the highest of the four (at least 90%); median time at least 20% above balanced |
| No Hero | clearly worse | win rate below balanced, or median time at least 30% above, or at least 2 more Guardian deaths |

Collected for each plan: win rate, completion time, Guardian deaths, Hero falls, Revives, Azure Keep minimum HP, time of first Keep damage, Raider and Warden kills, stalls and give-ups. No run may stall; the Raider must reach his target. The estimate in 2.8 is checked by an unattended probe (no commands) with the Raider only.

Browser: `verify-old-tavern.mjs` pattern at 780 x 360 DPR 3: two hires, the cap refusing a third, a Defend order near the Keep, the Raider arriving, the Banner and shield.

## 4. Implementation plan and size (not started)

| File | Change |
|---|---|
| `src/data/campaignLevels.ts` | `brothersInArmsLevel` (campaign-42, number 42, chapter 5) |
| `src/data/campaignChapters.ts` | add the level to Chapter 5 |
| `src/data/matchSetup.ts` | accept `hero` with a single `post` when the setup has a Tavern (about 1 line) |
| `src/world/battlefield.ts`, `battlefieldArt.ts` | `brothers-in-arms` variant of `forest-edge` |
| `src/scenes/HUD.ts` | one notice (for example "Hire two heroes: one to defend, one to follow") |
| `tests/campaign-level-42.cjs` (new), `tests/support/tavernBot.cjs`, `scripts/verify-brothers.mjs` (new) | level, two-hero bot, browser walk-through |
| List tests | the same hardcoded lists M1 touched |
| `docs/CHAPTER5_M2.md` | implementation report |

No change to Simulation, Movement, Economy, Tavern or Hero code. Estimate: about 25 lines of source, 400 of tests and scripts.

## 5. Risks

1. **The Raider ignores the Defend hero.** He keeps hitting the Keep until he dies; if the Defend hero is away he can break the Keep in about 30 s (estimate). Mitigation: 100 s delay, 60 s respawn, the sweep decides the numbers.
2. **Both Crimson Heroes go for the Banner after the capture.** A spike of two 833 HP heroes plus 3 Elites at the camp, which may make capture-and-hold harder than 5/10. Knobs: Elites 2, Warden respawn longer, Raider release later.
3. **Balance by bot only.** The bot is far faster than humans (M1 about 2.4 times); the human playtest decides.
4. **Defend AI around the Keep.** Phase 0's stall breaker exists; the bot and browser runs must show the hero engages the Raider.
5. **Gold timing.** A player who does not kill waves will hire late. Starting Gold 100 and the 25 per soldier kill make hero 2 about 1:15 for most pairs.
6. **Performance on S24.** Two heroes plus two Crimson Heroes plus a wave: not profiled (three Allied Heroes ran 40 to 49 FPS in Phase 1A).
7. **Map repetition.** Same geometry as Forest Edge (decoration only). Acceptable for data-only; a new silhouette needs art.
8. **Pacing.** Possible repeat of M1: too fast. Pre-decided knobs: Raider delay and respawn, Elite count, wave size.
9. **Art.** Chapter 5 painting and `mission-art-campaign-42.webp` do not exist yet (same gap as M1).

## 6. Alternatives

| | Design | Pros | Cons |
|---|---|---|---|
| **A: two camps (Canyon Basin style)** | `posts` with Warden at one camp and the Raider via `setup.hero`; no code change | fully data-only; two capture targets are the "two objectives" | repeats Chapter 4 M5, the hardest Chapter 4 layout; two Banners to defend is likely above 5/10 |
| **B: one camp + Raider (recommended)** | as section 2; one validation line | simpler, closer to 5/10, Banner as a lure, proven flank route | one validator change (not behaviour) |
| **C: Warden + flank waves only, no Raider** | drop `setup.hero` | zero code | the base is never attacked by a hero, so Defend barely matters; fails PO 5 |

## 7. Recommendation

**GO for Alternative B**, conditional on PO approval of the one-line validator change (Tavern missions may combine a single camp with a Raider). If the PO prefers no code change, fall back to Alternative A and accept a harder mission. Next step after approval: implement M2, run the four bot strategies and the browser verification, then stop for review. Nothing is committed, pushed or deployed.
