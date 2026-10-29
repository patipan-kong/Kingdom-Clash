import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignChapters} from '../data/campaignChapters';
import {campaignSelection,type MissionSelectionView} from '../data/campaignSelection';
import {campaignProgress} from '../data/campaignProgressStore';
import {campaignLayout,campaignCardVisible,campaignScroll} from '../ui/campaignLayout';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {missionArt,MISSION_ART_TEXTURES} from '../ui/missionArt';
import {chapterArtFrame,preloadChapterArt} from '../ui/chapterArt';
import {missionCardArt,preloadMissionCardArt} from '../ui/missionCardArt';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawCheck,drawFantasyButton,drawInsetCard,drawLock,drawMedallion,drawPips,FANTASY,FANTASY_TEXT,UI_FONT,type MedallionTone} from '../ui/fantasyTheme';

const FOCUS=0x7fb2d6;

export class CampaignSelect extends Phaser.Scene {
 /** Only real, unlocked/replayable missions get interactive tile targets; a tap opens the Mission Briefing. */
 public levelButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public lockedCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public pendingCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public slotCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public missions:readonly MissionSelectionView[]=[];
 /** The mission the player last opened (set on a tap and restored on return from the Briefing). */
 public selectedLevelId:string|null=null;
 public chapterId='first-war';
 public backButton!:Phaser.GameObjects.Rectangle;
 public cards!:Phaser.GameObjects.Container;
 public warning?:Phaser.GameObjects.Text;
 private layout=campaignLayout(1);
 private clip=this.layout.clip;
 private scroll=0;private minScroll=0;private moved=0;
 /** The mission to mark with the steel-blue ring: only one carried back from a Briefing, never the default pick. */
 private focusId:string|null=null;
 private drag?:{id:number;y:number;scroll:number};
 private bar!:Phaser.GameObjects.Graphics;
 constructor(){super('CampaignSelect');}
 init(data?:{chapterId?:string;selectedLevelId?:string}){
  const chapterId=data?.chapterId??'first-war';
  if(this.chapterId!==chapterId){this.selectedLevelId=null;this.scroll=0;}
  this.chapterId=chapterId;
  if(data?.selectedLevelId!==undefined)this.selectedLevelId=data.selectedLevelId;
  this.focusId=data?.selectedLevelId??null;
 }
 preload(){preloadMenuBackdrop(this);const artwork=campaignChapters.find(c=>c.id===this.chapterId)?.artwork;if(artwork)preloadChapterArt(this,[artwork]);preloadMissionCardArt(this,campaignChapters.find(c=>c.id===this.chapterId)?.slots.map(l=>l.levelId)??[]);for(const key of MISSION_ART_TEXTURES)if(!this.textures.exists(key))this.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.png`);}
 create(){
  campaignProgress.refresh();
  const view=campaignSelection(campaignChapters,campaign.list(),campaignProgress.progress,this.chapterId,this.selectedLevelId??undefined);
  if(!view){this.scene.start('ChapterSelect');return;}
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font;restartOnBreakpoint(this,m.mobile);
  // The chapter's painting replaces the shared battlefield, darkened and vignetted so the cards and header stay readable; no painting, no change.
  const paint=chapterArtFrame(this,view.chapter.chapter.artwork,960,540);
  if(paint){
   this.add.image(480,270,paint.key,paint.frame).setDisplaySize(960,540).setDepth(-95);
   const wash=this.add.graphics().setDepth(-94);wash.fillStyle(0x071622,.66).fillRect(0,0,960,540);
   for(let i=0;i<8;i++){const a=.07*(8-i)/8*2,t=i*14;wash.fillStyle(0x020810,a).fillRect(0,t,960,14).fillRect(0,526-t,960,14).fillRect(t,0,14,540).fillRect(946-t,0,14,540);}
  }
  this.layout=campaignLayout(m.k,view.missions.length);this.clip=this.layout.clip;this.minScroll=this.layout.minScroll;
  this.missions=view.missions;this.selectedLevelId=view.selectedId;this.moved=0;this.drag=undefined;this.warning=undefined;
  this.levelButtons=new Map();this.lockedCards=new Map();this.pendingCards=new Map();this.slotCards=new Map();
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...width?{wordWrap:{width}}:{}});
  // Header: where you are, how far you are, and one line of flavour. The long narrative lives on the Briefing and the chapter card is gone.
  text(32,14,`CHAPTER ${view.chapter.chapter.number}`,f(12,12),FANTASY_TEXT.gold,true);
  text(32,36,view.chapter.chapter.title,30,FANTASY_TEXT.primary,true);
  text(32,76,view.chapter.chapter.subtitle,f(13,12),FANTASY_TEXT.muted);
  const pips=this.add.graphics(),pipWidth=view.chapter.total*12+(view.chapter.total-1)*5;drawPips(pips,928-pipWidth,48,view.chapter.total,view.chapter.completed,12,5);
  this.cards=this.add.container();
  this.missions.forEach((mission,index)=>{
   const frame=this.layout.slots[index],{x,y,width:w,height:h}=frame,open=mission.selectable,next=mission.recommended;
   const art=this.add.graphics();this.cards.add(art);
   drawInsetCard(art,x,y,w,h,1,next,open);
   // A painted card: the illustration fills it, the number sits top-left and the title on the bottom shade; the sprite decoration is skipped.
   const painted=mission.state!=='pending'?missionCardArt(this,mission.id,Math.round(w),h,open):null;
   let top=art;
   if(painted){this.cards.add(this.add.image(x+w/2,y+h/2,painted).setDisplaySize(w,h));top=this.add.graphics();this.cards.add(top);if(next)top.lineStyle(2,FANTASY.goldBright,.92).strokeRoundedRect(x,y,w,h,8);}
   if(next)art.lineStyle(5,FANTASY.gold,.28).strokeRoundedRect(x-1,y-1,w+2,h+2,9);
   // Subdued mission-type sprite on the right; pending slots stay bare. Art is drawn before the text so it never covers it.
   if(mission.state!=='pending'&&!painted){
    const deco=missionArt(campaign.has(mission.id)?campaign.get(mission.id).mission:null,mission.finale),ax=x+w-50;
    const img=this.add.image(ax,y+h-10,deco.texture).setOrigin(.5,1).setScale(deco.height/this.textures.get(deco.texture).getSourceImage().height);
    img.setAlpha(!open?.14:mission.state==='completed'?.34:next?.55:.4);
    if(deco.tint!==undefined)img.setTint(deco.tint);
    if(!open)img.setTint(0x7d8f99);
    this.cards.add(img);
   }
   if(mission.finale)art.lineStyle(1,0xd7b66a,.6).strokeRoundedRect(x+4,y+4,w-8,h-8,6);
   if(this.focusId===mission.id&&open&&!next)art.lineStyle(2,FOCUS,.95).strokeRoundedRect(x+3,y+3,w-6,h-6,6);
   const add=(t:Phaser.GameObjects.Text)=>{this.cards.add(t);return t;};
   // Numbered medallion: a check once cleared, the gold numeral on the next mission, a dim numeral under a padlock otherwise.
   const mr=painted?18:24,mx=x+14+mr,my=painted?y+14+mr:y+h/2,tone:MedallionTone=mission.state==='completed'?'done':next?'next':open?'open':'locked';
   drawMedallion(top,mx,my,mr,tone);
   if(tone==='done')drawCheck(top,mx,my,painted?14:20,0xeafff8);
   else add(text(mx,my,String(mission.number).padStart(2,'0'),f(painted?15:18,painted?13:14),next?FANTASY_TEXT.ink:open?FANTASY_TEXT.primary:'#6f8795',true).setOrigin(.5));
   if(!open)drawLock(top,x+w-20,y+20,15,0x9fb2bd,.8);
   const badge=mission.badge||(mission.finale?'FINALE':''),tx=painted?x+14:x+14+48+14;
   add(text(tx,painted?y+h-(badge?52:18):y+h/2-(badge?7:0),mission.title,f(17,14),open?FANTASY_TEXT.primary:'#8da3af',true,painted?w-28-(open?0:24):w-(tx-x)-84).setOrigin(0,.5));
   if(badge){
    const by=y+h-14,play=badge==='PLAY';
    if(play)top.fillStyle(FANTASY.gold,1).fillTriangle(tx,by-13,tx,by-1,tx+10,by-7);
    add(text(play?tx+16:tx,by,badge,f(12,12),play||badge==='FINALE'?FANTASY_TEXT.gold:FANTASY_TEXT.muted,true).setOrigin(0,1));
   }
   const hit=this.add.rectangle(x+w/2,y+h/2,w,h,0,0);this.cards.add(hit);this.slotCards.set(mission.id,hit);
   if(open){
    hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.openBriefing(mission.id);});
    this.levelButtons.set(mission.id,hit);
   }else (mission.state==='pending'?this.pendingCards:this.lockedCards).set(mission.id,hit);
  });
  const maskArt=this.make.graphics({x:0,y:0},false);maskArt.fillStyle(0xffffff).fillRect(0,this.clip.top,960,this.clip.bottom-this.clip.top);
  const mask=maskArt.createGeometryMask();this.cards.setMask(mask);this.bar=this.add.graphics();
  const art=this.add.graphics();drawFantasyButton(art,32,484,220,40,1,'secondary');
  this.backButton=this.add.rectangle(142,504,220,Math.max(44,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.scene.start('ChapterSelect');});
  text(142,504,'BACK TO CHAPTERS',f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);
  if(!campaignProgress.persistent)this.warning=text(600,504,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true,290).setOrigin(.5);
  // Restore the menu's own scroll on resize and campaign return.
  this.setScroll(this.scroll);
  const wheel=(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.setScroll(this.scroll-dy*.5);
  const down=(p:Phaser.Input.Pointer)=>{this.moved=0;if(p.y>=this.clip.top&&p.y<this.clip.bottom)this.drag={id:p.id,y:p.y,scroll:this.scroll};};
  const move=(p:Phaser.Input.Pointer)=>{if(!this.drag||this.drag.id!==p.id||!p.isDown)return;this.moved=Math.max(this.moved,Math.abs(p.y-this.drag.y));this.setScroll(this.drag.scroll+p.y-this.drag.y);};
  const up=()=>{this.drag=undefined;};
  this.input.on('wheel',wheel).on('pointerdown',down).on('pointermove',move).on('pointerup',up);
  this.events.once('shutdown',()=>{this.input.off('wheel',wheel).off('pointerdown',down).off('pointermove',move).off('pointerup',up);this.drag=undefined;mask.destroy();maskArt.destroy();});
 }
 private openBriefing(id:string){
  campaignProgress.refresh();
  const selected=this.missions.find(m=>m.id===id&&m.selectable);
  if(!selected||!campaign.has(id)||!campaignProgress.isUnlocked(campaign.get(id)))return;
  this.selectedLevelId=id;
  this.scene.start('MissionBriefing',{levelId:id,returnTo:{scene:'CampaignSelect' as const,data:{chapterId:this.chapterId,selectedLevelId:id}}});
 }
 private setScroll(value:number){
  this.scroll=campaignScroll(value,this.minScroll);this.cards.y=this.scroll;
  this.missions.forEach((mission,index)=>{const hit=this.levelButtons.get(mission.id);if(hit?.input)hit.input.enabled=campaignCardVisible(this.layout.slots[index],this.scroll,this.clip);});
  this.bar.clear();if(this.minScroll>=0)return;
  const height=this.clip.bottom-this.clip.top,thumb=height*height/(height-this.minScroll),y=this.clip.top+(height-thumb)*this.scroll/this.minScroll;
  this.bar.fillStyle(0xf2cf8b,.18).fillRoundedRect(945,this.clip.top,4,height,2);this.bar.fillStyle(0xf2cf8b,.7).fillRoundedRect(945,y,4,thumb,2);
 }
}
