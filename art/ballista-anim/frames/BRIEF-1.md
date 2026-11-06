# Azure Ballista V1.0: master painting (1 image)

Inputs (do not edit them): `../../ref/ballista-template.png` (1024x1024, transparent) is the CURRENT Azure Ballista, drawn flat: a round grey stone footing, a short wooden pedestal post, a horizontal wooden stock, two big curved wooden bow arms in a V with a white string, one loaded bolt pointing up with a silver head, a gold boss on the pedestal and a blue swallow-tail pennant at the stock's right end. `../../ref/style-tower.png` and `../../ref/style-barracks.png` are the approved painted Azure buildings: the target STYLE (soft painted shading, dark outline, warm wood, grey stone with chips, blue cloth, gold fittings, top-left light, three-quarter high camera).

## Task: `master.png`
Repaint the Ballista from the template in that painted style. Keep it recognisably the SAME machine:
- same parts and proportions: round grey stone footing at the bottom, wooden pedestal post rising from it with a gold boss, a horizontal stock on top, two large curved bow arms rising in a V from the stock, a white bowstring from the arm tips to the stock's centre, one loaded wooden bolt with a silver head rising from the string's centre, and a blue swallow-tail pennant on a short pole at the stock's right end (it may flutter slightly);
- use iron bands on the stock, rope lashings on the arms and a small winch drum on the stock's rear, as a hand-built siege engine would have; keep them modest;
- the mechanism is turned a little (about 25 degrees) toward the viewer's right, so the stock and bolt point to the upper right in a three-quarter view; the bolt must point at about 60 degrees above horizontal toward the right and the footing and pedestal are not turned;
- the footing is a low round stone plinth, painted with chips and cracks like the Barracks stone base.

## Rules
1. One generation. Use the built-in image tool editing `../../ref/ballista-template.png`, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha. Never use a white, coloured or chroma-key backdrop, and never run background removal, chroma key, matting or any script on the pixels. Save the output exactly as returned.
2. Keep the canvas square and the machine at the template's size and position: the footing's lowest row stays at the template's (about y=940 of 1024) and the machine stays inside x 150..880, y 190..940.
3. Nothing extra: no ground patch, no ground shadow, no dust, no glow, no text, no border, no backdrop. Only the Ballista.

Save as `master.png` in the current folder.
