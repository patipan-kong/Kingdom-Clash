import type Phaser from 'phaser';
import {FANTASY} from './fantasyTheme';
import {nearestTo,spatialNext,tabNext,type NavDirection,type NavRect} from './panelNavigation';
type Hit=Phaser.GameObjects.Rectangle;
/** Desktop UX D2.1: the keyboard focus inside an open popup (Skills, Build, Shop). It knows nothing about the popups: each frame the HUD hands it the popup's hit
 * rectangles. Any visible control can take focus (a locked or unaffordable one too, drawn with a dimmed outline, so the focus never jumps away when the last point or coin
 * is spent); only an enabled one reacts to Enter, so every locked, unavailable and unaffordable rule stays the popup's own.
 * Enter replays a press on the focused rectangle (pointerdown, then pointerup, with one negative pointer id), so the popup's existing click handler and checks run unchanged;
 * the popups let a negative id take over a capture left by a mouse press that was dragged off, so that press cannot swallow the next Enter.
 * A gold outline in the HUD's theme marks the focus. */
export class PanelFocus{
 private ring:Phaser.GameObjects.Graphics;
 private owner?:string;private current?:Hit;private last?:NavRect;private targets:Hit[]=[];private watched=new WeakSet<Hit>();
 /** Depth 900: over every popup (Skills 500, Shop 600), under the Pause overlay (1000). */
 constructor(private scene:Phaser.Scene,depth=900){this.ring=scene.add.graphics().setDepth(depth).setVisible(false);}
 /** The focused control, if any. */
 get focused(){return this.current;}
 get active(){return !!this.owner&&!!this.current;}
 private focusable(hit:Hit){return hit.visible&&!!hit.input&&hit.width>0;}
 private enabled(hit:Hit){return this.focusable(hit)&&!!hit.input?.enabled;}
 private rect(hit:Hit):NavRect{const b=hit.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};}
 /** owner: which popup is open (undefined: none); targets: its hit rectangles; initial: where focus starts when it opens. shown: draw the outline (keyboard mode, not paused). */
 sync(owner:string|undefined,targets:readonly Hit[],scale:number,shown:boolean,initial?:()=>Hit|undefined){
  if(!owner){this.clear();return;}
  // A mouse press on a control moves the focus there. The popups stop the press from reaching the scene, so listen on each control itself (once).
  for(const h of targets)if(!this.watched.has(h)){this.watched.add(h);h.on('pointerdown',()=>this.pointed(h));}
  this.targets=targets.filter(h=>this.focusable(h));
  if(owner!==this.owner){this.owner=owner;const first=initial?.();this.current=first&&this.targets.includes(first)?first:this.targets[0];}
  else if(this.current&&!this.targets.includes(this.current)){const i=this.last?nearestTo(this.targets.map(h=>this.rect(h)),this.last):-1;this.current=i>=0?this.targets[i]:undefined;}
  else if(!this.current)this.current=this.targets[0];
  this.draw(scale,shown);
 }
 clear(){this.owner=undefined;this.current=undefined;this.last=undefined;this.targets=[];this.ring.clear().setVisible(false);}
 /** A mouse press on one of the popup's controls moves the keyboard focus there, so mixed use continues from the last control used. */
 pointed(hit:unknown){if(this.owner&&this.targets.includes(hit as Hit))this.current=hit as Hit;}
 move(direction:NavDirection){this.step(i=>spatialNext(this.targets.map(h=>this.rect(h)),i,direction));}
 tab(step:1|-1){this.step(i=>tabNext(this.targets.map(h=>this.rect(h)),i,step));}
 private step(next:(from:number)=>number){
  if(!this.owner||!this.targets.length)return;const from=this.current?this.targets.indexOf(this.current):-1;
  const i=from<0?0:next(from);if(i>=0)this.current=this.targets[i];
 }
 /** Enter: the focused control's own click. Returns whether a control was pressed. */
 activate(){
  const hit=this.current;if(!hit||!this.enabled(hit))return false;
  const b=hit.getBounds(),pointer={id:-21,x:b.centerX,y:b.centerY} as unknown as Phaser.Input.Pointer,event={stopPropagation(){}};
  hit.emit('pointerdown',pointer,0,0,event);hit.emit('pointerup',pointer,0,0,event);return true;
 }
 private draw(scale:number,shown:boolean){
  this.ring.clear();const hit=this.current;
  if(!hit){this.ring.setVisible(false);return;}
  const r=this.last=this.rect(hit);if(!shown){this.ring.setVisible(false);return;}
  const s=Math.max(.1,scale),pad=3/s,radius=7/s;
  this.ring.setVisible(true).lineStyle(4/s,0x071a22,.55).strokeRoundedRect(r.x-pad,r.y-pad,r.width+2*pad,r.height+2*pad,radius)
   .lineStyle(2.5/s,FANTASY.goldBright,this.enabled(hit)?1:.45).strokeRoundedRect(r.x-pad,r.y-pad,r.width+2*pad,r.height+2*pad,radius);
 }
}
