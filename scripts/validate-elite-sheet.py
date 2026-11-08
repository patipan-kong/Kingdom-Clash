#!/usr/bin/env python
"""Read-only validator for the Crimson Elite Soldier V1.0 sheet: the review grid art/elite-anim/elite-grid.png (288x240 cells, 5x3, 14 frames, pivot (164,214); the packed atlas
public/assets/soldier-elite.png/.json; frame map and geometry in src/world/soldierSprite.ts). Usage: py scripts/validate-elite-sheet.py
Needs Pillow only; never writes a file. Per frame it runs the Guardian validator's analysis (clipping, islands, interior holes, detached haze, halo, feet on the baseline,
height against idle), then the Elite rules:
 - idle height 150 +-2 (spear tip to soles, the still's 72 px at 0.48); walk and hurt within 8% of idle; death3 at most 65% of idle; the thrust frames stand lower (a lunge);
 - the walk and hurt frames keep the idle's shield: the rightmost ink within 14 cell px of the idle's, and the same body mass (opaque pixel count within 25%);
 - the spear thrust: the blade reaches further left of the feet with every frame (wind-up < drive <= contact + 6) and the contact frame at least 100 cell px, the spear horizontal
   (the blade tip within 22 cell px of the body's top third..bottom of the chest: its tip y between the idle's 35% and 75% height), the whole spear inside the cell;
 - the death frames get lower: idle > death1 > death2 > death3 body height, and none of them leaves the cell;
 - identity against the approved still (public/assets/crimson-elite.png): the same opaque colour family (the share of red-class and of dark-metal-class pixels within 0.5x..2x of the
   still's, the mean colour of the opaque pixels within 28 of its R, G and B) and the idle taller than 0.9x and not wider than 1.7x the still's silhouette ratio;
 - atlas: every cell restored by the JSON equals the grid cell exactly (alpha and colour), the pivot is in the JSON, and the frame set is "0".."13".
Exit code 1 on a failure."""
import sys, json
from importlib.machinery import SourceFileLoader
from PIL import Image

V = SourceFileLoader('validate_guardian', 'scripts/validate-guardian-sheet.py').load_module()
V.CW, V.CH, V.COLS, V.ROWS, V.FRAMES, V.PIVOT = 288, 240, 5, 3, 14, (164, 214)
NAMES = ['idle'] + ['walk%d' % i for i in range(1, 7)] + ['attack1', 'attack2', 'attack3', 'hurt', 'death1', 'death2', 'death3']
STANDING = range(0, 14)   # every frame rests on the baseline (the lowest ink)
LOOPS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (0, 7), (7, 8), (8, 9), (9, 0), (0, 10), (0, 11), (11, 12), (12, 13)]

def red(r, g, b): return r > g + 40 and r > b + 40
def metal(r, g, b): return max(r, g, b) < 150 and max(r, g, b) - min(r, g, b) < 40

def stats(im):
    px = [p for p in im.get_flattened_data() if p[3] >= 200]; n = len(px)
    return n, sum(red(*p[:3]) for p in px) / n, sum(metal(*p[:3]) for p in px) / n, [sum(p[i] for p in px) / n for i in range(3)]

def ink(cell, t=128): return cell.getchannel('A').point(lambda v: 255 if v >= t else 0)

def main():
    fails = []; grid = Image.open('art/elite-anim/elite-grid.png').convert('RGBA')
    cells = [V.cell(grid, i) for i in range(14)]; frames = [V.analyse(c) for c in cells]; idle_h = frames[0]['main_h']
    print('pivot (%d,%d)  idle height %d' % (V.PIVOT[0], V.PIVOT[1], idle_h))
    if abs(idle_h - 150) > 2: fails.append('idle height %d' % idle_h)
    for i, f in enumerate(frames):
        flags = []; hard = []
        if f['ring']: hard.append('CLIP/edge %dpx' % f['ring'])
        if f['islands']: flags.append('%d detached island(s) %dpx (the spear, the shield or the hand are real separate parts)' % (f['islands'], f['island_px']))
        if f['holes'] > 60: flags.append('enclosed gap %dpx (review: real negative space)' % f['holes'])
        if f['haze'] > 20: hard.append('faint haze %dpx' % f['haze'])
        if f['fringe_light'] > 0.25: hard.append('light halo %.0f%%' % (f['fringe_light'] * 100))
        if f['margins'] and min(f['margins']) < 4: hard.append('tight margins L%d T%d R%d B%d' % f['margins'])
        if f['below'] and i in STANDING: hard.append('ink below baseline %dpx' % f['below'])
        if i in STANDING and abs(f['bottom'] - V.PIVOT[1]) > 2: hard.append('feet off baseline by %+d' % (f['bottom'] - V.PIVOT[1]))
        if (NAMES[i].startswith('walk') or NAMES[i] == 'hurt') and abs(f['main_h'] - idle_h) / idle_h > 0.08: hard.append('height %+d%% vs idle' % round(100 * (f['main_h'] - idle_h) / idle_h))
        if NAMES[i] == 'death3' and f['main_h'] > idle_h * 0.65: hard.append('death3 taller than 65% idle')
        fails += ['%s: %s' % (NAMES[i], h) for h in hard]
        print('%2d %-8s bbox=%s margins(LTRB)=%s bottom=%s h=%s %s' % (i, NAMES[i], f['bbox'], f['margins'], f['bottom'], f['main_h'], '; '.join(hard + flags) or 'ok'))
    print('continuity (mask IoU, d_bottom, d_height, d_foot_x):')
    for a, b in LOOPS:
        fa, fb = frames[a], frames[b]
        print('  %-16s iou=%.2f d_bottom=%+d d_height=%+d d_foot_x=%s' % ('%s>%s' % (NAMES[a], NAMES[b]), V.iou(fa['mask'], fb['mask']), fb['bottom'] - fa['bottom'], fb['main_h'] - fa['main_h'], None if None in (fa['foot_x'], fb['foot_x']) else fb['foot_x'] - fa['foot_x']))
    # shield and mass stability for the walk and the hurt
    bbs = [ink(c).getbbox() for c in cells]; mass = [sum(1 for v in ink(c).tobytes() if v) for c in cells]
    for i in list(range(1, 7)) + [10]:
        dr, dm = bbs[i][2] - bbs[0][2], abs(mass[i] - mass[0]) / mass[0]
        print('  stability %-6s right edge %+d px, mass %+.0f%%' % (NAMES[i], dr, 100 * (mass[i] - mass[0]) / mass[0]))
        if abs(dr) > 14: fails.append('%s: shield edge moves %+d px from the idle' % (NAMES[i], dr))
        if dm > 0.25: fails.append('%s: body mass %+.0f%% vs idle' % (NAMES[i], 100 * (mass[i] - mass[0]) / mass[0]))
    # the thrust: reach left of the feet, a horizontal spear, nothing clipped
    reach = {i: V.PIVOT[0] - bbs[i][0] for i in (7, 8, 9)}; print('thrust reach left of the feet: wind-up %d, drive %d, contact %d' % (reach[7], reach[8], reach[9]))
    if not (reach[7] < reach[8] <= reach[9] + 6): fails.append('thrust reach not increasing: %s' % reach)
    if reach[9] < 100: fails.append('contact reach %d < 100' % reach[9])
    for i in (7, 8, 9):
        c = ink(cells[i]); w, h = c.size; px = c.load()
        tip = next(x for x in range(w) if any(px[x, y] for y in range(h)))      # the blade tip: the leftmost ink column
        ys = [y for y in range(h) if px[tip, y]]; ty = (ys[0] + ys[-1]) / 2; lo, hi = V.PIVOT[1] - idle_h * .75, V.PIVOT[1] - idle_h * .35
        print('  %-8s blade tip at x=%d y=%.0f (chest band %.0f..%.0f)' % (NAMES[i], tip, ty, lo, hi))
        if not lo <= ty <= hi: fails.append('%s: blade tip y %.0f outside the chest band %.0f..%.0f (the spear is not level)' % (NAMES[i], ty, lo, hi))
        if tip < 2: fails.append('%s: the spear reaches the cell edge' % NAMES[i])
    hs = [frames[i]['main_h'] for i in (0, 11, 12, 13)]; print('death heights (idle, stagger, collapse, down):', hs)
    if not (hs[0] > hs[1] > hs[2] > hs[3]): fails.append('death heights not decreasing: %s' % hs)
    # identity against the approved still
    still = Image.open('public/assets/crimson-elite.png').convert('RGBA'); a = stats(still); b = stats(cells[0])
    print('identity: red share still %.3f idle %.3f; dark-metal share still %.3f idle %.3f; mean RGB still %s idle %s' % (a[1], b[1], a[2], b[2], [round(v) for v in a[3]], [round(v) for v in b[3]]))
    if not .5 <= b[1] / a[1] <= 2: fails.append('red share %.2fx the still' % (b[1] / a[1]))
    if not .5 <= b[2] / a[2] <= 2: fails.append('dark-metal share %.2fx the still' % (b[2] / a[2]))
    if any(abs(x - y) > 28 for x, y in zip(a[3], b[3])): fails.append('mean colour off the still')
    sb = still.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox(); ratio_s = (sb[2] - sb[0]) / (sb[3] - sb[1]); bb = bbs[0]; ratio_i = (bb[2] - bb[0]) / (bb[3] - bb[1])
    print('silhouette width/height: still %.3f idle %.3f' % (ratio_s, ratio_i))
    if not .9 <= ratio_i / ratio_s <= 1.7: fails.append('idle silhouette ratio %.2fx the still' % (ratio_i / ratio_s))
    # atlas = grid
    atlas = Image.open('public/assets/soldier-elite.png').convert('RGBA'); js = json.load(open('public/assets/soldier-elite.json')); fr = js['frames']
    if sorted(fr, key=int) != [str(i) for i in range(14)]: fails.append('atlas frames are not "0".."13"')
    if js['meta'].get('pivot') != dict(x=V.PIVOT[0], y=V.PIVOT[1]): fails.append('atlas pivot differs')
    bad = 0
    for i in range(14):
        f = fr[str(i)]; fm, sp, ss = f['frame'], f['spriteSourceSize'], f['sourceSize']
        if (ss['w'], ss['h']) != (288, 240): fails.append('frame %d sourceSize' % i); continue
        back = Image.new('RGBA', (288, 240), (0, 0, 0, 0)); back.paste(atlas.crop((fm['x'], fm['y'], fm['x'] + fm['w'], fm['y'] + fm['h'])), (sp['x'], sp['y']))
        if back.tobytes() != cells[i].tobytes(): bad += 1
    print('atlas: %d of 14 frames differ from the grid; atlas %dx%d (%.2f MB RGBA)' % (bad, atlas.width, atlas.height, atlas.width * atlas.height * 4 / 1048576))
    if bad: fails.append('%d atlas frames differ from the grid' % bad)
    print('FAIL\n  ' + '\n  '.join(fails) if fails else 'ALL PASS'); sys.exit(1 if fails else 0)

if __name__ == '__main__': main()
