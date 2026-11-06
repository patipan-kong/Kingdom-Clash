# Azure Ballista V1.0: frames (8 images, three runs)

The approved painted Ballista is `../../ref/master.png` (1254x1254, transparent). It was split on the horizontal line y=840 into two layers that the game draws one over the other, at the same position:
- `../../ref/base-intact.png`: the BASE, the stone footing and the lower part of the wooden pedestal post (everything at y >= 840). The post's flat top edge is on y=840 and is covered by the mechanism in game.
- `../../ref/mech-loaded.png`: the MECHANISM, the stock with its boss, iron bands and rope lashings, the winch, the two bow arms, the white string, the loaded bolt and the blue pennant (everything at y < 840). The mechanism is turned toward the upper right.
`../../ref/style-tower.png` and `../../ref/style-barracks.png` show the approved painted style (soft painted shading, dark outline, warm wood, grey stone, blue cloth, gold fittings, top-left light).

## Rules for every image
1. One generation per image. Use the built-in image tool, editing the input named for that image, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha. Never use a white, coloured or chroma-key backdrop; never run background removal, chroma key, matting, alpha repair or any script on the pixels. Save each output exactly as returned, under the file name given.
2. Keep the canvas square and every part that does not change at EXACTLY its input position, size, colour and shading. Never rescale, recentre or crop.
3. Same painted style, outline, light and camera as the input.
4. Nothing extra: no ground patch, ground shadow, dust, smoke, fire, glow, motion lines, sparks, text, border or backdrop.

## Run BASE (input `../../ref/base-intact.png`; output only the base layer)
The output keeps ONLY the footing and the post below y=840; the post's flat top edge stays on y=840 with the same width and x position as in the input, and nothing is drawn above it.

### `base-damaged.png`
The same base with light battle damage: several new cracks across the stone footing and two or three chipped edge stones, scorch marks and splintered gouges on the post, and two arrows stuck in the post, shafts angled outward. Silhouette almost identical.

### `base-critical.png`
The same base heavily damaged: large cracks splitting the footing, a missing wedge of stone at the front edge, loose broken stones lying at its rim, the post deeply gouged and split with splinters and heavy black scorching, four or five arrows stuck in it. The footing and post positions and the flat top edge on y=840 stay exactly the same; the post stays upright.

## Run COLLAPSE (input `../../ref/master.png`; output the whole Ballista, both layers, in one image)
### `collapse-1.png`
The machine as it begins to break: the stock has split and sags, the left bow arm has snapped in the middle and its half hangs from the string, the right arm is cracked, the string has snapped and trails loose, the bolt tumbles off sideways, the pennant is torn, the post splinters. The footing is cracked. It is still recognisably the same machine and the footing and post stay where they are.
### `collapse-2.png`
Mostly fallen: the stock lies broken across the top of the post stump, the bow arms are snapped halves lying on and around the footing, the string in a loose tangle, the pennant torn on the ground, about 45% of the master's height. No dust.
### `collapse-3.png`
Rubble: a low heap of broken wooden beams, snapped bow halves, rope and a torn blue pennant lying on the cracked stone footing, no taller than about 25% of the master's height and no wider than its footing. The heap's lowest row rests on the same row as the footing's lowest row in the master. No dust, no fire.

## Run MECH (input `../../ref/mech-loaded.png`; output ONLY the mechanism layer, nothing at y >= 840)
Only the string, bow arms, bolt, winch crank and pennant may change, as described; the stock, boss, iron bands, rope lashings, winch drum and the pennant's pole stay as in the input.
### `mech-fired.png`
The instant after release: no bolt anywhere; the string has sprung forward and lies as a nearly straight slightly sagging line between the two arm tips; the two bow arms have relaxed forward, their tips a little closer together and higher than in the input; the pennant flutters back.
### `mech-recoil.png`
A moment after release: no bolt; the bow arms are flexed to their furthest relaxed position (tips pulled in toward each other and forward, clearly more than in mech-fired), the string slack and bowing in a loose curve below the straight line between the tips; the winch crank has swung a little; the pennant whipped the other way.
### `mech-reload.png`
Re-arming: the string is drawn about halfway back toward the stock's centre by the winch (the string in a shallow V, the arms bent about halfway between mech-fired and the input), the winch crank turned, and a fresh bolt is laid on the stock, half seated: lower and flatter than the input's bolt, its silver head pointing to the upper right, its tail resting against the stock's centre.
