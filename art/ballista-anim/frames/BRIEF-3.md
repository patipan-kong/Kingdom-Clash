# Azure Ballista V1.0: one mechanism pose (retry)

Input: `../../ref/mech-loaded.png`, the wooden crossbow-style mechanism of a siege crossbow (stock, two curved wooden arms, white rope string, a bolt, a blue pennant), on a transparent canvas, in a painted game-art style. `../../ref/style-tower.png` shows the style.

## `mech-recoil.png`
Edit the input into the pose just after the string was let go, when the wooden arms have swung a little past their resting shape: the bolt is gone, the two arms are bent slightly inward and forward so their tips are close together and held high, the rope string hangs in a loose, sagging loop below the line between the tips, the small winch handle has swung a little, and the blue pennant ripples the other way. The stock, the gold boss, iron bands, rope lashings and winch drum stay exactly as in the input; nothing is drawn at or below y=840.

Rules: one generation with the built-in image tool, editing the input, with a genuinely transparent background (`transparent_background: true`); keep the same canvas size and place, painted style, outline and light; no ground, shadow, dust, smoke, glow, motion lines, text or backdrop; never run background removal or any script on the pixels; save the output exactly as returned.
