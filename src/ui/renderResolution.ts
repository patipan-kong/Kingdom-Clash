import Phaser from 'phaser';
import {coarsePointer} from './fullscreen';

/** Desktop UX D3-1 (experiment, opt-in): render the 960x540 logical game into a larger backing canvas.
 *
 * Everything above WebGL stays logical: game size, cameras, scroll, layouts and pointer coordinates are unchanged, so no
 * input or camera code is converted. Only the canvas backing store is k times larger, and while the canvas (not an
 * offscreen framebuffer) is bound, GL viewport and scissor rectangles are scaled by k, so Phaser's 960x540 projection
 * fills the bigger canvas. Text objects render their glyph canvas at resolution k so labels gain real pixels too.
 *
 * Off by default. ?res=540 is today's rendering, ?res=720 / 1080 / 1440 a fixed backing height, ?res=native the
 * canvas' on-screen height x devicePixelRatio (followed on resize, capped). Touch devices always keep k=1. */
import {LOGICAL,parseResolution,resolutionScale,type ResolutionRequest} from './resolutionRequest';
export {LOGICAL,parseResolution,resolutionScale,type ResolutionRequest};

export interface RenderResolution{readonly request:ResolutionRequest;readonly k:number;readonly webgl:boolean;readonly backing:{width:number;height:number}}
type State={request:ResolutionRequest;k:number;webgl:boolean;canvas:HTMLCanvasElement};
let active:State|undefined;

const canvasSize={get width(){return Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width')!;},get height(){return Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'height')!;}};
const backingSize=(c:HTMLCanvasElement,d:'width'|'height')=>canvasSize[d].get!.call(c) as number;

/** The running experiment, or undefined when the game renders as before. */
export const renderResolution=():RenderResolution|undefined=>active&&{request:active.request,k:active.k,webgl:active.webgl,
 backing:{width:backingSize(active.canvas,'width'),height:backingSize(active.canvas,'height')}};

/** The canvas Phaser should use, or undefined (the normal path) when the experiment is off, is the baseline, or the device is touch. */
export function prepareResolutionCanvas(search=location.search):HTMLCanvasElement|undefined{
 const request=parseResolution(search);
 if(!request||coarsePointer())return undefined;
 // The FIT height the canvas will get inside its parent, so native text starts at the right k before the first resize.
 const parent=document.getElementById('game')?.getBoundingClientRect(),pw=parent?.width||innerWidth,ph=parent?.height||innerHeight;
 const k=resolutionScale(request,Math.min(ph,pw*LOGICAL.height/LOGICAL.width),devicePixelRatio);
 if(k===1&&request.mode==='fixed')return undefined; // ?res=540 is today's rendering
 if(!webglAvailable())return undefined; // the experiment is WebGL-only; the Canvas fallback renders as before
 const canvas=document.createElement('canvas'),state:State=active={request,k,webgl:true,canvas};
 // Phaser and the page see the logical size; the backing store is k times larger (a 2D fallback renderer stays logical).
 const logical={width:300,height:150};
 for(const d of ['width','height'] as const)Object.defineProperty(canvas,d,{configurable:true,
  get:()=>logical[d],
  set:(v:number)=>{logical[d]=v;canvasSize[d].set!.call(canvas,Math.round(v*(state.webgl?state.k:1)));}});
 const getContext=canvas.getContext as (type:string,attrs?:unknown)=>RenderingContext|null;
 (canvas as unknown as {getContext:typeof getContext}).getContext=function(this:HTMLCanvasElement,type:string,attrs?:unknown){
  const ctx=getContext.call(this,type,attrs);
  if(ctx&&/webgl/.test(type))scaleCanvasDrawing(ctx as WebGLRenderingContext,()=>state.k);
  else if(ctx){state.webgl=false;canvas.width=logical.width;canvas.height=logical.height;}
  return ctx;
 };
 patchTextResolution(()=>state.webgl?state.k:1);
 return canvas;
}

function webglAvailable(){
 const gl=document.createElement('canvas').getContext('webgl') as WebGLRenderingContext|null;
 gl?.getExtension('WEBGL_lose_context')?.loseContext();return !!gl;
}

/** GL rectangles in canvas pixels are scaled while the default framebuffer is bound; framebuffers keep their own sizes. */
function scaleCanvasDrawing(gl:WebGLRenderingContext,k:()=>number){
 let onCanvas=true;
 const bind=gl.bindFramebuffer.bind(gl),viewport=gl.viewport.bind(gl),scissor=gl.scissor.bind(gl);
 const glProto=Object.getPrototypeOf(gl);
 const bufferWidth=Object.getOwnPropertyDescriptor(glProto,'drawingBufferWidth')!.get!,bufferHeight=Object.getOwnPropertyDescriptor(glProto,'drawingBufferHeight')!.get!;
 gl.bindFramebuffer=(target,fb)=>{if(target===gl.FRAMEBUFFER)onCanvas=fb===null;bind(target,fb);};
 const s=(v:number)=>onCanvas?Math.round(v*k()):v;
 gl.viewport=(x,y,w,h)=>viewport(s(x),s(y),s(w),s(h));
 gl.scissor=(x,y,w,h)=>scissor(s(x),s(y),s(w),s(h));
 Object.defineProperty(gl,'drawingBufferWidth',{configurable:true,get:()=>bufferWidth.call(gl)/k()});
 Object.defineProperty(gl,'drawingBufferHeight',{configurable:true,get:()=>bufferHeight.call(gl)/k()});
}

/** Text glyph canvases at resolution k; an explicit higher resolution (menu titles at devicePixelRatio 3) is kept. */
let textPatched=false;
function patchTextResolution(k:()=>number){
 if(textPatched)return;textPatched=true;
 const T=Phaser.GameObjects.Text.prototype as unknown as {setResolution(v:number):unknown};
 const S=Phaser.GameObjects.TextStyle.prototype as unknown as {setStyle(style:unknown,update?:boolean,defaults?:boolean):unknown};
 const setResolution=T.setResolution,setStyle=S.setStyle;
 T.setResolution=function(this:unknown,v:number){return setResolution.call(this,Math.max(v||1,k()));};
 S.setStyle=function(this:{resolution:number},style:unknown,update?:boolean,defaults?:boolean){
  const out=setStyle.call(this,style,update,defaults);
  if(this.resolution<k())this.resolution=k();
  return out;
 };
}

/** Native mode follows the window: a new k re-sizes the backing store and refreshes Phaser's viewport (existing text keeps its k). */
export function followNativeResolution(game:Phaser.Game){
 const state=active;if(!state||state.request.mode!=='native'||!state.webgl)return;
 const update=()=>{
  if(!game.canvas)return;
  const k=resolutionScale(state.request,game.canvas.getBoundingClientRect().height,devicePixelRatio);
  if(k===state.k)return;
  state.k=k;const c=game.canvas;c.width=LOGICAL.width;c.height=LOGICAL.height; // re-applies the backing size at the new k
  game.renderer.resize(LOGICAL.width,LOGICAL.height);
 };
 game.events.once(Phaser.Core.Events.READY,()=>{game.scale.on(Phaser.Scale.Events.RESIZE,update);update();});
}
