#!/usr/bin/env python
"""Validate the Ballista V1.0 sheet (art/ballista-anim/ballista-grid.png, made by scripts/pack-ballista-sheet.py): the base's damage states and collapse, the
mechanism's four poses, the seam between the two layers, and the atlas. Frames 0-5 are the base (intact, damaged, badly damaged, three collapse), 6-9 the mechanism
(loaded, fired, recoil, reload). Checks that compare pictures run at the size the player sees (the Ballista is drawn 84 px tall, its 320 px cell scaled by 0.2625: DISPLAY).
Usage: py scripts/validate-ballista-sheet.py   (exit 1 on any failure). Needs Pillow only."""
import json, sys
from PIL import Image, ImageChops, ImageFilter

CW, CH = 336, 320; N = 10
CUT = 204; SEAM = 181
DISPLAY = (88, 84)
F = 84 / 320
STOCK = [(87, 155, 106, 186), (199, 155, 219, 186), (141, 179, 164, 198)]   # the two iron bands and the boss, in cell pixels: they must not change between poses
STOCK_D = [tuple(round(v * F) for v in b) for b in STOCK]
BOLT = (195, 8, 240, 44)                        # where the loaded bolt's head stands, in cell pixels: empty once the bolt is gone
grid = Image.open('art/ballista-anim/ballista-grid.png').convert('RGBA'); cells = [grid.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(N)]
meta = json.load(open('public/assets/ballista-sheet.json')); PX = meta['meta']['pivot']['x']
fails = []; rows = []
def check(name, ok, detail=''):
    rows.append(('PASS' if ok else 'FAIL', name, detail)); ok or fails.append(name)
def mask(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0)
def count(m, box=None):
    m = m.crop(box) if box else m; return m.histogram()[255]
def iou(a, b, box=None):
    if box: a, b = a.crop(box), b.crop(box)
    inter = count(ImageChops.logical_and(a.convert('1'), b.convert('1')).convert('L')); union = count(ImageChops.logical_or(a.convert('1'), b.convert('1')).convert('L'))
    return inter / max(1, union)
def bbox(im): return mask(im).getbbox()
def halo(c): return count(ImageChops.subtract(c.getchannel('A').point(lambda v: 255 if 0 < v < 245 else 0), mask(c).filter(ImageFilter.MaxFilter(5))))
def small(im): return im.convert('RGBa').resize(DISPLAY, Image.LANCZOS).convert('RGBA')
def over(*ims):
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    for i in ims: c.alpha_composite(i)
    return c
def colour_change(a, b, box=None, t=40):
    """The share of a's opaque pixels (in box, in displayed-size pixels) whose colour moved by more than t (summed RGB) in b."""
    a, b = small(a), small(b); a, b = (a.crop(box), b.crop(box)) if box else (a, b); pa, pb = a.load(), b.load(); n = d = 0
    for y in range(a.height):
        for x in range(a.width):
            if pa[x, y][3] >= 128:
                n += 1; q, r = pa[x, y], pb[x, y]
                if r[3] < 128 or abs(q[0] - r[0]) + abs(q[1] - r[1]) + abs(q[2] - r[2]) > t: d += 1
    return d / max(1, n)

base, mech = cells[0], cells[6]; full = over(base, mech); HALO = halo(full); H0 = bbox(full)
for i, c in enumerate(cells):
    h = c.getchannel('A').histogram(); vis = sum(h[1:]); interior = sum(h[245:])
    check('frame %d native alpha (interior opaque)' % i, interior / vis > .8, '%.0f%% of visible pixels at alpha >= 245' % (100 * interior / vis))
    bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    check('frame %d inside the cell, 1 px gutter' % i, bb[0] >= 1 and bb[1] >= 1 and bb[2] <= CW - 1 and bb[3] <= CH - 1, str(bb))
    check('frame %d no haze, shadow, smoke or dust (soft pixels outside the silhouette <= 2x the intact machine)' % i, halo(c) <= 2 * HALO, '%d px (intact %d)' % (halo(c), HALO))
# the two intact layers redraw one painting; the seam is closed for every base and pose
for i, b in ((0, base), (1, cells[1]), (2, cells[2])):
    for j in (6, 7, 8, 9):
        c = over(b, cells[j]); a = c.getchannel('A')
        gap = [(x, y) for y in range(CUT - 4, CUT + 4) for x in range(PX - 8, PX + 8) if a.getpixel((x, y)) < 250]
        check('seam closed: base %d + pose %d (post columns opaque on the 8 rows around the cut)' % (i, j), not gap, '%d transparent px' % len(gap))
# damage states of the base
foot = lambda c: c.crop((0, CUT + 12, CW, CH))
for i, need, name in ((1, .93, 'damaged'), (2, .88, 'badly damaged')):
    v = iou(mask(foot(base)), mask(foot(cells[i])))
    check('%s footing silhouette IoU >= %.2f' % (name, need), v >= need, 'IoU %.3f' % v)
d1, d2 = colour_change(over(base), over(cells[1])), colour_change(over(base), over(cells[2]))
check('base damage grows: damaged < badly damaged, both visible at displayed size (>= 8% / >= 15% of pixels changed)', d1 < d2 and d1 >= .08 and d2 >= .15, '%.0f%% / %.0f%%' % (100 * d1, 100 * d2))
# mechanism poses
def boss_centre(c):   # the gold boss's centre: the gold pixels in its box
    px = c.load(); pts = [(x, y) for y in range(STOCK[2][1] - 6, STOCK[2][3] + 6) for x in range(STOCK[2][0] - 6, STOCK[2][2] + 6) if px[x, y][3] > 200 and px[x, y][0] > 190 and px[x, y][1] > 135 and px[x, y][2] < 110]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
bc = [boss_centre(cells[j]) for j in (6, 7, 8, 9)]
check('the gold boss stays put in every pose (centre within 2 cell px, 0.5 px at displayed size)', all(abs(b[0] - bc[0][0]) <= 2 and abs(b[1] - bc[0][1]) <= 2 for b in bc), ' '.join('(%.1f,%.1f)' % b for b in bc))
def stock_bottom(c, x):   # the lowest opaque row of the stock's slab in column x, above the cut
    a = c.getchannel('A'); return max(y for y in range(150, CUT) if a.getpixel((x, y)) >= 128)
sb = [[stock_bottom(cells[j], x) for x in (95, 215)] for j in (6, 7, 8, 9)]
check('the stock sits in the same place in every pose (its lower edge within 3 px)', all(abs(sb[k][i] - sb[0][i]) <= 3 for k in (1, 2, 3) for i in (0, 1)), str(sb))
bolt = [count(mask(cells[j]), BOLT) for j in (6, 7, 8, 9)]
check('the loaded bolt is there (>= 60 px in the head box); fired and reload have none (<= 6 px)', bolt[0] >= 60 and bolt[1] <= 6 and bolt[3] <= 6, 'loaded %d, fired %d, recoil %d, reload %d' % tuple(bolt))
pairs = [(6, 7), (7, 8), (6, 9), (8, 9)]
for a, b in pairs:
    v = colour_change(cells[a], cells[b])
    check('pose %d differs from pose %d (>= 3%% of pixels at displayed size)' % (a, b), v >= .03, '%.1f%%' % (100 * v))
# collapse
hs = [(bbox(c)[3] - bbox(c)[1]) for c in cells[:6]]
check('collapse 1 is lower than the intact machine (<= 97%) but not a heap (>= 60%)', .60 * hs[0] <= hs[3] <= .97 * hs[0] or .60 * (H0[3] - H0[1]) <= hs[3] <= .97 * (H0[3] - H0[1]), '%d px of %d' % (hs[3], H0[3] - H0[1]))
Hf = H0[3] - H0[1]
check('collapse 2 is lower still (<= 70% of the machine, below collapse 1)', hs[4] <= .70 * Hf and hs[4] < hs[3], '%d px' % hs[4])
check('rubble is a low heap (<= 40% of the machine, below collapse 2)', hs[5] <= .40 * Hf and hs[5] < hs[4], '%d px' % hs[5])
for i, name in ((3, 'collapse 1'), (4, 'collapse 2'), (5, 'rubble')):
    bb = bbox(cells[i]); check('%s on the same ground (lowest row within 28 px) and no wider than 1.6x the footing' % name, abs(bb[3] - H0[3]) <= 28 and bb[2] - bb[0] <= 1.6 * (bbox(base)[2] - bbox(base)[0]), 'lowest %d vs %d, x %d..%d vs %d..%d' % (bb[3], H0[3], bb[0], bb[2], bbox(base)[0], bbox(base)[2]))
# the atlas matches the grid
sheet = Image.open('public/assets/ballista-sheet.png').convert('RGBA'); ok = len(meta['frames']) == N
for k, f in meta['frames'].items():
    s, fr = f['spriteSourceSize'], f['frame']; cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.paste(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (s['x'], s['y']))
    ok = ok and f['sourceSize'] == {'w': CW, 'h': CH} and not ImageChops.difference(cell, cells[int(k)]).getbbox()
check('atlas frames rebuild the grid exactly (10 frames, 336x320 cells)', ok, '%dx%d' % sheet.size)
for r in rows: print('%-4s  %-100s %s' % r)
print('%s %d/%d' % ('ALL PASS' if not fails else 'FAILED', len([r for r in rows if r[0] == 'PASS']), len(rows)))
sys.exit(1 if fails else 0)
