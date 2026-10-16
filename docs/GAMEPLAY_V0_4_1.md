# Gameplay v0.4.1: Guardian durability experiment

> **Integration update.** On branch `integration/gameplay-v041-ui-v042`, Variant B is the active balance. It is the `Simulation` default and runs on the normal playtest URL; `?combat=b` is no longer needed. A and C remain available for comparison, through the harness or the dev-only `?combat=a|c` override, which logs a console warning. See [GAMEPLAY_V041_UI_V042_INTEGRATION.md](GAMEPLAY_V041_UI_V042_INTEGRATION.md). The rest of this document is the original experiment record.

Original status: **experimental, not approved**. Branch `gameplay-v0.4.1-balance`, based on `da7475d` (Gameplay v0.4). The production default is Variant A, which is identical to v0.4. Variants B and C exist only for human playtesting on the dev server.

## 1. Confirmed production combat formulas (v0.4, from source)

| Stat | Value | Source |
|---|---|---|
| Guardian base / starting HP | 1200 at LV1 (starts full) | `guardianStats.maxHp` (`src/data/combat.ts`) |
| Guardian max HP | `(1200 + 60·(LV−1)) · (1 + 0.05·Fortitude) + item HP`. LV20 = 2340; with Fortitude 2 (LV18/LV20) = 2574. No other cap | `GuardianSkills.refreshStats` |
| **The proposed "1,320 HP"** | **LV3 max HP** (1200 + 2·60), not a base stat | — |
| Guardian armor | `20 + 1·(LV−1) + 3·Fortitude` +5 within 240 of the Azure Keep, + Guardian Zone aura 10/15/20, + items | `refreshStats` |
| Damage reduction | `raw · 100 / (100 + armor)` for physical/magic; `direct` ignores armor. LV1 is −16.7%, LV20 with Fortitude 2 is −31% | `damageAfterArmor` |
| Guardian Shield | +250 HP, +15 armor, 500 Gold | `src/data/artifacts.ts` |
| Crimson minion | 18 raw, 30-tick (1.0 s) cooldown, 9-tick windup, range 48. One type only; Azure minions use the same stats | `minionStats` |
| Crimson tower | 24 raw vs the Guardian (18 vs everything else), 24-tick (0.8 s) cooldown, range 240 from the centre, 650 HP | `balanceV02.crimsonTowerDamageVsGuardian`, `buildings.tower` |
| Crimson Keep | 14 raw, 24-tick cooldown, range 140 from its footprint edge, Guardian-first, no windup | `gameplayV04.keepDefense.red` |
| Rounding | Raw damage values are integers. Armor mitigation and HP are not rounded (fractional). When max HP changes, HP keeps its fraction, floored to 0.01 | `hit`, `refreshStats` |
| Max-HP change | **Current HP fraction is preserved**: level-up, Fortitude and Shield do not heal. Respawn restores full max HP | `refreshStats`, respawn in `Simulation.update` |

Discrepancies with the proposal:
- 1,320 is the LV3 value. The base stat is 1,200.
- Integer raw damage cannot express every requested percentage exactly. Minion 18×1.1 = 19.8 → **20** (+11.1%). Tower 24×1.1 = 26.4 → **26** (+8.3%). Tower 24×1.2 = 28.8 → **29** (+20.8%).

## 2. Variants (`src/data/gameplayV041.ts`)

| | A: v0.4 | B: moderate | C: hard |
|---|---|---|---|
| Guardian base HP (LV1) | 1200 | 980 | 830 |
| HP growth per LV | +60 | +60 | +60 |
| LV3 HP (target) | 1320 | **1100** | **950** |
| Crimson minion raw vs Guardian | 18 | 20 | 20 |
| Crimson tower raw vs Guardian | 24 | 26 | 29 |
| Crimson Keep raw (all targets) | 14 | 17 | 20 |
| Keep cooldown / range / targeting | 24 / 140 / Guardian-first | unchanged | unchanged |

Interpretation choices:
- **HP**: only the base stat is lowered, so LV3 lands exactly on the target and the +60/LV curve, Fortitude and Shield are preserved.
- **Multiplier scope**: the minion and tower multipliers apply to hits **on the Guardian only**, following the existing `crimsonTowerDamageVsGuardian` precedent. Pressure on the Azure Keep, Azure minions and player-built towers is unchanged; the `absent` scenario is identical across variants.
- **Keep damage**: the Keep has one damage stat, which is replaced. It only hits other targets when no Guardian is attackable.
- **Single application**: each multiplier is applied once to the raw stat, then `Math.round`. Crits are Guardian-only, so no enemy damage is multiplied twice. Armor is applied once afterwards, as before.
- Attack speed, range, targeting, armor, waves, towers and victory rules are untouched.

HP by level (no items, no Fortitude unless noted):

| LV | 1 | 3 | 6 | 10 | 20 | 20 + Fortitude 2 |
|---|---|---|---|---|---|---|
| A | 1200 | 1320 | 1500 | 1740 | 2340 | 2574 |
| B | 980 (−18%) | 1100 (−17%) | 1280 (−15%) | 1520 (−13%) | 2120 (−9%) | 2332 |
| C | 830 (−31%) | 950 (−28%) | 1130 (−25%) | 1370 (−21%) | 1970 (−16%) | 2167 |

Because growth is preserved, the reduction fades with level. A proportional alternative (scale base **and** growth) was measured as a sensitivity check (§4). Its levels are BS = 1000 + 50/LV and CS = 864 + 43/LV, which gives LV20 of 1950 and 1681.

Analytic time to death under continuous fire (armor 20+LV−1, no Zone, no items):

| | LV1: tower | LV1: tower+Keep | LV1: 2 towers+Keep | LV1: 3 minions | LV10: tower+Keep | LV20: tower+Keep |
|---|---|---|---|---|---|---|
| A | 48.0 s | 30.3 s | 18.6 s | 26.7 s | 47.3 s | 68.5 s |
| B | 36.2 s | 21.9 s | 13.6 s | 19.6 s | 36.5 s | 54.8 s |
| C | 27.5 s | 16.3 s | 10.2 s | 16.6 s | 28.9 s | 44.7 s |

## 3. Deterministic comparison (`node scripts/balance-v041.mjs all all --full`)

Method:
- Same v0.4 bots, seeds and initial conditions as `scripts/balance-v04.mjs`. Only the Simulation's combat variant differs.
- `rush`, `shield`, `hammer`, `defend15` and `dying` run at bot reaction 1, 2 and 3 ticks; the tables show ranges.
- Variant A reproduces the production harness output byte-for-byte.
- Left wing = `flankWing` (north lane, destroy `keep-north`). Right wing = `flankWingS` (south lane, destroy `keep-south`). Extended survival = `survive20` (20 min).

| Scenario | A | B | C |
|---|---|---|---|
| Rush, no items | 3/3 win, 174–175 s, 3 deaths, Azure 1056–1164 | 3/3 win, 184–208 s, 4 deaths, Azure 1074–3000 | 3/3 win, 231–241 s, 5 deaths, Azure 372–3000 |
| Left flank, no items | **loss** 87 s, 2 deaths, Crimson 312 left | **loss** 83 s, 2 deaths, Crimson 840 | **loss** 96 s, 3 deaths, Crimson 1176 |
| Right flank, no items | **win** 97 s, 2 deaths, Azure 876 | **loss** 106 s, 3 deaths, Crimson **72** left | **loss** 129 s, 4 deaths, Crimson 1176 |
| Guardian Shield | 3/3 win, 271–272 s, 2 deaths, Azure 1416–1668 | 3/3 win, 260–262 s, 2 deaths, Azure 2100–2604 | 3/3 win, 247–287 s, 2–3 deaths, Azure 3000 |
| Siege Hammer | 3/3 win, 236–238 s, 1 death, Azure 3000 | 3/3 win, 259–263 s, 2 deaths, Azure 3000 | 3/3 win, 269–273 s, 2 deaths, Azure 3000 |
| Hammer flank | win 184 s, 0 deaths, min HP 100 | win 202 s, 1 death, Azure 2100 | win 203 s, 1 death, Azure 2136 |
| Defend Azure, 15 min | holds, 0–1 deaths, Azure 2928–3000 | holds, 0–1 deaths, Azure 2280–3000 | holds, 1 death, Azure 2586–2982 |
| Guardian absent | loss 112 s | loss 112 s (identical) | loss 112 s (identical) |
| Repeatedly dying (8 forced deaths) | 3/3 win, 194–230 s, 5 deaths | 2 win / 1 loss, 257–358 s, 7–8 deaths | 2 win / 1 loss, 276–352 s, 7–8 deaths |
| Survive 20 min | holds, 1 death, Azure 2928 | holds, 1 death, Azure 2370 | holds, 1 death, Azure 2694 |

Damage received by the Guardian, by source (minion / tower / Keep), plus XP, Gold and timing:

| Scenario | A | B | C |
|---|---|---|---|
| Rush | 117–177 / 3513–3675 / 1296–1391; LV6, 780 XP, 500 G; 112–114 s attacking structures | 325–782 / 3026–3217 / 1191–1503; LV9, 1380–1470 XP | 378–846 / 3468–3577 / 1598–1828; LV10, 1710–1860 XP, 925 G |
| Left flank | 0 / 1595 / 805 | 0 / 1583 / 822 | 50 / 1633 / 856 |
| Right flank | 0 / 1780 / 870 | 0 / 1920 / 1020 | 830 / 1640 / 850 |
| Shield (bought 105 s) | 372–484 / 2517–2723 / 1130–1231 | 116–298 / 2862–3072 / 1290–1410 | 330–867 / 2469–2865 / 1390–1608 |
| Hammer (bought 146 s) | 96–211 / 1726–2184 / 732–769 | 448–497 / 1832–2156 / 941–997 | 313–502 / 2166–2240 / 1103–1274 |
| Hammer flank (bought 145 s) | 0 / 941 / 459 | 0 / 1102 / 584 | 128 / 1230 / 660 |
| Defend 15 min | 1792–2431 minion only; LV20, 5820 XP, ~3360 G | 1932–2665 | 2168–2860 |

Crimson minions reaching Azure:

| Scenario | A | B | C |
|---|---|---|---|
| Rush | 5–6 | 0–5 | 0–6 |
| Flanks | 5–9 | 5–9 | 5–9 |
| Hammer | 0 | 0 | 0 |
| Hammer flank | 0 | 6 | 5 |

Respawn and level-up: no unexpected interaction.
- Level-ups keep the HP fraction. Several level-ups occur while dead, at 0%.
- Respawn restores the variant maximum.
- Longer B/C matches give **more** XP, kills and Gold (rush LV6 → LV10). Respawning at home puts the Guardian back in the lane, farming the next wave.

Noise warning:
- Final Azure HP is chaotic between runs. B/C rushes sometimes keep Azure at 3000 because an earlier death returns the bot home just as a wave arrives.
- Outcome, duration and deaths are the robust signals.

## 4. Sensitivity (`node scripts/balance-v041.mjs all sens`)

| Scenario | BS: proportional B | CS: proportional C | C, HP only | C, damage only |
|---|---|---|---|---|
| Rush | 3/3 win, 194–207 s, 4 deaths | 3/3 win, 233–240 s, 5 deaths | 3/3 win, 193–202 s, 4 deaths | 2 win / 1 loss, 194–229 s, 4–5 deaths |
| Left flank | loss (Crimson 72) | loss | loss | loss (Crimson 72) |
| Right flank | win 97 s | loss | **loss** | **win** 97 s |
| Shield / Hammer | all win | all win | all win | all win |
| Hammer flank | win, 1 death | win, 1 death | win, 1 death | win, 1 death |
| Dying | 3/3 win | 3/3 win | 3/3 win | 2 win / 1 loss |
| Survive 20 min | holds, 1 death | holds, **2 deaths** | holds, 1 death | holds, 1 death |

- Proportional scaling barely changes these outcomes. The bots fight structures at LV1–LV12, where both HP curves are close. The only extra effect is a second attrition death in the 20-minute run.
- The HP cut alone is what breaks the LV1 right flank. The damage increase alone is what makes attrition (rush, dying) occasionally fail.

## 5. Tradeoffs

- **Frontal approaches under C.** Not unreasonably punishing for the bots: every rush still wins, at +33% time and 5 deaths instead of 3. Humans already died 5 times in a v0.4 rush (4:18), against 3 for the bot. If the bot ratio carries over, a C rush could mean 7–8 human deaths. Respawn grows +3 s per prior death (cap 22 s), so this compounds.
- **Shield.** Not disproportionately punished. Its flat +250 HP and +15 armor are a larger share of a smaller pool: at LV10, +14% of max HP in A versus +18% in C. Shield wins every run in every variant and was the fastest C strategy at reaction 1.
- **Flanking.** Higher tower damage makes flanking **less** dominant. No-item flanks happen at LV1, so lower base HP hits them hardest: the right flank flips to a loss in B (by 72 Crimson HP) and in C. The left-flank bot already loses in A (it never defends Azure); humans won it in 2:14 in v0.4.
- **Siege Hammer.** Still viable, and still the safest: 3/3 wins and Azure 3000 in every variant, with +10–15% time and 1 → 2 deaths. The Hammer flank still wins but now needs a death, and Azure takes about 900 damage during the respawn.
- **Retreat windows.** These shrink without disappearing. A LV1 Guardian under a tower and the Keep survives about 16 s in C versus 30 s in A; at LV10, 29 s versus 47 s. That is still many seconds to disengage on a 0.8 s cadence.
- **Interesting decisions or just faster deaths?** The added difficulty lands on structure assaults (tower +8% to +21%, Keep +21% / +43%). Lane defense hardly changes: the 15-minute defense and 20-minute survival look similar in all variants. It therefore raises the cost of attacking without making defense a death trap. Because growth is preserved, late-game durability (LV20: 2167–2574) and the Hammer's safety margin stay mostly intact.

## 6. Correctness notes and known limits

- **Rounded percentages.** Effective tower increases are +8.3% (B) and +20.8% (C), and the minion increase is +11.1%. Exact percentages would require fractional raw damage.
- **Pre-existing behaviour, unchanged.** Level-up never heals. Hammer remains dominant. There is no HP regeneration, so the long-match attrition death remains.
- **Bots are not human proxies.** The bots never kite, retreat or time their pushes. Human playtests decide.

## 7. Human playtesting

Run `npm run dev`, then open:

| Variant | URL |
|---|---|
| A (default) | `http://127.0.0.1:5173/` |
| B | `http://127.0.0.1:5173/?combat=b` |
| C | `http://127.0.0.1:5173/?combat=c` |

- `?combat=` combines with `?encounter=`.
- The browser console logs `[gameplay v0.4.1] combat variant ...` for B and C.
- Restarting a match keeps the variant.
- Production builds (`npm run build` / `vite preview`) ignore the option and always run A.
