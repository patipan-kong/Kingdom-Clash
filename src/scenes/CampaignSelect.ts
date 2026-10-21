import Phaser from 'phaser';
import {MobileLevelSelect} from '../ui/MobileLevelSelect';
import {MobileMenu} from '../ui/mobileMenu';
import {campaign} from '../data/campaignLevels';
import {campaignChapters} from '../data/campaignChapters';
import {campaignSelection,type MissionSelectionView} from '../data/campaignSelection';
import {campaignProgress} from '../data/campaignProgressStore';
import {specialLabel} from '../data/campaignProgress';
import {campaignLayout,campaignCardVisible,campaignScroll} from '../ui/campaignLayout';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,drawInsetCard,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export class CampaignSelect extends Phaser.Scene {
 /** Only real, unlocked/replayable missions get interactive tile targets. */
 public levelButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public lockedCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public pendingCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public slotCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public missions:readonly MissionSelectionView[]=[];
 public selectedLevelId:string|null=null;
 public chapterId='first-war';
 public backButton!:Phaser.GameObjects.Rectangle;
 public fullBattleButton!:Phaser.GameObjects.Rectangle;
 public briefingButton!:Phaser.GameObjects.Rectangle;
 public detailTitle!:Phaser.GameObjects.Text;
 public detailDescription!:Phaser.GameObjects.Text;
 public cards!:Phaser.GameObjects.Container;
 public warning?:Phaser.GameObjects.Text;
 public mobileMenu?:MobileLevelSelect;
 private layout=campaignLayout(1);
 private clip=this.layout.clip;
 private scroll=0;private minScroll=0;private moved=0;
 private drag?:{id:number;y:number;scroll:number};
 private tileArt=new Map<string,Phaser.GameObjects.Graphics>();
 private briefingArt!:Phaser.GameObjects.Graphics;
 private briefingLabel!:Phaser.GameObjects.Text;
 private detailState!:Phaser.GameObjects.Text;
 private bar!:Phaser.GameObjects.Graphics;
 constructor(){super('CampaignSelect');}
 init(data?:{chapterId?:string;selectedLevelId?:string}){
  const chapterId=data?.chapterId??'first-war';
  if(this.chapterId!==chapterId){this.selectedLevelId=null;this.scroll=0;}
  this.chapterId=chapterId;
  if(data?.selectedLevelId!==undefined)this.selectedLevelId=data.selectedLevelId;
 }
 preload(){preloadMenuBackdrop(this);}
 create(){
  campaignProgress.refresh();
  const view=campaignSelection(campaignChapters,campaign.list(),campaignProgress.progress,this.chapterId,this.selectedLevelId??undefined);
  if(!view){this.scene.start('ChapterSelect');return;}
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font,mobile=!!window.kingdomViewport?.mobile&&m.mobile;this.mobileMenu=undefined;if(!mobile)restartOnBreakpoint(this,m.mobile);
  this.layout=campaignLayout(m.k,view.missions.length);this.clip=this.layout.clip;this.minScroll=this.layout.minScroll;
  this.missions=view.missions;this.selectedLevelId=view.selectedId;this.moved=0;this.drag=undefined;this.warning=undefined;
  this.levelButtons=new Map();this.lockedCards=new Map();this.pendingCards=new Map();this.slotCards=new Map();this.tileArt=new Map();
  if(mobile){this.mobileMenu=new MobileLevelSelect(this,this.missions,view.chapter,this.selectedLevelId,{select:id=>{this.selectedLevelId=id;},briefing:()=>this.openBriefing(),back:()=>this.scene.start('ChapterSelect')},!campaignProgress.persistent);const ui=this.mobileMenu;this.cards=ui.cards;this.levelButtons=ui.levelButtons;this.lockedCards=ui.lockedCards;this.pendingCards=ui.pendingCards;this.slotCards=ui.slotCards;this.backButton=ui.backButton;this.briefingButton=ui.briefingButton;new MobileMenu(this).resize(()=>({chapterId:this.chapterId,selectedLevelId:this.selectedLevelId??undefined}));return;}
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...width?{wordWrap:{width}}:{}});
  text(32,15,`CHAPTER ${view.chapter.chapter.number}  ·  ${view.chapter.completed}/${view.chapter.total} COMPLETE`,f(11,11),FANTASY_TEXT.gold,true);
  text(32,37,view.chapter.chapter.title,30,FANTASY_TEXT.primary,true);
  text(928,48,`${view.chapter.released} released · ${view.chapter.total-view.chapter.released} pending`,f(12,12),FANTASY_TEXT.muted).setOrigin(1,.5);
  text(32,76,view.chapter.chapter.subtitle,f(13,12),FANTASY_TEXT.gold);
  text(32,100,view.chapter.chapter.narrative,f(12,12),FANTASY_TEXT.muted,false,896);
  this.cards=this.add.container();
  this.missions.forEach((mission,index)=>{
   const frame=this.layout.slots[index],{x,y,width:w,height:h}=frame;
   const art=this.add.graphics();this.tileArt.set(mission.id,art);this.cards.add(art);
   if(mission.finale){
    const keep=this.add.image(x+w-30,y+49,'base-red').setDisplaySize(49,54).setAlpha(.22);this.cards.add(keep);
   }
   const add=(t:Phaser.GameObjects.Text)=>{this.cards.add(t);return t;};
   add(text(x+13,y+12,mission.finale?'FINALE · MISSION 10':`MISSION ${String(mission.number).padStart(2,'0')}`,f(11,11),FANTASY_TEXT.gold,true));
   add(text(x+13,y+35,mission.title,f(16,14),FANTASY_TEXT.primary,true,w-26));
   add(text(x+13,y+87,mission.status,f(11,11),mission.state==='completed'?'#8cebd1':mission.recommended?FANTASY_TEXT.gold:FANTASY_TEXT.muted,true));
   const hit=this.add.rectangle(x+w/2,y+h/2,w,h,0,0);this.cards.add(hit);this.slotCards.set(mission.id,hit);
   if(mission.selectable){
    hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10){this.selectedLevelId=mission.id;this.drawSelection();}});
    this.levelButtons.set(mission.id,hit);
   }else (mission.state==='pending'?this.pendingCards:this.lockedCards).set(mission.id,hit);
  });
  const maskArt=this.make.graphics({x:0,y:0},false);maskArt.fillStyle(0xffffff).fillRect(0,this.clip.top,960,this.clip.bottom-this.clip.top);
  const mask=maskArt.createGeometryMask();this.cards.setMask(mask);this.bar=this.add.graphics();
  const d=this.layout.detail,detailArt=this.add.graphics();drawFantasyPanel(detailArt,d,1);
  this.detailTitle=text(d.x+18,d.y+14,'',f(18,15),FANTASY_TEXT.primary,true,610);
  this.detailDescription=text(d.x+18,d.y+(m.mobile?47:42),'',f(13,12),FANTASY_TEXT.muted,false,610);
  const bx=800,by=d.y+d.height/2+9,bw=220,bh=Math.max(44,48/m.k);
  this.detailState=text(bx,d.y+13,'',f(11,11),FANTASY_TEXT.gold,true).setOrigin(.5,0);
  this.briefingArt=this.add.graphics();this.briefingButton=this.add.rectangle(bx,by,bw,bh,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.openBriefing());
  this.briefingLabel=text(bx,by,'REVIEW BRIEFING',f(12,12),FANTASY_TEXT.ink,true).setOrigin(.5);
  const button=(x:number,w:number,label:string,action:()=>void)=>{
   const art=this.add.graphics();drawFantasyButton(art,x,484,w,40,1,'secondary');
   const hit=this.add.rectangle(x+w/2,504,w,Math.max(44,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)action();});
   text(x+w/2,504,label,f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);return hit;
  };
  this.backButton=button(32,220,'BACK TO CHAPTERS',()=>this.scene.start('ChapterSelect'));
  const special=campaign.list().find(level=>specialLabel(level));
  this.fullBattleButton=button(578,350,'FULL BATTLE · ALWAYS AVAILABLE',()=>{if(special)this.scene.start('MissionBriefing',{levelId:special.id,returnTo:this.returnDestination()});});
  if(!special)this.fullBattleButton.disableInteractive();
  if(!campaignProgress.persistent)this.warning=text(415,504,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true,290).setOrigin(.5);
  this.drawSelection();
  // Restore the menu's own scroll on resize and campaign return.
  this.setScroll(this.scroll);
  const wheel=(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.setScroll(this.scroll-dy*.5);
  const down=(p:Phaser.Input.Pointer)=>{this.moved=0;if(p.y>=this.clip.top&&p.y<this.clip.bottom)this.drag={id:p.id,y:p.y,scroll:this.scroll};};
  const move=(p:Phaser.Input.Pointer)=>{if(!this.drag||this.drag.id!==p.id||!p.isDown)return;this.moved=Math.max(this.moved,Math.abs(p.y-this.drag.y));this.setScroll(this.drag.scroll+p.y-this.drag.y);};
  const up=()=>{this.drag=undefined;};
  this.input.on('wheel',wheel).on('pointerdown',down).on('pointermove',move).on('pointerup',up);
  this.events.once('shutdown',()=>{this.input.off('wheel',wheel).off('pointerdown',down).off('pointermove',move).off('pointerup',up);this.drag=undefined;mask.destroy();maskArt.destroy();});
 }
 private drawSelection(){
  this.missions.forEach((mission,index)=>{
   const g=this.tileArt.get(mission.id)!,r=this.layout.slots[index];
   drawInsetCard(g,r.x,r.y,r.width,r.height,1,mission.id===this.selectedLevelId,mission.selectable);
   if(mission.recommended)g.lineStyle(2,0xffe4a0,.9).strokeRoundedRect(r.x+1,r.y+1,r.width-2,r.height-2,8);
   if(mission.finale)g.lineStyle(1,0xd7b66a,.75).strokeRoundedRect(r.x+4,r.y+4,r.width-8,r.height-8,6);
  });
  const selected=this.missions.find(m=>m.id===this.selectedLevelId&&m.selectable);
  this.detailTitle.setText(selected?`Mission ${selected.number} · ${selected.title}`:'Select an available mission');
  this.detailDescription.setText(selected?.description??'Completed missions can be replayed. Locked and pending missions cannot launch.');
  this.detailState.setText(selected?.state==='completed'?'REPLAY MISSION':selected?.recommended?'NEXT RECOMMENDED':'MISSION DETAILS');
  this.briefingLabel.setText(selected?.state==='completed'?'REPLAY · BRIEFING':'REVIEW BRIEFING');
  const b=this.briefingButton.getBounds();drawFantasyButton(this.briefingArt,b.x,b.centerY-20,b.width,40,1,selected?'primary':'disabled');
  if(this.briefingButton.input)this.briefingButton.input.enabled=!!selected;
 }
 private openBriefing(){
  if(this.moved>10||!this.selectedLevelId)return;
  campaignProgress.refresh();
  const selected=this.missions.find(m=>m.id===this.selectedLevelId&&m.selectable);
  if(selected&&campaign.has(selected.id)&&campaignProgress.isUnlocked(campaign.get(selected.id)))this.scene.start('MissionBriefing',{levelId:selected.id,returnTo:this.returnDestination()});
 }
 private returnDestination(){return {scene:'CampaignSelect' as const,data:{chapterId:this.chapterId,...(this.selectedLevelId?{selectedLevelId:this.selectedLevelId}:{})}};}
 private setScroll(value:number){
  this.scroll=campaignScroll(value,this.minScroll);this.cards.y=this.scroll;
  this.missions.forEach((mission,index)=>{const hit=this.levelButtons.get(mission.id);if(hit?.input)hit.input.enabled=campaignCardVisible(this.layout.slots[index],this.scroll,this.clip);});
  this.bar.clear();if(this.minScroll>=0)return;
  const height=this.clip.bottom-this.clip.top,thumb=height*height/(height-this.minScroll),y=this.clip.top+(height-thumb)*this.scroll/this.minScroll;
  this.bar.fillStyle(0xf2cf8b,.18).fillRoundedRect(945,this.clip.top,4,height,2);this.bar.fillStyle(0xf2cf8b,.7).fillRoundedRect(945,y,4,thumb,2);
 }
}
