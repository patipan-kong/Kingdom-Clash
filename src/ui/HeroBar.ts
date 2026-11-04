import Phaser from 'phaser';
import type {HeroBarLayout} from './heroBarLayout';
import {HERO_SLOTS} from './heroBarLayout';
import type {HeroCommandState,HeroOrderType} from './heroCommand';
/** Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md): the Allied Hero portraits (HP bar, order badge, selection), the Follow / Attack / Defend popover and the target prompt.
 * A view only: the HUD owns the command state (heroCommand.ts) and passes it to render(); taps come back through the callbacks. Every hit target stops propagation, so a tap on the bar never reaches the battlefield. */
export interface HeroBarHero{readonly id:string;readonly hp:number;readonly maxHp:number;readonly order:HeroOrderType;readonly texture?:string}
const INK=0x122d35,GOLD=0xdcbf7a,RIM=0xc1d5c2,CREAM=0xfff3d3,ATTACK=0xff6b5b,DEFEND=0x59ceff,HP=0x6fe3a8;
export const orderColor=(t:HeroOrderType)=>t==='attack'?ATTACK:t==='defend'?DEFEND:CREAM;
const COMMANDS:readonly [HeroOrderType,string][]=[['follow','Follow'],['attack','Attack'],['defend','Defend']];
/** The order glyphs (» Follow, crossed swords Attack, shield Defend), drawn with Graphics so every device renders them alike. k is the glyph's size. */
export function drawOrderGlyph(g:Phaser.GameObjects.Graphics,type:HeroOrderType,x:number,y:number,k:number,color:number){
 g.lineStyle(Math.max(1.5,k*.18),color,1);
 if(type==='follow'){for(const d of [-.35,.25]){g.beginPath();g.moveTo(x+(d-.2)*k,y-.4*k);g.lineTo(x+(d+.2)*k,y);g.lineTo(x+(d-.2)*k,y+.4*k);g.strokePath();}}
 else if(type==='attack'){g.lineBetween(x-.45*k,y+.45*k,x+.45*k,y-.45*k);g.lineBetween(x+.45*k,y+.45*k,x-.45*k,y-.45*k);g.lineBetween(x-.5*k,y+.15*k,x-.15*k,y+.5*k);g.lineBetween(x+.5*k,y+.15*k,x+.15*k,y+.5*k);}
 else {g.beginPath();g.moveTo(x,y-.5*k);g.lineTo(x+.42*k,y-.32*k);g.lineTo(x+.36*k,y+.12*k);g.lineTo(x,y+.52*k);g.lineTo(x-.36*k,y+.12*k);g.lineTo(x-.42*k,y-.32*k);g.closePath();g.strokePath();}
}
interface Slot{art:Phaser.GameObjects.Graphics;face:Phaser.GameObjects.Image;mask:Phaser.GameObjects.Graphics;over:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Arc;id?:string}
interface Button{art:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;hit:Phaser.GameObjects.Rectangle}
export class HeroBar{
 readonly container:Phaser.GameObjects.Container;
 private slots:Slot[]=[];private buttons:Button[]=[];
 private prompt:{art:Phaser.GameObjects.Graphics;text:Phaser.GameObjects.Text;chip:Phaser.GameObjects.Arc};
 private geometry?:HeroBarLayout;private signature='';
 constructor(scene:Phaser.Scene,private on:{portrait:(id:string)=>void;command:(order:HeroOrderType)=>void;cancel:()=>void}){
  this.container=scene.add.container(0,0).setDepth(60).setVisible(false);
  const stop=(e:Phaser.Types.Input.EventData)=>e.stopPropagation();
  for(let i=0;i<HERO_SLOTS;i++){
   const art=scene.add.graphics(),face=scene.add.image(0,0,'guardian').setOrigin(.5,0),mask=scene.make.graphics({},false),over=scene.add.graphics();face.setMask(mask.createGeometryMask());
   const hit=scene.add.circle(0,0,24,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(24,24,24),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true});
   const slot:Slot={art,face,mask,over,hit};hit.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{stop(e);if(slot.id)this.on.portrait(slot.id);});
   this.slots.push(slot);this.container.add([art,face,over,hit]);
  }
  for(const [order,name] of COMMANDS){
   const art=scene.add.graphics(),label=scene.add.text(0,0,name,{fontFamily:'Arial, sans-serif',fontSize:'12px',fontStyle:'bold',color:'#fff3d3'}).setOrigin(.5,1);
   const hit=scene.add.rectangle(0,0,10,10,0,0).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{stop(e);this.on.command(order);});
   this.buttons.push({art,label,hit});this.container.add([art,label,hit]);
  }
  const part=scene.add.graphics(),text=scene.add.text(0,0,'',{fontFamily:'Arial, sans-serif',fontSize:'15px',fontStyle:'bold',color:'#fff3d3'}).setOrigin(0,.5);
  const chip=scene.add.circle(0,0,22,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(22,22,22),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{stop(e);this.on.cancel();});
  this.prompt={art:part,text,chip};this.container.add([part,text,chip]);
 }
 /** Rectangles of whatever is drawn now (logical px), for the HUD's own tests and obstruction checks. */
 get bounds(){const g=this.geometry;if(!g||!this.container.visible)return [];return this.slots.filter(s=>s.id).map(s=>s.hit.getBounds());}
 layout(geometry:HeroBarLayout){this.geometry=geometry;this.signature='';
  for(const [i,s] of this.slots.entries()){const p=geometry.slots[i]??geometry.slots[0];if(!p)continue;s.hit.setPosition(p.x,p.y).setRadius(p.hitRadius);(s.hit.input!.hitArea as Phaser.Geom.Circle).setTo(p.hitRadius,p.hitRadius,p.hitRadius);
   s.face.setPosition(p.x,p.y-p.radius*1.05).setScale(p.radius*2/(s.face.height*.5));s.mask.clear().fillStyle(0xffffff,1).fillCircle(p.x,p.y,p.radius-1);}
  const q=geometry.popover;
  this.buttons.forEach((b,k)=>{const x=q.x+k*(q.button.width+q.button.gap);b.hit.setPosition(x,q.y).setSize(q.button.width,q.height).setDisplaySize(q.button.width,q.height);b.hit.input!.hitArea.setTo(0,0,q.button.width,q.height);b.label.setPosition(x+q.button.width/2,q.y+q.height-q.height*.08).setFontSize(Math.round(q.height*.24));});
  const pr=geometry.prompt;this.prompt.chip.setPosition(pr.x+pr.width-pr.cancel,pr.y+pr.height/2).setRadius(pr.cancel);(this.prompt.chip.input!.hitArea as Phaser.Geom.Circle).setTo(pr.cancel,pr.cancel,pr.cancel);
 }
 /** Draws the bar for these heroes (in slot order) and this command state; enabled false dims it and ignores taps (a panel is open, the match is paused). reason: a refused tap's explanation, shown in the prompt. */
 render(heroes:readonly HeroBarHero[],state:HeroCommandState,enabled:boolean,reason?:string){
  const g=this.geometry;const shown=!!g&&heroes.length>0;this.container.setVisible(shown);if(!shown||!g)return;
  const list=heroes.slice(0,HERO_SLOTS),signature=JSON.stringify([list.map(h=>[h.id,Math.ceil(h.hp*40/h.maxHp),h.order]),state.mode,state.selected,enabled,reason]);if(signature===this.signature)return;this.signature=signature;
  const targeting=state.mode==='attack'||state.mode==='defend';
  for(const [i,s] of this.slots.entries()){
   const h=list[i],p=g.slots[i];s.id=h?.id;if(h&&p){s.face.setTexture(h.texture??'guardian');s.face.setScale(p.radius*2/(s.face.height*.5));}const on=!!h&&!!p;[s.art,s.face,s.over].forEach(o=>o.setVisible(on));s.hit.setVisible(on);if(on)s.hit.setInteractive();else s.hit.disableInteractive();if(!on||!h||!p)continue;
   if(!enabled)s.hit.disableInteractive();
   const selected=state.selected===h.id&&state.mode!=='idle',cancel=selected&&targeting,a=s.art.clear(),o=s.over.clear();
   if(selected){a.fillStyle(GOLD,.24).fillCircle(p.x,p.y,p.radius+p.hitRadius*.25);}
   a.fillStyle(INK,.92).fillCircle(p.x,p.y,p.radius);
   o.lineStyle(selected?p.radius*.2:p.radius*.1,selected?GOLD:RIM,selected?1:.8).strokeCircle(p.x,p.y,p.radius);
   const w=p.radius*1.8,bar=p.radius*.3,f=Math.max(0,Math.min(1,h.hp/h.maxHp));o.fillStyle(0x0b1a1f,.9).fillRect(p.x-w/2,p.y+p.radius+bar*.6,w,bar);o.fillStyle(HP,1).fillRect(p.x-w/2,p.y+p.radius+bar*.6,w*f,bar);
   const bx=p.x+p.radius*.78,by=p.y+p.radius*.62,br=p.radius*.42;o.fillStyle(INK,1).fillCircle(bx,by,br);o.lineStyle(Math.max(1,br*.18),RIM,.9).strokeCircle(bx,by,br);drawOrderGlyph(o,h.order,bx,by,br*1.15,orderColor(h.order));
   if(targeting&&!selected||!enabled)o.fillStyle(0x020810,.45).fillCircle(p.x,p.y,p.radius);
   if(cancel){o.fillStyle(0x3a1f22,.72).fillCircle(p.x,p.y,p.radius);const k=p.radius*.42;o.lineStyle(p.radius*.2,0xffe3dc,1).lineBetween(p.x-k,p.y-k,p.x+k,p.y+k).lineBetween(p.x+k,p.y-k,p.x-k,p.y+k);}
  }
  const q=g.popover,menu=state.mode==='menu'&&enabled,current=list.find(h=>h.id===state.selected)?.order;
  this.buttons.forEach((b,k)=>{const [order]=COMMANDS[k],x=q.x+k*(q.button.width+q.button.gap),active=order===current;b.art.clear().setVisible(menu);b.label.setVisible(menu);b.hit.setVisible(menu);if(menu)b.hit.setInteractive();else b.hit.disableInteractive();if(!menu)return;
   b.art.fillStyle(active?0x265460:INK,.95).fillRoundedRect(x,q.y,q.button.width,q.height,q.height*.16).lineStyle(q.height*.04,active?GOLD:RIM,active?1:.7).strokeRoundedRect(x,q.y,q.button.width,q.height,q.height*.16);
   drawOrderGlyph(b.art,order,x+q.button.width/2,q.y+q.height*.4,q.height*.4,orderColor(order));});
  const pr=g.prompt,t=this.prompt,show=targeting&&enabled,type=state.mode==='attack'?'attack':'defend',color=orderColor(type);
  t.art.clear().setVisible(show);t.text.setVisible(show);t.chip.setVisible(show);if(show)t.chip.setInteractive();else t.chip.disableInteractive();if(!show)return;
  const chipLeft=pr.x+pr.width-2*pr.cancel-pr.height*.15,textLeft=pr.x+pr.height*.9,room=chipLeft-textLeft-pr.height*.2;
  const message=reason??(type==='attack'?(g.short?'Tap an enemy':'ATTACK · tap an enemy'):(g.short?'Tap a spot':'DEFEND · tap a spot to hold'));
  t.text.setText(message).setFontSize(Math.round(pr.font)).setColor(reason?'#ffd0c8':'#fff3d3');for(let size=Math.round(pr.font);t.text.width>room&&size>8;size--)t.text.setFontSize(size);
  const boxRight=chipLeft-pr.height*.1;t.art.fillStyle(0x0b1a1f,.9).fillRoundedRect(pr.x,pr.y,boxRight-pr.x,pr.height,pr.height*.2).lineStyle(pr.height*.05,reason?0xffb4a8:color,1).strokeRoundedRect(pr.x,pr.y,boxRight-pr.x,pr.height,pr.height*.2);
  drawOrderGlyph(t.art,type,pr.x+pr.height*.48,pr.y+pr.height/2,pr.height*.5,color);t.text.setPosition(textLeft,pr.y+pr.height/2);
  const cx=pr.x+pr.width-pr.cancel,cy=pr.y+pr.height/2,k=pr.cancel*.42;t.art.fillStyle(0x3a1f22,.95).fillCircle(cx,cy,pr.cancel).lineStyle(pr.cancel*.09,0xffb4a8,1).strokeCircle(cx,cy,pr.cancel).lineStyle(pr.cancel*.14,0xffe3dc,1).lineBetween(cx-k,cy-k,cx+k,cy+k).lineBetween(cx+k,cy-k,cx-k,cy+k);
 }
}
