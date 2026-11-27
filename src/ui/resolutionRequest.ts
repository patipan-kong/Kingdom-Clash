/** Desktop UX D3: pure parts of the desktop rendering resolution (query parsing, default, scale factor, frame statistics). */
export type ResolutionRequest={mode:'fixed';height:number}|{mode:'native';cap?:number};
export const LOGICAL={width:960,height:540};
export const NATIVE_CAP=3;
/** The desktop default without ?res=: the screen's own pixels, at most 1920×1080 (k=2). */
export const DEFAULT_RESOLUTION:ResolutionRequest={mode:'native',cap:2};

/** ?res=native, or a backing height from 540 (the original 960×540 rendering) to 2160; anything else is no override. */
export function parseResolution(search:string):ResolutionRequest|undefined{
 const v=new URLSearchParams(search).get('res')?.toLowerCase();
 if(v==='native')return {mode:'native'};
 const h=Number(v);return v&&Number.isFinite(h)&&h>=LOGICAL.height&&h<=2160?{mode:'fixed',height:Math.round(h)}:undefined;
}
export const requestedResolution=(search:string):ResolutionRequest=>parseResolution(search)??DEFAULT_RESOLUTION;
/** Phones and tablets keep 960×540: a coarse primary pointer, or an Android/iOS device that reports a fine one (stylus models, iPad desktop mode). */
export const isHandheld=(coarse:boolean,userAgent:string,touchPoints:number)=>
 coarse||/Android|iPhone|iPad|iPod/.test(userAgent)||(/Macintosh/.test(userAgent)&&touchPoints>1);
/** Scale factor for a request: fixed heights are exact, native follows the canvas' device pixels (capped); never below 1. */
export function resolutionScale(r:ResolutionRequest|undefined,cssHeight:number,dpr:number):number{
 if(!r)return 1;
 const k=r.mode==='fixed'?r.height/LOGICAL.height:Math.min(r.cap??NATIVE_CAP,cssHeight*(dpr||1)/LOGICAL.height);
 return Math.max(1,k);
}
/** Frame rate and frame-time summary from requestAnimationFrame intervals in milliseconds. */
export function frameStats(intervals:readonly number[]){
 if(!intervals.length)return {fps:0,avg:0,p95:0,worst:0};
 const sorted=[...intervals].sort((a,b)=>a-b),avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;
 return {fps:1000/avg,avg,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],worst:sorted[sorted.length-1]};
}
