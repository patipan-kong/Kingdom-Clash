import Phaser from 'phaser';
import {localeFont,t} from '../i18n';
import {buildingLabels,interactionRejection} from '../i18n/interaction';
import {fitLocalizedLine,wrapLocalizedText} from '../i18n/textLayout';
import type {Simulation} from '../simulation/Simulation';
import type {GameEvent} from '../simulation/GameState';
import type {BuildingKind} from '../data/buildings';
import {buildLayout,type BuildPosition} from './buildLayout';
import {GRID,projection} from '../world/layout';
import {BuildModel,type BuildPlacement} from './buildModel';
import {compactControlFrame,drawDivider,drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT,type ButtonTone,type ControlVariant} from './fantasyTheme';
const WHITE=FANTASY_TEXT.primary,MUTED=FANTASY_TEXT.muted;
const buildKinds=(sim:Simulation):BuildingKind[]=>['wall','tower',...(sim.azurePads.length?['barracks' as const]:[]),...(sim.ballistaRuin?['ballista' as const]:[]),...(sim.setup.tavern?['tavern' as const]:[])];
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
  this.heading=this.text(t('battleBuild'),16,true);this.resources=this.text('',12);this.status=this.text('',12);
  for(const [i,kind] of (['wall','tower'] as const).entries()){
   this.button(i,()=>{if(this.model.choose(kind)){this.select(kind);this.render();}});
   const image=scene.add.image(0,0,kind).setOrigin(.5,0);this.images.push(image);this.container.add(image);
   this.labels.push(this.text('',12,true));this.purposes.push(this.text(t(kind==='wall'?'buildBlocks':'buildRanged'),12).setColor(MUTED));
  }
  this.button(2,()=>{const id=this.model.request(this.sim(),this.placement(),performance.now());if(id)this.confirm(id);});
  this.button(3,close);
  this.pointers.push(null);this.button(4,()=>{if(this.model.back())this.select(undefined);});
  // Chapter 3: the Azure Barracks card exists only in a match with authored pads (button 5, card 2).
  this.pointers.push(null);this.button(5,()=>{if(this.model.choose('barracks')){this.select('barracks');this.render();}});
  this.images.push(scene.add.image(0,0,'wall').setOrigin(.5,0));this.container.add(this.images[2]);this.labels.push(this.text('',12,true));this.purposes.push(this.text(t('buildTrains'),12).setColor(MUTED));
  // Chapter 4 M2: the Ballista card exists only in a match whose camp has a Ballista ruin (button 6, card 3); a Ballista is placed on that cell alone.
  this.pointers.push(null);this.button(6,()=>{if(this.model.choose('ballista')){this.select('ballista');this.render();}});
  this.images.push(scene.add.image(0,0,'tower').setOrigin(.5,0));this.container.add(this.images[3]);this.labels.push(this.text('',12,true));this.purposes.push(this.text(t('buildSiege'),12).setColor(MUTED));
  // Chapter 5 Phase 1B: the Tavern card exists only in a match whose setup has a Tavern (button 7, card 4).
  this.pointers.push(null);this.button(7,()=>{if(this.model.choose('tavern')){this.select('tavern');this.render();}});
  this.images.push(scene.add.image(0,0,'wall').setOrigin(.5,0));this.container.add(this.images[4]);this.labels.push(this.text('',12,true));this.purposes.push(this.text(t('buildHires'),12).setColor(MUTED));
  const release=(pointer?:Phaser.Input.Pointer)=>{this.pointers=this.pointers.map(id=>!pointer||id===pointer.id?null:id);};
  scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);const cancel=()=>release();
  for(const name of ['pointercancel','touchcancel','blur'])window.addEventListener(name,cancel);
  scene.game.events.on('clear-controls',cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);scene.game.events.off('clear-controls',cancel);for(const name of ['pointercancel','touchcancel','blur'])window.removeEventListener(name,cancel);});
 }
 private text(value:string,size:number,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:localeFont(UI_FONT),fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(index:number,action:()=>void){
  const art=this.scene.add.graphics();this.buttonArt[index]=art;this.container.add(art);
  const hit=this.scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});this.hits[index]=hit;this.container.add(hit);
  const label=this.text('',12,true).setOrigin(.5);this.actionLabels[index]=label;
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled&&(this.pointers[index]===null||p.id<0))this.pointers[index]=p.id;});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const activate=this.pointers[index]===p.id&&hit.input?.enabled;this.pointers[index]=null;if(activate){action();this.render();}});
 }
 /** Opens at whichever of the two stable positions covers fewer buildable cells on screen (the bottom one on a tie); it then stays put until the panel closes. */
 open(){this.model.reset();this.position=this.choosePosition();this.container.setVisible(true);this.render();}
 /** The Ballista card focuses the camera on its ruin; the panel then moves to whichever position leaves that cell the most room, so it never ends up crowded under the panel (the position was chosen before the camera moved). */
 refit(col:number,row:number){
  if(!this.utilityX||!this.container.visible)return;
  const cam=(this.scene.scene.get('Battle') as Phaser.Scene).cameras.main,y=(row+.5)*GRID*projection.y-cam.clampY(cam.scrollY),half=GRID*projection.y/2,cards=buildKinds(this.sim()).length;
  const room=(position:BuildPosition)=>{const f=buildLayout(this.scale,this.top,this.utilityX,false,position,cards);return y+half<f.y?f.y-(y+half):y-half>f.y+f.height?y-half-(f.y+f.height):-1;};
  const next=room('bottom')>=room('top')?'bottom':'top';
  if(next!==this.position){this.position=next;this.render();}
 }
 private choosePosition():BuildPosition{
  if(!this.utilityX)return 'bottom';
  const sim=this.sim(),cam=(this.scene.scene.get('Battle') as Phaser.Scene).cameras.main,cards=buildKinds(sim).length;
  const covered=(position:BuildPosition)=>{
   const f=buildLayout(this.scale,this.top,this.utilityX,false,position,cards);let n=0;
   const {width,height}=sim.geo.size;
   for(let row=0;row<height/GRID;row++)for(let col=0;col<width/GRID;col++){
    const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
    if(x>=f.x&&x<=f.x+f.width&&y>=f.y&&y<=f.y+f.height&&(sim.placementReason('tower',col,row)===''||sim.placementReason('ballista',col,row)===''))n++; // the Ballista's ruin counts: the panel should not open over the one cell it needs
   }
   return n;
  };
  return covered('top')<covered('bottom')?'top':'bottom';
 }
 hide(){this.model.reset();this.pointers.fill(null);this.container.setVisible(false);}
 locationChanged(){if(!this.model.pending){this.model.message='';this.model.started=undefined;}}
 observe(event:GameEvent){if(this.model.observe(event))this.clearPreview();}
 layout(scale:number,top:number,utilityX:number){this.scale=scale;this.top=top;this.utilityX=utilityX;this.pointers.fill(null);this.render();}
 render(){
  if(!this.container.visible||!this.utilityX)return;
  const sim=this.sim();if(this.model.sync(sim))this.clearPreview();
  const kinds=buildKinds(sim),n=kinds.length;
  const f=buildLayout(this.scale,this.top,this.utilityX,this.model.collapsed,this.position,n),p=(n:number)=>n/this.scale;
  const changed=['x','y','width','height'].some(k=>this.bounds[k as keyof typeof this.bounds]!==f[k as keyof typeof f]);this.bounds={x:f.x,y:f.y,width:f.width,height:f.height};
  if(changed)this.scene.game.events.emit('shop-obstruction',this.bounds);
  drawFantasyPanel(this.bg,f,this.scale);drawDivider(this.bg,f.x+p(10),f.cardY-p(3),f.width-p(20),this.scale);
  this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  const left=f.x+p(8),inner=f.width-p(16),gap=p(4),collapsed=this.model.collapsed,side=n>2&&!collapsed?p(48):p(64),pending=!!this.model.pending;
  for(let i=0;i<this.hits.length;i++){this.hits[i].setVisible(false);this.hits[i].input!.enabled=false;this.buttonArt[i].setVisible(false);this.actionLabels[i].setVisible(false);}
  const setHit=(i:number,x:number,y:number,w:number,h:number,enabled:boolean,primary=false,tone?:ButtonTone,variant:ControlVariant='card')=>{const hit=this.hits[i],visual=compactControlFrame(x,y,w,h,this.scale,variant);hit.setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setFillStyle(0,0);hit.input!.enabled=enabled;drawFantasyButton(this.buttonArt[i],visual.x,visual.y,visual.width,visual.height,this.scale,!enabled?'disabled':tone??(primary?'primary':'secondary'),this.pointers[i]!==null);this.actionLabels[i].setPosition(visual.x+visual.width/2,visual.y+visual.height/2+(this.pointers[i]!==null?p(1):0)).setFontSize(p(12)).setColor(enabled?(primary?FANTASY_TEXT.ink:WHITE):MUTED).setVisible(i>=2);hit.setVisible(true);this.buttonArt[i].setVisible(true);};
  // Chapter 4 M1: a tower on the camp's ruin is a repair and is charged (and shown) at the repair price.
  const placement=this.placement(),kind=this.model.kind,q=kind?(placement&&placement.kind===kind?sim.placementQuote(kind,placement.col,placement.row):kind==='ballista'?sim.repairPrice(kind):sim.constructionQuote(kind)):undefined,repair=!!placement&&!!kind&&sim.repairSite(kind,placement.col,placement.row);
  const cost=(k:BuildingKind,short:boolean,c=sim.constructionQuote(k))=>{return k==='wall'?t(short?'buildWoodShort':'buildWood',{wood:c.wood}):t(short?'buildMaterialsShort':'buildMaterials',{wood:c.wood,iron:c.iron});};
  // Row 1, line 1: what is being built (or the Build title and the stock); line 2: the placement status.
  this.heading.setPosition(left,f.infoY).setFontSize(p(12)).setVisible(true);
  this.resources.setPosition(f.x+f.width-p(8),f.infoY).setOrigin(1,0).setFontSize(p(12)).setColor(FANTASY_TEXT.primary).setText(t('buildMaterials',{wood:Math.floor(sim.state.wood),iron:Math.floor(sim.state.iron)})).setVisible(!collapsed);
  if(collapsed&&kind){
   const label=kind==='ballista'?'buildRepairBallista':repair&&kind==='barracks'?'buildRepairBarracks':repair&&kind==='tower'?'buildRepairTower':buildingLabels[kind];
   fitLocalizedLine(this.heading.setColor(q?.available===false?'#ffb0a5':WHITE),`${t(label)} · ${cost(kind,false,q)}`,inner,` · ${cost(kind,false,q)}`);
  }
  else{this.heading.setColor(FANTASY_TEXT.gold).setText(t('buildHeading'));if(this.heading.getBounds().right+p(8)>this.resources.getBounds().left)this.heading.setText(t('buildShort'));}
  // Row 2: the choice (Wall | Tower | Cancel) before a selection, the actions (Change | Confirm | Cancel) after it.
  for(let i=0;i<this.labels.length;i++){this.images[i].setVisible(false);this.purposes[i].setVisible(false);this.labels[i].setVisible(false);}
  if(!collapsed){
   const hitOf={wall:0,tower:1,barracks:5,ballista:6,tavern:7} as const,labelOf={wall:0,tower:1,barracks:2,ballista:3,tavern:4} as const;
   const cw=(inner-side-n*gap)/n,shortName=cw*this.scale<90,shortCost=cw*this.scale<84;
   for(const [i,k] of kinds.entries()){
    const x=left+i*(cw+gap),qk=k==='ballista'?sim.repairPrice(k):sim.constructionQuote(k),li=labelOf[k];
    setHit(hitOf[k],x,f.cardY,cw,f.cardHeight,!pending,false,pending||!qk.available?'disabled':'card','card');
    const label=t(k==='ballista'?'buildRepairBallista':k==='barracks'?'buildBarracks':k==='tower'&&shortName?'buildTower':buildingLabels[k]);
    const room=cw-p(n>2?4:8),inset=x+p(n>2?3:5);
    const size=n>2?10:12,title=this.labels[li].setPosition(inset,f.cardY+p(4)).setFontSize(p(size)).setText(`${label}\n${cost(k,shortCost,qk)}`).setColor(qk.available?WHITE:'#ffb0a5').setVisible(true);
    for(let font=size;font>8&&title.width>room;)title.setFontSize(p(--font));
    wrapLocalizedText(this.purposes[li].setPosition(inset,f.cardY+p(29)).setFontSize(p(n>2?8.5:10)).setVisible(true),Math.max(p(16),room));
   }
  }else{
   setHit(4,left,f.actionY,side,f.cardHeight,!pending,false,'secondary','secondaryCompact');this.actionLabels[4].setText(t('buildChange')).setVisible(true);
  }
  const placementReason=placement?sim.placementReason(placement.kind,placement.col,placement.row):'';
  const reason=placementReason?interactionRejection(placementReason):'';
  const shortage=q&&!q.available?t(sim.state.wood<q.wood?'buildNeedWood':sim.state.iron<q.iron?'buildNeedIron':'buildNeedMaterials'):'';
  const started=this.model.started?sim.state.structures[this.model.started]:undefined;
  const rejected=this.model.message==='Construction rejected';
  const message=rejected?(reason||t('buildRejected')):pending?t('buildPending'):started?(started.progress>=1?t('buildComplete'):t('buildStarted',{seconds:Math.ceil((started.completeTick-sim.clock.tick)/30)})):this.model.message?t('buildCharged'):reason||(kind?(shortage||t(kind==='barracks'?'buildGoldPad':kind==='ballista'?'buildGoldRuin':'buildTapCell')):t('buildSelect'));
  this.status.setPosition(left,f.statusY).setFontSize(p(12)).setColor(pending?'#94d4ff':reason||shortage||rejected?'#ffb0a5':MUTED);
  const prompt=placement&&!reason&&!this.model.message?(repair&&kind?t('buildRepairValid',{building:t(kind==='tower'?'buildTower':buildingLabels[kind])}):t('buildValid')):message;
  this.status.setText(prompt);
  if(this.status.width>inner)this.status.setFontSize(p(11));
  fitLocalizedLine(this.status,prompt,inner);
  const canConfirm=!!placement&&!placementReason&&!pending&&!sim.clock.paused&&!sim.ended;
  if(collapsed){setHit(2,left+side+gap,f.actionY,inner-2*side-2*gap,f.cardHeight,canConfirm,true,undefined,'primaryCompact');this.actionLabels[2].setText(t(pending?'uiPending':'buildConfirm')).setVisible(true);}
  setHit(3,f.x+f.width-p(8)-side,f.actionY,side,f.cardHeight,true,false,'secondary','secondaryCompact');this.actionLabels[3].setText(t('uiCancel')).setVisible(true);
 }
}
