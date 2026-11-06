#!/usr/bin/env python
"""Validate the Barracks V1.0 sheet (art/barracks-anim/barracks-grid.png, made by scripts/pack-barracks-sheet.py) against the still public/assets/barracks-azure.png.
Usage: py scripts/validate-barracks-sheet.py   (exit 1 on any failure). Needs Pillow only."""
import json, sys
from PIL import Image, ImageChops, ImageFilter

CW, CH, N = 384, 372, 7
DOOR = (255, 170, 345, 290)               # the doorway and the steps' top, where the recruiting light may change the picture
DOOR_D = (62, 41, 85, 71); ROOF_D = (0, 0, 94, 36)   # the same doorway and the roof / flag band, in displayed-size pixels
FRONT = (190, 270, 350, 372)              # steps, training dummy, brazier: stay put while the building stands
grid = Image.open('art/barracks-anim/barracks-grid.png').convert('RGBA'); cells = [grid.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(N)]
still = Image.open('public/assets/barracks-azure.png').convert('RGBA')
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
DISPLAY = (94, 91)                        # the Azure Barracks is drawn 91 px tall (azureBarracksVisual 76 x 1.2): this is what the player can see of a frame
def small(im): return im.convert('RGBa').resize(DISPLAY, Image.LANCZOS).convert('RGBA')
def colour_change(a, b, box=None, t=40):
    """The share of the still's opaque pixels (in box, in displayed-size pixels) whose colour moved by more than t (summed RGB): where a frame differs from the intact building."""
    a, b = small(a), small(b); a, b = (a.crop(box), b.crop(box)) if box else (a, b); pa, pb = a.load(), b.load(); n = d = 0
    for y in range(a.height):
        for x in range(a.width):
            if pa[x, y][3] >= 128:
                n += 1; q, r = pa[x, y], pb[x, y]
                if r[3] < 128 or abs(q[0] - r[0]) + abs(q[1] - r[1]) + abs(q[2] - r[2]) > t: d += 1
    return d / max(1, n)

I = cells[0]; HALO = halo(I); H0 = bbox(I)
# native alpha: the generator's own alpha, opaque interior, no colour key; nothing painted beyond the building
for i, c in enumerate(cells):
    h = c.getchannel('A').histogram(); vis = sum(h[1:]); interior = sum(h[245:])
    check('frame %d native alpha (interior opaque)' % i, interior / vis > .8, '%.0f%% of visible pixels at alpha >= 245' % (100 * interior / vis))
    check('frame %d no haze, shadow, smoke or dust (soft pixels outside the silhouette <= 2x the still)' % i, halo(c) <= 2 * HALO, '%d px (still %d)' % (halo(c), HALO))
    bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    check('frame %d inside the cell' % i, bb[0] >= 0 and bb[1] >= 0 and bb[2] <= CW and bb[3] <= CH, str(bb))
# intact is the still, pixel for pixel
d = ImageChops.difference(I, still); mx = max(v[1] for v in d.getextrema())
check('intact = barracks-azure.png pixel for pixel', mx == 0 and I.size == still.size, 'max channel diff %d' % mx)
# recruiting: the same building, only the doorway differs
v = iou(mask(I), mask(cells[1])); outside = colour_change(I, cells[1])
check('recruiting silhouette IoU >= 0.96', v >= .96, 'IoU %.3f' % v)
def outside_door(a, b):
    a, b = small(a), small(b)
    for im in (a, b): im.paste((0, 0, 0, 0), DOOR_D)
    return colour_change_small(a, b)
def colour_change_small(a, b, t=40):
    pa, pb = a.load(), b.load(); n = d = 0
    for y in range(a.height):
        for x in range(a.width):
            if pa[x, y][3] >= 128:
                n += 1; q, r = pa[x, y], pb[x, y]
                if r[3] < 128 or abs(q[0] - r[0]) + abs(q[1] - r[1]) + abs(q[2] - r[2]) > t: d += 1
    return d / max(1, n)
od = outside_door(I, cells[1])
check('recruiting changes only the doorway: roof, flag and banners identical at displayed size (roof band <= 8% moved)', colour_change(I, cells[1], ROOF_D) <= .08, 'roof band %.1f%%, outside the doorway %.1f%%, overall %.1f%%' % (100 * colour_change(I, cells[1], ROOF_D), 100 * od, 100 * outside))
dl = lambda c: sum(sum(c.crop(DOOR).convert('RGB').resize((1, 1), Image.BOX).getpixel((0, 0))[:3]) for _ in [0])
check('recruiting: the doorway is lit (brighter than the still\'s)', dl(cells[1]) > dl(I) + 20, 'door box mean %d vs %d' % (dl(cells[1]), dl(I)))
# damage states: the same building, ordered by how much it changed, the front untouched
chg = [colour_change(I, cells[i], ROOF_D) for i in range(N)]   # damage shows on the roof and the flag
for i, need, name in ((2, .92, 'damaged'), (3, .85, 'badly damaged')):
    v = iou(mask(I), mask(cells[i])); fr = iou(mask(I), mask(cells[i]), FRONT)
    check('%s silhouette IoU >= %.2f' % (name, need), v >= need, 'IoU %.3f' % v)
    check('%s steps, dummy and brazier in place (IoU >= 0.9)' % name, fr >= .9, 'IoU %.3f' % fr)
check('damage grows on the roof band: recruiting < damaged < badly damaged', chg[1] < chg[2] < chg[3], 'changed %.0f%% / %.0f%% / %.0f%%' % (100 * chg[1], 100 * chg[2], 100 * chg[3]))
check('damaged is visibly damaged (>= 10% of the roof band changed) and badly damaged more (>= 40%)', chg[2] >= .10 and chg[3] >= .40, '%.0f%% / %.0f%%' % (100 * chg[2], 100 * chg[3]))
# collapse: lower and lower, on the same ground
hs = [(bbox(c)[3] - bbox(c)[1]) for c in cells]
check('collapse 1 is lower than the intact building (<= 95%) but not yet a heap (>= 70%)', .70 * hs[0] <= hs[4] <= .95 * hs[0], '%d px of %d' % (hs[4], hs[0]))
check('collapse 2 is lower still (<= 65% of intact, below collapse 1)', hs[5] <= .65 * hs[0] and hs[5] < hs[4], '%d px' % hs[5])
check('rubble is a low heap (<= 35% of the building, below collapse 2)', hs[6] <= .35 * hs[0] and hs[6] < hs[5], '%d px' % hs[6])
for i, name in ((4, 'collapse 1'), (5, 'collapse 2'), (6, 'rubble')):
    bb = bbox(cells[i]); check('%s on the same ground (lowest row within 8 px of the building\'s)' % name, abs(bb[3] - H0[3]) <= 8, 'lowest row %d vs %d' % (bb[3], H0[3]))
    check('%s inside the building\'s own footprint (no wider than the still, +4 px)' % name, bb[0] >= H0[0] - 4 and bb[2] <= H0[2] + 4, '%d..%d vs %d..%d' % (bb[0], bb[2], H0[0], H0[2]))
fr4 = iou(mask(I), mask(cells[4]), FRONT)
check('collapse 1 steps, dummy and brazier still in place (IoU >= 0.8)', fr4 >= .8, 'IoU %.3f' % fr4)
# the atlas matches the grid
atlas = json.load(open('public/assets/barracks-sheet.json')); sheet = Image.open('public/assets/barracks-sheet.png').convert('RGBA')
ok = len(atlas['frames']) == N
for k, f in atlas['frames'].items():
    s, fr = f['spriteSourceSize'], f['frame']; cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.paste(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (s['x'], s['y']))
    ok = ok and f['sourceSize'] == {'w': CW, 'h': CH} and not ImageChops.difference(cell, cells[int(k)]).getbbox()
check('atlas frames rebuild the grid exactly (7 frames, 384x372 cells)', ok, '%dx%d' % sheet.size)
for r in rows: print('%-4s  %-86s %s' % r)
print('%s %d/%d' % ('ALL PASS' if not fails else 'FAILED', len([r for r in rows if r[0] == 'PASS']), len([r for r in rows if r[0] != 'INFO'])))
sys.exit(1 if fails else 0)
