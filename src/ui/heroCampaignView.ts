import type Phaser from 'phaser';
import type {campaignSelection} from '../data/campaignSelection';
import {chapterArtFrame} from './chapterArt';
import {heroCampaignLayout} from './heroCampaignLayout';
import {drawCheck,drawLock,drawPips,FANTASY_TEXT,UI_FONT} from './fantasyTheme';
import {drawOrnateMenuPanel,drawOrnateMenuButton,drawMenuRule,finishMenuTitle,MENU_TITLE_FONT} from './menuArt';

export const HERO_CHAPTER='rise-of-the-heroes';
export const HERO_DESCRIPTION='Unite with Allied Heroes and rally a new force against the darkness.';
type Selection=NonNullable<ReturnType<typeof campaignSelection>>;
export function buildHeroCampaign(scene:Phaser.Scene,input:{view:Selection;k:number;font:(px:number,css?:number)=>number;onBriefing:(id:string)=>void;onBack:()=>void;persistent?:boolean}){
 const {view,k,font:f}=input,p=(n:number)=>n/k,layout=heroCampaignLayout(k),{frame,left,right,slots}=layout;
 const levelButtons=new Map<string,Phaser.GameObjects.Rectangle>(),lockedCards=new Map<string,Phaser.GameObjects.Rectangle>(),pendingCards=new Map<string,Phaser.GameObjects.Rectangle>(),slotCards=new Map<string,Phaser.GameObjects.Rectangle>(),labels=new Map<string,Phaser.GameObjects.Text>();
 const text=(x:number,y:number,value:string,size:number,color:string=FANTASY_TEXT.primary,bold=false,width?:number)=>scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:size+'px',color,fontStyle:bold?'bold':'normal',...(width?{wordWrap:{width},align:'center' as const}:{})}).setResolution(Math.min(3,devicePixelRatio||1));
 scene.cameras.main.setBackgroundColor('#071725');const bg=scene.add.graphics();bg.fillStyle(0x071725,1).fillRect(0,0,960,540);drawOrnateMenuPanel(scene.add.graphics(),frame,k,false);
 const headerY=frame.y/2;const heading=text(480,headerY,'MISSION SELECT',Math.min(f(30,22),p(32)),FANTASY_TEXT.gold,true).setOrigin(.5);finishMenuTitle(heading,k);
 drawOrnateMenuButton(scene.add.graphics(),p(14),headerY-p(17),p(88),p(34),k,false);const backButton=scene.add.rectangle(p(58),headerY,p(96),p(48),0,0).setInteractive({useHandCursor:true}).on('pointerup',input.onBack);
 text(p(58),headerY,'‹ BACK',f(16,14),FANTASY_TEXT.primary,true).setOrigin(.5);
 const artHeight=left.height*.57,paint=chapterArtFrame(scene,'heroes',left.width,artHeight);
 if(paint)scene.add.image(left.x+left.width/2,left.y+artHeight/2,paint.key,paint.frame).setDisplaySize(left.width,artHeight).setName('hero-campaign-art');
 const shade=scene.add.graphics();for(let i=0;i<20;i++){shade.fillStyle(0x071b2b,i/19*.94).fillRect(left.x,left.y+artHeight*.65+i*artHeight*.35/20,left.width,artHeight*.35/20+.2);}
 const short=left.height*k<270;
 const chapterTag=text(left.x+left.width/2,left.y+left.height*(short?.59:.53),input.persistent===false?'CHAPTER 5 • NOT SAVED':'CHAPTER 5',f(15,12),input.persistent===false?FANTASY_TEXT.warning:FANTASY_TEXT.gold,true).setOrigin(.5);
 const title=text(left.x+left.width/2,left.y+left.height*(short?.75:.665),'RISE OF THE HEROES',f(28,18),FANTASY_TEXT.gold,true,left.width-p(18)).setOrigin(.5).setFontFamily(MENU_TITLE_FONT);finishMenuTitle(title,k);
 if(!short)text(left.x+left.width/2,left.y+left.height*.83,HERO_DESCRIPTION,f(15,12),FANTASY_TEXT.primary,false,left.width-p(20)).setOrigin(.5);
 const progressY=left.y+left.height-p(10),progressArt=scene.add.graphics();drawMenuRule(progressArt,left.x+p(10),progressY-p(12),left.width-p(20),k);
 const progressTitle=text(left.x+p(8),progressY,'Progress',f(13,12),FANTASY_TEXT.primary,true).setOrigin(0,.5);
 drawPips(progressArt,progressTitle.x+progressTitle.width+p(8),progressY-p(3.5),view.chapter.total,view.chapter.completed,p(7),p(4));
 const progressLabel=text(left.x+left.width-p(8),progressY,view.chapter.completed+' / '+view.chapter.total,f(13,12),FANTASY_TEXT.gold,true).setOrigin(1,.5).setName('hero-progress');
 const list=scene.add.container();let scroll=0,moved=0,drag:{id:number;y:number;scroll:number}|undefined;
 const selectedId=view.selectedId;
 view.missions.forEach((mission,i)=>{
  const s=slots[i],cx=s.x+s.width/2,cy=s.y+s.height/2,open=mission.selectable,art=scene.add.graphics();list.add(art);
  drawOrnateMenuButton(art,s.x,s.y+p(2),s.width,s.height-p(4),k,false);
  if(!open)art.fillStyle(0x162735,.7).fillRect(s.x+p(2),s.y+p(3),s.width-p(4),s.height-p(6));
  if(mission.id===selectedId){art.lineStyle(p(3),0xffd779,.24).strokeRoundedRect(s.x-p(1),s.y+p(1),s.width+p(2),s.height-p(2),p(7));art.lineStyle(p(1.5),0xffe4a0,1).strokeRoundedRect(s.x,s.y+p(2),s.width,s.height-p(4),p(7));}
  art.lineStyle(p(1),open?0xd9b86b:0x7c8e98,1).strokeRoundedRect(s.x+p(9),cy-p(15),p(29),p(30),p(4));
  list.add(text(s.x+p(23.5),cy,'M'+mission.number,Math.min(f(16,13),p(16)),open?FANTASY_TEXT.gold:FANTASY_TEXT.muted,true).setOrigin(.5));
  const title=mission.state==='pending'?'Coming Soon':mission.title,availableWidth=s.width-p(123);
  const label=text(s.x+p(48),cy,title,f(18,14),open?FANTASY_TEXT.primary:FANTASY_TEXT.muted,true).setOrigin(0,.5);
  if(label.width>availableWidth){label.setWordWrapWidth(availableWidth).setAlign('left');}list.add(label);labels.set(mission.id,label);
  if(mission.state==='completed'){drawCheck(art,s.x+s.width-p(20),cy,p(13),0x8cebd1);list.add(text(s.x+s.width-p(34),cy,'REPLAY',f(12,10),'#8cebd1',true).setOrigin(1,.5));}
  else if(!open)drawLock(art,s.x+s.width-p(22),cy,p(16),0xa6b2bb,.95);
  else list.add(text(s.x+s.width-p(13),cy,mission.recommended?'PLAY':'READY',f(12,10),FANTASY_TEXT.gold,true).setOrigin(1,.5));
  const hit=scene.add.rectangle(cx,cy,s.width,s.height,0,0);list.add(hit);slotCards.set(mission.id,hit);
  if(open){hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(moved<=10)input.onBriefing(mission.id);});levelButtons.set(mission.id,hit);}else (mission.state==='pending'?pendingCards:lockedCards).set(mission.id,hit);
 });
 const maskArt=scene.make.graphics({x:0,y:0},false);maskArt.fillStyle(0xffffff).fillRect(right.x,right.y,right.width,right.height);const mask=maskArt.createGeometryMask();list.setMask(mask);
 const bar=scene.add.graphics();
 const setScroll=(value:number)=>{scroll=Math.max(layout.minScroll,Math.min(0,value));list.y=scroll;view.missions.forEach((m,i)=>{const h=levelButtons.get(m.id),s=slots[i];if(h?.input)h.input.enabled=s.y+scroll>=right.y-.1&&s.y+s.height+scroll<=right.y+right.height+.1;});bar.clear();if(layout.minScroll<0){const track=right.height,thumb=track*track/(track-layout.minScroll);bar.fillStyle(0xe8c878,.65).fillRoundedRect(right.x+right.width-p(2),right.y+(track-thumb)*scroll/layout.minScroll,p(2),thumb,p(1));}};setScroll(0);
 const selectedIndex=view.missions.findIndex(m=>m.id===selectedId);if(selectedIndex>=0&&slots[selectedIndex].y+slots[selectedIndex].height>right.y+right.height)setScroll(right.y+right.height-slots[selectedIndex].y-slots[selectedIndex].height);
 const wheel=(pointer:Phaser.Input.Pointer,_objects:unknown,_dx:number,dy:number)=>{if(pointer.x>=right.x&&pointer.y>=right.y&&pointer.y<=right.y+right.height)setScroll(scroll-dy*.5);};
 const down=(pointer:Phaser.Input.Pointer)=>{moved=0;if(pointer.x>=right.x&&pointer.y>=right.y&&pointer.y<=right.y+right.height)drag={id:pointer.id,y:pointer.y,scroll};};
 const move=(pointer:Phaser.Input.Pointer)=>{if(!drag||drag.id!==pointer.id||!pointer.isDown)return;moved=Math.max(moved,Math.abs(pointer.y-drag.y));setScroll(drag.scroll+pointer.y-drag.y);};const up=()=>{drag=undefined;};
 scene.input.on('wheel',wheel).on('pointerdown',down).on('pointermove',move).on('pointerup',up);scene.events.once('shutdown',()=>{scene.input.off('wheel',wheel).off('pointerdown',down).off('pointermove',move).off('pointerup',up);mask.destroy();maskArt.destroy();});
 return {warning:input.persistent===false?chapterTag:undefined,levelButtons,lockedCards,pendingCards,slotCards,labels,backButton,layout,list,progressLabel,selectedId,scrollTo:(index:number)=>setScroll(right.y-slots[index].y)};
}
