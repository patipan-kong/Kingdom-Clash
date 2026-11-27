# Campaign gameplay freeze

Product-owner approval covers B1, B1.1, the Chapter 1 battlefield improvements, B2 and all six B5 missions. The configurations for all 36 campaign missions are frozen for the integrated Desktop UX and gameplay regression. The approved changes affect eight missions relative to V1.1 (`b67cbd3`).

| Mission | Approved victory | Crimson Keep | Crimson tower positions `(x,y)` | Crimson first wave / interval |
| --- | --- | --- | --- | --- |
| C1M1 Hold the Ford | Defeat five waves or destroy the Keep | 4,000 HP, unarmed | (1464,504), (1464,600), (1464,696), (1512,456), (1512,744), (1560,480), (1560,720), (1760,600) | 8 s / 22.5 s, five scripted waves |
| C1M2 Fortify the Crossing | Complete two Azure Archer Towers and either defeat six waves or destroy the Keep | 4,000 HP, unarmed | Same eight positions as C1M1 | 15 s / 24 s |
| C1M3 Against the Tide | Destroy the three front towers or destroy the Keep | 3,000 HP, unarmed | (1464,504), (1464,600), (1464,696), (1560,480), (1560,720) | 10 s / 25 s |
| C1M4 The Twin Batteries | Destroy all five battery towers or destroy the Keep | 3,000 HP, unarmed | (1464,504), (1464,696), (1512,456), (1512,744), (1760,600) | 10 s / 25 s |
| C1M5 The Crimson Muster | Destroy the War Camp or destroy the Keep | 3,000 HP, unarmed | (1464,504), (1464,600), (1464,696), (1560,480), (1560,720) | 10 s / 25 s |
| C2M1 The Dust Riders | Defeat six waves or destroy the Keep | 4,000 HP, unarmed | (1560,480), (1560,720) | 10 s / 640 ticks (about 21.3 s) |
| C2M3 The Sandstone Line | Destroy both gate towers or destroy the Keep | 3,000 HP, unarmed | (1464,504), (1464,600), (1464,696), (1560,480), (1560,720) | 10 s / 25 s |
| C2M4 Break the Siege | Destroy the Barracks or destroy the Keep | 3,000 HP, unarmed | (1560,480), (1560,720) | 10 s / 20 s |

- The simulation runs at 30 ticks per second. C1M1 Crimson announcements occur at ticks `240, 915, 1590, 2265, 2940`. Its exact Azure spawn ticks remain `240, 264, 990, 1014, 1740, 1764, 2490, 2514, 3240, 3264`. Wave sizes, composition, economy and rewards remain as approved. Azure defeat has priority when both Keeps fall on the same tick.
- The Captain of the Ford guards C1M3 from `(1320,540)` with a 156-unit leash. The Captain uses the Crimson Hero body and sprite with 833 HP, 20 armor, 80 attack damage, 95 move speed, 20 collision radius and 48 melee range. An 18-tick (0.60 s) windup uses the existing strike lifecycle. The Captain has one life and grants the existing 25 Gold and 150 XP. Defeating the Captain is optional. The 125% sprite scale is visual only. The localized world name, health bar and 2.25-second HUD announcement use the existing presentation systems.
- The 2,000 HP War Camp and 3,500 HP C2M4 Barracks still own their original Crimson spawn slots and stop their own reinforcements when destroyed. The Keep route leaves those structures and the towers optional.
- `anyOf` applies within the relevant mission phase. Other requirements in the phase still apply, including C1M2 construction. The briefing and HUD use the localized group label in English, Thai and Japanese. Existing territory shields, capture requirements and siege progression still apply across the campaign. In total, 34 missions use Keep destruction in a victory route, including missions that require earlier objectives.
- C2M2 and C6M6 remain the explicit exceptions. C2M2 retains its Shield Bash, Vanguard Charge and tower-damage phases. C6M6 retains its dedicated Crimson Warlord fight and its siege progression. Both retain the protected Keep scenery. C1M6 retains its original armed Keep finale.

## Review and integration

The gameplay patch is based on `b67cbd3` and contains the approved campaign, simulation, localization and regression changes. In the shared scenes, `Battle.ts` owns the Captain's presentation and encounter event, and the gameplay changes in `HUD.ts` consume that event and display the Captain's inspector name. Desktop UX control layout, keyboard and touch handling, panel navigation and its battle strings are tracked by the [Desktop UX handoff](DESKTOP_UX_D2.md).

Status 2026-11-27: gameplay and Desktop UX are integrated and approved; the browser gate below was completed on the 1.2.0 release package (227/227); see [RELEASE_V1_2.md](RELEASE_V1_2.md) for how it was played. The gate as originally written:

Integrated regression is the next gate. Exercise both objective routes and retry/progression through the normal campaign entry point, including the C1M2 construction gate, on keyboard and touch. Check objective wrapping and the Captain announcement in English, Thai and Japanese. Include the C2M2 and C6M6 exceptions and one gated territory siege. Production deployment and Playgama integration await separate approval.
