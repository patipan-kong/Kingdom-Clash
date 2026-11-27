import type Phaser from 'phaser';
import {DEFAULT_RESOLUTION,renderResolution} from './renderResolution';
import {frameStats} from './resolutionRequest';

/** Desktop UX D3: a plain DOM readout (outside the canvas, so it costs the measured frame nothing) for comparing rendering
 * resolutions on real hardware. Hidden in normal play: shown with ?res=… or ?perf=1; F8 hides or shows it. Frame times are the browser's own
 * requestAnimationFrame intervals over the last two seconds, so they include the GPU work the experiment adds. */
export function showRenderStats(game:Phaser.Game,search=location.search){
 const q=new URLSearchParams(search);if(!q.has('res')&&q.get('perf')!=='1')return;
 const box=document.createElement('div');box.id='render-stats';
 box.style.cssText='position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:20;pointer-events:none;font:12px/1.35 Consolas,monospace;color:#f4e6b8;background:rgba(8,20,24,.78);border:1px solid #dcbf7a;border-radius:4px;padding:3px 8px;white-space:pre;';
 document.body.appendChild(box);
 const samples:{t:number;dt:number}[]=[];let last=0,shown=true,paint=0;
 window.addEventListener('keydown',e=>{if(e.code==='F8'){shown=!shown;box.style.display=shown?'block':'none';}});
 const tick=(t:number)=>{
  if(last)samples.push({t,dt:t-last});last=t;
  while(samples.length&&samples[0].t<t-2000)samples.shift();
  if(t-paint>500&&shown){
   paint=t;const s=frameStats(samples.map(x=>x.dt)),r=renderResolution(),c=game.canvas,css=c?.getBoundingClientRect();
   const mode=r?(r.request===DEFAULT_RESOLUTION?`default (native ≤1080p) k=${r.k.toFixed(2)}`:r.request.mode==='native'?`native k=${r.k.toFixed(2)}`:`${r.request.height}p k=${r.k.toFixed(2)}`)+(r.webgl?'':' (Canvas renderer: off)'):'960×540 (original)';
   const backing=r?`${r.backing.width}×${r.backing.height}`:c?`${c.width}×${c.height}`:'–';
   box.textContent=`${mode} · backing ${backing} · shown ${css?Math.round(css.width):0}×${css?Math.round(css.height):0} css @${devicePixelRatio}x\n${s.fps.toFixed(0)} fps · frame ${s.avg.toFixed(1)} ms avg · ${s.p95.toFixed(1)} p95 · ${s.worst.toFixed(1)} worst (2 s)`;
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
