import type Phaser from 'phaser';
// One painting per chapter, cropped to size on demand: the same texture is the Chapter Select poster and the Mission Select backdrop.
// The paintings carry no lettering; chapter titles are always drawn by the scenes.
export type ChapterArtwork='kingdom'|'frontier'|'frozen';
const key=(artwork:ChapterArtwork)=>`chapter-${artwork}`;
/** How far down the painting a short crop starts (0 = top): keeps each castle in frame. */
const FOCUS:Record<ChapterArtwork,number>={kingdom:.2,frontier:.18,frozen:.1};
export function preloadChapterArt(scene:Phaser.Scene,artworks:readonly ChapterArtwork[]){
 for(const a of artworks)if(!scene.textures.exists(key(a)))scene.load.image(key(a),`${import.meta.env.BASE_URL}assets/${key(a)}.webp`);
}
/** A cover-fit frame (no stretching) of the painting for a w×h box, or null when the texture is unavailable so the caller can fall back. */
export function chapterArtFrame(scene:Phaser.Scene,artwork:ChapterArtwork,w:number,h:number):{key:string;frame:string}|null{
 if(!scene.textures.exists(key(artwork)))return null;
 const tex=scene.textures.get(key(artwork)),src=tex.getSourceImage() as {width:number;height:number},scale=Math.max(w/src.width,h/src.height);
 const cw=Math.round(w/scale),ch=Math.round(h/scale),name=`cover-${w}x${h}`;
 if(!tex.has(name))tex.add(name,0,Math.round((src.width-cw)/2),Math.round((src.height-ch)*FOCUS[artwork]),cw,ch);
 return {key:key(artwork),frame:name};
}
