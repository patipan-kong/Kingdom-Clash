# Chapter 5 asset readiness: Tavern and Allied Knight

Status: requirements only. No artwork has been created. Both assets are placeholders today (`Battle.unitVisual`): the Tavern draws the Azure Barracks sprite (`barracks-azure.png`) under the name "Tavern", and every Allied Hero draws the Guardian sprite (`guardian.png`) at 1.5x soldier size. Existing sprites are PNG with alpha, loaded by key in `Battle.preload` (`/assets/<key>.png`), anchored bottom-centre (`setOrigin(.5,1)`, drawn 4 px below the entity point) and scaled to the entity's `width x height` in world px.

## Tavern (one sprite, Azure team)

| Item | Requirement |
|---|---|
| File | `public/assets/tavern-azure.png`, alpha, replaces the `azureBarracksVisual` spread in `unitVisual` (`u.tavern`) |
| Size | about 384 x 372 source, like `barracks-azure.png` (draws 60 x 76 world px on a 1 x 1 cell, 48 px) |
| Footprint | one grid cell; the base of the art must sit inside the cell, roof and sign may overhang upward only (the map is projected, y x 0.72) |
| Reads as | an inn / hall, clearly different from the Azure Barracks (banner, tents) and a Tower: a hanging tankard sign and a chimney or lit window are the cheapest cues |
| Team | Azure blue and gold trim, consistent with the other Azure buildings; a Crimson variant is not needed |
| States | one finished sprite. Under construction reuses the existing build progress (HP bar); no animation needed. A destroyed state is not needed (the structure is removed) |
| Legibility | must read at about 36 x 46 CSS px (S24 fullscreen scale 0.667) and in the Build card and placement preview, which reuse the same texture |

## Allied Knight (shared by Roland, Borin, Kael)

| Item | Requirement |
|---|---|
| File | `public/assets/ally-knight.png`, alpha, replaces `texture:'guardian'` in the `ally` visual |
| Size | about 384 x 340 source, like `guardian.png` (draws 103 x 132 world px: 1.5 x the Guardian's 69 x 88) |
| Pose | standing, facing right, same camera angle, anchor and feet position as `guardian.png`, so shadow ellipse and HP bar line up |
| Reads as | a mercenary melee knight that is not the Guardian: a different silhouette (open helm or horned helm, no tower shield), a heavier sword, a warm tabard. Must be told apart from the Guardian in a crowd at about 50 CSS px tall |
| Team | Azure blue as the main colour so allies read as friendly; the HP bar and ring already carry team colour |
| Portrait | `HeroBar` draws the TOP HALF of the sprite as a face inside a circle (image origin top-centre, scaled to the circle diameter), so the head and shoulders must sit in the upper half and be centred, with nothing important cut by a circular mask |
| Variants | optional later: tint or small trim change per mercenary (Roland neutral, Borin heavier and blue-grey, Kael red-orange accents); not needed for the first pass because name and stats are in the panel and bar |
| Animation | none in the engine (units are static sprites); no frames needed |

## Not required yet

Tavern interior art, mercenary portraits, hire or revive effects, a Crimson Knight, sound. The Tavern panel and Hero bar are drawn with existing Graphics and the fantasy theme.

## Integration points when art exists

`src/scenes/Battle.ts`: add the two keys to the `preload` list; point the `u.tavern` and `u.ally` visuals at them (`unitVisual`); `placementArt` and the Build card use the Tavern texture through the same visual. `src/ui/HeroBar.ts` loads `'guardian'` for the portrait face: switch it to the Knight key. Update `docs/ASSET_MANIFEST.md`.
