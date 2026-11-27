/** Desktop UX D3-1: pure parts of the rendering-resolution experiment (query parsing, scale factor, frame statistics). */
export type ResolutionRequest={mode:'fixed';height:number}|{mode:'native'};
export const LOGICAL={width:960,height:540};
export const NATIVE_CAP=3;

/** ?res=native, or a backing height from 540 (today's rendering) to 2160; anything else leaves the experiment off. */
export function parseResolution(search:string):ResolutionRequest|undefined{
 const v=new URLSearchParams(search).get('res')?.toLowerCase();
 if(v==='native')return {mode:'native'};
 const h=Number(v);return v&&Number.isFinite(h)&&h>=LOGICAL.height&&h<=2160?{mode:'fixed',height:Math.round(h)}:undefined;
}
/** Scale factor for a request: fixed heights are exact, native follows the canvas' device pixels (capped); never below 1. */
export function resolutionScale(r:ResolutionRequest|undefined,cssHeight:number,dpr:number):number{
 if(!r)return 1;
 const k=r.mode==='fixed'?r.height/LOGICAL.height:Math.min(NATIVE_CAP,cssHeight*(dpr||1)/LOGICAL.height);
 return Math.max(1,k);
}
/** Frame rate and frame-time summary from requestAnimationFrame intervals in milliseconds. */
export function frameStats(intervals:readonly number[]){
 if(!intervals.length)return {fps:0,avg:0,p95:0,worst:0};
 const sorted=[...intervals].sort((a,b)=>a-b),avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;
 return {fps:1000/avg,avg,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],worst:sorted[sorted.length-1]};
}
