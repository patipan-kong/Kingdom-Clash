from pathlib import Path
from PIL import Image
import json
project=Path(__file__).resolve().parents[1]
out=project/'public/assets'
groups=[('environment-source.png',[('trees',0,.385),('rocks',.385,.70),('bush',.70,1)]),
        ('abilities-source.png',[(f'ability-{name}',i/5,(i+1)/5) for i,name in enumerate(['bash','taunt','charge','zone','attack'])])]
metadata=[]
for source,entries in groups:
    im=Image.open(project/'art/source'/source).convert('RGBA')
    for name,a,b in entries:
        tile=im.crop((round(im.width*a),0,round(im.width*b),im.height))
        box=tile.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
        tile=tile.crop(box)
        limit=512 if name=='trees' else 256
        tile.thumbnail((limit,limit),Image.Resampling.LANCZOS)
        tile.save(out/f'{name}.png',optimize=True)
        metadata.append({'file':f'{name}.png','source':source,'width':tile.width,'height':tile.height,'alpha':True})
for name in ['grass','path','water','bridge']:
    im=Image.open(project/'art/source'/f'{name}-source.png').convert('RGBA' if name=='bridge' else 'RGB')
    if name=='bridge':
        box=im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
        im=im.crop(box)
    im.thumbnail((512,512),Image.Resampling.LANCZOS)
    im.save(out/f'{name}.png',optimize=True)
    metadata.append({'file':f'{name}.png','source':f'{name}-source.png','width':im.width,'height':im.height,'alpha':name=='bridge'})
(out/'refinement-metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps(metadata,indent=2))
