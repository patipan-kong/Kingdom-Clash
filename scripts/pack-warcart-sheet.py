#!/usr/bin/env python
"""Pack the War Cart V1.0 frames (art/warcart-anim) into two trimmed Phaser atlases, public/assets/warcart-crimson.png + .json (frames "0".."11") and the cloth-only
Azure recolour public/assets/warcart-azure.png + .json (frames "0".."9": the wreck and the repairing frame are only ever seen Crimson). Frame map in
src/world/warCartSprite.ts: 0 idle, 1-4 roll, 5 windup, 6 contact, 7 recover, 8-9 destroyed, 10 wreck, 11 repairing.
Usage: py scripts/pack-warcart-sheet.py
Needs Pillow only. ref/master.png is the approved painting on a 2000x1300 canvas (art/warcart-anim/frames/master.png padded), and the generator returned every
other image at 1555x1011 (that canvas x 0.7775), so every frame is on the same canvas. The ram and wheel frames (1-7) are registered on the roof (the part that never
changes) by a small integer shift; the destroyed and wreck frames are grounded on the master's ground line. Every frame goes through the Guardian packer's alpha tidy
(never colour based) and one premultiplied Lanczos resize onto the cell grid (S cell px per canvas px). The Azure sheet changes only red cloth pixels (by hue)."""
import colorsys, json, os
from importlib.machinery import SourceFileLoader
from PIL import Image, ImageChops, ImageStat

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/warcart-anim/'
W0, H0 = 1555, 1011               # the generator's canvas (the master's 2000x1300 x 0.7775)
S = 0.2                           # canvas px -> cell px
OFF = (8, 19)                     # the cell's top-left in small (canvas x S) px
CW, CH = 296, 173
GROUND = 927                      # canvas row of the wheels' lowest edge in the master
ROOF = (640, 110, 1500, 330)      # canvas box that never changes in the ram and wheel frames: the register region
ATLAS_W = 1024
FILES = ['master', 'run-ROLL/roll1', 'run-ROLL/roll2', 'run-ROLL/roll3', 'run-ROLL/roll4', 'run-ATTACK/windup', 'run-ATTACK/contact', 'run-ATTACK/recover',
         'run-DEST/destroyed1', 'run-DEST/destroyed2', 'run-DEST/wreck', 'run-DEST/repairing']
REGISTER = range(1, 8)            # frames registered on the roof
GROUNDED = (9, 10, 11)            # frames set on the ground line

def load(i):
    p = ROOT + ('ref/master.png' if i == 0 else 'frames/' + FILES[i] + '.png')
    im = Image.open(p).convert('RGBA')
    if im.size != (W0, H0): im = im.convert('RGBa').resize((W0, H0), Image.LANCZOS).convert('RGBA')
    return im

def flat(im, box):
    bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im); return bg.crop(box).convert('L')

def lowest(im, t=40): return im.getchannel('A').point(lambda v: 255 if v >= t else 0).getbbox()[3]

def shift(im, dx, dy):
    o = Image.new('RGBA', im.size, (0, 0, 0, 0)); o.paste(im, (dx, dy)); return o

def register(im, ref):
    best = None
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            d = ImageStat.Stat(ImageChops.difference(flat(shift(im, dx, dy), ROOF), flat(ref, ROOF))).mean[0]
            if best is None or d < best[0]: best = (d, dx, dy)
    return best

def to_cell(full):
    n = (round(W0 * S), round(H0 * S))
    small = guardian.tidy(full).convert('RGBa').resize(n, Image.LANCZOS).convert('RGBA')
    return small.crop((OFF[0], OFF[1], OFF[0] + CW, OFF[1] + CH))

def azure(cell):
    out = cell.copy(); px = out.load(); n = 0
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if (h <= 0.03 or h >= 0.94) and s > 0.45 and v > 0.2:
                nr, ng, nb = colorsys.hsv_to_rgb(0.585, min(1, s * 0.9), v * 0.95); px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a); n += 1
    return out, n

def atlas(cells, name):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    H = y + shelf; img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/%s.png' % name, optimize=True)
    json.dump(dict(frames=frames, meta=dict(image=name + '.png', size=dict(w=ATLAS_W, h=H), scale='1', pivot=dict(x=PIVOT, y=PIVOT_Y), app='scripts/pack-warcart-sheet.py')), open('public/assets/%s.json' % name, 'w'), indent=1)
    print('wrote public/assets/%s.png' % name, img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/%s.png' % name) / 1048576))

def main():
    global PIVOT, PIVOT_Y
    fulls = [load(i) for i in range(len(FILES))]
    ref = fulls[0]
    for i in REGISTER:
        d, dx, dy = register(fulls[i], ref); fulls[i] = shift(fulls[i], dx, dy); print('%-22s registered on the roof: shift (%d,%d), residual %.2f' % (FILES[i], dx, dy, d))
    for i in GROUNDED:
        dy = GROUND - lowest(fulls[i]); fulls[i] = shift(fulls[i], 0, dy); print('%-22s grounded: dy %d' % (FILES[i], dy))
    # the pivot: the middle of the roof (the body without the ram), on the ground line
    roof = ref.crop((0, 150, W0, 250)).getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    PIVOT = round(((roof[0] + roof[2]) / 2 - OFF[0] / S) * S); PIVOT_Y = round((GROUND - OFF[1] / S) * S)
    cells = [to_cell(f) for f in fulls]
    for i, c in enumerate(cells):
        b = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        if b and (b[0] < 1 or b[1] < 1 or b[2] > CW - 1 or b[3] > CH - 1): print('NOTE frame %d reaches the cell edge' % i, b)
    az = []; changed = 0
    for c in cells[:10]:
        a, n = azure(c); az.append(a); changed += n
    print('Azure recolour: %d cloth px changed' % changed)
    for name, cs in (('warcart-crimson', cells), ('warcart-azure', az)):
        g = Image.new('RGBA', (CW * len(cs), CH), (0, 0, 0, 0))
        for i, c in enumerate(cs): g.paste(c, (i * CW, 0))
        g.save(ROOT + name.replace('warcart-', 'warcart-grid-') + '.png', optimize=True); atlas(cs, name)
    print('pivot (%d, %d), cell %dx%d' % (PIVOT, PIVOT_Y, CW, CH))

if __name__ == '__main__': main()
