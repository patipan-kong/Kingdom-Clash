import Phaser from 'phaser';
import type {MissionSelectionView} from '../data/campaignSelection';
import type {ChapterViewModel} from '../data/chapterView';
import {MobileMenu} from './mobileMenu';import {mobileLevelLayout} from './mobileCampaignLayout';
import {drawInsetCard,drawFantasyButton,FANTASY_TEXT} from './fantasyTheme';
export class MobileLevelSelect {
 readonly cards:Phaser.GameObjects.Container;readonly levelButtons=new Map<string,Phaser.GameObjects.Rectangle>();readonly lockedCards=new Map<string,Phaser.GameObjects.Rectangle>();readonly pendingCards=new Map<string,Phaser.GameObjects.Rectangle>();readonly slotCards=new Map<string,Phaser.GameObjects.Rectangle>();
 readonly backButton:Phaser.GameObjects.Rectangle;readonly briefingButton:Phaser.GameObjects.Rectangle;readonly previous:Phaser.GameObjects.Rectangle;readonly next:Phaser.GameObjects.Rectangle;
 private prevVisual:ReturnType<MobileMenu['button']>;private nextVisual:ReturnType<MobileMenu['button']>;
 private ui:MobileMenu;private pageLabel:Phaser.GameObjects.Text;private briefingArt:Phaser.GameObjects.Graphics;private briefingLabel:Phaser.GameObjects.Text;private page=0;private selectedId:string|null;private layout:ReturnType<typeof mobileLevelLayout>;
 tiles:Array<{id:string;texts:Phaser.GameObjects.Text[];hit:Phaser.GameObjects.Rectangle}>=[];
 constructor(private scene:Phaser.Scene,private missions:readonly MissionSelectionView[],chapter:ChapterViewModel,selected:string|null,private actions:{select:(id:string)=>void;briefing:()=>void;back:()=>void},warning=false){
  this.ui=new MobileMenu(scene);const u=this.ui,{width:w,height:h}=u;this.layout=mobileLevelLayout(w,h,warning);this.selectedId=selected;this.page=Math.max(0,Math.floor(missions.findIndex(m=>m.id===selected)/6));
  const title=u.text(12,6,'CHAPTER '+chapter.chapter.number+' · '+chapter.chapter.title,h<340?14:18,FANTASY_TEXT.gold,true);u.fit(title,w-24,24);
  this.pageLabel=u.text(12,h<340?27:31,'',11,FANTASY_TEXT.muted);
  this.prevVisual=u.button(4,(this.layout.top+this.layout.footer-8)/2-24,48,'‹',()=>this.turn(-1));this.nextVisual=u.button(w-52,(this.layout.top+this.layout.footer-8)/2-24,48,'›',()=>this.turn(1));this.previous=this.prevVisual.hit;this.next=this.nextVisual.hit;for(const c of [this.prevVisual,this.nextVisual])c.text.setFontSize(u.p(28)).setColor(FANTASY_TEXT.gold);
  this.cards=scene.add.container();this.backButton=u.button(12,this.layout.footer,(w-32)*.4,'BACK TO CHAPTERS',actions.back).hit;
  const bx=20+(w-32)*.4,bw=w-12-bx,button=u.button(bx,this.layout.footer,bw,'MISSION BRIEFING',actions.briefing,true,!!selected);this.briefingButton=button.hit;this.briefingArt=button.art;this.briefingLabel=button.text;
  if(warning)u.text(w/2,h-4,"Progress can't be saved in this browser.",11,'#f0b36b',true).setOrigin(.5,1);
  this.render(chapter.completed,chapter.total);
 }
 private turn(delta:number){const page=Phaser.Math.Clamp(this.page+delta,0,Math.max(0,Math.ceil(this.missions.length/6)-1));if(page===this.page)return;this.page=page;this.render();}
 private complete=0;private total=10;
 private render(completed=this.complete,total=this.total){
  this.complete=completed;this.total=total;const u=this.ui,p=u.p;this.cards.removeAll(true);this.tiles=[];for(const map of [this.levelButtons,this.lockedCards,this.pendingCards,this.slotCards])map.clear();
  this.pageLabel.setText(completed+'/'+total+' complete · Page '+(this.page+1)+'/'+Math.max(1,Math.ceil(this.missions.length/6)));
  this.previous.input!.enabled=this.page>0;this.previous.setAlpha(this.page?1:.4);this.next.input!.enabled=(this.page+1)*6<this.missions.length;this.next.setAlpha(this.next.input!.enabled?1:.4);for(const c of [this.prevVisual,this.nextVisual]){const enabled=!!c.hit.input?.enabled;c.art.setAlpha(enabled?1:.4);c.text.setAlpha(enabled?1:.4);}
  this.missions.slice(this.page*6,this.page*6+6).forEach((mission,i)=>{
   const r=this.layout.slots[i],g=this.scene.add.graphics();drawInsetCard(g,p(r.x),p(r.y),p(r.width),p(r.height),u.k,mission.id===this.selectedId,mission.selectable);this.cards.add(g);
   const art=this.scene.add.tileSprite(p(r.x+r.width/2),p(r.y+Math.min(48,r.height*.45)/2+3),p(r.width-6),p(Math.min(48,r.height*.45)),'grass').setTileScale(.3/u.k).setAlpha(mission.selectable?.24:.10);this.cards.add(art);
   if(mission.finale){const keep=this.scene.add.image(p(r.x+r.width-22),p(r.y+25),'base-red').setDisplaySize(p(38),p(42)).setAlpha(.3);this.cards.add(keep);}
   const add=(t:Phaser.GameObjects.Text)=>{this.cards.add(t);return t;};const number=add(u.text(r.x+8,r.y+5,'MISSION '+String(mission.number).padStart(2,'0'),10,FANTASY_TEXT.gold,true));
   const title=add(u.text(r.x+8,r.y+(r.height<90?20:26),mission.title,r.height<90?12:15,FANTASY_TEXT.primary,true,r.width-16));u.fit(title,r.width-16,r.height<68?14:34);
   const status=add(u.text(r.x+8,r.y+r.height-18,mission.status,10,mission.state==='completed'?'#8cebd1':mission.recommended?FANTASY_TEXT.gold:FANTASY_TEXT.muted,true));u.fit(status,r.width-16,14);
   const hit=this.scene.add.rectangle(p(r.x+r.width/2),p(r.y+r.height/2),p(r.width),p(r.height),0,0);this.cards.add(hit);this.slotCards.set(mission.id,hit);
   if(mission.selectable){let owner:number|null=null;hit.setInteractive({useHandCursor:true}).on('pointerdown',(pointer:Phaser.Input.Pointer)=>owner=pointer.id).on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(owner===pointer.id){owner=null;this.selectedId=mission.id;this.actions.select(mission.id);this.render();}}).on('pointerout',()=>owner=null);this.levelButtons.set(mission.id,hit);}else (mission.state==='pending'?this.pendingCards:this.lockedCards).set(mission.id,hit);
   this.tiles.push({id:mission.id,texts:[number,title,status],hit});
  });
  const selected=this.missions.find(m=>m.id===this.selectedId&&m.selectable),b=this.briefingButton.getBounds();drawFantasyButton(this.briefingArt,b.x,b.y+this.ui.p(4),b.width,this.ui.p(40),this.ui.k,selected?'primary':'disabled');if(this.briefingButton.input)this.briefingButton.input.enabled=!!selected;this.briefingLabel.setText(selected?'MISSION BRIEFING · '+String(selected.number).padStart(2,'0'):'SELECT A MISSION');u.fit(this.briefingLabel,b.width*u.k-12,36);
 }
}
