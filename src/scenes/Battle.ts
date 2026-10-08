import Phaser from 'phaser';
import { entities, GRID, projection, scenery, terrain, VIEW_WORLD, WORLD, viewToWorld, worldToView, type VisualEntity } from '../world/layout';
import { Simulation } from '../simulation/Simulation';
import type { Unit } from '../simulation/GameState';
const BLUE=0x70d7ff, RED=0xff7976;
export class Battle extends Phaser.Scene {
 private visuals=new Map<string,Phaser.GameObjects.Container>();
 private grid!:Phaser.GameObjects.Graphics;
 public simulation=new Simulation();
 public get hero(){return this.simulation.hero;}
 private hpBars=new Map<string,{bar:Phaser.GameObjects.Rectangle;width:number}>();
 private cleanup:Array<()=>void>=[];
 private stick={x:0,y:0};
 private keys?:Record<string,Phaser.Input.Keyboard.Key>;
 public buildingMode=false;
 public placement?:{kind:'wall'|'tower';col:number;row:number};
 private placementArt!:Phaser.GameObjects.Image;
 private placementGrid!:Phaser.GameObjects.Graphics;
 public frozen=false;
 private elapsed=0;
 public castCount=0;
 private lookUntil=0;
 private following=false;
 constructor(){super('Battle');}
 preload(){
  for(const key of ['grass','path','water','bridge','trees','rocks','bush','guardian','minion-blue','minion-red','base-blue','base-red','tower','wall'])this.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.png`);
  this.load.on('loaderror',(f:Phaser.Loader.File)=>{const e=document.getElementById('error')!;e.style.display='block';e.textContent=`Missing asset: ${f.key}`;});
 }
 create(){
  this.stick={x:0,y:0};this.simulation=new Simulation();this.visuals.clear();this.hpBars.clear();this.frozen=false;this.elapsed=0;this.following=false;this.castCount=0;
  this.buildingMode=false;this.placement=undefined;this.createTerrain();
  this.placementArt=this.add.image(0,0,'wall').setOrigin(.5,1).setAlpha(.65).setDepth(2601).setVisible(false);
  this.placementGrid=this.add.graphics().setDepth(2600);
  scenery.forEach(e=>{const p=worldToView(e.x,e.y);const image=this.add.image(p.x,p.y,e.kind).setOrigin(.5,1).setDepth(p.y);image.setScale(e.height/image.height);this.add.ellipse(p.x+12,p.y-2,image.displayWidth*.7,24,0x163e2c,.22).setDepth(p.y-1);});
  this.grid=this.add.graphics().setDepth(2500).setVisible(false);
  entities.filter(e=>!e.kind.startsWith('minion')).forEach(e=>this.makeEntity(e));this.drawGrid();
  this.cameras.main.setBounds(0,0,VIEW_WORLD.width,VIEW_WORLD.height);this.followHero();
  this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
  this.listen('build-pan',(dx:number,dy:number)=>{if(!this.buildingMode)return;this.following=false;this.cameras.main.stopFollow().setScroll(this.cameras.main.scrollX+dx,this.cameras.main.scrollY+dy);});
  this.listen('select-building',()=>{this.placement=undefined;this.placementArt.setVisible(false);this.placementGrid.clear();});
  this.listen('building-mode',(v:boolean)=>{this.buildingMode=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.clearInput();if(!v){this.placement=undefined;this.placementArt.setVisible(false);this.placementGrid.clear();}this.grid.setVisible(v);});
  this.listen('placement',(kind:'wall'|'tower',x:number,y:number)=>{if(!this.buildingMode)return;const p=viewToWorld(x+this.cameras.main.scrollX,y+this.cameras.main.scrollY);this.placement={kind,col:Math.floor(p.x/GRID),row:Math.floor(p.y/GRID)};});
  this.listen('confirm-building',(requestId:string)=>{if(this.buildingMode&&this.placement)this.simulation.send({type:'place',requestId,...this.placement});});
  this.listen('stick',(x:number,y:number)=>{this.stick={x,y};if(x||y)this.followHero();});
  this.listen('grid',(show:boolean)=>this.grid.setVisible(show));
  this.listen('pause-visual',(v:boolean)=>{this.frozen=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.setPaused(v);this.tweens.timeScale=v?0:1;});
  this.listen('time-scale',(v:number)=>this.simulation.setTimeScale(v));
  this.listen('cast',(key:string)=>{if(!this.buildingMode)this.simulation.send(key==='attack'?{type:'attack'}:{type:'preview',key});});
  this.listen('reset-view',()=>this.followHero());
  this.listen('focus-map',(x:number,y:number)=>{const p=worldToView(x,y);this.following=false;this.cameras.main.stopFollow().centerOn(p.x,p.y);this.lookUntil=this.elapsed+2200;});
  this.dom(window,'blur',()=>this.game.events.emit('request-pause'));
  this.dom(document,'visibilitychange',()=>{if(document.hidden)this.game.events.emit('request-pause');});
  this.dom(window,'resize',()=>{if(innerHeight>innerWidth)this.game.events.emit('request-pause');});
  this.events.once('shutdown',()=>{this.simulation.setPaused(true);this.cleanup.splice(0).forEach(f=>f());this.scene.stop('HUD');window.visualReady=false;});
  this.scene.launch('HUD');window.visualReady=true;
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(target:Window|Document,event:string,fn:()=>void){target.addEventListener(event,fn);this.cleanup.push(()=>target.removeEventListener(event,fn));}
 private createTerrain(){
  this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'grass').setOrigin(0).setTileScale(.42,.42).setTint(0xc1d99c);
  let g=this.add.graphics();const t=terrain;
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  rect(0,t.laneTop-24,WORLD.width,t.laneBottom-t.laneTop+48,0xc1b86c,.65);
  rect(0,t.laneTop-10,WORLD.width,t.laneBottom-t.laneTop+20,0xcfc17b,.9);
  rect(0,t.laneTop,WORLD.width,t.laneBottom-t.laneTop,0xd8c28b);
  this.add.tileSprite(0,t.laneTop*projection.y,VIEW_WORLD.width,(t.laneBottom-t.laneTop)*projection.y,'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);
  g=this.add.graphics();
  rect(t.riverLeft-14,0,t.riverRight-t.riverLeft+28,WORLD.height,0x647f66);
  rect(t.riverLeft,0,t.riverRight-t.riverLeft,WORLD.height,0x267f90);
  rect(t.riverLeft+14,0,t.riverRight-t.riverLeft-28,WORLD.height,0x36a7ad);
  this.add.tileSprite(t.riverLeft*projection.x,0,(t.riverRight-t.riverLeft)*projection.x,VIEW_WORLD.height,'water').setOrigin(0).setTileScale(.7,.7);
  g=this.add.graphics();
  // Shore stones and grass fringes soften procedural edges without changing navigation.
  for(let y=0;y<WORLD.height;y+=22){if(y>t.bridgeTop-30&&y<t.bridgeBottom+30)continue;[t.riverLeft,t.riverRight].forEach((x,i)=>{const p=worldToView(x+(Math.sin(y*.13+i)*7),y);g.fillStyle(0x405f55,.65).fillEllipse(p.x+3,p.y+5,23,15);g.fillStyle(y%3?0x8fa294:0xb5bda1).fillEllipse(p.x,p.y,18+y%11,12+y%5);g.fillStyle(0xd0d1b2,.6).fillEllipse(p.x-3,p.y-2,11,5);});}
  for(let x=0;x<WORLD.width;x+=19){[t.laneTop,t.laneBottom].forEach((y,i)=>{const p=worldToView(x,y+(Math.sin(x*.1+i)*5));g.fillStyle(0x70973f,.50).fillEllipse(p.x,p.y,24,9);g.lineStyle(1,0xb1c967,.55).lineBetween(p.x-2,p.y,p.x+2,p.y-5);});}
  for(let i=0;i<160;i++){const x=(i*137.3)%WORLD.width,y=t.laneTop+8+(i*43.7)%(t.laneBottom-t.laneTop-16);if(x>t.riverLeft&&x<t.riverRight)continue;const p=worldToView(x,y);g.fillStyle(i%2?0xedd4a0:0x998353,.24).fillEllipse(p.x,p.y,3+i%5,2+i%3);}
  for(let y=24;y<WORLD.height;y+=45){const p=worldToView(t.riverLeft+30+(y*7)%80,y);g.lineStyle(2,0xb9f2e4,.35).lineBetween(p.x,p.y,p.x+28,p.y);}
  const bp=worldToView((t.riverLeft+t.riverRight)/2,(t.bridgeTop+t.bridgeBottom)/2);
  const bridge=this.add.image(bp.x,bp.y+5,'bridge');bridge.setScale(216/bridge.width);
 }
 public followHero(){this.lookUntil=0;if(this.following)return;this.following=true;this.cameras.main.startFollow(this.visuals.get('guardian')!,false,.14,.14,0,35);}
 public getCameraWorld(){const c=this.cameras.main;const p=viewToWorld(c.scrollX,c.scrollY);return {x:p.x,y:p.y,width:c.width/projection.x,height:c.height/projection.y};}
 // Browser verification helper: validated logical position, never sprite coordinates.
 public setHeroPosition(x:number,y:number){if(!this.simulation.teleportHero(x,y))return false;this.syncUnits();this.followHero();return true;}
 private unitVisual(u:Unit):VisualEntity{return {...entities.find(e=>e.kind===u.kind)!,id:u.id,team:u.team,x:u.x,y:u.y,hp:`${Math.ceil(u.hp)} / ${u.maxHp}`};}
 private makeEntity(e:VisualEntity){
  const p=worldToView(e.x,e.y),h=e.height*1.2;const c=this.add.container(p.x,p.y).setDepth(p.y);
  c.add(this.add.ellipse(7,4,e.width*.9,e.width*.24,0x143629,.28));
  if(e.kind==='guardian')c.add(this.add.ellipse(0,0,76,30,0x59ceff,.13).setStrokeStyle(2,BLUE,.9));
  if(e.kind.startsWith('minion'))c.add(this.add.ellipse(0,1,35,13,e.team==='blue'?BLUE:RED,.1).setStrokeStyle(1,e.team==='blue'?BLUE:RED,.7));
  const art=this.add.image(0,4,e.kind).setOrigin(.5,1);art.setScale(h/art.height).setInteractive({useHandCursor:true});art.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();if(this.buildingMode)return;const u=this.simulation.state.units[e.id]??this.simulation.state.structures[e.id];if(u?.team==='red')this.simulation.send({type:'target',id:e.id});this.game.events.emit('inspect',u?this.unitVisual(u):e);});c.add(art);
  const w=e.kind.startsWith('base')?94:e.kind==='guardian'?66:e.kind==='tower'?54:33;
  c.add(this.add.rectangle(0,-h-8,w+4,7,0x10292d));const bar=this.add.rectangle(-w/2,-h-8,w,4,e.team==='blue'?BLUE:RED).setOrigin(0,.5);c.add(bar);this.hpBars.set(e.id,{bar,width:w});
  c.add(this.add.text(-w/2-14,-h-15,e.team==='blue'?'⬟':'◆',{fontSize:'12px',color:e.team==='blue'?'#a5edff':'#ffaea4'}));
  if(e.kind.startsWith('base'))c.add(this.add.text(0,24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#fff4cd',stroke:'#14352b',strokeThickness:4}).setOrigin(.5));
  this.visuals.set(e.id,c);
 }
 private drawGrid(){
  this.grid.clear().lineStyle(1,0xa2e4dd,.22);
  if(this.buildingMode){for(let col=0;col<40;col++)for(let row=0;row<24;row++){const x=(col+.5)*GRID,y=(row+.5)*GRID;if(Math.hypot(x-330,y-600)<=8*GRID){const p=worldToView(x-24,y-24);this.grid.strokeRect(p.x,p.y,GRID,GRID*projection.y);}}}
  else {for(let x=0;x<=WORLD.width;x+=GRID){const a=worldToView(x,0);this.grid.lineBetween(a.x,0,a.x,VIEW_WORLD.height);}
  for(let y=0;y<=WORLD.height;y+=GRID){const a=worldToView(0,y);this.grid.lineBetween(0,a.y,VIEW_WORLD.width,a.y);}}
  [...entities.filter(e=>e.kind!=='guardian'&&!e.kind.startsWith('minion')),...Object.values({...this.simulation.state.units,...this.simulation.state.structures}).map(u=>this.unitVisual(u))].forEach(e=>{const p=worldToView(e.x,e.y);this.grid.lineStyle(2,e.team==='blue'?BLUE:RED,.9);if('columns'in e.footprint){const w=e.footprint.columns*GRID*projection.x,h=e.footprint.rows*GRID*projection.y;this.grid.strokeRect(p.x-w/2,p.y-h/2,w,h);}else this.grid.strokeEllipse(p.x,p.y,e.footprint.radius*2*projection.x,e.footprint.radius*2*projection.y);});
 }
 private syncUnits(){
  const units={...this.simulation.state.units,...this.simulation.state.structures};
  for(const u of Object.values(units)){
   if(!this.visuals.has(u.id))this.makeEntity(this.unitVisual(u));
   const p=worldToView(u.x,u.y),v=this.visuals.get(u.id)!;
   v.setPosition(p.x,p.y).setDepth(p.y).setVisible(u.hp>0).setAlpha(this.simulation.state.structures[u.id]?.progress??1);
   const hp=this.hpBars.get(u.id)!;hp.bar.width=hp.width*u.hp/u.maxHp;
  }
  for(const [id,v] of this.visuals){if((id.startsWith('red-')||id.startsWith('blue-')||id.startsWith('built-'))&&!units[id]){v.destroy();this.visuals.delete(id);this.hpBars.delete(id);}}
  if(this.grid.visible)this.drawGrid();
 }
 private effect(key:string){if(this.frozen)return;this.castCount++;const p=worldToView(this.hero.x,this.hero.y);const colors:Record<string,number>={bash:0x7cdcff,taunt:0xffc56a,charge:0xb8f4ff,zone:0x86edcc,attack:0xffdd8e};const g=this.add.graphics().setPosition(p.x,p.y).setDepth(p.y+1);g.lineStyle(key==='zone'?4:3,colors[key],.9).strokeEllipse(0,0,key==='zone'?240:110,key==='zone'?140:60);this.tweens.add({targets:g,alpha:0,scaleX:1.7,scaleY:1.7,duration:600,onComplete:()=>g.destroy()});}
 update(_time:number,delta:number){
  if(this.frozen||innerHeight>innerWidth)return;
  this.elapsed+=Math.min(delta,100);if(!this.buildingMode&&this.lookUntil&&this.elapsed>this.lookUntil)this.followHero();
  let dx=this.stick.x,dy=this.stick.y;const k=this.keys;
  if(k){dx+=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0);dy+=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0);}
  if(this.buildingMode){dx=0;dy=0;}
  if(dx||dy)this.followHero();
  this.simulation.send({type:'move',x:dx,y:dy});this.simulation.advance(delta);this.syncUnits();
  if(this.placement){const {kind,col,row}=this.placement,p=worldToView((col+.5)*GRID,(row+.5)*GRID),reason=this.simulation.placementReason(kind,col,row);this.placementArt.setTexture(kind).setDisplaySize(kind==='wall'?47:76,kind==='wall'?60:142).setPosition(p.x,p.y+4).setVisible(true).setTint(reason?0xff7976:0x70ffb0);this.placementGrid.clear().lineStyle(3,reason?RED:0x70ffb0).strokeRect(p.x-24,p.y-24*projection.y,48,48*projection.y);if(kind==='tower')this.placementGrid.lineStyle(1,0x70d7ff,.5).strokeEllipse(p.x,p.y,480,480*projection.y);this.game.events.emit('placement-status',reason||'Valid placement - confirm to build');}
  for(const event of this.simulation.drainEvents()){
   if(event.type==='preview')this.effect(event.key);
   if(event.type==='attack'){
    const u=(this.simulation.state.units[event.id]??this.simulation.state.structures[event.id]);if(u){const p=worldToView(u.x,u.y);const g=this.add.graphics().setPosition(p.x,p.y).setDepth(p.y+1);g.lineStyle(3,u.team==='blue'?0xffdd8e:RED,.9).strokeEllipse(0,0,u.range*2,u.range*1.44);this.tweens.add({targets:g,alpha:0,duration:200,onComplete:()=>g.destroy()});}
   }
   if(event.type==='damage'){const u=(this.simulation.state.units[event.id]??this.simulation.state.structures[event.id]);if(u){const p=worldToView(u.x,u.y);const text=this.add.text(p.x,p.y-80,`-${Math.ceil(event.amount)}`,{fontSize:'18px',color:'#fff3d3',stroke:'#10292d',strokeThickness:3}).setOrigin(.5).setDepth(2600);this.tweens.add({targets:text,y:text.y-28,alpha:0,duration:450,onComplete:()=>text.destroy()});}}
   if(event.type==='death'&&event.id==='guardian'){this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.game.events.emit('clear-controls');}
   this.game.events.emit('simulation-event',event);
  }
 }
}
