#!/usr/bin/env python
"""Validate the Tower V1.0 sheet (art/tower-anim/tower-grid.png, written by scripts/pack-tower-sheet.py) against the approved still public/assets/tower.png.
Usage: py scripts/validate-tower-sheet.py   (exit 1 on any FAIL). Needs Pillow only.
Checks: native alpha (soft edges, transparent cell border, no backdrop); the intact building matches the still's silhouette and colours outside the archer's
window; the damage states keep the intact outline, baseline and footprint; the collapse stays on the ground line and inside the cell; the archer sets have
nothing below the railing line, keep the same hood and legs in every pose, and the left set mirrors the right; the Crimson recolour (crimsonTowerPixels)
leaves no blue behind on the new art that it did not leave on the still."""
import sys, colorsys
from PIL import Image

CW, CH, COLS = 300, 420, 6
HIT = (56, 16, 244, 400)           # the still's rectangle in the cell
WINDOW = (108, 136, 214, 220)      # the archer's window in cell px (template box 395..690 x 640..875 on the cell grid)
RAIL = [(240, 794), (340, 806), (400, 815), (460, 823), (520, 833), (600, 836), (700, 787), (740, 775), (800, 770)]
SX, SY = (188 / 327) / 1.6, (384 / 674) / 1.6
FEET = (250 + 163.5 * 1.6, 302 + 674 * 1.6)
fails = []

def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)

grid = Image.open('art/tower-anim/tower-grid.png').convert('RGBA')
cell = lambda i: grid.crop(((i % COLS) * CW, (i // COLS) * CH, (i % COLS) * CW + CW, (i // COLS) * CH + CH))
cells = [cell(i) for i in range(16)]
still = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); still.alpha_composite(Image.open('public/assets/tower.png').convert('RGBA'), HIT[:2])

def mask(im, t=128): return [1 if v > t else 0 for v in im.getchannel('A').get_flattened_data()]
def iou(a, b):
    i = sum(x & y for x, y in zip(a, b)); u = sum(x | y for x, y in zip(a, b)); return i / u if u else 1
def bbox(im, t=20): return im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()
def foot_span(im):
    bb = bbox(im); a = im.getchannel('A'); xs = [x for x in range(CW) for y in range(bb[3] - 12, bb[3]) if a.getpixel((x, y)) > 128]
    return min(xs), max(xs), bb[3]
def in_window(x, y): return WINDOW[0] <= x < WINDOW[2] and WINDOW[1] <= y < WINDOW[3]

# 1. Native alpha: soft edges, a clear border, no backdrop.
for i, c in enumerate(cells):
    a = list(c.getchannel('A').get_flattened_data()); semi = sum(1 for v in a if 0 < v < 255); solid = sum(1 for v in a if v == 255)
    border = max(max(c.getchannel('A').crop(b).get_flattened_data()) for b in [(0, 0, CW, 2), (0, CH - 2, CW, CH), (0, 0, 2, CH), (CW - 2, 0, CW, CH)])
    check(solid > 0 and semi > solid * 0.03 and border == 0 and solid < CW * CH * 0.6, 'frame %d alpha: %d solid, %d soft edge px, border alpha %d' % (i, solid, semi, border))

# 2. Intact vs the approved still.
m0, ms = mask(cells[0]), mask(still)
check(iou(m0, ms) >= 0.97, 'intact silhouette IoU with tower.png %.3f (>= 0.97)' % iou(m0, ms))
p0, ps = cells[0].load(), still.load(); diffs = []
for y in range(CH):
    for x in range(CW):
        if not in_window(x, y) and p0[x, y][3] > 200 and ps[x, y][3] > 200: diffs.append(sum(abs(p0[x, y][k] - ps[x, y][k]) for k in range(3)) / 3)
check(sum(diffs) / len(diffs) < 14, 'intact colours outside the archer window: mean diff %.1f / 255 (< 14)' % (sum(diffs) / len(diffs)))
s0 = foot_span(cells[0]); ss = foot_span(still)
# The still's feet are cut hard at its canvas edge, so its last soft row is lower; the silhouette registers best at no offset.
check(abs(s0[2] - ss[2]) <= 2 and abs(s0[0] - ss[0]) <= 2 and abs(s0[1] - ss[1]) <= 2, 'intact baseline %d / footprint %d..%d vs still %d / %d..%d' % (s0[2], s0[0], s0[1], ss[2], ss[0], ss[1]))
bb = bbox(cells[0]); check(bb[0] >= HIT[0] - 2 and bb[1] >= HIT[1] - 2 and bb[2] <= HIT[2] + 2 and bb[3] <= HIT[3] + 1, 'intact inside the still rectangle (tap box) %s' % (bb,))

# 3. Damage states keep the outline, the baseline and the footprint.
for i, name in [(1, 'damaged'), (2, 'critical')]:
    v = iou(mask(cells[i]), m0); s = foot_span(cells[i])
    check(v >= 0.95, '%s silhouette IoU with intact %.3f (>= 0.95)' % (name, v))
    check(abs(s[2] - s0[2]) <= 1 and abs(s[0] - s0[0]) <= 3 and abs(s[1] - s0[1]) <= 3, '%s baseline %d / footprint %d..%d (intact %d / %d..%d)' % (name, s[2], s[0], s[1], s0[2], s0[0], s0[1]))

# 4. Collapse on the ground line, getting lower, inside the cell.
tops = []
for i in (3, 4, 5):
    bb = bbox(cells[i]); tops.append(bb[1])
    check(abs(bb[3] - s0[2]) <= 2 and bb[0] >= 2 and bb[2] <= CW - 2, 'collapse %d on the ground line (bottom %d vs %d), inside the cell %s' % (i - 2, bb[3], s0[2], bb))
check(tops[0] < tops[1] < tops[2] and tops[2] > 400 - 0.4 * 384, 'collapse gets lower: tops %s; rubble below 40%% of the tower height' % tops)

# 5. Archer sets.
def rail_y(x):   # the railing line on the cell grid at cell x
    tx = (x - 150) / SX + FEET[0]
    for (x0, y0), (x1, y1) in zip(RAIL, RAIL[1:]):
        if x0 <= tx <= x1: return 400 + (y0 + (y1 - y0) * (tx - x0) / (x1 - x0) - FEET[1]) * SY
    return 400 + (RAIL[0 if tx < RAIL[0][0] else -1][1] - FEET[1]) * SY
for i in range(6, 16):
    a = cells[i].getchannel('A').load(); below = sum(1 for y in range(CH) for x in range(CW) if a[x, y] > 40 and y > rail_y(x) + 1.5)
    check(below == 0, 'archer frame %d: %d px below the railing line' % (i, below))
hoods = [bbox(cells[i])[1] for i in range(6, 16)]
check(max(hoods) - min(hoods) <= 2, 'archer top (hood) the same in every pose: %s' % hoods)
for k in range(5):
    r, l = cells[6 + k], cells[11 + k]; br, bl = bbox(r), bbox(l)
    check(abs((br[2] - br[0]) - (bl[2] - bl[0])) <= 3 and abs(br[1] - bl[1]) <= 1, 'pose %d: left set mirrors right (width %d vs %d)' % (k, br[2] - br[0], bl[2] - bl[0]))
win = [bbox(cells[i]) for i in range(6, 16)]
check(all(b[0] >= 2 and b[2] <= CW - 2 for b in win), 'archer frames inside the cell: x %d..%d' % (min(b[0] for b in win), max(b[2] for b in win)))

# 6. Crimson recolour: blue left behind after crimsonTowerPixels, new art vs the still.
def leftover_blue(im):
    n = t = 0
    for r, g, b, a in im.get_flattened_data():
        if a < 128: continue
        t += 1
        if b > r + 20 and b > g + 15: r, g, b = b, g * .65, r + max(0, g - r) * .25
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if 0.52 < h < 0.75 and s > 0.3 and v > 0.25: n += 1
    return n / t
for i, name in [(0, 'intact'), (2, 'critical'), (5, 'rubble'), (7, 'archer aim')]:
    lb, ls = leftover_blue(cells[i]), leftover_blue(still)
    check(lb <= ls + 0.01, '%s: blue left after the Crimson recolour %.2f%% (still %.2f%%)' % (name, lb * 100, ls * 100))

print('\n%s (%d failures)' % ('ALL PASS' if not fails else 'FAILED', len(fails)))
sys.exit(1 if fails else 0)
