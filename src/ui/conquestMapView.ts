import Phaser from 'phaser';
import type {MissionSelectionView} from '../data/campaignSelection';
import {CONQUEST_ART,conquestRoads,conquestStops,dashSegments,markerRadius,markerStyle,roadStyle,smoothRoad,tapSide,toGame,CONQUEST_SCALE,type MarkerStyle} from './conquestMap';
import {drawFantasyButton,drawPips,FANTASY,FANTASY_TEXT,UI_FONT} from './fantasyTheme';

export function preloadConquestMap(scene:Phaser.Scene){
 for(const key of [CONQUEST_ART.background,CONQUEST_ART.azureKeep])if(!scene.textures.exists(key))scene.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.webp`);
}

export interface ConquestMapInput{
 missions:readonly MissionSelectionView[];
 chapterNumber:number;title:string;completed:number;total:number;
 /** The mission the panel shows first (the next one to play, else the last playable). */
 initialId:string|null;
 /** CSS pixels per game pixel (menuScale.k) and its font lift. */
 k:number;font:(px:number,css?:number)=>number;
 onBriefing:(id:string)=>void;onBack:()=>void;
}
export interface ConquestMapView{
 levelButtons:Map<string,Phaser.GameObjects.Rectangle>;lockedCards:Map<string,Phaser.GameObjects.Rectangle>;pendingCards:Map<string,Phaser.GameObjects.Rectangle>;slotCards:Map<string,Phaser.GameObjects.Rectangle>;
 labels:Map<string,Phaser.GameObjects.Text>;backButton:Phaser.GameObjects.Rectangle;briefingButton:Phaser.GameObjects.Rectangle;
 /** Whether the Azure Fortress overlay is drawn (only once the last mission is conquered). */
 azureKeep:Phaser.GameObjects.Image|null;
 select(id:string):void;selected():string|null;
}

const col=(n:number)=>`#${n.toString(16).padStart(6,'0')}`;
const AZURE=0x4f9be0,TEAL=0x2f7d6d,TEAL_EDGE=0x8cebd1,GOLD_FILL=0xf0cf7c,LOCK_FILL=0x26343d,LOCK_EDGE=0x66798a;

/** Draws the Conquest Map: the painting, the Azure Fortress once the finale is conquered, roads, markers with names, and the header and bottom panel. Selection is local to the scene; a tap on a marker selects it and BRIEFING opens it. */
export function buildConquestMap(scene:Phaser.Scene,input:ConquestMapInput):ConquestMapView{
 const {missions,k,font:f}=input,W=960,H=540;
 const text=(x:number,y:number,value:string,size:number,color:string,bold=true,halo=0)=>{const t=scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color});if(halo)t.setStroke('#040c14',halo);return t;};
 scene.cameras.main.setBackgroundColor('#0b1a22');
 if(scene.textures.exists(CONQUEST_ART.background))scene.add.image(0,0,CONQUEST_ART.background).setOrigin(0).setDisplaySize(W,H);
 const last=missions[missions.length-1],conquered=last?.state==='completed';
 let azureKeep:Phaser.GameObjects.Image|null=null;
 if(conquered&&scene.textures.exists(CONQUEST_ART.azureKeep)){const o=CONQUEST_ART.overlay;azureKeep=scene.add.image(o.x*CONQUEST_SCALE,o.y*CONQUEST_SCALE,CONQUEST_ART.azureKeep).setOrigin(0).setDisplaySize(o.w*CONQUEST_SCALE,o.h*CONQUEST_SCALE).setName('azure-keep');}
 // Scrims: the header and the bottom bar read against the painting without boxing it.
 const scrim=scene.add.graphics();
 scrim.fillGradientStyle(0x050e16,0x050e16,0x050e16,0x050e16,.82,.82,0,0).fillRect(0,0,W,110);
 scrim.fillGradientStyle(0x050e16,0x050e16,0x050e16,0x050e16,0,0,.9,.9).fillRect(0,H-110,W,110);
 // Roads: a dark under-stroke, then conquered = Azure, the next road = dashed gold, roads ahead = faint dots.
 const roads=scene.add.graphics();
 conquestRoads.forEach((pts,i)=>{
  const to=missions[i+1];if(!to)return;
  const line=smoothRoad(pts),style=roadStyle(to);
  roads.lineStyle(style==='locked'?3:4.2,0x040c14,.55).strokePoints(line.map(p=>({x:p[0],y:p[1]})),false,false);
  if(style==='done')roads.lineStyle(2.2,AZURE,1).strokePoints(line.map(p=>({x:p[0],y:p[1]})),false,false);
  else if(style==='next'){roads.lineStyle(2.2,FANTASY.goldBright,1);for(const [a,b] of dashSegments(line,7,5))roads.lineBetween(a[0],a[1],b[0],b[1]);}
  else{roads.lineStyle(1.4,0xfff3d3,.55);for(const [a,b] of dashSegments(line,1.5,6))roads.lineBetween(a[0],a[1],b[0],b[1]);}
 });
 const view={levelButtons:new Map(),lockedCards:new Map(),pendingCards:new Map(),slotCards:new Map()} as Pick<ConquestMapView,'levelButtons'|'lockedCards'|'pendingCards'|'slotCards'>;
 const labels=new Map<string,Phaser.GameObjects.Text>(),styles=new Map<string,MarkerStyle>(),ring=scene.add.graphics();
 const pos=new Map<string,{x:number;y:number;r:number}>();
 missions.forEach(m=>{
  const stop=conquestStops.find(s=>s.slot===m.number);if(!stop)return;
  const [x,y]=toGame([stop.x,stop.y]),r=markerRadius(m.finale),style=markerStyle(m);styles.set(m.id,style);pos.set(m.id,{x,y,r});
  const g=scene.add.graphics();
  if(style==='next'){const halo=scene.add.circle(x,y,r+9,FANTASY.goldBright,.3);scene.tweens.add({targets:halo,alpha:.12,scale:1.25,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});}
  // Banner pole and flag: Azure once conquered, Crimson otherwise.
  g.lineStyle(1.6,0x2b1d10,1).lineBetween(x,y-r+2,x,y-r-18);
  g.fillStyle(style==='done'?AZURE:style==='locked'?0x7a3a3f:0xc34a4a,1).fillTriangle(x,y-r-18,x+13,y-r-14,x,y-r-9);
  g.fillStyle(0x020810,.5).fillEllipse(x,y+r*.85,r*1.8,r*.6);
  g.fillStyle(style==='done'?TEAL:style==='locked'?LOCK_FILL:GOLD_FILL,1).fillCircle(x,y,r);
  g.lineStyle(1.8,style==='done'?TEAL_EDGE:style==='locked'?LOCK_EDGE:FANTASY.goldBright,1).strokeCircle(x,y,r);
  if(style==='done')g.lineStyle(2,0xeafff8,1).beginPath().moveTo(x-4.5,y).lineTo(x-1.5,y+3.5).lineTo(x+5,y-3.5).strokePath();
  else if(style==='locked'){g.fillStyle(0x9fb2bd,1).fillRoundedRect(x-4,y-1,8,6.5,1.3);g.lineStyle(1.5,0x9fb2bd,1).beginPath().arc(x,y-1,3,Math.PI,0,false).strokePath();}
  else text(x,y+.5,String(m.number),13,col(FANTASY.ink),true).setOrigin(.5);
  // Name: plain text with a dark halo; a PLAY tag under the recommended mission.
  const fs=f(13,12),side=stop.label,lx=side==='right'?x+r+8:x,ly=side==='above'?y-r-34:side==='below'?y+r+8:y;
  const label=text(lx,ly,m.title,fs,style==='locked'?'#cbd7de':FANTASY_TEXT.primary,true,3.5).setOrigin(side==='right'?0:.5,side==='above'?1:side==='below'?0:.5);
  labels.set(m.id,label);
  if(style==='next')text(lx,side==='right'?ly+fs*.5+2:ly+(side==='below'?fs+3:0),'▸ PLAY',f(10,10),col(FANTASY.goldBright),true,3).setOrigin(side==='right'?0:.5,0);
  // Taps: a square of at least 44 CSS px around the marker, and the name itself.
  const side44=tapSide(k,m.finale),hit=scene.add.rectangle(x,y,side44,side44,0,0);
  const open=m.selectable;
  hit.setInteractive({useHandCursor:true});label.setInteractive({useHandCursor:true});
  const pick=()=>api.select(m.id);hit.on('pointerup',pick);label.on('pointerup',pick);
  view.slotCards.set(m.id,hit);
  if(open)view.levelButtons.set(m.id,hit);else (m.state==='pending'?view.pendingCards:view.lockedCards).set(m.id,hit);
 });
 // Header.
 const header=text(32,14,`CHAPTER ${input.chapterNumber} · CONQUEST MAP`,f(12,12),FANTASY_TEXT.gold,true,3);
 text(32,34,input.title,28,FANTASY_TEXT.primary,true,4);header.setDepth(1);
 const pw=input.total*12+(input.total-1)*5,pips=scene.add.graphics();drawPips(pips,928-pw,34,input.total,input.completed,12,5);
 text(928-pw-12,40,`${input.completed}/${input.total} conquered`,f(12,12),FANTASY_TEXT.gold,true,3).setOrigin(1,.5);
 // Bottom bar: back, the selected mission's status and name, and BRIEFING.
 const bh=Math.max(44,48/k),backArt=scene.add.graphics();drawFantasyButton(backArt,24,478,160,46,1,'secondary');
 const backButton=scene.add.rectangle(104,501,160,Math.max(46,bh),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>input.onBack());
 text(104,501,'◂ CHAPTERS',f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);
 const panel=scene.add.graphics();panel.fillStyle(0x08141f,.82).fillRoundedRect(196,474,528,54,10).lineStyle(1.3,FANTASY.gold,.8).strokeRoundedRect(196,474,528,54,10);
 const status=text(210,484,'',f(10,10),FANTASY_TEXT.gold,true),name=text(210,498,'',f(17,15),FANTASY_TEXT.primary,true);
 const btnArt=scene.add.graphics(),btnText=text(836,501,'',f(14,13),col(FANTASY.ink),true).setOrigin(.5);
 const briefingButton=scene.add.rectangle(836,501,200,Math.max(54,bh),0,0).setInteractive({useHandCursor:true});
 let selected:string|null=input.initialId;
 const render=()=>{
  ring.clear();
  for(const [id,label] of labels)label.setColor(id===selected?FANTASY_TEXT.gold:styles.get(id)==='locked'?'#cbd7de':FANTASY_TEXT.primary);
  const m=missions.find(x=>x.id===selected),p=selected?pos.get(selected):undefined;
  btnArt.clear();
  if(!m||!p){status.setText('');name.setText('');btnText.setText('');drawFantasyButton(btnArt,736,474,200,54,1,'disabled');return;}
  ring.lineStyle(2,0x9fd0f2,1).strokeCircle(p.x,p.y,p.r+5).lineStyle(1,0xffffff,.55).strokeCircle(p.x,p.y,p.r+7.5);
  const st=styles.get(m.id)!,locked=!m.selectable;
  status.setText(`MISSION ${m.number}${m.finale?' · FINALE':''} · ${st==='done'?'CONQUERED':locked?`LOCKED · CONQUER MISSION ${m.number-1} FIRST`:st==='next'?'NEXT TO CONQUER':'AVAILABLE'}`);
  status.setColor(st==='done'?col(TEAL_EDGE):locked?'#9fb2bd':FANTASY_TEXT.gold);
  name.setText(m.title);
  drawFantasyButton(btnArt,736,474,200,54,1,locked?'disabled':'primary');
  btnText.setText(locked?'LOCKED':st==='done'?'REPLAY ▸':'BRIEFING ▸').setColor(locked?'#7f95a2':col(FANTASY.ink));
 };
 briefingButton.on('pointerup',()=>{const m=missions.find(x=>x.id===selected);if(m?.selectable)input.onBriefing(m.id);});
 const api:ConquestMapView={...view,labels,backButton,briefingButton,azureKeep,select(id){if(!missions.some(m=>m.id===id))return;selected=id;render();},selected:()=>selected};
 render();
 return api;
}
