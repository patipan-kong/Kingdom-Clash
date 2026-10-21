import Phaser from 'phaser';
import type {ObjectiveRow} from '../data/campaignUi';
import {mobileHud} from './mobileHudLayout';
import {gameTransform} from './viewport';
import {drawFantasyPanel,drawFantasyButton,drawDivider,FANTASY_TEXT} from './fantasyTheme';
type View={rows:readonly ObjectiveRow[];selected?:string;summary:string;select:(id:string)=>void;back:()=>void;resume:()=>void};
/** Mobile-only objective details, shown exclusively by the existing Pause flow. */
export class MobileObjectives {
 readonly container:Phaser.GameObjects.Container;readonly buttons:Phaser.GameObjects.Rectangle[]=[];
 private shade:Phaser.GameObjects.Rectangle;private bg:Phaser.GameObjects.Graphics;private list:Phaser.GameObjects.Graphics;private mask:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;private hint:Phaser.GameObjects.Text;private summary:Phaser.GameObjects.Text;
 private body:Phaser.GameObjects.Rectangle;private labels:Phaser.GameObjects.Text[]=[];private statuses:Phaser.GameObjects.Text[]=[];
 private controls:Array<{hit:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;pointer?:number;fn:()=>void}>=[];
 private view?:View;private scroll=0;private total=0;private s=1;private region={x:0,y:0,width:0,height:0};private items:Array<{id:string;y:number;height:number}>=[];
 private gesture?:{id:number;y:number;scroll:number;dragged:boolean};private keys='';
 constructor(private scene:Phaser.Scene){
  this.container=scene.add.container(0,0).setDepth(1100).setVisible(false);this.shade=scene.add.rectangle(0,0,1,1,0x020810,.55).setInteractive();this.container.add(this.shade);this.shade.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.bg=scene.add.graphics();this.list=scene.add.graphics();this.container.add([this.bg,this.list]);
  this.mask=scene.make.graphics({});this.list.setMask(this.mask.createGeometryMask());
  this.title=this.text().setColor(FANTASY_TEXT.gold).setFontStyle('bold');this.hint=this.text().setColor(FANTASY_TEXT.muted);this.summary=this.text().setColor(FANTASY_TEXT.muted);
  this.body=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive();this.container.add(this.body);
  this.body.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(!this.gesture)this.gesture={id:p.id,y:p.y,scroll:this.scroll,dragged:false};});
  this.body.on('wheel',(_p:unknown,_x:number,dy:number)=>{this.scroll=Phaser.Math.Clamp(this.scroll+dy,0,Math.max(0,this.total-this.region.height));if(this.view)this.render(this.view);});
  const move=(p:Phaser.Input.Pointer)=>{const g=this.gesture;if(!g||g.id!==p.id)return;g.dragged ||= Math.abs(p.y-g.y)*this.s>8;if(g.dragged){this.scroll=Phaser.Math.Clamp(g.scroll+g.y-p.y,0,Math.max(0,this.total-this.region.height));if(this.view)this.render(this.view);}};
  const release=(p:Phaser.Input.Pointer)=>{const g=this.gesture;this.gesture=undefined;if(!g||g.id!==p.id||g.dragged||!this.container.visible)return;const r=this.region;if(p.x<r.x||p.x>r.x+r.width||p.y<r.y||p.y>r.y+r.height)return;const item=this.items.find(i=>p.y>=r.y+i.y-this.scroll&&p.y<=r.y+i.y-this.scroll+i.height);if(item&&Math.min(r.height,item.y-this.scroll+item.height)-Math.max(0,item.y-this.scroll)>=48/this.s)this.view?.select(item.id);};
  for(const label of ['Back','Return to combat']){const art=scene.add.graphics(),hit=scene.add.rectangle(0,0,1,1,0,0).setInteractive(),text=this.text().setOrigin(.5).setText(label),c={art,hit,label:text,pointer:undefined as number|undefined,fn:()=>{}};this.controls.push(c);this.buttons.push(hit);this.container.add([art,hit,text]);this.container.bringToTop(text);
   hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();c.pointer=p.id;});hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(c.pointer===p.id){c.pointer=undefined;c.fn();}});
  }
  const cancel=()=>{this.gesture=undefined;this.controls.forEach(c=>c.pointer=undefined);};scene.input.on('pointermove',move);scene.input.on('pointerup',release);scene.input.on('pointerupoutside',cancel);scene.game.events.on('clear-controls',cancel);scene.game.events.on('pause-visual',cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointermove',move);scene.input.off('pointerup',release);scene.input.off('pointerupoutside',cancel);scene.game.events.off('clear-controls',cancel);scene.game.events.off('pause-visual',cancel);this.mask.destroy();});
 }
 private text(){const text=this.scene.add.text(0,0,'',{fontFamily:'Arial, sans-serif',fontSize:'12px',color:FANTASY_TEXT.primary});this.container.add(text);return text;}
 render(view:View){
  const mobile=mobileHud(this.scene);if(!mobile)return;this.view=view;this.s=gameTransform(this.scene.game).scale;const p=(n:number)=>n/this.s,w=Math.min(560,mobile.width-24),h=Math.min(360,mobile.height-16),x=(mobile.width-w)/2,y=(mobile.height-h)/2;
  this.shade.setPosition(this.scene.scale.width/2,270).setSize(this.scene.scale.width,540).setDisplaySize(this.scene.scale.width,540);
  this.container.setVisible(true);const keys=view.rows.map(r=>r.id).join('|');if(keys!==this.keys){this.keys=keys;this.scroll=0;this.gesture=undefined;}
  drawFantasyPanel(this.bg,{x:p(x),y:p(y),width:p(w),height:p(h)},this.s);this.title.setPosition(p(x+16),p(y+10)).setFontSize(p(16)).setText('MISSION OBJECTIVES');
  this.hint.setPosition(p(x+16),p(y+31)).setFontSize(p(11)).setText('Tap an objective to track · '+view.rows.filter(r=>r.complete).length+'/'+view.rows.length+' complete');
  const bodyH=Math.floor((h-144)/64)*64;this.region={x:p(x+12),y:p(y+50),width:p(w-24),height:p(bodyH)};
  const r=this.region;this.body.setPosition(r.x,r.y).setSize(r.width,r.height).setDisplaySize(r.width,r.height);this.mask.clear().fillStyle(0xffffff).fillRect(r.x,r.y,r.width,r.height);
  let top=0;this.items=[];view.rows.forEach((row,i)=>{if(!this.labels[i]){this.labels[i]=this.text().setMask(this.mask.createGeometryMask());this.statuses[i]=this.text().setMask(this.mask.createGeometryMask());}
   const label=this.labels[i];label.setFontSize(p(13)).setWordWrapWidth(r.width-p(28),true).setText(row.label);const height=Math.max(p(64),label.height+p(32));this.items.push({id:row.id,y:top,height});top+=height;
  });this.total=top;this.scroll=Phaser.Math.Clamp(this.scroll,0,Math.max(0,top-r.height));this.list.clear();
  view.rows.forEach((row,i)=>{const item=this.items[i],top=r.y+item.y-this.scroll,selected=row.id===view.selected;
   if(selected)this.list.fillStyle(0x31556a,.55).fillRoundedRect(r.x,top,r.width,item.height-p(4),p(5)).fillStyle(0xd7b66a).fillRect(r.x,top+p(5),p(3),item.height-p(14));
   this.labels[i].setVisible(true).setPosition(r.x+p(12),top+p(6)).setColor(selected?FANTASY_TEXT.gold:FANTASY_TEXT.primary);
   this.statuses[i].setVisible(true).setFontSize(p(11)).setPosition(r.x+p(12),top+item.height-p(25)).setText((selected?'Tracking · ':'')+(row.complete?'Complete':row.state==='locked'?'Locked':'In progress')+' · '+row.progress+'/'+row.target);
   const ratio=Phaser.Math.Clamp(row.progress/Math.max(1,row.target),0,1);this.list.fillStyle(0x294657).fillRect(r.x+p(12),top+item.height-p(8),r.width-p(24),p(2)).fillStyle(row.complete?0x76c5a0:0xd7b66a).fillRect(r.x+p(12),top+item.height-p(8),(r.width-p(24))*ratio,p(2));
  });for(let i=view.rows.length;i<this.labels.length;i++){this.labels[i].setVisible(false);this.statuses[i].setVisible(false);}
  if(top>r.height){const thumb=Math.max(p(16),r.height*r.height/top);this.list.fillStyle(0xd7b66a,.85).fillRoundedRect(r.x+r.width-p(4),r.y+(r.height-thumb)*this.scroll/(top-r.height),p(3),thumb,p(1));}
  this.summary.setPosition(p(x+16),r.y+r.height+p(6)).setFontSize(p(11)).setWordWrapWidth(p(w-32),true).setText(view.summary+(top>r.height?' · Scroll for more':''));
  const footer=p(y+h-56),gap=p(8),bw=(p(w-32)-gap)/2;drawDivider(this.bg,p(x+16),footer-p(6),p(w-32),this.s);
  this.controls.forEach((c,i)=>{const cx=p(x+16)+i*(bw+gap);drawFantasyButton(c.art,cx,footer+p(4),bw,p(40),this.s,i?'primary':'secondary');c.hit.setPosition(cx+bw/2,footer+p(24)).setSize(bw,p(48)).setDisplaySize(bw,p(48));c.label.setPosition(cx+bw/2,footer+p(24)).setFontSize(p(13)).setColor(i?FANTASY_TEXT.ink:FANTASY_TEXT.primary);c.fn=i?view.resume:view.back;});
 }
}
