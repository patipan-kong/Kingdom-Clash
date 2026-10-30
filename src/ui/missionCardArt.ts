import type Phaser from 'phaser';
// Prototype: an illustrated backdrop for individual Mission Select cards. A mission without an entry keeps the plain card.
/** Mission id → how far down the painting the card crop starts (0 = top). */
const ART:Readonly<Record<string,number>>={'campaign-01':.5,'campaign-02':.5,'campaign-03':.5,'campaign-04':.5,'campaign-05':.5,'campaign-06':.5,'campaign-11':.55,'campaign-12':.5,'campaign-13':.5,'campaign-14':.5,'campaign-15':.5,'campaign-16':.5,'campaign-21':.5,'campaign-22':.5,'campaign-23':.5,'campaign-24':.5,'campaign-25':.5,'campaign-26':.5};
const key=(id:string)=>`mission-art-${id}`;
/** True when the mission has a painting (so the card draws its title over the bottom shade instead of beside a medallion). */
export const hasMissionCardArt=(id:string)=>id in ART;
export function preloadMissionCardArt(scene:Phaser.Scene,ids:readonly string[]){
 for(const id of ids)if(hasMissionCardArt(id)&&!scene.textures.exists(key(id)))scene.load.image(key(id),`${import.meta.env.BASE_URL}assets/${key(id)}.webp`);
}
/** The painting cover-fitted to a w×h card with rounded corners and a bottom shade for the title baked in; locked cards are darkened. Null when the texture is unavailable. */
export function missionCardArt(scene:Phaser.Scene,id:string,w:number,h:number,open:boolean):string|null{
 if(!hasMissionCardArt(id)||!scene.textures.exists(key(id)))return null;
 const name=`${key(id)}-card-${w}x${h}-${open?'open':'locked'}`;
 if(scene.textures.exists(name))return name;
 const src=scene.textures.get(key(id)).getSourceImage() as HTMLImageElement,tex=scene.textures.createCanvas(name,w,h);
 if(!tex)return null;
 const ctx=tex.getContext(),scale=Math.max(w/src.width,h/src.height),sw=w/scale,sh=h/scale;
 ctx.save();ctx.beginPath();ctx.roundRect(1,1,w-2,h-2,8);ctx.clip();
 ctx.drawImage(src,(src.width-sw)/2,(src.height-sh)*ART[id],sw,sh,0,0,w,h);
 const shade=ctx.createLinearGradient(0,h*.38,0,h);shade.addColorStop(0,'rgba(4,12,20,0)');shade.addColorStop(1,'rgba(4,12,20,.88)');
 ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 if(!open){ctx.fillStyle='rgba(8,18,27,.62)';ctx.fillRect(0,0,w,h);}
 ctx.restore();tex.refresh();return name;
}
