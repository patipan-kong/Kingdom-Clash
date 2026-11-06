# Wooden Wall V1.0: frame brief (6 images)

Input (do not edit it): `../ref/wall-template.png` (1024x1024, transparent). It is the approved Wooden Wall painting at a fixed scale: a palisade of FIVE sharpened wooden stakes in a row, seen from a three-quarter high angle. The row runs diagonally, from the tallest stake at viewer-left/back down to the stake at viewer-right/front. Two horizontal wooden rails run through dark iron bands with square rivets. The stakes' feet stand on the ground line at y=940.

## Rules for every image

1. **One generation per image.**
   - Use the built-in image tool, editing `../ref/wall-template.png`, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha.
   - Never use a white, coloured or chroma-key backdrop.
   - Never apply background removal, chroma key, matting, alpha repair or any script to the pixels.
   - Save each output exactly as returned, under the file name given.
2. **Keep the canvas and the scale.** Keep the output canvas 1024x1024. Keep the wall at EXACTLY the template's size and position: never rescale, recentre or crop. The feet stay on y=940.
3. **Match the template.** Use the same painted, soft-shaded style, dark outline, warm wood and grey iron palette, top-left lighting and camera as the template.
4. **Nothing extra.** No ground, ground shadow, dust cloud, smoke, glow, motion lines, sparks, text, border or backdrop. Only wood, iron and arrows.

## Run A

### `01-damaged.png`: Damaged
The same wall, with the same outline, the same five stakes, the same positions and the same rails and bands. Add light battle damage only on the surfaces:
- two arrows stuck in the wood (one in the second stake, one in the fourth), shafts angled toward the viewer;
- one vertical split crack down the middle stake;
- a few chips and nicks on the stake tips;
- one iron band slightly dented.

The silhouette must stay almost identical to the template.

### `02-badly-damaged.png`: Badly damaged
The same wall, at the same size, position and feet, with heavy damage:
- the pointed tip of the fourth stake snapped off, leaving a jagged splintered top about 15% shorter;
- the middle stake cracked right through, with splinters;
- the lower iron band of the second stake broken and hanging loose;
- three arrows stuck in the stakes;
- darker scorched patches on two stakes.

The other stakes keep their height. The outline changes only where the tip broke off.

### `03-breaking.png`: Breaking
The wall at the moment it gives way. The feet stay on the same ground line, in the same place:
- the stakes lean outward and apart, the left ones tilting left and the right ones tilting right, by about 15–25 degrees;
- the rails are snapped, the iron bands burst open;
- splinters at the breaks;
- the middle stake broken in half.

The wall is still standing but clearly falling apart.

## Run B

### `04-rubble.png`: Rubble
The wall fallen: a low heap of broken stakes, snapped rails and bent iron bands lying flat on the ground. The heap is centred where the wall stood and rests on the ground line y=940. It is no taller than about one third of the template wall, and no wider than 1.25x the wall's width. Two or three short broken stake stumps still stand at the feet. No dust, no ground patch.

### `05-ajar.png`: Ajar (gate half open)
The same wall, now a gate:
- **Posts:** the FIRST stake (viewer-left) and the FIFTH stake (viewer-right) stay exactly where and how they are in the template. They are the gate posts.
- **Leaf:** the middle THREE stakes, with their own short rail pieces and iron bands, are one gate leaf, hinged at the fifth stake. The leaf has swung about 45 degrees BACKWARD, away from the viewer.
  - It looks foreshortened (narrower) and angled into the depth behind the fifth stake.
  - Its stakes are the same height and look as before.
- **Gap:** a gap has opened next to the first stake. Through it, nothing is drawn (transparent).

### `06-open.png`: Open (gate fully open)
The same gate as `05-ajar.png`:
- the first and fifth stakes stay exactly where they are;
- the three-stake leaf has swung fully back, about 90 degrees, hinged at the fifth stake. It is seen almost edge-on, as a narrow column of stakes behind the fifth stake, receding into the depth;
- the passage between the first and fifth stakes is fully open and transparent;
- the rails between the posts are gone with the leaf.

Write a short report of what was done to the report file named in your task.
