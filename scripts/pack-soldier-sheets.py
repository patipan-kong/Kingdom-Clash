#!/usr/bin/env python
"""Pack the Soldier V1.0 animation frames (one Azure Vanguard master) into two trimmed Phaser atlases, public/assets/soldier-azure.png + .json and its
Crimson recolour public/assets/soldier-crimson.png + .json (frames "0".."13", each with a 208x192 source cell and the feet pivot at (116,172); frame map in
src/world/soldierSprite.ts), and the untrimmed 5x3 review grids art/soldier-anim/soldier-grid-azure.png / -crimson.png for scripts/validate-soldier-sheets.py.
Usage: py scripts/pack-soldier-sheets.py [art/soldier-anim/frames.json]
Needs Pillow only. Per frame: the Guardian packer's alpha tidy (never colour based), one uniform premultiplied Lanczos resize, an integer translation of
the feet anchor onto the pivot (scripts/pack-guardian-sheet.py). Crimson: only the blue cloth (tabard, scarf, plume, shield field: B > R+25 and B > G+10,
the only blue in the art) moves to the Crimson Raider's measured red (hue 0.018, saturation x1.04, value kept; relative hue kept at half); every other
pixel, the alpha included, is copied unchanged."""
import sys, json, colorsys
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
CW, CH, COLS, ROWS, FRAMES = 208, 192, 5, 3, 14
PIVOT = (116, 172)
ATLAS_W = 1024
CRIMSON = dict(hue=0.018, blue=0.621, keep=0.5, sat=1.04)

def cloth(r, g, b): return b > r + 25 and b > g + 10

def crimson(cell):
    out = cell.copy(); px = out.load(); n = 0
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and cloth(r, g, b):
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                q = colorsys.hsv_to_rgb((CRIMSON['hue'] + (h - CRIMSON['blue']) * CRIMSON['keep']) % 1, min(1, s * CRIMSON['sat']), v)
                px[x, y] = tuple(round(c * 255) for c in q) + (a,); n += 1
    return out, n

def frame(entry, base):
    im = guardian.tidy(Image.open(base + entry['file']).convert('RGBA'))
    s = entry['scale']; w, h = round(im.width * s), round(im.height * s)
    small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    ax, ay = entry['anchor']; ox, oy = round(PIVOT[0] - ax * s), round(PIVOT[1] - ay * s)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    sx, sy = max(0, -ox), max(0, -oy)
    cell.alpha_composite(small.crop((sx, sy, min(w, CW - ox), min(h, CH - oy))), (max(0, ox), max(0, oy)))
    ink = small.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    clipped = bool(ink) and (ox + ink[0] < 2 or oy + ink[1] < 2 or ox + ink[2] > CW - 2 or oy + ink[3] > CH - 2)
    return cell, clipped

def layout(cells):
    # Trimmed atlas: each frame cropped to its pixels plus 1 px, shelf-packed with 2 px padding; Phaser restores the 208x192 source cell from
    # spriteSourceSize/sourceSize, so the origin (the pivot) is the same point in every frame. Both factions share this layout (the same alpha).
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return place, y + shelf

def atlas(cells, place, H, name):
    img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/%s.png' % name, optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='%s.png' % name, size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-soldier-sheets.py')), open('public/assets/%s.json' % name, 'w'), indent=1)
    print('wrote public/assets/%s.png' % name, img.size, '(%.1f MB RGBA)' % (ATLAS_W * H * 4 / 1048576))

def grid(cells, path):
    g = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, ((i % COLS) * CW, (i // COLS) * CH))
    g.save(path, optimize=True)

def main():
    manifest = sys.argv[1] if len(sys.argv) > 1 else 'art/soldier-anim/frames.json'
    base = manifest.rsplit('/', 1)[0] + '/'
    m = json.load(open(manifest, encoding='utf-8'))
    assert len(m['frames']) == FRAMES, 'manifest needs %d frames' % FRAMES
    azure = []; red = []; bad = []; changed = 0
    for i, entry in enumerate(m['frames']):
        cell, clipped = frame(entry, base)
        if clipped: bad.append('%d %s reaches the 2 px cell gutter' % (i, entry['file']))
        c, n = crimson(cell); azure.append(cell); red.append(c); changed += n
    grid(azure, base + 'soldier-grid-azure.png'); grid(red, base + 'soldier-grid-crimson.png')
    place, H = layout(azure)
    atlas(azure, place, H, 'soldier-azure'); atlas(red, place, H, 'soldier-crimson')
    print('Crimson recolour: %d cloth px changed' % changed); [print('WARN', b) for b in bad]

if __name__ == '__main__': main()
