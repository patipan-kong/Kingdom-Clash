import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import type {GameEvent} from '../simulation/GameState';
import type {BuildingKind} from '../data/buildings';
import {buildLayout,type BuildPosition} from './buildLayout';
import {GRID,WORLD,projection} from '../world/layout';
import {BuildModel,type BuildPlacement} from './buildModel';
import {compactControlFrame,drawDivider,drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT,type ButtonTone,type ControlVariant} from './fantasyTheme';
const WHITE=FANTASY_TEXT.primary,MUTED=FANTASY_TEXT.muted;
export class BuildPanel {
 readonly model=new BuildModel();readonly container:Phaser.GameObjects.Container;
 readonly hits:Phaser.GameObjects.Rectangle[]=[];readonly labels:Phaser.GameObjects.Text[]=[];
 readonly status:Phaser.GameObjects.Text;readonly heading:Phaser.GameObjects.Text;
 readonly images:Phaser.GameObjects.Image[]=[];readonly purposes:Phaser.GameObjects.Text[]=[];
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;private resources:Phaser.GameObjects.Text;
 private buttonArt:Phaser.GameObjects.Graphics[]=[];
 private actionLabels:Phaser.GameObjects.Text[]=[];private pointers:(number|null)[]=[null,null,null,null];
 private scale=1;private top=0;private utilityX=0;private position:BuildPosition='bottom';
 bounds={x:0,y:0,width:0,height:0};
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,private placement:()=>BuildPlacement|undefined,private select:(kind:BuildingKind|undefined)=>void,private clearPreview:()=>void,private confirm:(id:string)=>void,private close:()=>void){
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
  this.pointers.push(null);this.button(4,()=>{if(this.model.back())this.select(undefined);});
  // Chapter 3: the Azure Barracks card exists only in a match with authored pads (button 5, card 2).
  this.pointers.push(null);this.button(5,()=>{if(this.model.choose('barracks')){this.select('barracks');this.render();}});
  this.images.push(scene.add.image(0,0,'wall').setOrigin(.5,0));this.container.add(this.images[2]);this.labels.push(this.text('',12,true));this.purposes.push(this.text('Trains 2 soldiers',12).setColor(MUTED));
  const release=(pointer?:Phaser.Input.Pointer)=>{this.pointers=this.pointers.map(id=>!pointer||id===pointer.id?null:id);};
  scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);const cancel=()=>release();
  for(const name of ['pointercancel','touchcancel','blur'])window.addEventListener(name,cancel);
  scene.game.events.on('clear-controls',cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);scene.game.events.off('clear-controls',cancel);for(const name of ['pointercancel','touchcancel','blur'])window.removeEventListener(name,cancel);});
 }
 private text(value:string,size:number,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(index:number,action:()=>void){
  const art=this.scene.add.graphics();this.buttonArt[index]=art;this.container.add(art);
  const hit=this.scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});this.hits[index]=hit;this.container.add(hit);
  const label=this.text('',12,true).setOrigin(.5);this.actionLabels[index]=label;
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled&&this.pointers[index]===null)this.pointers[index]=p.id;});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const activate=this.pointers[index]===p.id&&hit.input?.enabled;this.pointers[index]=null;if(activate){action();this.render();}});
 }
 /** Opens at whichever of the two stable positions covers fewer buildable cells on screen (the bottom one on a tie); it then stays put until the panel closes. */
 open(){this.model.reset();this.position=this.choosePosition();this.container.setVisible(true);this.render();}
 private choosePosition():BuildPosition{
  if(!this.utilityX)return 'bottom';
  const sim=this.sim(),cam=(this.scene.scene.get('Battle') as Phaser.Scene).cameras.main;
  const covered=(position:BuildPosition)=>{
   const f=buildLayout(this.scale,this.top,this.utilityX,false,position);let n=0;
   for(let row=0;row<WORLD.height/GRID;row++)for(let col=0;col<WORLD.width/GRID;col++){
    const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
    if(x>=f.x&&x<=f.x+f.width&&y>=f.y&&y<=f.y+f.height&&sim.placementReason('tower',col,row)==='')n++;
   }
   return n;
  };
  return covered('top')<covered('bottom')?'top':'bottom';
 }
 hide(){this.model.reset();this.pointers.fill(null);this.container.setVisible(false);}
 locationChanged(){if(!this.model.pending){this.model.message='';this.model.started=undefined;}}
 observe(event:GameEvent){if(this.model.observe(event))this.clearPreview();}
 layout(scale:number,top:number,utilityX:number){this.scale=scale;this.top=top;this.utilityX=utilityX;this.pointers.fill(null);this.render();}
 private fit(t:Phaser.GameObjects.Text,value:string,room:number){t.setText(value);for(let text=value;t.width>room&&text.length>4;)t.setText((text=text.slice(0,-2).trimEnd())+'…');}
 render(){
  if(!this.container.visible||!this.utilityX)return;
  const sim=this.sim();if(this.model.sync(sim))this.clearPreview();
  const f=buildLayout(this.scale,this.top,this.utilityX,this.model.collapsed,this.position),p=(n:number)=>n/this.scale;
  const changed=['x','y','width','height'].some(k=>this.bounds[k as keyof typeof this.bounds]!==f[k as keyof typeof f]);this.bounds={x:f.x,y:f.y,width:f.width,height:f.height};
  if(changed)this.scene.game.events.emit('shop-obstruction',this.bounds);
  drawFantasyPanel(this.bg,f,this.scale);drawDivider(this.bg,f.x+p(10),f.cardY-p(3),f.width-p(20),this.scale);
  this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  const left=f.x+p(8),inner=f.width-p(16),gap=p(4),collapsed=this.model.collapsed,side=sim.azurePads.length&&!collapsed?p(48):p(64),pending=!!this.model.pending;
  for(let i=0;i<this.hits.length;i++){this.hits[i].setVisible(false);this.hits[i].input!.enabled=false;this.buttonArt[i].setVisible(false);this.actionLabels[i].setVisible(false);}
  const setHit=(i:number,x:number,y:number,w:number,h:number,enabled:boolean,primary=false,tone?:ButtonTone,variant:ControlVariant='card')=>{const hit=this.hits[i],visual=compactControlFrame(x,y,w,h,this.scale,variant);hit.setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setFillStyle(0,0);hit.input!.enabled=enabled;drawFantasyButton(this.buttonArt[i],visual.x,visual.y,visual.width,visual.height,this.scale,!enabled?'disabled':tone??(primary?'primary':'secondary'),this.pointers[i]!==null);this.actionLabels[i].setPosition(visual.x+visual.width/2,visual.y+visual.height/2+(this.pointers[i]!==null?p(1):0)).setFontSize(p(12)).setColor(enabled?(primary?FANTASY_TEXT.ink:WHITE):MUTED).setVisible(i>=2);hit.setVisible(true);this.buttonArt[i].setVisible(true);};
  const kind=this.model.kind,q=kind?sim.constructionQuote(kind):undefined;
  const cost=(k:BuildingKind,short:boolean)=>{const c=sim.constructionQuote(k);return k==='wall'?(short?`${c.wood} W`:`${c.wood} Wood`):short?`${c.wood}W ${c.iron}I`:`${c.wood} W · ${c.iron} I`;};
  // Row 1, line 1: what is being built (or the Build title and the stock); line 2: the placement status.
  this.heading.setPosition(left,f.infoY).setFontSize(p(12)).setVisible(true);
  this.resources.setPosition(f.x+f.width-p(8),f.infoY).setOrigin(1,0).setFontSize(p(12)).setColor(FANTASY_TEXT.primary).setText(`${Math.floor(sim.state.wood)} W · ${Math.floor(sim.state.iron)} I`).setVisible(!collapsed);
  if(collapsed){this.heading.setColor(q?.available===false?'#ffb0a5':WHITE).setText(`${kind==='wall'?'Wall':kind==='barracks'?'Azure Barracks':'Archer Tower'} · ${cost(kind!,false)}`);}
  else{this.heading.setColor(FANTASY_TEXT.gold).setText('BUILD DEFENSES');if(this.heading.getBounds().right+p(8)>this.resources.getBounds().left)this.heading.setText('BUILD');}
  // Row 2: the choice (Wall | Tower | Cancel) before a selection, the actions (Change | Confirm | Cancel) after it.
  for(let i=0;i<this.labels.length;i++){this.images[i].setVisible(false);this.purposes[i].setVisible(false);this.labels[i].setVisible(false);}
  if(!collapsed){
   const kinds:readonly BuildingKind[]=sim.azurePads.length?['wall','tower','barracks']:['wall','tower'],n=kinds.length;
   const cw=(inner-side-n*gap)/n,shortName=cw*this.scale<90,shortCost=cw*this.scale<84;
   for(const [i,k] of kinds.entries()){
    const x=left+i*(cw+gap),qk=sim.constructionQuote(k);
    setHit(i<2?i:5,x,f.cardY,cw,f.cardHeight,!pending,false,pending||!qk.available?'disabled':'card','card');
    this.labels[i].setPosition(x+p(n>2?4:6),f.cardY+p(9)).setFontSize(p(n>2?10:12)).setWordWrapWidth(cw-p(n>2?4:8),true).setText(`${k==='wall'?'Wall':k==='barracks'?'Barracks':shortName?'Tower':'Archer Tower'}\n${cost(k,shortCost)}`).setColor(qk.available?WHITE:'#ffb0a5').setVisible(true);
   }
  }else{
   setHit(4,left,f.actionY,side,f.cardHeight,!pending,false,'secondary','secondaryCompact');this.actionLabels[4].setText('Change').setVisible(true);
  }
  const placement=this.placement(),reason=placement?sim.placementReason(placement.kind,placement.col,placement.row):'';
  const shortage=q&&!q.available?(sim.state.wood<q.wood?'Need Wood':sim.state.iron<q.iron?'Need Iron':'Need resources'):'';
  const started=this.model.started?sim.state.structures[this.model.started]:undefined;
  const message=this.model.message==='Construction rejected'?`Construction rejected${reason?` · ${reason}`:''}`:pending?'Pending construction…':started?(started.progress>=1?'Construction complete':`Construction started · ${Math.ceil((started.completeTick-sim.clock.tick)/30)}s remaining`):this.model.message||reason||(kind?(shortage||(kind==='barracks'?'Tap a gold pad':'Tap a battlefield cell')):'Select a defense, then a cell');
  this.status.setPosition(left,f.statusY).setFontSize(p(12)).setWordWrapWidth(0).setColor(pending?'#94d4ff':reason||shortage||this.model.message==='Construction rejected'?'#ffb0a5':MUTED);
  this.fit(this.status,placement&&!reason&&!this.model.message?'Valid placement · confirm':message,inner);
  const canConfirm=!!placement&&!reason&&!pending&&!sim.clock.paused&&!sim.ended;
  if(collapsed){setHit(2,left+side+gap,f.actionY,inner-2*side-2*gap,f.cardHeight,canConfirm,true,undefined,'primaryCompact');this.actionLabels[2].setText(pending?'Pending…':'CONFIRM').setVisible(true);}
  setHit(3,f.x+f.width-p(8)-side,f.actionY,side,f.cardHeight,true,false,'secondary','secondaryCompact');this.actionLabels[3].setText('Cancel').setVisible(true);
 }
}
