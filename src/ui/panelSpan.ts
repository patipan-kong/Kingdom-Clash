/** Width (CSS px) of a left-anchored panel between the utility column and the skill cluster. On a narrow phone canvas that gap collapses
 * (97 px at scale .54), so the panel keeps a readable floor and is allowed to cover the skill buttons while it is open; it never leaves the canvas. */
export const PANEL_MIN_WIDTH=220;
export function panelSpan(scale:number,utilityX:number,cap:number,x=124){
 const s=Math.max(.1,scale),free=utilityX*s-30-x,canvas=960*s;
 return Math.min(cap,Math.max(free,Math.min(PANEL_MIN_WIDTH,canvas-x-8)));
}
/** Under 340 CSS px tall the HUD plates leave no room below them: panels cover them while open, from 8 px down, and use the rest of the canvas height. */
export const shortCanvas=(scale:number)=>540*Math.max(.1,scale)<340;
/** Phaser throws when a wrap width is narrower than one character; every dynamic wrap width goes through this. */
export const wrapWidth=(w:number,min=40)=>Number.isFinite(w)?Math.max(min,w):min;
