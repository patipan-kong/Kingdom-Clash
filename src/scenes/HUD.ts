import Phaser from 'phaser';
import { entities, scenery, terrain, WORLD, type VisualEntity } from '../world/layout';
import { Battle } from './Battle';
import { AbilityButton } from '../ui/AbilityButton';
import { UtilityButton } from '../ui/UtilityButton';
import { guardianStats, previewSeconds } from '../data/combat';
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
 private hpBar!:Phaser.GameObjects.Rectangle;
 private hpText!:Phaser.GameObjects.Text;
 private woodText!:Phaser.GameObjects.Text;
 private ironText!:Phaser.GameObjects.Text;
 private buildControls!:Phaser.GameObjects.Container;
 private buildReason!:Phaser.GameObjects.Text;
 private buildKind?:'wall'|'tower';
 private buildRequest=0;
 private buildHits:Phaser.GameObjects.Rectangle[]=[];
 private footprintButton!:Phaser.GameObjects.Text;
 private panPointer?:{id:number;x:number;y:number};
 private goldText!:Phaser.GameObjects.Text;
 private selectedId?:string;
 private unitDots=new Map<string,Phaser.GameObjects.Arc>();
 private cleanup:Array<()=>void>=[];
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
 private baseText!:Phaser.GameObjects.Text;
 private results!:Phaser.GameObjects.Container;
 private resultTitle!:Phaser.GameObjects.Text;
 private resultDetail!:Phaser.GameObjects.Text;
 private restartHit?:Phaser.GameObjects.Rectangle;
 private restarting=false;
 public controls!:ReturnType<typeof controlLayout>;
 constructor(){super('HUD');}
 preload(){for(const key of ['bash','taunt','charge','zone','attack'])this.load.image(`ability-${key}`,`${import.meta.env.BASE_URL}assets/ability-${key}.png`);for(const key of ['gold','wood','iron','build','shop','army'])this.load.image(`hud-${key}`,`${import.meta.env.BASE_URL}assets/hud-${key}.png`);}
 private text(x:number,y:number,value:string,size=12,color=WHITE,bold=false){return this.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal'});}
 private panel(x:number,y:number,w:number,h:number){const g=this.add.graphics();g.fillStyle(0x06191e,.24).fillRoundedRect(x+1,y+3,w,h,16);g.fillStyle(INK,.93).fillRoundedRect(x,y,w,h,16);g.lineStyle(1,GOLD,.6).strokeRoundedRect(x,y,w,h,16);return g;}
 create(){
  this.restartHit=undefined;this.restarting=false;
  this.stickPointer=null;this.selectedId=undefined;this.paused=false;this.abilities=[];this.utilities=[];this.unitDots.clear();this.buildHits=[];this.buildKind=undefined;this.buildRequest=0;this.utilityMode="";this.elapsed=0;this.gridShown=false;
  this.minimap();
  this.panel(12,12,256,68);this.add.circle(43,44,26,0x24516a).setStrokeStyle(2,GOLD);this.add.image(43,63,'guardian').setOrigin(.5,1).setDisplaySize(52,46);
  this.add.circle(43,44,34,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.game.events.emit('reset-view'));
  this.text(80,20,'GUARDIAN',14,WHITE,true);this.text(252,22,'LV 1',11,'#f4d58e',true).setOrigin(1,0);
  this.add.rectangle(80,46,172,10,0x071f26).setOrigin(0,.5);this.hpBar=this.add.rectangle(80,46,172,8,0x68d8ad).setOrigin(0,.5);this.hpText=this.text(166,46,'1,200 / 1,200',11,'#0c302f',true).setOrigin(.5);
  this.add.rectangle(80,60,172,4,0x395d6e).setOrigin(0,.5);this.add.rectangle(80,60,44,4,0x9dd5ff).setOrigin(0,.5);this.text(166,70,'XP - future phase',10,MUTED).setOrigin(.5);
  this.panel(336,12,288,54);
  this.panel(336,72,288,60);this.baseText=this.text(348,78,'',13,WHITE,true);
  this.text(348,114,'Destroy Crimson Keep · Defend Azure Keep',10,MUTED);
  [['gold','250'],['wood','180'],['iron','30']].forEach(([icon,value],i)=>{
   const art=this.add.image(360+i*94,39,`hud-${icon}`);art.setScale(32/Math.max(art.width,art.height));
   const text=this.text(382+i*94,39,value,18,WHITE,true).setOrigin(0,.5);if(icon==='gold')this.goldText=text;if(icon==='wood')this.woodText=text;if(icon==='iron')this.ironText=text;
  });
  this.pauseButton=new UtilityButton(this,'pause',770,46,24,()=>this.setPause(!this.paused),34);
  this.joystick();
  ['build','shop','army'].forEach(id=>this.utilities.push(new UtilityButton(this,id,0,0,23.45,()=>this.showUtility(id[0].toUpperCase()+id.slice(1)))));
  const definitions=[['bash',0,0,33.5,3.2,'Shield Bash'],['taunt',0,0,33.5,4.2,'Lion’s Challenge'],['charge',0,0,33.5,2.8,'Vanguard Charge'],['zone',0,0,35.5,6,'Guardian Sanctuary'],['attack',0,0,53,.75,'Attack'] ] as const;
  definitions.forEach(([id,x,y,r,duration,name])=>this.abilities.push(new AbilityButton(this,id,x,y,r,id==='attack'?guardianStats.cooldownTicks/30:previewSeconds[id],()=>{this.game.events.emit('cast',id);this.tell(id==='attack'?'Basic attack engaged - nearest enemy':`${name} - visual preview`);})));
  this.attackLabel=this.text(0,0,'ATTACK',11,WHITE,true).setOrigin(.5).setShadow(0,1,'#183c33',3);
  this.layoutControls();this.scale.on('resize',this.layoutControls,this);
  this.events.once('shutdown',()=>this.scale.off('resize',this.layoutControls,this));
  this.inspector=this.text(948,113,'',11,WHITE,true).setOrigin(1,0).setShadow(0,1,'#183c33',3);
  this.toast=this.text(460,395,'',12,WHITE).setOrigin(.5).setBackgroundColor('#173842d9').setPadding(12,7).setVisible(false);
  this.createUtilityPanel();this.createPause();this.createResults();this.restarting=false;
  this.listen('inspect',(e:VisualEntity)=>{this.selectedId=e.id;this.inspector.setText(`${e.name}\n${e.hp} HP`);this.tell(`${e.name} · ${'columns'in e.footprint?`${e.footprint.columns} × ${e.footprint.rows} cells`:`${e.footprint.radius}-unit radius`}`);});
  // Observe after every scene has updated so HUD values match the rendered authoritative tick.
  this.listen(Phaser.Core.Events.POST_STEP,()=>this.observeSimulation());
  this.listen('request-pause',()=>this.setPause(true));
  this.input.keyboard?.on('keydown-SPACE',()=>this.setPause(!this.paused));
  this.listen('simulation-event',(e:{type:string;index?:number})=>{if(e.type==='wave')this.tell(`Enemy wave ${e.index}`);});
  this.listen('simulation-event',(e:{type:string})=>{if(e.type==='match-end')this.showResults();});
  this.events.once('shutdown',()=>this.cleanup.splice(0).forEach(f=>f()));
  if(innerHeight>innerWidth)this.setPause(true);
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 private layoutControls(){
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.controls=controlLayout(scale);
  this.controls.abilities.forEach((p,i)=>this.abilities[i].setLayout(p.x,p.y,p.radius));
  this.controls.utilities.forEach((p,i)=>this.utilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius,scale));
  for(const hit of this.buildHits){hit.setDisplaySize(110,Math.max(68,Math.ceil(48/scale)));hit.setSize(110,Math.max(68,Math.ceil(48/scale)));}
  if(this.restartHit){this.restartHit.setDisplaySize(200,Math.max(70,Math.ceil(48/scale)));this.restartHit.setSize(200,Math.max(70,Math.ceil(48/scale)));}
  this.attackLabel.setPosition(this.controls.attackLabel.x,this.controls.attackLabel.y);
 }
 private minimap(){
  const f=this.mapFrame;this.panel(f.x-4,f.y-4,f.width+8,f.height+8);const g=this.add.graphics();
  const r=(x:number,y:number,w:number,h:number,color:number)=>g.fillStyle(color).fillRect(f.x+x/WORLD.width*f.width,f.y+y/WORLD.height*f.height,w/WORLD.width*f.width,h/WORLD.height*f.height);
  r(0,0,WORLD.width,WORLD.height,0x50815a);r(0,terrain.laneTop,WORLD.width,terrain.laneBottom-terrain.laneTop,0xc8b97e);r(terrain.riverLeft,0,terrain.riverRight-terrain.riverLeft,WORLD.height,0x3ba0ab);r(terrain.riverLeft,terrain.bridgeTop,terrain.riverRight-terrain.riverLeft,terrain.bridgeBottom-terrain.bridgeTop,0xc8c7a7);
  scenery.forEach(p=>{const x=f.x+p.x/WORLD.width*f.width,y=f.y+p.y/WORLD.height*f.height;g.fillStyle(p.kind==='trees'?0x234c3b:0x9ba980).fillCircle(x,y,p.kind==='trees'?3:1.5);});
  entities.filter(e=>!e.kind.startsWith('minion')&&!e.kind.startsWith('base')).forEach(e=>{const x=f.x+e.x/WORLD.width*f.width,y=f.y+e.y/WORLD.height*f.height;const dot=this.add.circle(x,y,e.id==='guardian'?3:1.8,e.team==='blue'?0x83deff:0xff7878);if(e.id==='guardian')this.mapHero=dot.setStrokeStyle(1,0xffffff);});
  this.mapViewport=this.add.graphics();
  this.add.rectangle(f.x+f.width/2,f.y+f.height/2,f.width,f.height,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('focus-map',(p.x-f.x)/f.width*WORLD.width,(p.y-f.y)/f.height*WORLD.height);});
 }
 private joystick(){
  this.add.circle(104,447,61,0x102e36,.48).setStrokeStyle(2,0xc1d5c2,.65);this.add.circle(104,447,46,0x315a60,.2).setStrokeStyle(1,0xb0d3cf,.4);this.knob=this.add.circle(104,447,27,0x264b55,.85).setStrokeStyle(2,0xd4d8b2,.8);
  this.add.circle(104,447,65,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(this.paused||this.utilityMode==='Build'&&this.utilityPanel.visible||this.stickPointer!==null)return;this.stickPointer=p.id;this.moveStick(p);});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.id===this.stickPointer)this.moveStick(p);});
  const release=(p?:Phaser.Input.Pointer)=>{if(!p||p.id===this.stickPointer){this.stickPointer=null;this.knob.setPosition(104,447);this.game.events.emit('stick',0,0);}};
  this.input.on('pointerup',release);this.input.on('pointerupoutside',release);this.listen('pause-visual',()=>release());this.listen('clear-controls',()=>release());this.dom('pointercancel',()=>release());this.dom('touchcancel',()=>release());this.dom('blur',()=>release());
 }
 private moveStick(p:Phaser.Input.Pointer){const dx=p.x-104,dy=p.y-447,len=Math.hypot(dx,dy),scale=Math.min(1,35/Math.max(len,1));this.knob.setPosition(104+dx*scale,447+dy*scale);this.game.events.emit('stick',dx*scale/35,dy*scale/35);}
 private createUtilityPanel(){
  this.utilityPanel=this.add.container(0,0).setDepth(100).setVisible(false);
  const bg=this.panel(286,290,328,224);this.utilityTitle=this.text(307,307,'',16,WHITE,true);this.utilityDetail=this.text(307,337,'',12,MUTED);
  const grid=this.footprintButton=this.text(309,386,'FOOTPRINTS',11,'#c7e7e5',true).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.gridShown=!this.gridShown;this.game.events.emit('grid',this.gridShown);});
  const close=this.add.circle(550,309,17,0x244852).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.closeUtility());const mark=this.text(550,309,'×',22,WHITE).setOrigin(.5);this.buildControls=this.add.container(0,0).setVisible(false);
  const button=(x:number,y:number,label:string,fn:()=>void)=>{y=y===345?371:470;const hit=this.add.rectangle(x,y,110,Math.max(68,Math.ceil(48/(this.game.canvas.getBoundingClientRect().height/540))),0x265460).setStrokeStyle(1,GOLD).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(!this.paused)fn();});const text=this.text(x,y,label,12,WHITE,true).setOrigin(.5);this.buildControls.add([hit,text]);this.buildHits.push(hit);};
  button(352,345,'WALL - 25 W',()=>{this.game.events.emit('select-building');this.buildKind='wall';this.buildReason.setText('Tap a cell in blue territory');});
  button(508,345,'TOWER - 80/10',()=>{this.game.events.emit('select-building');this.buildKind='tower';this.buildReason.setText('Tap a cell in blue territory');});
  button(432,424,'CONFIRM',()=>this.game.events.emit('confirm-building',`ui-${++this.buildRequest}`));
  button(552,424,'CANCEL',()=>this.closeUtility());
  this.buildReason=this.text(307,416,'Select a building',11,MUTED).setWordWrapWidth(260);this.buildControls.add(this.buildReason);
  this.utilityPanel.add(this.buildControls);
  this.listen('placement-status',(reason:string)=>this.buildReason.setText(reason));
  this.listen('simulation-event',(e:{type:string;reason?:string})=>{if(e.type==='built')this.tell('Construction started - resources charged once');if(e.type==='rejected')this.tell(e.reason??'Rejected');});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{if(!objects.length&&!this.paused&&this.utilityPanel.visible&&this.utilityMode==='Build'&&this.buildKind){this.game.events.emit('placement',this.buildKind,p.x,p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.panPointer?.id===p.id&&p.isDown&&!this.paused){this.game.events.emit('build-pan',this.panPointer.x-p.x,this.panPointer.y-p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointerup',()=>{this.panPointer=undefined;});this.listen('clear-controls',()=>{this.panPointer=undefined;});this.dom('pointercancel',()=>{this.panPointer=undefined;});
  const blocker=this.add.rectangle(450,402,328,224,0,0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  this.utilityPanel.add([bg,blocker,this.utilityTitle,this.utilityDetail,grid,close,mark]);this.utilityPanel.bringToTop(this.buildControls);
 }
 private closeUtility(){this.panPointer=undefined;this.utilityPanel.setVisible(false);this.buildKind=undefined;this.game.events.emit('building-mode',false);this.game.events.emit('time-scale',1);}
 private showUtility(mode:string){if(this.paused)return;this.utilityPanel.setVisible(!(this.utilityPanel.visible&&this.utilityMode===mode));this.utilityMode=mode;this.footprintButton.setVisible(mode!=='Build');this.buildKind=undefined;this.buildControls.setVisible(mode==='Build');this.utilityDetail.setVisible(mode!=='Build');this.buildReason.setText('Select Wall or Archer Tower');this.game.events.emit('clear-controls');this.game.events.emit('building-mode',mode==='Build'&&this.utilityPanel.visible);this.game.events.emit('time-scale',this.utilityPanel.visible&&(mode==='Build'||mode==='Shop')?.25:1);this.utilityTitle.setText(`${mode.toUpperCase()}${mode==='Build'?'':' - PREVIEW'}`);this.utilityDetail.setText(mode==='Build'?'Select a building and tap a cell.':mode==='Shop'?'Artifacts arrive in a later phase.\nPurchases are not implemented.':'Allied minions fight automatically.\nArmy commands arrive in a later phase.');}
 private createPause(){
  this.overlay=this.add.container(0,0).setDepth(1000).setVisible(false);const shade=this.add.rectangle(480,270,960,540,0x071d25,.38).setInteractive();const bg=this.panel(330,174,300,170);const title=this.text(480,211,'GAME PAUSED',22,WHITE,true).setOrigin(.5);const sub=this.text(480,248,'Ability buttons disabled · cooldowns frozen',11,MUTED).setOrigin(.5);const resume=this.add.rectangle(480,300,180,52,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerup',()=>this.setPause(false));const label=this.text(480,300,'RESUME',12,WHITE,true).setOrigin(.5);this.overlay.add([shade,bg,title,sub,resume,label]);
 }
 public setPause(v:boolean){if((this.scene.get('Battle') as Battle).simulation.ended||this.restarting)return;if(v)this.closeUtility();this.paused=v;this.overlay.setVisible(v);this.abilities.forEach(a=>a.setDisabled(v));this.utilities.forEach(a=>a.setDisabled(v));this.game.events.emit('pause-visual',v);const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>a.observe(sim.remaining(a.id)));}
 private createResults(){
  this.results=this.add.container(0,0).setDepth(2000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x071d25,.65).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const bg=this.panel(280,144,400,268);this.resultTitle=this.text(480,180,'',28,WHITE,true).setOrigin(.5);
  const caption=this.text(480,212,'MATCH RESULTS',12,MUTED,true).setOrigin(.5);this.resultDetail=this.text(480,262,'',14,WHITE).setOrigin(.5).setAlign('center');
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.restartHit=this.add.rectangle(480,350,200,Math.max(70,Math.ceil(48/scale)),0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true});
  this.restartHit.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation()).on('pointerup',()=>{const b=this.scene.get('Battle') as Battle;if(this.restarting||!b.simulation.ended)return;this.restarting=true;b.simulation.beginRestart();this.game.events.emit('clear-controls');b.scene.restart();});
  const label=this.text(480,350,'RESTART MATCH',15,WHITE,true).setOrigin(.5);
  const rule=this.text(480,396,'If both bases fall together, defeat takes precedence.',10,MUTED).setOrigin(.5);
  this.results.add([shade,bg,this.resultTitle,caption,this.resultDetail,this.restartHit,label,rule]);
 }
 private showResults(){
  const sim=(this.scene.get('Battle') as Battle).simulation,r=sim.state.match.result;if(!r)return;
  this.closeUtility();this.overlay.setVisible(false);this.paused=true;this.game.events.emit('pause-visual',true);this.results.setVisible(true);
  this.resultTitle.setText(r.outcome==='victory'?'VICTORY':'DEFEAT');this.resultTitle.setColor(r.outcome==='victory'?'#8cebd1':'#ffaea4');
  const seconds=Math.floor(r.tick/30);this.resultDetail.setText(`Time ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · Enemies defeated ${r.kills}\nAzure Keep ${Math.ceil(r.alliedHp)} / 3000\nCrimson Keep ${Math.ceil(r.enemyHp)} / 3000`);
  this.abilities.forEach(a=>a.setDisabled(true));this.utilities.forEach(a=>a.setDisabled(true));this.toast.setVisible(false);
 }
 private tell(message:string){this.toast.setText(message).setVisible(true);this.toastUntil=this.elapsed+2500;}
 update(_time:number,delta:number){
  if(!this.paused)this.elapsed+=Math.min(delta,100);
 }
 private observeSimulation(){
  const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>{a.setDisabled(this.paused||sim.hero.hp<=0||this.utilityMode==='Build'&&this.utilityPanel.visible,this.paused?'PAUSED':sim.hero.hp<=0?'DEAD':'BUILD');a.observe(sim.remaining(a.id));});this.hpBar.width=172*sim.hero.hp/sim.hero.maxHp;this.hpText.setText(sim.hero.hp>0?`${Math.ceil(sim.hero.hp)} / ${sim.hero.maxHp}`:`Respawn ${Math.ceil(((sim.hero.respawnTick??sim.clock.tick)-sim.clock.tick)/30)}s`);this.goldText.setText(`${Math.floor(sim.state.gold)}`);this.woodText.setText(`${Math.floor(sim.state.wood)}`);this.ironText.setText(`${Math.floor(sim.state.iron)}`);
  this.baseText.setText(`⬟ Azure Keep ${Math.ceil(sim.state.bases['blue-base'].hp)} / ${sim.state.bases['blue-base'].maxHp}\n◆ Crimson Keep ${Math.ceil(sim.state.bases['red-base'].hp)} / ${sim.state.bases['red-base'].maxHp}`);
  if(this.selectedId){const u=sim.state.units[this.selectedId]??sim.state.structures[this.selectedId]??sim.state.bases[this.selectedId];if(u)this.inspector.setText(`${u.kind.startsWith('base')?(u.team==='blue'?'Azure Keep':'Crimson Keep'):u.kind==='guardian'?'Guardian':u.kind==='wall'?'Wooden Wall':u.kind==='tower'?'Archer Tower':u.team==='blue'?'Azure Vanguard':'Crimson Raider'}\n${Math.ceil(u.hp)} / ${u.maxHp} HP`);else if(this.selectedId.startsWith('red-')||this.selectedId.startsWith('blue-')||this.selectedId.startsWith('built-'))this.inspector.setText(this.selectedId.startsWith('built-')?'Structure destroyed':'Minion - defeated');}
  for(const u of Object.values({...sim.state.units,...sim.state.structures,...sim.state.bases})){if(u.kind==='guardian')continue;let dot=this.unitDots.get(u.id);if(!dot){dot=this.add.circle(0,0,u.kind.startsWith('base')?4:1.8,u.team==='blue'?0x83deff:0xff7878);this.unitDots.set(u.id,dot);}dot.setVisible(u.hp>0).setPosition(this.mapFrame.x+u.x/WORLD.width*this.mapFrame.width,this.mapFrame.y+u.y/WORLD.height*this.mapFrame.height);}
  for(const [id,dot] of this.unitDots)if(!sim.state.units[id]&&!sim.state.structures[id]&&!sim.state.bases[id]){dot.destroy();this.unitDots.delete(id);}if(this.toast.visible&&this.elapsed>this.toastUntil)this.toast.setVisible(false);
  const battle=this.scene.get('Battle') as Battle,f=this.mapFrame,h=battle.hero,c=battle.getCameraWorld();this.mapHero.setPosition(f.x+h.x/WORLD.width*f.width,f.y+h.y/WORLD.height*f.height);
  this.mapViewport.clear().lineStyle(1,0xffe8b4,.9).strokeRect(f.x+c.x/WORLD.width*f.width,f.y+c.y/WORLD.height*f.height,c.width/WORLD.width*f.width,c.height/WORLD.height*f.height);
 }
}
