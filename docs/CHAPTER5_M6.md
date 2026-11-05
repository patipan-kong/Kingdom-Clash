# Chapter 5 M6: The Crimson Throne — implementation report (uncommitted, awaiting PO review)

Status: implemented on `scratch/c5-allied-hero` on top of the committed M5 (`97a5f09`). Not committed, pushed, merged or deployed. Design: `docs/CHAPTER5_M6_DESIGN.md` (PO approved, Option B). Every balance value is provisional; bot results are evidence only and the Galaxy S24 playtest decides balance. M1-M5 and Chapters 1-4 are unchanged; Chapter 5 stays Coming Soon.

## Values as built (PO-approved)

| Item | Value |
|---|---|
| Level | `campaign-46`, Chapter 5 slot 6, "The Crimson Throne" (debug launch `?debug=1&level=46`) |
| Terrain | `crimson-throne`: Crimson Fortress geometry, M4/M5 tower ids, forward towers moved to the gate road's centre line `c5-sally-north` (1344,552) and `c5-sally-south` (1344,648); art alias of Crimson Fortress |
| Start | 100 Gold, 200 Wood, 30 Iron; Hero Cap 2; Barracks cap 2; pads: 3 home, (22,8) North, (22,16) South |
| Waves | [7,7,8,8,9,9,10,10] from 30 s, every 30 s; wave 3 south road (all), wave 5 north road (all), wave 7 split (4-6 units south) |
| Throne Gate | 3,000 HP (M5: 2,500); Last Stand 3 Elites (M5: 4) |
| Crimson Lord | Crimson Hero x1.2 HP (1,000), x1.1 damage (88), released 1 s after the gate falls at (1488,600), back 45 s after each death while the Keep stands |
| Commanders | Iron Marshal 240 s (rest 90 s), Shadowblade 330 s (rest 40 s), warnings 6 s ahead; M4/M5 stats |
| Siege | Ballista cell (24,5) and War Cart wreck (20,19) exactly as M5 (single-use cart, locked until the South Outpost is Azure) |
| Outposts | M5's, with no South Warden |

## Core change (PO approved, Option B; three files)

- `src/data/matchSetup.ts`: `MatchHero` gains optional `lord?:{hp,damage}`. Validated (needs a garrison and camps, no camp with its own Hero because the Lord and a Warden share the id `red-hero`, hp and damage in (0,4]) and copied. Absent = every earlier setup.
- `src/simulation/Simulation.ts` (3 lines): with `lord` the Hero is registered under `heroId` even with camps (so the existing gate hook schedules him) and the timed Raider is not registered; `heroDue` scales his hit points and damage the way `commanderDue` does.
- `src/simulation/Movement.ts` (1 condition): a `heroId` Hero without a camp of his own marches on the Azure Keep and fights nothing else, as the Chapter 3 Warlord does; before, only a no-camp mission did this and no earlier mission has a camps-and-no-Warden `heroId`.
- Respawn 45 s and "stop when the Keep falls" are the existing Hero mechanics (`respawnTicks`, `heroDue`), unchanged.
- No other core, Combat, GameState or UI file changed. No new dependencies.

## Verification

- TypeScript clean; production build OK.
- `tests/campaign-level-46.cjs`: 19 tests. Identity and Coming Soon; approved values (and M5's unchanged); the Throne map; no Lord or Raider at the start and no clock release; the gate releases him once with 1,000 HP and 88 damage, three Elites; towers, a Banner holder and an outpost capture do not release him; he marches on the Keep and strikes only it; 45 s respawn twice with the same stats; no respawn after the Keep falls; Commanders on their own clocks (234/240 s, 324/330 s) with or without the gate; Lord and Marshal coexist; staged flank waves; M5 siege carried over; matchSetup validation and Warlord/earlier setups unchanged; three bot tests.
- Regression: Chapter 3 M6 Warlord (`campaign-level-26.cjs`) and every Commander mission (`campaign-level-34/36/44/45`) pass unchanged in the full suite. List/registry tests extended for campaign-46 (battlefield-art, campaign-level-31/41/42/43/44/45, chapter-view, debug-launch, frost-gate, six-missions).
- Full automated suite: 1349 of 1349 pass; TypeScript clean; production build OK.
- `scripts/verify-crimson-throne.mjs`, 780x360, DPR 3, real taps: ALL PASS (start values, locked wreck ring, real South capture and repair, cart follows, Ballista placed by tap and shooting, Marshal 234/240 s and Shadowblade 324/330 s, peak 31 live units, then the Lord: absent before the gate, no clock release, 1,000 HP / 88 damage inside the fortress after the gate, marches west on the Keep, down 40 s is not back, back after 45 s, no return after the Keep falls). Stills: the Lord attacking the Keep reads normally with the existing "Azure Keep under attack" notice.
- Browser regression on the same tree: M5 (`verify-last-stronghold.mjs`) ALL PASS; M4 (`verify-broken-alliance.mjs`) ALL PASS.

## Bot results (evidence only; start times 60/90/120/150/180 s, deterministic)

`tests/support/throneBot.cjs` (the M5 bot on campaign-46, with `gateAt`, a second hold-back before attacking the gate, and Lord/overlap logging).

| Plan | Wins | Median win | Gate down (med) | Lord released | Lord defeats (5 runs) | Marshal dead (med) | Marshal+Shadowblade+Lord alive together | Guardian deaths (med) | Hero falls (med) | Keep min HP (med) | Peak live |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Guardian only | 0/5 | - | 489 s | 490 s | 9 | 264 s | 18 s | 5 | 0 | 0 | 29 |
| Direct rush | 0/5 (1 timeout) | - | 166 s | 167 s | 23 | 266 s | 2 s | 3 | 6 | 0 | 28 |
| No siege | 5/5 | 368 s | 199 s | 200 s | 10 | 269 s | 0 s | 3 | 5 | 1,944 | 28 |
| North-first (Ballista, then cart) | 5/5 | 359 s | 191 s | 192 s | 13 | 270 s | 0 s | 3 | 5 | 1,416 | 29 |
| South-first (cart, then Ballista) | 4/5 | 319 s | 218 s | 219 s | 9 | 266 s | 0 s | 3 | 4 | 1,944 | 27 |
| Ballista only | 5/5 | 311 s | 189 s | 190 s | 9 | 269 s | 0 s | 2 | 4 | 2,032 | 30 |
| Cart only | 5/5 | 418 s | 234 s | 235 s | 12 | 265 s | 0 s | 3 | 4 | 1,242 | 28 |
| North-first, iron saved | 3/5 | 314 s | 220 s | 221 s | 8 | 264 s | 0 s | 3 | 4 | 452 | 22 |
| South-first, iron saved | 1/5 | 395 s | 213 s | 214 s | 10 | 268 s | 8 s | 3 | 5 | 0 | 28 |
| Methodical, no siege (gate after 290 s) | 5/5 | 419 s | 306 s | 307 s | 10 | 254 s | 13 s | 2 | 4 | 1,592 | 27 |
| Methodical, Ballista | 5/5 | 418 s | 303 s | 304 s | 9 | 263 s | 14 s | 2 | 2 | 2,120 | 21 |
| Methodical, North-first | 5/5 | 420 s | 303 s | 304 s | 8 | 259 s | 0 s | 2 | 3 | 1,720 | 23 |

Winning clear times across all plans: 233-544 s (about 4-9 minutes); no run reached the 11-14 minute human target, as in every earlier mission the human run is expected to be slower than the bot.

## Findings

- **Two viable approaches are real.** Early breakthrough (gate down 166-234 s, before the Marshal at 240 s) wins in the siege and no-siege plans; the methodical plans (nothing at the gate before 290 s) win 5/5. The direct rush and the Guardian alone lose (the Keep stays shielded while the outposts hold).
- **Simultaneous Marshal + Shadowblade + Lord pressure is avoidable.** In the early plans no run had all three alive together; the methodical no-siege and Ballista plans did for 13-14 s in total across five runs (each run that overlapped won), because the gate fell at 290-330 s, just before the Shadowblade. It is never forced: the player chooses when the gate falls. The three overlapping cases appear in a few losing saving-plan runs too (South saving: 8 s).
- **Lord threat.** He is defeated about twice per run (8-13 times in five runs); the plans that win hold him at the Keep with the Guardian and heroes. The rush plan meets him 23 times (the Keep is open and nothing is held back), which is the expected punishment.
- **Siege usage.** The Ballista matters: it is the fastest approach (median win 311 s, gate down 189 s) and deals 9,500-20,800 damage across five runs. The War Cart is repaired in 11 of 25 siege runs (all five cart-only runs, 206-224 s) but never touched the gate in any run (0 damage): it dies to the waves unescorted, the same finding as M5. Iron is the limiting resource (about 15 per minute): the siege assets compete with the second Barracks and tower repairs.
- **Saving plans lose** (north-first 3/5, south-first 1/5), the same bot artifact as M5: saving iron starves the home defence.
- **Stalls:** none worth reporting; peak live units 21-30 (target 40).
- **Timing:** the Lord is released before the Marshal in most bot runs; the Marshal is killed at 254-270 s, about 15-30 s after his release.

## Remaining risks and human-playtest items

- Difficulty and clear time are unproven for humans: the bots clear in 4-9 minutes, below the 11-14 minute target; the S24 playtest must say whether 9.5/10 and 11-14 minutes hold.
- Does the 90 s Marshal rest and the 3-Elite Last Stand feel right, and is the gate timing decision (early versus after the Marshal) readable without a prompt?
- The staged flank waves (wave 3 south, 5 north, 7 split) were checked as data and in the bots; whether they feel like distinct counterattacks on a phone needs a human.
- The War Cart is still unproven as a gate breaker in bot play.
- The Lord has no announcement notice (he appears at the gate; the existing "Azure Keep under attack" notice follows when he arrives). A notice would be a UI change and is not in scope; flagged for the PO.
- Barracks label wrapping on the five-card Build panel is deferred (PO).

## Changed files

Source: `src/data/matchSetup.ts`, `src/simulation/Simulation.ts`, `src/simulation/Movement.ts`, `src/data/campaignLevels.ts`, `src/world/battlefield.ts`, `src/world/battlefieldArt.ts`.
New: `tests/campaign-level-46.cjs`, `tests/support/throneBot.cjs`, `scripts/verify-crimson-throne.mjs`, `docs/CHAPTER5_M6.md`; `docs/CHAPTER5_M6_DESIGN.md` (from the design phase).
List/registry tests updated: `battlefield-art`, `campaign-level-31`, `campaign-level-41`, `campaign-level-42`, `campaign-level-43`, `campaign-level-44`, `campaign-level-45`, `chapter-view`, `debug-launch`, `frost-gate`, `six-missions`.

## How to run

`node scripts/test.mjs campaign-level-46.cjs`; bots: `node tests/support/throneBot.cjs '{"plan":"north-first","startAt":2700}'`; browser: `STRONGHOLD_URL=http://127.0.0.1:5371/ STRONGHOLD_EVIDENCE=<dir> node scripts/verify-crimson-throne.mjs` (needs the dev server on that port). Dev launch `?debug=1&level=46`.
