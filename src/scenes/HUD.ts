import Phaser from 'phaser';
import { entities, scenery, terrain, WORLD, type VisualEntity } from '../world/layout';
import { Battle } from './Battle';
import { AbilityButton } from '../ui/AbilityButton';
import { UtilityButton } from '../ui/UtilityButton';
import { controlLayout } from '../ui/controlLayout';
const INK=0x122d35,GOLD=0xdcbf7a,WHITE='#fff3d3',MUTED='#b5d0ce';
export class HUD extends Phaser.Scene {
 public paused=false;
 public abilities:AbilityButton[]=[];
 public utilities:UtilityButton[]=[];
 public pauseButton!:UtilityButton;
 public mapHero!:Phaser.GameObjects.Arc;
 public mapViewport!:Phaser.GameObjects.Graphics;
 public mapFrame={x:812,y:16,width:136,height:82};
 private toast!:Phaser.GameObjects.Text;
 private toastUntil=0;
 private elapsed=0;
 private overlay!:Phaser.GameObjects.Container;
 private knob!:Phaser.GameObjects.Arc;
 private stickPointer:number|null=null;
 private utilityPanel!:Phaser.GameObjects.Container;
 private utilityTitle!:Phaser.GameObjects.Text;
 private utilityDetail!:Phaser.GameObjects.Text;
 private utilityMode='';
 private gridShown=false;
 private inspector!:Phaser.GameObjects.Text;
 private attackLabel!:Phaser.GameObjects.Text;
 public controls!:ReturnType<typeof controlLayout>;
 constructor(){super('HUD');}
 preload(){for(const key of ['bash','taunt','charge','zone','attack'])this.load.image(`ability-${key}`,`${import.meta.env.BASE_URL}assets/ability-${key}.png`);for(const key of ['gold','wood','iron','build','shop','army'])this.load.image(`hud-${key}`,`${import.meta.env.BASE_URL}assets/hud-${key}.png`);}
 private text(x:number,y:number,value:string,size=12,color=WHITE,bold=false){return this.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal'});}
 private panel(x:number,y:number,w:number,h:number){const g=this.add.graphics();g.fillStyle(0x06191e,.24).fillRoundedRect(x+1,y+3,w,h,16);g.fillStyle(INK,.93).fillRoundedRect(x,y,w,h,16);g.lineStyle(1,GOLD,.6).strokeRoundedRect(x,y,w,h,16);return g;}
 create(){
  this.minimap();
  this.panel(12,12,256,68);this.add.circle(43,44,26,0x24516a).setStrokeStyle(2,GOLD);this.add.image(43,63,'guardian').setOrigin(.5,1).setDisplaySize(52,46);
  this.add.circle(43,44,34,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.game.events.emit('reset-view'));
  this.text(80,20,'GUARDIAN',14,WHITE,true);this.text(252,22,'LV 1',11,'#f4d58e',true).setOrigin(1,0);
  this.add.rectangle(80,46,172,10,0x071f26).setOrigin(0,.5);this.add.rectangle(80,46,172,8,0x68d8ad).setOrigin(0,.5);this.text(166,46,'1,200 / 1,200',11,'#0c302f',true).setOrigin(.5);
  this.add.rectangle(80,60,172,4,0x395d6e).setOrigin(0,.5);this.add.rectangle(80,60,44,4,0x9dd5ff).setOrigin(0,.5);this.text(166,70,'XP 20 / 80',10,MUTED).setOrigin(.5);
  this.panel(336,12,288,54);
  [['gold','250'],['wood','180'],['iron','30']].forEach(([icon,value],i)=>{
   const art=this.add.image(360+i*94,39,`hud-${icon}`);art.setScale(32/Math.max(art.width,art.height));
   this.text(382+i*94,39,value,18,WHITE,true).setOrigin(0,.5);
  });
  this.pauseButton=new UtilityButton(this,'pause',770,46,24,()=>this.setPause(!this.paused),34);
  this.joystick();
  ['build','shop','army'].forEach(id=>this.utilities.push(new UtilityButton(this,id,0,0,23.45,()=>this.showUtility(id[0].toUpperCase()+id.slice(1)))));
  const definitions=[['bash',0,0,33.5,3.2,'Shield Bash'],['taunt',0,0,33.5,4.2,'Lion’s Challenge'],['charge',0,0,33.5,2.8,'Vanguard Charge'],['zone',0,0,35.5,6,'Guardian Sanctuary'],['attack',0,0,53,.75,'Attack'] ] as const;
  definitions.forEach(([id,x,y,r,duration,name])=>this.abilities.push(new AbilityButton(this,id,x,y,r,duration,()=>{this.game.events.emit('cast',id);this.tell(`${name} · visual preview`);})));
  this.attackLabel=this.text(0,0,'ATTACK',11,WHITE,true).setOrigin(.5).setShadow(0,1,'#183c33',3);
  this.layoutControls();this.scale.on('resize',this.layoutControls,this);
  this.events.once('shutdown',()=>this.scale.off('resize',this.layoutControls,this));
  this.inspector=this.text(948,113,'',11,WHITE,true).setOrigin(1,0).setShadow(0,1,'#183c33',3);
  this.toast=this.text(460,395,'',12,WHITE).setOrigin(.5).setBackgroundColor('#173842d9').setPadding(12,7).setVisible(false);
  this.createUtilityPanel();this.createPause();
  this.game.events.on('inspect',(e:VisualEntity)=>{this.inspector.setText(`${e.name}\n${e.hp} HP`);this.tell(`${e.name} · ${'columns'in e.footprint?`${e.footprint.columns} × ${e.footprint.rows} cells`:`${e.footprint.radius}-unit radius`}`);});
  this.game.events.on('request-pause',()=>this.setPause(true));
  this.input.keyboard?.on('keydown-SPACE',()=>this.setPause(!this.paused));
 }
 private layoutControls(){
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.controls=controlLayout(scale);
  this.controls.abilities.forEach((p,i)=>this.abilities[i].setLayout(p.x,p.y,p.radius));
  this.controls.utilities.forEach((p,i)=>this.utilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius,scale));
  this.attackLabel.setPosition(this.controls.attackLabel.x,this.controls.attackLabel.y);
 }
 private minimap(){
  const f=this.mapFrame;this.panel(f.x-4,f.y-4,f.width+8,f.height+8);const g=this.add.graphics();
  const r=(x:number,y:number,w:number,h:number,color:number)=>g.fillStyle(color).fillRect(f.x+x/WORLD.width*f.width,f.y+y/WORLD.height*f.height,w/WORLD.width*f.width,h/WORLD.height*f.height);
  r(0,0,WORLD.width,WORLD.height,0x50815a);r(0,terrain.laneTop,WORLD.width,terrain.laneBottom-terrain.laneTop,0xc8b97e);r(terrain.riverLeft,0,terrain.riverRight-terrain.riverLeft,WORLD.height,0x3ba0ab);r(terrain.riverLeft,terrain.bridgeTop,terrain.riverRight-terrain.riverLeft,terrain.bridgeBottom-terrain.bridgeTop,0xc8c7a7);
  scenery.forEach(p=>{const x=f.x+p.x/WORLD.width*f.width,y=f.y+p.y/WORLD.height*f.height;g.fillStyle(p.kind==='trees'?0x234c3b:0x9ba980).fillCircle(x,y,p.kind==='trees'?3:1.5);});
  entities.forEach(e=>{const x=f.x+e.x/WORLD.width*f.width,y=f.y+e.y/WORLD.height*f.height;const dot=this.add.circle(x,y,e.kind.startsWith('base')?4:e.id==='guardian'?3:1.8,e.team==='blue'?0x83deff:0xff7878);if(e.id==='guardian')this.mapHero=dot.setStrokeStyle(1,0xffffff);});
  this.mapViewport=this.add.graphics();
  this.add.rectangle(f.x+f.width/2,f.y+f.height/2,f.width,f.height,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('focus-map',(p.x-f.x)/f.width*WORLD.width,(p.y-f.y)/f.height*WORLD.height);});
 }
 private joystick(){
  this.add.circle(104,447,61,0x102e36,.48).setStrokeStyle(2,0xc1d5c2,.65);this.add.circle(104,447,46,0x315a60,.2).setStrokeStyle(1,0xb0d3cf,.4);this.knob=this.add.circle(104,447,27,0x264b55,.85).setStrokeStyle(2,0xd4d8b2,.8);
  this.add.circle(104,447,65,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(this.paused||this.stickPointer!==null)return;this.stickPointer=p.id;this.moveStick(p);});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.id===this.stickPointer)this.moveStick(p);});
  const release=(p?:Phaser.Input.Pointer)=>{if(!p||p.id===this.stickPointer){this.stickPointer=null;this.knob.setPosition(104,447);this.game.events.emit('stick',0,0);}};
  this.input.on('pointerup',release);this.input.on('pointerupoutside',release);this.game.events.on('pause-visual',()=>release());window.addEventListener('pointercancel',()=>release());window.addEventListener('touchcancel',()=>release());window.addEventListener('blur',()=>release());
 }
 private moveStick(p:Phaser.Input.Pointer){const dx=p.x-104,dy=p.y-447,len=Math.hypot(dx,dy),scale=Math.min(1,35/Math.max(len,1));this.knob.setPosition(104+dx*scale,447+dy*scale);this.game.events.emit('stick',dx*scale/35,dy*scale/35);}
 private createUtilityPanel(){
  this.utilityPanel=this.add.container(0,0).setDepth(100).setVisible(false);
  const bg=this.panel(286,290,288,126);this.utilityTitle=this.text(307,307,'',16,WHITE,true);this.utilityDetail=this.text(307,337,'',12,MUTED);
  const grid=this.text(309,386,'FOOTPRINTS',11,'#c7e7e5',true).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.gridShown=!this.gridShown;this.game.events.emit('grid',this.gridShown);});
  const close=this.add.circle(550,309,17,0x244852).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.utilityPanel.setVisible(false));const mark=this.text(550,309,'×',22,WHITE).setOrigin(.5);this.utilityPanel.add([bg,this.utilityTitle,this.utilityDetail,grid,close,mark]);
 }
 private showUtility(mode:string){if(this.paused)return;this.utilityPanel.setVisible(!(this.utilityPanel.visible&&this.utilityMode===mode));this.utilityMode=mode;this.utilityTitle.setText(`${mode.toUpperCase()} · PREVIEW`);this.utilityDetail.setText(mode==='Build'?'Archer Tower · Wooden Wall\nPlacement is not implemented.':mode==='Shop'?'Artifacts unlock after visual review.\nPurchases are disabled in this prototype.':'3 Azure Vanguard · 3 Crimson Raiders\nArmy commands are presentation only.');}
 private createPause(){
  this.overlay=this.add.container(0,0).setDepth(1000).setVisible(false);const shade=this.add.rectangle(480,270,960,540,0x071d25,.38).setInteractive();const bg=this.panel(330,174,300,170);const title=this.text(480,211,'PREVIEW PAUSED',22,WHITE,true).setOrigin(.5);const sub=this.text(480,248,'Ability buttons disabled · cooldowns frozen',11,MUTED).setOrigin(.5);const resume=this.add.rectangle(480,300,180,52,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerup',()=>this.setPause(false));const label=this.text(480,300,'RESUME',12,WHITE,true).setOrigin(.5);this.overlay.add([shade,bg,title,sub,resume,label]);
 }
 public setPause(v:boolean){this.paused=v;this.overlay.setVisible(v);this.abilities.forEach(a=>a.setDisabled(v));this.utilities.forEach(a=>a.setDisabled(v));this.game.events.emit('pause-visual',v);}
 private tell(message:string){this.toast.setText(message).setVisible(true);this.toastUntil=this.elapsed+2500;}
 update(_time:number,delta:number){
  if(!this.paused)this.elapsed+=Math.min(delta,100);this.abilities.forEach(a=>a.update(delta,this.paused));if(this.toast.visible&&this.elapsed>this.toastUntil)this.toast.setVisible(false);
  const battle=this.scene.get('Battle') as Battle,f=this.mapFrame,h=battle.hero,c=battle.getCameraWorld();this.mapHero.setPosition(f.x+h.x/WORLD.width*f.width,f.y+h.y/WORLD.height*f.height);
  this.mapViewport.clear().lineStyle(1,0xffe8b4,.9).strokeRect(f.x+c.x/WORLD.width*f.width,f.y+c.y/WORLD.height*f.height,c.width/WORLD.width*f.width,c.height/WORLD.height*f.height);
 }
}
