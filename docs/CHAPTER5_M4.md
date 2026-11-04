# Chapter 5 M4: The Broken Alliance (implemented, uncommitted, awaiting S24 playtest)

Status: implemented on top of the local commit `99f319f` (`scratch/c5-allied-hero`, M3 locked) following `CHAPTER5_M4_DESIGN.md` with the PO adjustments (Raider removed; War Cart amendment, see "War Cart"). **Not committed, pushed, merged or deployed.** Chapter 5 stays **Coming Soon**. Every balance value is provisional; the bot is not a human, and Galaxy S24 playtesting decides the balance.

**PO review: implementation approved for physical Galaxy S24 playtesting. War Cart: Option C, left out of M4** (no Simulation, matchSetup or Movement change for a pre-placed ruin). No balance changes before the human playtest; M4 stays uncommitted until the feedback arrives. No further bot sweeps.

## What it is

campaign-44, Chapter 5 Mission 4, on `broken-alliance` (a data variant of Crimson Fortress: same ridge, Siege Road and Shadow Trail, outposts, Fortress wall, gate and flank waypoints, with its own tower ids `c5-*`). Two Crimson outposts behind one Keep shield, a Warden at the South Outpost, the Iron Marshal and the Shadowblade, a Fortress Gate with a Last Stand garrison, the Tavern at Hero Cap 2 and up to two Azure Barracks.

| Rule | Value |
|---|---|
| Start | 100 Gold, 220 Wood, 30 Iron (a Tavern and a Barracks exactly, at 0 s); the Guardian starts at (600,600) (Crimson Fortress's own start: the default start point is inside the ridge) |
| Waves | `[7,7,8,8,9,9,10,10]`, first at 30 s, every 30 s, slots (1776,480) / (1776,720), no flanks |
| Outposts | North (flag 1080,264, circle r132, ruin 21,6) and South (flag 1032,888, circle r132, ruin 20,17); two watchtowers each; Banner 2000 HP, 4 s raise; two Elites on each first capture |
| Keep shield | Up until both outposts are Azure (M3 rule); the Fortress Gate must also fall |
| Warden | South Outpost, anchor (1056,936), guard 220, respawn 45 s, spawns at (1296,888) in the sally ground |
| Raider | none (PO) |
| Iron Marshal | north lane, announced at 174 s, takes the field at 180 s, three escorts, rest 60 s (M6 stats) |
| Shadowblade | announced at 234 s, takes the field at 240 s, rest 40 s, half damage to the Azure Keep (M6 stats) |
| Fortress Gate | 2500 HP faction gate; its fall releases four Elites once (M6 Last Stand) |
| Tavern / Barracks | Hero Cap 2 (Roland, Borin, Kael); Barracks cap 2, none prebuilt, footmen follow the Guardian |
| Pads | three at home (10,10) (10,14) (13,12); North pad (20,7) and South pad (18,18), each open only once its own outpost is Azure |
| Objectives | capture both outposts, then destroy the Crimson Keep; defeat when the Azure Keep falls |

## Validation (step 1)

Outposts, Commanders, Tavern, the Warden and the Last Stand garrison already validate together: `campaign.setup(44)` and `new Simulation` accept the level with **no change to `matchSetup`, Simulation or Movement**. M6 already validated posts, Commanders and a garrison; M3 posts and a Tavern; the Raider was the only new combination and was removed.

## Changes

- `src/world/battlefield.ts`: `brokenAlliance` (`...crimsonFortress`, own tower ids), registered as `broken-alliance`.
- `src/world/battlefieldArt.ts`: the art alias.
- `src/data/campaignLevels.ts`: `brokenAllianceLevel` (campaign-44) after M3.
- `tests/campaign-level-44.cjs` (21 tests), `tests/support/brokenBot.cjs`, `scripts/verify-broken-alliance.mjs`.
- List tests updated for the new level (only registry lists, no behaviour): battlefield-art, campaign-level-31, campaign-level-41, campaign-level-42, campaign-level-43, chapter-view (`[6,6,6,6,4]`), debug-launch, frost-gate, six-missions (29 levels).
- No change to M1, M2, M3, Chapters 1-4 gameplay, Simulation, Movement, matchSetup or AI.

## Verification

| Check | Result |
|---|---|
| TypeScript | clean |
| Focused tests `campaign-level-44.cjs` | 21/21 |
| Full suite | 1301/1301 (1280 before M4 + 21 new; the one failure of the first full run was a Chapter 4 list test that needed campaign-44 in its gate-owner list, fixed and re-run) |
| Production build | OK |
| Browser, 780x360 DPR 3, real touch (`verify-broken-alliance.mjs`) | ALL PASS |
| Regression browser scripts at the phone viewport | M1 verify-old-tavern, M2 verify-brothers, M3 verify-divided-road, verify-canyon-basin and verify-crimson-fortress all pass |

The browser script taps: the opening spend (Tavern then Barracks), the home pad, the **North pad (20,7)** and the **South pad (18,18)** (both real taps: select, confirm, placed, built, two footmen), the pad cap, the Keep shield with one and both outposts, the Marshal warning at 174 s and release at 180 s (three escorts), the Shadowblade at 234 s / 240 s, no Raider, and the unit peak. On screen at 780x360 the South pad sits 40 px above the Build panel (the North pad is well clear); the Guardian walks to both (movement commands).

## Bot results (preliminary evidence, not a balance sign-off)

Five start times (60, 90, 120, 150, 180 s: when the Guardian leaves home) per plan. The bot is deterministic, so start time is the only variation.

| Plan | Normal wins | Median s | Keep min HP | Heroes fallen | Barracks lost | Ally stalls | Peak live |
|---|---|---|---|---|---|---|---|
| none (Guardian alone) | 0/5 | none | 0 | n/a | n/a | 0 | 27 |
| no-barracks (2 heroes) | 5/5 | 360 | 1708-2864 | 4 | 0 | 1 | 23 |
| concentrate-south | 5/5 | 335 | 688-3000 | 3-5 | 0-2 | 2 | 30 |
| concentrate-north | 5/5 | 324 | 2252-3000 | 2-4 | 0-2 | 2 | 30 |
| split (a hero takes the North alone) | 5/5 | 364 | 2456-3000 | 4-6 | 0-1 | 8 | 32 |
| split-keep (a hero defends the Keep) | 5/5 | 332 | 2728-3000 | 2-5 | 0-1 | 2 | 30 |

Never recalling to defend the Keep ("no-recall") is punished: no-barracks 1/5, concentrate-south 4/5, concentrate-north 3/5, split 3/5, split-keep 4/5. M3's bot medians were 207-269 s, so M4 runs about 45-55% longer, with two to four heroes lost per game. The Guardian alone does not win. Every plan loses fewer than 40 live units at peak (32 at most).

Observations:
- **Both plans and both outposts first are viable**; north first is the fastest (324 s), no-barracks the slowest of the winning plans (360 s), so Barracks help but are not needed.
- Commanders make the mid game: in the winning bot lines the Marshal and the Shadowblade each fell several times per game, and a bot that never recalls to the Keep loses it to them.
- The intended 7.5-8/10 is plausible from the 45-55% longer bot times and the Keep pressure, but only the S24 playtest can say.

## Pathing, UI and performance

- **Ally stalls:** the Allied Hero stood still 3 s or more 8 times (42 s total in a 364 s game, none given up) in the `split` plan, which sends a hero alone to Defend the North Outpost; other plans had 1-2. Positions were beside the Ridge's north-west corner (706,436), in the north outpost and on the Siege Road at (908,218). Isolated trace tests (home to flag, ridge corner to flag, both outposts) show the hero walking normally and stopping only to fight the outpost's watchtowers, so this looks like the existing ally steering around the ridge and the watchtowers' fire rather than a blocked route. The stall breaker never had to give up a target. This is a pathing concern for the playtest (it is no deadlock), not changed here. The unit test allows up to 10 stalls and 90 s in a run.
- **UI, HUD wording (fixed):** the objective plate now reads "Capture both outposts". `HUD.postObjective` picks the noun from the post names: when every open post's name ends in "Outpost" it says outposts, otherwise camps as before. Only M4 has two posts named Outposts (Chapter 4 M6 returns earlier; its outposts have no shield), so locked missions read as before; the Canyon Basin and Divided Road browser checks still pass. The South pad is 40 px above the Build panel at 780x360 (the M3 Basin pad was 75 px); tappable in the real-touch run.
- **Performance:** peak live units 32 in the bot sweep and 28 in the browser stand-in run (target 40); under SwiftShader the HUD reported about 25 FPS with 1 unit on screen in the screenshots, like M3.

## War Cart (PO amendment): decided, Option C

The PO chose Option C: the cart stays out of M4 and nothing is changed to support it. The evidence below is kept for a later mission.

**Not implemented: the amendment asks for something the existing system cannot do with data.** The Chapter 4 War Cart (`setup.cart`) is a *Crimson cart that spawns at `startTick`, attacks Azure structures, and only when it dies leaves one wreck that can be repaired into an Azure cart*. There is no setting to start the match with the wreck already in place; `cartWreck` is created only by the Simulation when the Crimson cart dies. "Start as a repairable ruin near the Fortress approach" therefore needs a Simulation change (pre-placing `state.cartWreck`), which the instruction forbids without reporting first.

Evidence gathered anyway (no change to the level; the experiments used `mod`/`init` hooks in the bot):

1. **Cart repair economics.** The repair costs 160 Wood and 40 Iron. Iron is the scarce resource (start 30, income 0.25/s): after the Tavern and a Barracks the bot has none, so 40 Iron arrives about 160 s in and competes with two Barracks, towers and ruin repairs. A bot that saves for it repaired at about 205 s.
2. **Bot comparison (a ruin pre-placed by a hack, repaired by the bot when affordable) against no cart**, concentrate-north / concentrate-south / split, start 90 s: 339 / 521 / 437 s against 324 / 335 / 364 s; every run still won. The cart gave no measurable gate benefit (0 gate damage by the cart in these runs: it arrived late, with the Guardian assaulting, and died) and cost the bot time and resources.
3. **Crimson cart variant (existing mechanic, data only): a Crimson cart at 150 s whose wreck appears on a site at (15,12).** 349 / 324 / 399 s with the wreck repaired in two of three runs (at 335 s and 380 s, far too late to matter) against 324 / 335 / 364 s without; peak units 23-30. This is extra Crimson pressure, not an optional ruin, so it changes the mission's design.
4. **No bypass, no trivialisation of the gate or the Last Stand** (probe: an Azure cart ordered only against the Fortress Gate beside it with no outpost captured): the cart alone breaks the 2500 HP gate in about 55 s, the Last Stand still releases its four Elites, the Keep takes no damage and stays shielded. The cart order list is `['red-fortress-gate']` only, so it cannot attack the outposts' watchtowers; the Keep shield is the guarantee that both outposts must still be captured. The Last Stand still happens when the cart breaks the gate.
5. **Placement and access**: the only site tried is cell (15,12) = (744,600) on the open Azure plain west of the ridge; the bot reached it and repaired there. It is not near the gate (about 700 px away, round the ridge), so "near the Fortress approach" only holds loosely; a site nearer the gate was not tried. The Crimson-cart variant's wreck would appear on that one site whatever the cart's death point.

**Options for the PO** (none applied):
- A. Allow a one-field Simulation change (`cart.wreckAtStart`) and then use the cart as an optional ruin on the plain. Small, but it touches the Simulation, which the PO ruled out without a report.
- B. Use the existing Crimson cart (data only), with the wreck optional to repair. It adds a Crimson attacker and no start-as-ruin; the bot sees little change, but a human might feel the extra enemy.
- C. Leave the cart out of M4 and keep it for a later mission (recommended: the cart's value here is small and it competes for the same iron as Barracks and towers).

## Balance concerns and recommended adjustments (not applied)

1. If the S24 playtest finds M4 too easy (bot medians 324-364 s): Marshal at 150 s, Shadowblade at 210 s, or Elites 3 per first capture.
2. If too hard: Marshal at 210 s, or waves minus one in waves 5-8. The split strategy loses 4-6 heroes per game in the bot.
3. If the hero stalls are felt on the S24: move the North pad or the Warden anchor; no code change.
4. The South Outpost's Warden stands in the build circle (anchor 1056,936) and his guard (220 px) covers the South pad's footprint: the pad opens only after the camp is Azure, and he respawns 45 s after each death, so a Barracks built there early can still meet him.

## Remaining observations for the human playtest

- Difficulty against the 7.5-8/10 target (the bot only says M4 is about 45-55% longer than M3).
- How the two Commander warnings feel against building and hero commands; whether a forward Barracks becomes bait for the Shadowblade as designed.
- Allied Hero stalls near the ridge corner and the outposts when sent alone (the bot saw up to 42 s in the split plan).
- The South pad's room above the Build panel (40 px) on the real phone, and the South Warden's 45 s respawn near the pad.
- Whether Hero Cap 2 plus Barracks cap 2 fit the early iron.

## Run

```
node scripts/test.mjs campaign-level-44.cjs
node tests/support/brokenBot.cjs '{"plan":"concentrate-north","startAt":2700}'
BROKEN_URL=http://127.0.0.1:5371/ node scripts/verify-broken-alliance.mjs   # needs the dev server; ?debug=1&level=44
```
