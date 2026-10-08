# Art Direction — Stylized Fantasy RTS

## Visual thesis

Kingdom Clash presents a welcoming, sunlit fantasy conflict with clear battlefield roles. Sunstone Crossing is an emerald forest valley split by a turquoise stream. A warm sand lane and stone bridge give the eye an immediate left-to-right battle axis. The border is rich with foliage; the central lane stays open and lower in visual complexity.

The initial art quality and Stylized Fantasy RTS direction are approved. This refinement changes camera framing and HUD hierarchy while retaining the approved units and buildings. It remains a visual review deliverable; the gameplay roadmap in specifications 01–10 is not implemented. No reference screenshot was available in the received chat/attachments, so framing follows the written mobile MOBA requirements rather than an exact screenshot match.

## Camera and light

Use orthographic three-quarter artwork, nominally 55 degrees above ground, with visible fronts and roofs. Remain in Phaser 2D: no perspective camera or 3D engine. Light comes from the upper left with warm highlights and soft shadows toward the lower right. Trees, bushes, rocks, bridge, units and buildings are separate sprites with foot-based depth sorting where appropriate. Procedural contact shadows anchor objects.

Ground coordinates remain a 1,920 × 1,152 logical world (40 × 24 cells of 48 units). The projection maps ground to a 1,920 × 829.44 render world using x = worldX and y = worldY × 0.72. A 960 × 540 camera shows 960 × 750 logical units, about half the map width. It follows the Guardian with 0.14 interpolation and a 35-pixel vertical offset, leaving the hero's body near center while preserving room ahead. Camera scroll is clamped to the projected map boundaries; HUD coordinates are in an independent scene and never scroll.

The minimap owns the full-map overview: its marks are computed from logical coordinates and its viewport rectangle is computed from inverse camera projection. Tapping it temporarily surveys a location for 2.2 presentation seconds. Moving the joystick, using movement keys or tapping the hero portrait restores following without moving the hero to the map tap.

## Terrain pipeline decision

Enlarging the first background would magnify baked vegetation and shorelines while preserving approximate, unrelated navigation bounds. The active scene instead uses generated grass/path/water texture modules and independent environment props. Shared `terrain` data defines the lane, water and walkable bridge for rendering, movement rejection and minimap geometry. Sprite artwork does not define collision footprints.

The tradeoff is additional authoring and visible repetition in a small texture/prop library. Straight river/lane geometry and procedural shore stones are temporary. This is a compact modular prototype layer, not a production autotile system. The old painted battlefield is preserved in `art/source/battlefield-original.png` and excluded from the active scene/build. No approval for full gameplay or broader production art work is implied.

## Shapes, proportions and scale

Guardian: broad gold-trimmed pauldrons, large shield, cobalt plume, compact body; oversized readable silhouette. Minions: smaller helmets and shields, reduced gold ornamentation. Both armies share unit proportions. Bases: thick ivory stone, grouped round towers and conical roofs. Archer Tower: narrow timber silhouette with a visible elevated archer. Wall: low horizontal stake silhouette, no roof.

Presentation height guide: base 197 px, tower 142 px, Guardian 106 px, wall 60 px and minion 58 px. Sprite aspect ratios are preserved. Art size never determines occupancy: tower and each wall occupy one grid cell; bases use an illustrative 3 × 3 footprint; Guardian radius is 20 world units and minions 12. Scenery uses separate logical circular footprints. The base footprint is a visual-review assumption because the specifications do not prescribe it.

## Palette and texture

| Role | Palette | Purpose |
|---|---|---|
| Friendly | Cobalt roofs and cloth; cyan `#70D7FF` indicators; white shield | Stable, protective identity |
| Enemy | Crimson roofs and cloth; coral `#FF7976` indicators; white diamond | Opposing identity without relying only on color |
| Terrain | Jade, emerald, turquoise, warm sand | Calm readable field under vivid actors |
| Materials | Ivory stone, warm timber, silver metal, warm gold | Shared material language |
| HUD | Dark teal `#122D35`, gold `#DCBF7A`, cream text | Fantasy-modern mobile interface |

Textures use soft painted facets, bevels and broad highlights. Avoid photoreal grime, thin outlines and noisy miniature details. At mobile size, silhouettes and symbols carry the identity before texture.

## HUD and readability

The compact Guardian portrait/name/LV/HP/XP panel anchors 12 logical pixels from the upper-left canvas edge. Gold 250, Wood 180 and Iron 30 share a centered 288 × 54 panel with matching 32-pixel original coin/log/ingot icons. The full-map minimap anchors eight pixels from the right edge; a compact gold-bevel Pause disc sits immediately to its left. The three top zones share a 12-pixel upper edge, with clear gaps and no decorative headings. Safe-area CSS places the entire canvas within device insets.

Joystick stays bottom left; every combat and utility control belongs to the right thumb. Approved icon art is retained. Attack remains the largest disc, anchored to the lower-right safe canvas. Three skills reduce from 70 to 67 logical pixels; sanctuary reduces from 74 to 71. Their existing arc around Attack is preserved with additional room for pressed rims. Build/Shop/Army form a compact vertical column immediately left of that arc. Their 46.9-pixel discs are 70% of the standard skill diameter, with small labels (at least 9 CSS pixels) and independent invisible circular touch targets. They open the existing illustrative panels; Footprints remain inside Build. No Q/W/E/R labels appear.

`src/ui/controlLayout.ts` derives all bottom-right controls from the right/bottom canvas edges and the measured FIT scale. A 24 CSS pixel bottom strip is reserved for gesture navigation in addition to external safe-area insets. Primary skills stay at least 48 CSS pixels across, Attack at least 68; utility targets stay at least 48 even when their art is smaller. Short screens increase logical button sizes and spread the utility column vertically rather than shrinking the primary controls. The existing Phaser world/camera and top HUD do not change. Utility presses shrink the icon and light the rim; pause dims/disables them. Outside release, pointer/touch cancellation, resizing and loss of focus clear presses without activation.

Button press shrinks the icon and brightens its rim. Release inside the button activates a visual effect; release outside cancels. Presentation cooldowns dim the icon and show a swept sector, progress rim and remaining seconds, blocking repeated preview activation. Pause desaturates/disables ability icons and freezes these timers. These states demonstrate HUD behavior, not combat balance or progression. Important values use cream text and bold weight. Gold/Wood/Iron retain distinct shapes and counts.

At 844 × 390, standard skill discs/targets are 48.39 CSS pixels, sanctuary is 51.28, Attack is 76.56, and utilities show 33.87-pixel art over 48-pixel targets. Unchanged portrait/Pause targets are 49.11 pixels. At 667 × 320 and 568 × 320, bottom skills and utility targets remain 48 pixels and Attack remains 68; the approved top HUD becomes smaller. FIT preserves 16:9 letterboxing. Portrait shows a rotation guard and pauses presentation. Concurrent touches, release, cancellation and unequal simulated safe-area insets are browser-verified; physical thumb reach and device gesture behavior still require review.

## Review gates

Review the new camera distance, follow feel, minimap and circular control ergonomics before moving beyond this refinement. The previously approved art style is retained. Directional animations, production navigation, combat and other gameplay systems remain outside this prototype.
