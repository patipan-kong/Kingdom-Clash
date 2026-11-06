#!/usr/bin/env python
"""Validate the War Cart V1.0 sheets (art/warcart-anim/warcart-grid-crimson.png and -azure.png, made by scripts/pack-warcart-sheet.py): the twelve Crimson frames (0 idle,
1-4 roll, 5 windup, 6 contact, 7 recover, 8-9 destroyed, 10 wreck, 11 repairing), the ten-frame Azure recolour, and the atlases. Checks that compare pictures run at the size the
player sees (the idle cart is 84 px tall: its 161 px silhouette scaled by DISPLAY_SCALE).
Usage: py scripts/validate-warcart-sheet.py   (exit 1 on any failure). Needs Pillow only."""
import colorsys, json, sys
from PIL import Image, ImageChops, ImageFilter, ImageStat

CW, CH = 296, 173
PIVOT_Y = 166
S = 0.2
OFF = (8, 19)
DISPLAY_SCALE = 84 / 161
cr = Image.open('art/warcart-anim/warcart-grid-crimson.png').convert('RGBA'); cells = [cr.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(12)]
az = Image.open('art/warcart-anim/warcart-grid-azure.png').convert('RGBA'); acells = [az.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(10)]
meta = {k: json.load(open('public/assets/warcart-%s.json' % k)) for k in ('crimson', 'azure')}
fails = []; rows = []
def check(name, ok, detail=''):
    rows.append(('PASS' if ok else 'FAIL', name, detail)); ok or fails.append(name)
def mask(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0)
def bbox(im): return mask(im).getbbox()
def count(m): return m.histogram()[255]
def halo(c): return count(ImageChops.subtract(c.getchannel('A').point(lambda v: 255 if 0 < v < 245 else 0), mask(c).filter(ImageFilter.MaxFilter(5))))
def flat(im, box):
    bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im); return bg.crop(box).convert('L')
def diff(a, b, box): return ImageStat.Stat(ImageChops.difference(flat(a, box), flat(b, box))).mean[0]
def left_edge(im, y0, y1):
    m = mask(im).crop((0, y0, CW, y1)); bb = m.getbbox(); return bb[0] if bb else CW
H = lambda im: bbox(im)[3] - bbox(im)[1]
ROOF = (120, 3, 292, 47)            # cell box that never changes in the ram and wheel frames (the master's roof, the register region)
WHEELS = (95, 105, 292, 170)        # the four wheels' band
RAM = (0, 95, 120, 150)             # where the ram head travels (cell px, left of the wheels)
idle = cells[0]; Hi = H(idle); ib = bbox(idle)
check('twelve Crimson and ten Azure frames, one 296 x 173 cell each', len(cells) == 12 and len(acells) == 10 and cr.size == (CW * 12, CH) and az.size == (CW * 10, CH))
# every frame: inside the cell with a margin, solid
for i, c in enumerate(cells):
    b = bbox(c); ok = b and b[0] >= 1 and b[1] >= 1 and b[2] <= CW - 1 and b[3] <= CH - 1
    check('frame %d is inside the cell with a margin (bbox %s)' % (i, b), ok)
check('the idle silhouette is 161 +- 3 px tall (the sheet constant: drawn 84 px)', abs(Hi - 161) <= 3, '%d px' % Hi)
HALO = halo(idle)
for i, c in enumerate(cells):
    check('frame %d: no haze, shadow, smoke or dust (soft pixels outside the silhouette <= 2x the idle cart + 40)' % i, halo(c) <= 2 * HALO + 40, '%d px (idle %d)' % (halo(c), HALO))
# the ground: the wheels' lowest edge is on the pivot row in every standing pose; the wreck lies on it
for i in range(8): check('frame %d stands on the ground line (lowest row within 2 px of the pivot row %d)' % (i, PIVOT_Y), abs(bbox(cells[i])[3] - PIVOT_Y) <= 2 + (3 if i == 7 else 0), 'lowest %d' % bbox(cells[i])[3])
for i in (9, 10, 11): check('frame %d lies on the ground line (lowest row within 5 px)' % i, abs(bbox(cells[i])[3] - PIVOT_Y) <= 5, 'lowest %d' % bbox(cells[i])[3])
# registration: the roof, the frame and the pennant never move in the roll and attack frames
for i in range(1, 8):
    d = diff(cells[i], idle, ROOF); check('frame %d: the roof region matches the idle cart (registered, mean difference < 8)' % i, d < 8, '%.2f' % d)
# rolling: the wheels differ from idle and from each other; the roof does not
for i in range(1, 5):
    d = diff(cells[i], idle, WHEELS); check('roll %d: the wheels are turned (differ from idle), the body is not' % i, d > 1.2 and diff(cells[i], idle, ROOF) < 8, 'wheels %.2f' % d)
dd = [diff(cells[i], cells[j], WHEELS) for i in range(1, 5) for j in range(i + 1, 5)]
check('the four roll frames are all different from each other', min(dd) > .8, 'min %.2f' % min(dd))
# the ram: windup draws it back, contact thrusts furthest, recover is between
ram = {i: left_edge(cells[i], 95, 150) for i in (0, 5, 6, 7)}
check('ram head positions order: windup (back) > idle > recover > contact (furthest forward) by at least 3 px each', ram[5] > ram[0] + 3 and ram[0] > ram[7] + 3 and ram[7] > ram[6] + 3, ram)
reach = (ib[0] - ram[6]) * DISPLAY_SCALE
check('the contact thrust reaches at least 12 px (displayed) beyond the idle ram', reach >= 12 or (ram[0] - ram[6]) * DISPLAY_SCALE >= 12, '%.1f px displayed' % ((ram[0] - ram[6]) * DISPLAY_SCALE))
check('the windup draws the ram at least 10 px (displayed) back from rest', (ram[5] - ram[0]) * DISPLAY_SCALE >= 10, '%.1f px displayed' % ((ram[5] - ram[0]) * DISPLAY_SCALE))
# destruction
h = [H(c) for c in cells]
check('destroyed 1 keeps most of the cart (>= 80% of the idle height) and differs from idle', h[8] >= .8 * Hi and diff(cells[8], idle, (0, 0, CW, CH)) > 4, '%d px, diff %.1f' % (h[8], diff(cells[8], idle, (0, 0, CW, CH))))
check('destroyed 2 is about 60% of the idle height (45 - 75%)', .45 * Hi <= h[9] <= .75 * Hi, '%d px' % h[9])
check('the wreck is a low heap (<= 55% of the idle cart, pennant spike included), lower than destroyed 2', h[10] <= .55 * Hi and h[10] < h[9], '%d px' % h[10])
check('the repairing frame is taller than the wreck and not more than 70% of the cart (scaffold poles included)', h[11] > h[10] and h[11] <= .70 * Hi, '%d px' % h[11])
check('wreck and repairing frames clearly differ', diff(cells[10], cells[11], (0, 0, CW, CH)) > 6, '%.1f' % diff(cells[10], cells[11], (0, 0, CW, CH)))
check('the wreck is one lump (its bbox width within 1.1x the idle cart, no fragment further than 12% outside the heap)', bbox(cells[10])[2] - bbox(cells[10])[0] <= 1.1 * (ib[2] - ib[0]))
# the Azure recolour: same geometry, only red cloth changes
alpha_same = all(not ImageChops.difference(cells[i].getchannel('A'), acells[i].getchannel('A')).getbbox() for i in range(10))
check('the Azure frames have exactly the Crimson frames\' alpha (geometry, pivot and transparency untouched)', alpha_same)
changed = total = 0; bad = 0; wood_changed = 0; red_left = 0
for i in range(10):
    pa, pb = cells[i].load(), acells[i].load()
    for y in range(CH):
        for x in range(CW):
            a, b = pa[x, y], pb[x, y]
            if a[3] == 0: continue
            total += 1
            hh, ss, vv = colorsys.rgb_to_hsv(a[0] / 255, a[1] / 255, a[2] / 255); red = (hh <= .03 or hh >= .94) and ss > .45 and vv > .2
            if a[:3] != b[:3]:
                changed += 1
                if not red: bad += 1
                if .04 <= hh <= .14: wood_changed += 1
            elif red: red_left += 1
check('only red cloth pixels changed (no wood, iron, wheel or transparent pixel; wood hues 0.04 - 0.14 untouched)', bad == 0 and wood_changed == 0, '%d changed, %d outside the cloth hue, %d wood' % (changed, bad, wood_changed))
check('the cloth is recoloured fully (no red cloth left) and is a small part of the cart (< 6% of its pixels)', red_left == 0 and 0 < changed < .06 * total, '%d changed of %d, %d red left' % (changed, total, red_left))
def meanrgb(c, box):
    px = [p for p in c.crop(box).getdata() if p[3] >= 128]; return tuple(sum(p[k] for p in px) / max(1, len(px)) for k in range(3))
check('the wheels are bit-for-bit the same in the Azure frame 0 (no cloth there)', not ImageChops.difference(cells[0].crop(WHEELS), acells[0].crop(WHEELS)).getbbox() or all(abs(a - b) < 1.5 for a, b in zip(meanrgb(cells[0], WHEELS), meanrgb(acells[0], WHEELS))), '%s vs %s' % (tuple(round(v, 1) for v in meanrgb(cells[0], WHEELS)), tuple(round(v, 1) for v in meanrgb(acells[0], WHEELS))))
# the atlases match the grids
for key, cs, n in (('crimson', cells, 12), ('azure', acells, 10)):
    sheet = Image.open('public/assets/warcart-%s.png' % key).convert('RGBA'); m = meta[key]; ok = len(m['frames']) == n
    for k, f in m['frames'].items():
        s, fr = f['spriteSourceSize'], f['frame']; cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.paste(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (s['x'], s['y']))
        ok = ok and f['sourceSize'] == {'w': CW, 'h': CH} and not ImageChops.difference(cell, cs[int(k)]).getbbox()
    check('the %s atlas rebuilds its grid exactly (%d frames, 296x173 cells, pivot %s)' % (key, n, m['meta']['pivot']), ok, '%dx%d' % sheet.size)
check('both atlases share one pivot', meta['crimson']['meta']['pivot'] == meta['azure']['meta']['pivot'] and meta['crimson']['meta']['pivot']['y'] == PIVOT_Y)
for r in rows: print('%-4s  %-110s %s' % r)
print('%s %d/%d' % ('ALL PASS' if not fails else 'FAILED', len([r for r in rows if r[0] == 'PASS']), len(rows)))
sys.exit(1 if fails else 0)
