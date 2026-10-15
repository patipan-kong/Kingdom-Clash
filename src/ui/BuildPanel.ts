import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import type {GameEvent} from '../simulation/GameState';
import type {BuildingKind} from '../data/buildings';
import {buildLayout} from './buildLayout';
import {BuildModel,type BuildPlacement} from './buildModel';
const GOLD=0xdcbf7a,WHITE='#fff3d3',MUTED='#bdd0da',INK=0x102536;
export class BuildPanel {
 readonly model=new BuildModel();readonly container:Phaser.GameObjects.Container;
 readonly hits:Phaser.GameObjects.Rectangle[]=[];readonly labels:Phaser.GameObjects.Text[]=[];
 readonly status:Phaser.GameObjects.Text;readonly heading:Phaser.GameObjects.Text;
 readonly images:Phaser.GameObjects.Image[]=[];readonly purposes:Phaser.GameObjects.Text[]=[];
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;private resources:Phaser.GameObjects.Text;
 private actionLabels:Phaser.GameObjects.Text[]=[];private pointers:(number|null)[]=[null,null,null,null];
 private scale=1;private top=0;private utilityX=0;
 bounds={x:0,y:0,width:0,height:0};
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,private placement:()=>BuildPlacement|undefined,private select:(kind:BuildingKind)=>void,private clearPreview:()=>void,private confirm:(id:string)=>void,private close:()=>void){
  this.container=scene.add.container(0,0).setVisible(false);this.bg=scene.add.graphics();
  this.blocker=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.container.add([this.bg,this.blocker]);
  this.heading=this.text('Build',16,true);this.resources=this.text('',12);this.status=this.text('',12);
  for(const [i,kind] of (['wall','tower'] as const).entries()){
   this.button(i,()=>{if(this.model.choose(kind)){this.select(kind);this.render();}});
   const image=scene.add.image(0,0,kind).setOrigin(.5,0);this.images.push(image);this.container.add(image);
   this.labels.push(this.text('',12,true));this.purposes.push(this.text(kind==='wall'?'Blocks paths':'Ranged defense',12).setColor(MUTED));
  }
  this.button(2,()=>{const id=this.model.request(this.sim(),this.placement(),performance.now());if(id)this.confirm(id);});
  this.button(3,close);
  const release=(pointer?:Phaser.Input.Pointer)=>{this.pointers=this.pointers.map(id=>!pointer||id===pointer.id?null:id);};
  scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);const cancel=()=>release();
  for(const name of ['pointercancel','touchcancel','blur'])window.addEventListener(name,cancel);
  scene.game.events.on('clear-controls',cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);scene.game.events.off('clear-controls',cancel);for(const name of ['pointercancel','touchcancel','blur'])window.removeEventListener(name,cancel);});
 }
 private text(value:string,size:number,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(index:number,action:()=>void){
  const hit=this.scene.add.rectangle(0,0,1,1,INK).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true});this.hits[index]=hit;this.container.add(hit);
  const label=this.text('',12,true).setOrigin(.5);this.actionLabels[index]=label;
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled&&this.pointers[index]===null)this.pointers[index]=p.id;});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const activate=this.pointers[index]===p.id&&hit.input?.enabled;this.pointers[index]=null;if(activate){action();this.render();}});
 }
 open(){this.model.reset();this.container.setVisible(true);this.render();}
 hide(){this.model.reset();this.pointers.fill(null);this.container.setVisible(false);}
 locationChanged(){if(!this.model.pending){this.model.message='';this.model.started=undefined;}}
 observe(event:GameEvent){if(this.model.observe(event))this.clearPreview();}
 layout(scale:number,top:number,utilityX:number){this.scale=scale;this.top=top;this.utilityX=utilityX;this.pointers.fill(null);this.render();}
 render(){
  if(!this.container.visible||!this.utilityX)return;
  const sim=this.sim();if(this.model.sync(sim))this.clearPreview();
  const f=buildLayout(this.scale,this.top,this.utilityX,this.model.collapsed),p=(n:number)=>n/this.scale;
  const changed=['x','y','width','height'].some(k=>this.bounds[k as keyof typeof this.bounds]!==f[k as keyof typeof f]);this.bounds={x:f.x,y:f.y,width:f.width,height:f.height};
  if(changed)this.scene.game.events.emit('shop-obstruction',this.bounds);
  this.bg.clear().fillStyle(0x061019,.3).fillRoundedRect(f.x,f.y+p(3),f.width,f.height,p(8)).fillStyle(INK,.97).fillRoundedRect(f.x,f.y,f.width,f.height,p(8)).lineStyle(p(1),GOLD,.8).strokeRoundedRect(f.x,f.y,f.width,f.height,p(8));
  this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  const left=f.x+p(8),inner=f.width-p(16),cardWidth=(inner-p(8))/2,pending=!!this.model.pending;
  this.heading.setPosition(left,f.y+p(8)).setFontSize(p(16));
  this.resources.setPosition(f.x+f.width-p(8),f.y+p(10)).setOrigin(1,0).setFontSize(p(12)).setText(`${Math.floor(sim.state.wood)} W · ${Math.floor(sim.state.iron)} I`);
  const setHit=(i:number,x:number,y:number,w:number,h:number,enabled:boolean,primary=false)=>{const hit=this.hits[i];hit.setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setFillStyle(!enabled?0x142c34:this.pointers[i]!==null?0x35688b:primary?GOLD:0x19384c).setStrokeStyle(p(1),GOLD);hit.input!.enabled=enabled;this.actionLabels[i].setPosition(x+w/2,y+h/2).setFontSize(p(12)).setColor(enabled?(primary?'#102536':WHITE):MUTED).setVisible(i>=2);};
  for(const [i,kind] of (['wall','tower'] as const).entries()){
   const x=left+i*(cardWidth+p(8)),q=sim.constructionQuote(kind),selected=this.model.kind===kind;
   setHit(i,x,f.cardY,cardWidth,f.cardHeight,!pending);this.hits[i].setFillStyle(this.pointers[i]!==null?0x35688b:selected?0x234e78:q.available?0x19384c:0x142c34).setStrokeStyle(p(selected?2:1),selected?GOLD:0x66818c);
   const size=this.model.collapsed?32:40,image=this.images[i],factor=p(size)/Math.max(image.width,image.height);
   image.setScale(factor).setPosition(this.model.collapsed?x+p(20):x+cardWidth/2,f.cardY+p(this.model.collapsed?8:2)).setAlpha(pending?.5:q.available?1:.65);
   this.labels[i].setPosition(this.model.collapsed?x+p(40):x+p(4),f.cardY+p(this.model.collapsed?3:44)).setFontSize(p(12)).setWordWrapWidth(cardWidth-p(this.model.collapsed?44:8),true).setText(`${kind==='wall'?'Wall':'Archer Tower'}\n${kind==='wall'?`${q.wood} Wood`:`${q.wood} W · ${q.iron} I`}`).setColor(q.available?WHITE:'#ffb0a5');
   this.purposes[i].setPosition(x+p(4),f.cardY+p(78)).setFontSize(p(12)).setVisible(!this.model.collapsed);
  }
  const placement=this.placement(),kind=this.model.kind,q=kind?sim.constructionQuote(kind):undefined;
  const reason=placement?sim.placementReason(placement.kind,placement.col,placement.row):'';
  const shortage=q&&!q.available?(sim.state.wood<q.wood?'Need Wood':sim.state.iron<q.iron?'Need Iron':'Need resources'):'';
  const started=this.model.started?sim.state.structures[this.model.started]:undefined;
  const message=this.model.message==='Construction rejected'?`Construction rejected${reason?` · ${reason}`:''}`:pending?'Pending construction…':started?(started.progress>=1?'Construction complete':`Construction started · ${Math.ceil((started.completeTick-sim.clock.tick)/30)}s remaining`):this.model.message||reason||(kind?(shortage||'Tap a battlefield cell'):'Select a defense, then a cell');
  this.status.setPosition(left,f.statusY).setFontSize(p(12)).setWordWrapWidth(inner,true).setColor(pending?'#94d4ff':reason||shortage||this.model.message==='Construction rejected'?'#ffb0a5':MUTED).setText(placement&&!reason&&!this.model.message?'Valid placement · confirm':message);
  const canConfirm=!!placement&&!reason&&!pending&&!sim.clock.paused&&!sim.ended;
  setHit(2,f.compact?left:left+inner-p(240),f.actionY,f.compact?inner-p(80):p(160),p(48),canConfirm,true);this.actionLabels[2].setText(pending?'Pending…':'Confirm');
  setHit(3,f.x+f.width-p(80),f.actionY,p(72),p(48),true);this.actionLabels[3].setText('Cancel');
 }
}
