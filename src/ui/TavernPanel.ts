import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import {mercenary,mercenaryStats,reviveCost,REVIVE_TICKS} from '../data/mercenaries';
import {HZ} from '../simulation/Clock';
import {tavernLayout,TAVERN_ROWS,type TavernLayout} from './tavernLayout';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT,type ButtonTone} from './fantasyTheme';
/** Chapter 5 Phase 1B: the Tavern panel (docs/CHAPTER5_PHASE1B.md). A view over Simulation.state.tavern: it holds no state of its own besides which Dismiss is armed and the last refusal.
 * Taps send `tavern` commands through the ordinary command queue (the HUD passes send); a button that would be refused shows the reason in the status line instead. */
const WHITE=FANTASY_TEXT.primary,MUTED=FANTASY_TEXT.muted,WARN=FANTASY_TEXT.warning;
interface Row{art:Phaser.GameObjects.Graphics;name:Phaser.GameObjects.Text;info:Phaser.GameObjects.Text;primary:Phaser.GameObjects.Text;dismiss:Phaser.GameObjects.Text;hitPrimary:Phaser.GameObjects.Rectangle;hitDismiss:Phaser.GameObjects.Rectangle;action?:()=>void;armed?:()=>void}
export class TavernPanel{
 readonly container:Phaser.GameObjects.Container;
 bounds={x:0,y:0,width:0,height:0};
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;private title:Phaser.GameObjects.Text;private stock:Phaser.GameObjects.Text;private status:Phaser.GameObjects.Text;
 private closeArt:Phaser.GameObjects.Graphics;private closeHit:Phaser.GameObjects.Rectangle;
 private rows:Row[]=[];private geometry?:TavernLayout;private signature='';private serial=0;private pressed:(string|null)[]=[];
 private armedSlot=-1;private armedAt=0;private note?:{text:string;until:number};
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,private send:(c:Parameters<Simulation['send']>[0])=>boolean,private close:()=>void){
  this.container=scene.add.container(0,0).setDepth(600).setVisible(false);this.bg=scene.add.graphics();
  this.blocker=scene.add.rectangle(0,0,960,540,0,.35).setOrigin(0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  this.container.add([this.blocker,this.bg]);
  this.title=this.text('TAVERN',true).setOrigin(0,.5).setColor(FANTASY_TEXT.gold);this.stock=this.text('').setOrigin(1,.5);this.status=this.text('').setOrigin(0,.5);
  this.closeArt=scene.add.graphics();this.closeHit=scene.add.rectangle(0,0,10,10,0,0).setInteractive({useHandCursor:true});this.container.add([this.closeArt,this.closeHit]);this.tap(this.closeHit,'close',()=>this.close());
  for(let i=0;i<TAVERN_ROWS;i++){
   const art=scene.add.graphics();this.container.add(art);
   const row:Row={art,name:this.text('',true),info:this.text(''),primary:this.text('',true).setOrigin(.5),dismiss:this.text('',true).setOrigin(.5),hitPrimary:scene.add.rectangle(0,0,10,10,0,0).setInteractive({useHandCursor:true}),hitDismiss:scene.add.rectangle(0,0,10,10,0,0).setInteractive({useHandCursor:true})};
   this.container.add([row.hitPrimary,row.hitDismiss]);this.rows.push(row);this.tap(row.hitPrimary,`p${i}`,()=>row.action?.());this.tap(row.hitDismiss,`d${i}`,()=>row.armed?.());
  }
 }
 get visible(){return this.container.visible;}
 open(){this.armedSlot=-1;this.note=undefined;this.signature='';this.container.setVisible(true);this.render();}
 hide(){this.armedSlot=-1;this.pressed=[];this.container.setVisible(false);}
 layout(scale:number){this.geometry=tavernLayout(scale,TAVERN_ROWS);this.signature='';this.bounds={x:this.geometry.x,y:this.geometry.y,width:this.geometry.width,height:this.geometry.height};this.render();}
 private text(value:string,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 // A button acts on release over the same button, like the other panels; pointerdown only claims the tap (and stops it reaching the battlefield).
 private tap(hit:Phaser.GameObjects.Rectangle,key:string,action:()=>void){
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.pressed[p.id]=key;this.signature='';});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const hit0=this.pressed[p.id]===key;this.pressed[p.id]=null;this.signature='';if(hit0){action();this.render();}});
  hit.on('pointerout',(p:Phaser.Input.Pointer)=>{this.pressed[p.id]=null;this.signature='';});
 }
 private refuse(text:string){this.note={text,until:this.scene.time.now+2600};this.signature='';}
 private order(command:{action:'hire'|'revive'|'dismiss';merc?:string;slot?:number}){
  const reason=this.sim().tavernReason(command);if(reason){this.refuse(reason);return;}
  this.send({type:'tavern',requestId:`tavern-ui-${++this.serial}`,...command});
 }
 private cost(g:number){return `${g}G`;}
 render(){
  const g=this.geometry;if(!g||!this.container.visible)return;
  const sim=this.sim(),t=sim.state.tavern,cfg=sim.setup.tavern;if(!t||!cfg){this.close();return;}
  const now=this.scene.time.now;if(this.note&&now>=this.note.until){this.note=undefined;this.signature='';}if(this.armedSlot>=0&&now-this.armedAt>3000){this.armedSlot=-1;this.signature='';}
  const view=cfg.roster.slice(0,TAVERN_ROWS).map(id=>{const m=mercenary(id)!,i=t.slots.findIndex(s=>s.merc===id),s=i>=0?t.slots[i]:undefined;return {m,i,s};});
  const secs=(ticks?:number)=>Math.ceil((ticks??0)/HZ);
  const signature=JSON.stringify([Math.floor(sim.state.gold),view.map(v=>[v.s?.status,secs(v.s?.remaining)]),this.armedSlot,this.note?.text,sim.tavernStanding(),Object.keys(this.pressed).length&&this.pressed]);
  if(signature===this.signature)return;this.signature=signature;
  this.bg.clear();drawFantasyPanel(this.bg,{x:g.x,y:g.y,width:g.width,height:g.height},g.scale);
  this.title.setPosition(g.title.x,g.title.y).setFontSize(g.font.title);
  this.stock.setPosition(g.resources.x,g.resources.y).setFontSize(g.font.status).setText(`${Math.floor(sim.state.gold)} G · Heroes ${t.slots.length}/${cfg.cap}`);
  this.closeHit.setPosition(g.close.x,g.close.y).setSize(g.close.size,g.close.size).setDisplaySize(g.close.size,g.close.size);
  const c=g.close,k=c.size*.2;this.closeArt.clear();drawFantasyButton(this.closeArt,c.x-c.size*.36,c.y-c.size*.36,c.size*.72,c.size*.72,g.scale,this.pressed.includes('close')?'selected':'secondary',false);this.closeArt.lineStyle(c.size*.07,0xfff3d3,1).lineBetween(c.x-k,c.y-k,c.x+k,c.y+k).lineBetween(c.x+k,c.y-k,c.x-k,c.y+k);
  const open=sim.tavernStanding();
  for(const [i,r] of this.rows.entries()){
   const v=view[i],geo=g.rows[i],show=!!v&&!!geo;[r.art,r.name,r.info,r.primary,r.dismiss,r.hitPrimary,r.hitDismiss].forEach(o=>o.setVisible(show));if(!show||!v||!geo){r.hitPrimary.disableInteractive();r.hitDismiss.disableInteractive();continue;}
   r.hitPrimary.setInteractive();r.hitDismiss.setInteractive();
   const stats=mercenaryStats(v.m);
   r.name.setPosition(geo.info.x,geo.y+geo.height*.1).setFontSize(g.font.name).setText(v.m.name);
   r.info.setPosition(geo.info.x,geo.y+geo.height*.55).setFontSize(g.font.info).setColor(MUTED).setText(`${v.m.role} · HP ${stats.maxHp} · ATK ${stats.damage}`);
   const st=v.s?.status,paint=(b:{x:number;y:number;width:number;height:number},tone:ButtonTone,key:string)=>drawFantasyButton(r.art,b.x,b.y,b.width,b.height,g.scale,tone,this.pressed.includes(key));
   r.art.clear();
   const label=(txt:Phaser.GameObjects.Text,b:{x:number;y:number;width:number;height:number},text:string,color:string=WHITE)=>txt.setPosition(b.x+b.width/2,b.y+b.height/2).setFontSize(g.font.button).setColor(color).setText(text).setWordWrapWidth(b.width*.94,true).setAlign('center');
   let primaryText:string,tone:ButtonTone,action:(()=>void)|undefined;
   if(!v.s){const reason=sim.tavernReason({action:'hire',merc:v.m.id});primaryText=`Hire\n${this.cost(v.m.gold)}`;tone=reason?'disabled':'primary';action=()=>this.order({action:'hire',merc:v.m.id});}
   else if(st==='dead'){const cost=reviveCost(v.m),reason=sim.tavernReason({action:'revive',slot:v.i});primaryText=`Revive\n${this.cost(cost.gold)}`;tone=reason?'disabled':'primary';action=()=>this.order({action:'revive',slot:v.i});}
   else if(st==='reviving'){primaryText=open?`Returns in\n${secs(v.s.remaining)} s`:'Waiting for\na Tavern';tone='secondary';action=undefined;}
   else {primaryText='In the field';tone='secondary';action=undefined;}
   paint(geo.primary,tone,`p${i}`);label(r.primary,geo.primary,primaryText,tone==='disabled'?'#9fb0b8':WHITE);r.action=action??(()=>{});
   r.hitPrimary.setPosition(geo.primary.x+geo.primary.width/2,geo.primary.y+geo.primary.height/2).setSize(geo.primary.width,geo.primary.height).setDisplaySize(geo.primary.width,geo.primary.height);
   const hired=!!v.s,armed=this.armedSlot===v.i&&hired;
   if(hired){paint(geo.dismiss,armed?'danger':'secondary',`d${i}`);label(r.dismiss,geo.dismiss,armed?'Sure?':'Dismiss',armed?'#ffe3dc':WHITE);r.armed=()=>{if(this.armedSlot===v.i){this.armedSlot=-1;this.order({action:'dismiss',slot:v.i});}else{this.armedSlot=v.i;this.armedAt=this.scene.time.now;}};}
   else {r.dismiss.setVisible(false);r.armed=undefined;}
   r.hitDismiss.setVisible(hired);if(hired)r.hitDismiss.setPosition(geo.dismiss.x+geo.dismiss.width/2,geo.dismiss.y+geo.dismiss.height/2).setSize(geo.dismiss.width,geo.dismiss.height).setDisplaySize(geo.dismiss.width,geo.dismiss.height);else r.hitDismiss.disableInteractive();
  }
  const hint=!open?(Object.values(sim.state.structures).some(b=>b.tavern&&b.hp>0)?'The Tavern is still being built':'No Tavern standing · build one to hire or revive'):this.note?.text??`A fallen hero keeps its place · Revive ${REVIVE_TICKS/HZ} s · Dismiss gives no refund`;
  this.status.setPosition(g.status.x,g.status.y).setFontSize(g.font.status).setColor(this.note||!open?WARN:MUTED).setText(hint).setWordWrapWidth(g.status.width,true);
 }
}
