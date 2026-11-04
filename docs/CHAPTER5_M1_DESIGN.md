# Chapter 5 M1: The Old Tavern (design; implemented and finalized, see CHAPTER5_M1.md)

Status: design for PO approval. Nothing here is built. Base: local commit `61a4cd0` (Phase 0 to 1B plus art), branch `scratch/c5-allied-hero`. Every number is provisional until a bot sweep and a human playtest.

## 0. Principle: reuse Chapter 4 Mission 1

M1 is Forest Edge (campaign-31) with a Tavern and a gentler opening. Every mechanic it needs already exists: the camp post (two watchtowers, Banner, ring, ruin repair, Keep shield), faction territory, Azure pads, waves, the Tavern (Phase 1B), Hero Commands (1A). **No new gameplay system, no new unit, no new building.** The only new data is one level, one chapter entry and (optionally) one battlefield.

Mission facts requested by the PO: Hero Cap 1; roster Roland / Borin / Kael; Tavern 100 Wood + 10 Iron; Hire 150 / 180 / 200 Gold (Revive 68 / 81 / 90); Follow / Attack / Defend; objective Destroy the Crimson Keep; 5 to 7 minutes.

## 1. Layout and objective flow

Same 1920 x 1152 window as Chapter 4, Azure Keep west, Crimson Keep east (1776, 600).

| Zone | Content |
|---|---|
| Azure home (x < 700) | Azure Keep, the Guardian, the Meadow territory. The Tavern is an ordinary build: any free cell in Azure territory (so every home cell is "Tavern compatible"; no new pad rule). The three standard Barracks pads (10,10) (10,14) (13,12) exist but no Barracks stands. |
| Road | One main road with a forest edge on each side, no flank trail. |
| Crimson Outpost (about x 1100, y 600) | Two Crimson watchtowers, the camp ring (96 px), a ruined tower cell. It is the Chapter 4 camp: while Crimson holds it the Crimson Keep is shielded. |
| Forward pad | **Removed in finalization.** Human playtests showed M1 is enjoyable and completable without a Barracks, and the pad sat under the skill buttons on a phone. M1 has no Barracks pad or card. |
| Crimson courtyard | Crimson Keep with its two front towers, as Forest Edge. |

Flow (two mission phases, as campaign-31):

1. **Phase Capture.** Objective plate: "Capture the Old Outpost 0/1". Destroy both watchtowers, stand in the ring, the Azure Banner rises in 4 s. The first capture sends **2 Elite Soldiers** after the Banner (Chapter 4 M2 value; M1 of Chapter 4 sent 4).
2. **Phase Assault.** "Destroy the Crimson Keep 0/1". The Keep shield drops while the Banner stands. Losing the Banner re-shields it (existing rule).

The Guardian can repair the ruined tower (60% price, 5 s) (finalized: no Barracks). The Tavern and the hero are never required by a rule.

## 2. Introducing the Tavern without a tutorial

- The Build tray shows the Tavern card from the first second; its price is on the card.
- The mission briefing and strategy text on the level card (the usual two sentences) name it: "The Old Tavern is open for hire. Build one at home, then tap it."
- One existing HUD notice at mission start: "Build a Tavern to hire a hero" (one string, same notice path as "Tavern ready · tap it to hire heroes", which already fires when it finishes).
- No dialogs, arrows or forced steps. The panel, the Hero Bar and the three commands are already self-explanatory (PO playtest PASS).

## 3. Starting economy and buildings

| Item | Value | Reason |
|---|---|---|
| Start | **50 Gold, 140 Wood, 15 Iron** | Chapter 4 starts at 0 Gold, 100 Wood, 10 Iron. 140 / 15 pays the Tavern (100 / 10) and leaves 40 / 5. 50 Gold means the first hire is affordable after about one wave, not at second zero. |
| Income | Wood 2/s, Iron 0.25/s (existing) | Iron (0.25/s) is the binding resource: Tavern 10, then tower repairs. |
| Gold | 25 per Crimson minion killed by anyone (existing rule, 10 from wave 13) | Wave 1 of 5 pays 125: Roland (150) is affordable around 0:50, Borin (180) after wave 2. |
| Buildings | Wall, Tower, Tavern (one), no Barracks (finalized) | Same cards as Chapter 4 plus the Tavern. |
| Gold sinks | Shop items 150 to 650, hero hire, Revive | A hero is one choice among shop items, never the only use of Gold. |

Gold over a full run: about 8 waves x 5.6 x 25 = 1,100. Hero (150 to 200) plus one Revive (68 to 90) costs a quarter of it.

## 4. Enemy composition and waves

Gentler than Chapter 4 M1 (waves [6,6,6,6,7,7,8,8] every 25 s from 10 s, flanks on waves 3 and 6, a Crimson Hero guard, 4 Elites on capture).

| Setting | M1 value |
|---|---|
| Waves | `[5,5,5,6,6,6,7,7]` Crimson soldiers, then the last entry repeats (existing rule) |
| Timing | first wave at 25 s (`firstWaveTick` 750), every 30 s (`waveInterval` 900) |
| Flanks | none |
| Allied per wave | 1 (as Chapter 4) |
| Crimson Hero | **none** in M1 (Chapter 4 camp Hero is optional data; omitted: no early Hero pressure, and no extra enemy for the player to read while learning the Tavern) |
| Outpost | 2 watchtowers (`c4`-style ids) |
| First-capture counterattack | 2 Elite Soldiers, once |
| Crimson Keep | armed, 2 front towers, as Forest Edge |

## 5. Expected Hero contribution

Stats (Phase 1B, from the Guardian-class knight, 833 HP / 80 damage): Roland 833 / 80, Borin 1,166 / 64, Kael 666 / 104. The Guardian is L1 980 HP.

- **Capture:** one Hero roughly adds a soldier-and-a-half of damage and a second target for the two watchtowers. Target: median capture 15 to 25% faster than no Hero.
- **Assault:** Borin soaks tower fire, Kael kills the Keep's defenders fastest, Roland is the middle. All three must win; none is a trap.
- **Not mandatory:** a no-hero Guardian-and-soldiers run must still win (Chapter 4 bot "no building" won 5 of 5 at Forest Edge with bigger waves). The hero shortens the mission; it is not a gate.
- **Death:** Revive costs 45% in Gold after 30 s with the Tavern standing; Dismiss lets the player swap to another hero (no refund).

## 6. Time target

| Time | Event |
|---|---|
| 0:00 to 0:10 | Build the Tavern (5 s) |
| 0:25 | Wave 1 |
| 0:50 to 1:30 | Gold reaches the first hire |
| 1:30 to 3:30 | Push to the Outpost, destroy two towers, raise the Banner, absorb 2 Elites |
| 3:30 to 4:30 | Repair the tower, wave pressure |
| 4:30 to 6:30 | Assault the Keep |

Chapter 4 M1 bot wins took 244 to 335 s; a human is 1.2 to 1.5 times slower, so 5 to 7 minutes holds with the gentler waves. To be confirmed by the bot sweep and a playtest.

## 7. Risks and balance assumptions

1. **Gold timing.** Hire timing depends on kills; a player who stays home kills fewer. Assumption: any kill pays, soldiers included. Mitigation: 50 start Gold, bot sweep for a no-fight player.
2. **Hero not mandatory vs useful.** Needs the bot sweep: four variants (no hero, Roland, Borin, Kael), 5 runs each, all must win, hero runs faster.
3. **Hero AI stalls** (Phase 0 stall breaker exists) around watchtowers and the Banner ring; the tests must cover a hero near the ring.
4. **Build tray with four cards** (Tower, Wall, Barracks, Tavern): "Barracks" wraps. Needs a one-line font fix in `BuildPanel.ts` or hiding the Barracks card until its pad opens.
5. **Chapter 5 UI.** Chapter 5 needs a chapter entry, a level card and a mission image. Plan: `coming-soon` like Chapter 4 before its release; dev launch with `?debug=1&level=41`.
6. **Map repetition.** Reusing Forest Edge geometry means players see the same road twice in two chapters (see option below).
7. **S24 performance.** Phase 1A playtest ran 40 to 49 FPS with three heroes; M1 has one hero, so lower, but the Tavern sprite and larger Elite counterattack have not been profiled.
8. **All values provisional.** Same status as every Chapter 4 mission before its playtest.

## 8. Implementation plan and file estimate

| File | Change | Size |
|---|---|---|
| `src/data/campaignLevels.ts` | `oldTavernLevel` (campaign-41): setup, `tavern:{cap:1,roster:[...]}`, post, waves, start, mission phases; add to `campaignLevels` | about 25 lines |
| `src/data/campaignChapters.ts` | Chapter 5 "Rise of the Heroes", `coming-soon` | about 10 lines |
| `src/world/battlefield.ts` and `battlefieldArt.ts` | option B: `old-tavern` derived from `forest-edge` (new road bend, camp offset, decoration); option A: no change | 30 to 60 lines (B) |
| `src/ui/BuildPanel.ts` | four-card label fix | 1 to 3 lines |
| `src/scenes/HUD.ts` | one start notice ("Build a Tavern to hire a hero") | 3 lines |
| `src/data/campaignUi.ts` or level card art | Chapter 5 card and mission image (needs art asset request) | data only |
| `tests/campaign-level-41.cjs` (new) | level data, Tavern setup, shield, hire in match, 25 tests like campaign-31 | new |
| `tests/support/` bot | extend `forestBot` with a hire step and a hero variant | new |
| `scripts/verify-old-tavern.mjs` (new) | browser walk-through at 780 x 360 DPR 3 | new |
| Existing list tests | `battlefield-art`, `chapter-view`, `debug-launch`, `six-missions`, as Chapter 4 did | small |
| `docs/CHAPTER5_M1.md` | implementation report | new |

Estimate: about 10 changed files, 4 new, 100 to 150 lines of source and 400 lines of tests and scripts. No change to the simulation, Movement, Economy or Tavern code.

## 9. Decisions requested

1. **Map:** (A) reuse the Forest Edge battlefield (cheapest, repeated map) or (B, recommended) a data-only `old-tavern` variant of it with a different road and camp position.
2. **Start:** 50 Gold, 140 Wood, 15 Iron (recommended) or Chapter 4's 0 / 100 / 10 with the first hire at about 1:30.
3. **Forward pad:** was one Barracks pad at the camp; **removed in finalization** (tower ruin repair only).
4. **Crimson Hero at the camp:** omitted in M1 (recommended), kept for M2.
5. **Intro:** the one-line start notice plus the briefing text (recommended), or nothing beyond the Build card.
