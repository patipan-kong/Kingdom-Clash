// Fullscreen for phones. The browser only honours the request inside a real user gesture, so callers invoke it synchronously from a pointerup handler
// (before any scene change). It is a convenience: unsupported, denied or failing requests are swallowed and play continues in the page.
const doc=document as Document&{webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>Promise<void>|void};
type Target=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
const target=()=>(document.getElementById('game')??document.documentElement) as Target;
export const fullscreenSupported=()=>!!(document.fullscreenEnabled||(document as {webkitFullscreenEnabled?:boolean}).webkitFullscreenEnabled);
export const isFullscreen=()=>!!(document.fullscreenElement??doc.webkitFullscreenElement);
/** Phones and tablets (a coarse primary pointer) get fullscreen on Play; desktop is never forced. */
export const coarsePointer=()=>typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
const swallow=(r:unknown)=>{if(r&&typeof (r as Promise<void>).catch==='function')(r as Promise<void>).catch(()=>undefined);};
export function enterFullscreen(){
 if(!fullscreenSupported()||isFullscreen())return;
 try{const t=target();swallow(t.requestFullscreen?t.requestFullscreen({navigationUI:'hide'}):t.webkitRequestFullscreen?.());}catch{/* denied: keep playing in the page */}
}
export function exitFullscreen(){
 if(!isFullscreen())return;
 try{swallow(document.exitFullscreen?document.exitFullscreen():doc.webkitExitFullscreen?.());}catch{/* ignore */}
}
export const toggleFullscreen=()=>isFullscreen()?exitFullscreen():enterFullscreen();
/** Called from a Play / Start Mission press: fullscreen on touch devices only. */
export const enterFullscreenOnTouch=()=>{if(coarsePointer())enterFullscreen();};
/** The pause-menu control is offered on touch devices and on a ?debug=1 launch, where the player skips the menu presses that would have entered fullscreen. */
export const fullscreenControlOffered=()=>fullscreenSupported()&&(coarsePointer()||new URLSearchParams(location.search).get('debug')==='1');
