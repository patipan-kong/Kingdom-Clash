import {gameTransform} from '../ui/viewport';
import Phaser from 'phaser';
export class AbilityButton {
 public remaining=0;
 private rank=0;private rankLabel:Phaser.GameObjects.Text;
 public disabled=false;
 private disabledReason="PAUSED";
 public pressed=false;
 public casts=0;
 private base:Phaser.GameObjects.Arc;
 private image:Phaser.GameObjects.Image;
 private state:Phaser.GameObjects.Graphics;
 private number:Phaser.GameObjects.Text;
 private badge:Phaser.GameObjects.Text;
 private activePointer:number|null=null;
 private start={x:0,y:0};private dragged=false;
 private nameLabel:Phaser.GameObjects.Text;
 public presentationState='ready';
 private art:Phaser.GameObjects.Container;
 private mask:Phaser.GameObjects.Graphics;
 private hit:Phaser.GameObjects.Arc;
 public hitRadius:number;
 public get visibleRadius(){return this.radius*this.art.scaleX;}
 private cleanup:Array<()=>void>=[];
 private onWindow(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 constructor(private scene:Phaser.Scene,public id:string,public x:number,public y:number,public radius:number,public duration:number,private activate:(gesture?:{x:number;y:number;dragged:boolean;startX:number;startY:number})=>void,private aim?:(p?:Phaser.Input.Pointer,dragged?:boolean,start?:{x:number;y:number})=>void){
  this.hitRadius=radius;
  this.art=scene.add.container(x,y);
  const shadow=scene.add.circle(1,4,radius+3,0x071c23,.55);
  this.base=scene.add.circle(0,0,radius,0x132e3b).setStrokeStyle(3,0xcab879);
  this.image=scene.add.image(0,0,`ability-${id}`).setDisplaySize(radius*1.85,radius*1.85);
  this.mask=scene.make.graphics({x,y}).fillCircle(0,0,radius-3);
  this.image.setMask(this.mask.createGeometryMask());
  const rim=scene.add.circle(0,0,radius-2).setStrokeStyle(1,0xffe8b0,.6);
  this.state=scene.add.graphics();
  this.number=scene.add.text(0,0,'',{fontSize:'22px',fontStyle:'bold',color:'#fff4dc',stroke:'#102431',strokeThickness:4}).setOrigin(.5);
  this.badge=scene.add.text(0,0,'',{fontSize:id==='attack'?'18px':'17px',fontStyle:'bold',color:'#d6dedc',stroke:'#102431',strokeThickness:3}).setOrigin(.5);
  const names:Record<string,string>={bash:'Bash',taunt:'Taunt',charge:'Charge',zone:'Protect'};
  this.nameLabel=scene.add.text(x,y+radius+4,names[id]??'',{fontSize:'16px',backgroundColor:'#122d35ee',padding:{x:3,y:1},fontStyle:'bold',color:'#fff3d3',stroke:'#102431',strokeThickness:3}).setOrigin(.5,0);
  this.rankLabel=scene.add.text(this.radius*.62,-this.radius*.62,'',{fontSize:'12px',fontStyle:'bold',color:'#f0d797',backgroundColor:'#10283b',padding:{x:2,y:0}}).setOrigin(.5).setVisible(false);
  this.art.add([shadow,this.base,this.image,rim,this.state,this.number,this.badge,this.rankLabel]);
  const hit=this.hit=scene.add.circle(x,y,radius,0xffffff,0).setInteractive({hitArea:new Phaser.Geom.Circle(radius,radius,radius),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true});
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(this.disabled||this.remaining>0||this.activePointer!==null)return;this.start={x:p.x,y:p.y};this.dragged=false;this.activePointer=p.id;this.aim?.(p,false,this.start);this.pressed=true;this.paint();});
  scene.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.id!==this.activePointer)return;this.dragged ||= Math.hypot(p.x-this.start.x,p.y-this.start.y)>(window.kingdomViewport?.mobile?12/gameTransform(this.scene.game).scale:12);this.aim?.(p,this.dragged,this.start);});
  scene.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(p.id!==this.activePointer)return;const inside=Math.hypot(p.x-this.x,p.y-this.y)<=this.hitRadius;const gesture={x:p.x,y:p.y,dragged:this.dragged,startX:this.start.x,startY:this.start.y};const allowed=inside||!!this.aim&&this.dragged;this.release();if(allowed&&!this.disabled&&this.remaining<=0){this.casts++;this.activate(gesture);this.paint();}});
  scene.input.on('pointerupoutside',(p:Phaser.Input.Pointer)=>{if(p.id===this.activePointer)this.release();});
  const pause=()=>this.release();scene.game.events.on('pause-visual',pause);this.cleanup.push(()=>scene.game.events.off('pause-visual',pause));scene.game.events.on('clear-controls',pause);this.cleanup.push(()=>scene.game.events.off('clear-controls',pause));
  scene.events.once('shutdown',()=>this.cleanup.splice(0).forEach(f=>f()));
  this.onWindow('pointercancel',()=>this.release());
  this.onWindow('touchcancel',()=>this.release());
  this.onWindow('blur',()=>this.release());
 }
 public setLayout(x:number,y:number,radius:number){
  this.release();this.art.setPosition(x,y).setScale(radius/this.radius);this.mask.setPosition(x,y).setScale(radius/this.radius);
  const scale=gameTransform(this.scene.game).scale;
  this.nameLabel.setFontSize(Math.ceil(12/scale)).setPadding(3/scale,1/scale).setPosition(x,y+radius+4/scale);
  if(window.kingdomViewport?.mobile){this.nameLabel.setOrigin(.5,1).setPadding(0).setPosition(x,y+radius-2/scale);this.badge.setFontSize(12/(radius/this.radius*scale));this.number.setFontSize(18/(radius/this.radius*scale));}
  this.x=x;this.y=y;this.hitRadius=radius;this.hit.setPosition(x,y).setRadius(radius);
  (this.hit.input!.hitArea as Phaser.Geom.Circle).setTo(radius,radius,radius);
 }
 public setVisible(value:boolean){this.art.setVisible(value);this.hit.setVisible(value);this.nameLabel.setVisible(value);if(!value)this.release();}
 public release(){if(this.activePointer!==null)this.aim?.();this.activePointer=null;this.pressed=false;this.paint();}
 public setDisabled(value:boolean,reason="PAUSED"){this.disabledReason=reason;this.disabled=value;if(value)this.release();this.paint();}
 public setRank(rank:number){this.rank=rank;}
 public observe(remaining:number){this.remaining=remaining;this.paint();}
 private paint(){
  this.state.clear();this.base.setStrokeStyle(this.pressed?4:3,this.pressed?0xffeeac:0xcab879);
  this.image.setScale((this.radius*1.85/this.image.width)*(this.pressed?.92:1));
  this.image.setTint(this.disabled?0x77868c:this.remaining>0?0x80969f:0xffffff);
  this.presentationState=this.disabled?this.disabledReason:this.remaining>0?'cooldown':'ready';
  this.number.setText(this.remaining>0&&(this.id!=='attack'||!this.disabled)?`${Math.ceil(this.remaining)}`:'');
  // A single centered status preserves the cooldown under temporary restrictions.
  const mobile=!!window.kingdomViewport?.mobile,locked=this.disabledReason==='Learn'||this.disabledReason==='LV6';
  this.badge.setText(this.disabled&&(this.id==='attack'||this.remaining<=0)?mobile&&locked?(this.disabledReason==='LV6'?'L6':'—'):this.disabledReason:'').setPosition(mobile&&locked?this.radius*.62:0,mobile&&locked?-this.radius*.62:0);
  this.rankLabel.setVisible(mobile&&this.id!=='attack'&&this.rank>0).setText(String(this.rank)).setFontSize(10/(this.art.scaleX*gameTransform(this.scene.game).scale));
  if(mobile)this.badge.setBackgroundColor(locked?'#10283b':'').setPadding(locked?2:0).setColor(locked?'#f0d797':'#d6dedc');
  if(this.remaining>0){this.state.fillStyle(0x091c2b,.48).slice(0,0,this.radius-3,-Math.PI/2,-Math.PI/2+Math.PI*2*this.remaining/this.duration,false).fillPath();this.state.lineStyle(3,0x82e0ef,.9).arc(0,0,this.radius+1,-Math.PI/2,-Math.PI/2+Math.PI*2*this.remaining/this.duration).strokePath();}
  if(this.pressed)this.state.lineStyle(3,0xffe4a4,.8).strokeCircle(0,0,this.radius+3);
 }
}
