"""Mechanically extract transparent sprites from the generated source atlases.
No recoloring or synthesized artwork. Preserve alpha and crop to occupied pixels.
"""
from pathlib import Path
from PIL import Image
import json
project = Path(__file__).resolve().parents[1]
root = project / 'public' / 'assets'
source_root = project / 'art' / 'source'
groups = [
 ('units-source.png', [('guardian',0,0.43),('minion-blue',0.43,0.70),('minion-red',0.70,1)]),
 ('structures-source.png', [('base-blue',0,.30),('base-red',.30,.57),('tower',.57,.78),('wall',.78,1)])
]
metadata=[]
for source, entries in groups:
 image=Image.open(source_root/source).convert('RGBA')
 for name,start,end in entries:
  sprite=image.crop((round(image.width*start),0,round(image.width*end),image.height))
  bbox=sprite.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
  if not bbox: raise ValueError(f'Empty sprite: {name}')
  sprite=sprite.crop(bbox)
  limit=512 if name.startswith('base') else 384 if name in ('guardian','tower') else 192
  sprite.thumbnail((limit,limit), Image.Resampling.LANCZOS)
  sprite.save(root/f'{name}.png',optimize=True)
  metadata.append({'id':name,'source':source,'file':f'{name}.png','width':sprite.width,'height':sprite.height,'alpha':True})
(root/'sprite-metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps(metadata,indent=2))
