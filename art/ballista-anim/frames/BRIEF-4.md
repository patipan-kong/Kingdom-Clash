# Azure Ballista V1.0: mechanism poses, from the fired pose

Input: `../../ref/mech-fired.png`, a large wooden bow-shaped game prop (a stock, two curved wooden arms joined by a rope, a winch with a crank, a blue pennant) on a transparent canvas, in a painted game-art style. `../../ref/style-tower.png` shows the style. Every part that is not mentioned stays exactly as in the input: the stock, the gold boss, iron bands, rope lashings, winch drum and the pennant's pole.

## Variant `recoil` (`mech-recoil.png`)
The rope has just been let go and the wooden arms have swung a little past their resting shape: the arms are bent slightly further inward and forward than in the input so their tips are closer together and held high, and the rope hangs in a loose, sagging loop below the line between the tips. The winch crank has swung a little and the blue pennant ripples the other way.

## Variant `reload` (`mech-reload.png`)
The rope is being pulled back toward the middle of the stock by the winch: the rope forms a shallow V from the arm tips to a point above the stock's centre, the arms are bent about halfway between the input and a fully drawn bow, the winch crank is turned, and a new wooden shaft with a silver point is being laid on the stock: it lies low and flat along the stock's centre, its silver point toward the upper right, its tail resting against the stock's centre.

Rules: one generation per image with the built-in image tool, editing the input, genuinely transparent background (`transparent_background: true`); same canvas size and place, painted style, outline and light; nothing at or below y=840; no ground, shadow, dust, smoke, glow, motion lines, text or backdrop; never run background removal or any script on the pixels; save the output exactly as returned.
