#!/usr/bin/env python
"""Read-only validator for the Soldier V1.0 sheets: the review grids art/soldier-anim/soldier-grid-azure.png and -crimson.png (208x192 cells, 5x3, 14 frames,
pivot (116,172); frame map in src/world/soldierSprite.ts). Usage: py scripts/validate-soldier-sheets.py
Needs Pillow only; never writes a file. Per frame it runs the Guardian validator's analysis (scripts/validate-guardian-sheet.py: clipping, islands, interior
holes, detached haze, halo, feet on the baseline, height against idle), then the soldier rules:
 - idle height 120 +-2; walk and hurt within 8% of idle (the brief's contact frames stand a little lower); death3 at most 65% of idle;
 - Crimson: alpha identical to Azure; only cloth-class pixels changed; no cloth-class blue left; Crimson cloth hue / saturation / value within
   0.02 / 0.05 / 0.06 of public/assets/minion-red.png's measured cloth;
 - enclosed transparent gaps are reported for review, not failed (the art has no keying; the raised arm and the sliding shield leave real gaps);
 - identity: the idle's silhouette IoU with the approved still (public/assets/minion-blue.png at the same height and feet) at least 0.85.
Exit code 1 on a failure."""
import sys, colorsys, statistics as st
from importlib.machinery import SourceFileLoader
from PIL import Image

V = SourceFileLoader('validate_guardian', 'scripts/validate-guardian-sheet.py').load_module()
V.CW, V.CH, V.COLS, V.ROWS, V.FRAMES, V.PIVOT = 208, 192, 5, 3, 14, (116, 172)
NAMES = ['idle'] + ['walk%d' % i for i in range(1, 7)] + ['attack1', 'attack2', 'attack3', 'hurt', 'death1', 'death2', 'death3']
STANDING = range(0, 11)
LOOPS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (0, 7), (7, 8), (8, 9), (9, 0), (0, 10), (0, 11), (11, 12), (12, 13)]
FEET_X_STILL, STILL_H = 117, 187        # the approved still's feet midpoint x and height (minion-blue.png)

def cloth(r, g, b): return b > r + 25 and b > g + 10
def red_cloth(r, g, b):
    if not (r > g + 25 and r > b + 25): return None
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (h if h < .5 else h - 1, s, v) if (h < 0.045 or h > 0.95) and s > 0.55 else None

def palette(pixels):
    hs = [q for q in (red_cloth(*p[:3]) for p in pixels if p[3] >= 128) if q]
    return len(hs), st.median(q[0] for q in hs), st.median(q[1] for q in hs), st.median(q[2] for q in hs)

def main():
    fails = []
    az = Image.open('art/soldier-anim/soldier-grid-azure.png').convert('RGBA'); cr = Image.open('art/soldier-anim/soldier-grid-crimson.png').convert('RGBA')
    frames = [V.analyse(V.cell(az, i)) for i in range(14)]; idle_h = frames[0]['main_h']
    print('pivot (%d,%d)  idle height %d' % (V.PIVOT[0], V.PIVOT[1], idle_h))
    if abs(idle_h - 120) > 2: fails.append('idle height %d' % idle_h)
    for i, f in enumerate(frames):
        flags = []; hard = []
        if f['ring']: hard.append('CLIP/edge %dpx' % f['ring'])
        if f['islands']: flags.append('%d detached island(s) %dpx' % (f['islands'], f['island_px']))
        if f['holes'] > 60: flags.append('enclosed gap %dpx (review: real negative space, e.g. arm over plume, or a hole)' % f['holes'])
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
    # Crimson: the same alpha, only cloth changed, no blue left, the Crimson Raider's palette
    A, C = list(az.get_flattened_data()), list(cr.get_flattened_data())
    alpha_same = all(p[3] == q[3] for p, q in zip(A, C)); outside = sum(1 for p, q in zip(A, C) if p != q and not (p[3] and cloth(*p[:3])))
    changed = sum(1 for p, q in zip(A, C) if p != q); left = sum(1 for q in C if q[3] >= 128 and cloth(*q[:3]))
    ref = palette(list(Image.open('public/assets/minion-red.png').convert('RGBA').get_flattened_data())); got = palette(C)
    print('Crimson: alpha identical=%s, changed %d px, changed outside cloth %d, cloth-blue left %d' % (alpha_same, changed, outside, left))
    print('  cloth palette hue/sat/val: Crimson sheet %.3f/%.2f/%.2f (n=%d), minion-red.png %.3f/%.2f/%.2f (n=%d)' % (got[1], got[2], got[3], got[0], ref[1], ref[2], ref[3], ref[0]))
    if not alpha_same: fails.append('Crimson alpha differs')
    if outside: fails.append('Crimson changed %d px outside the cloth' % outside)
    if left: fails.append('Crimson has %d cloth-blue px left' % left)
    if abs(got[1] - ref[1]) > .02 or abs(got[2] - ref[2]) > .05 or abs(got[3] - ref[3]) > .06: fails.append('Crimson palette off the Raider')
    # identity: the idle against the approved still at the same height, feet on feet
    still = Image.open('public/assets/minion-blue.png').convert('RGBA'); s = idle_h / STILL_H
    small = still.resize((round(still.width * s), round(still.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (V.CW, V.CH), (0, 0, 0, 0)); bottom = frames[0]['bottom']
    canvas.alpha_composite(small, (round(V.PIVOT[0] - FEET_X_STILL * s), bottom + 1 - small.height))
    iou = V.iou(V.cell(az, 0).getchannel('A').tobytes(), canvas.getchannel('A').tobytes())
    print('identity: idle silhouette IoU with minion-blue.png %.3f' % iou)
    if iou < .85: fails.append('idle IoU %.3f with the still' % iou)
    print('FAIL\n  ' + '\n  '.join(fails) if fails else 'ALL PASS'); sys.exit(1 if fails else 0)

if __name__ == '__main__': main()
