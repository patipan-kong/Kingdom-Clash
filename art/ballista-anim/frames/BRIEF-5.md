# Azure Ballista V1.0: one more mechanism pose

Input: `../../ref/mech-fired.png`, a large wooden bow-shaped game prop (a stock, two curved wooden arms joined by a rope, a winch with a crank, a blue pennant) on a transparent canvas, in a painted game-art style. `../../ref/style-tower.png` shows the style. Every part not mentioned stays exactly as in the input: the stock, the gold boss, iron bands, rope lashings, winch drum and the pennant's pole.

## `mech-reload.png` (variant A or B, as the run's name says)
The rope is being wound back toward the middle of the stock by the winch: the rope forms a shallow V from the two arm tips down to a point above the stock's centre, the arms are bent a little further than in the input (about halfway to a fully drawn bow), and the winch crank has turned a quarter turn.
- Variant B only: a straight wooden dowel with a small pointed metal tip lies on the stock along its centre, pointing to the upper right, its tail resting against the stock's centre.
- Variant A only: nothing lies on the stock.

Rules: one generation with the built-in image tool, editing the input, genuinely transparent background (`transparent_background: true`); same canvas size and place, painted style, outline and light; nothing at or below y=840; no ground, shadow, dust, smoke, glow, motion lines, text or backdrop; never run background removal or any script on the pixels; save the output exactly as returned.
