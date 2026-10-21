import Phaser from 'phaser';import type {LevelDefinition} from '../data/campaign';
import {MobileMenu} from './mobileMenu';import {mobileBriefingLayout} from './mobileCampaignLayout';import {drawFantasyPanel,FANTASY_TEXT} from './fantasyTheme';
export class MobileBriefing {
 readonly startButton:Phaser.GameObjects.Rectangle;readonly backButton:Phaser.GameObjects.Rectangle;readonly moreButton:Phaser.GameObjects.Rectangle;
 readonly title:Phaser.GameObjects.Text;readonly description:ReturnType<MobileMenu['scrollText']>;readonly objectiveText:ReturnType<MobileMenu['scrollText']>;
 private ui:MobileMenu;private details?:Phaser.GameObjects.Container;private detailScroll?:ReturnType<MobileMenu['scrollText']>;private detailsOpen=false;private closeButton?:Phaser.GameObjects.Rectangle;
 constructor(private scene:Phaser.Scene,private level:LevelDefinition,private objectives:readonly string[],private defeat:string,actions:{start:()=>void;back:()=>void;backLabel:string}){
  const u=this.ui=new MobileMenu(scene),{width:w,height:h,p,k}=u,f=mobileBriefingLayout(w,h);
  u.text(12,10,'CHAPTER '+level.chapter+' · MISSION '+level.number,h<340?14:18,FANTASY_TEXT.gold,true);
  for(const r of [f.left,f.right]){const g=scene.add.graphics();drawFantasyPanel(g,{x:p(r.x),y:p(r.y),width:p(r.width),height:p(r.height)},k);}
  scene.add.image(p(f.left.x+f.left.width*.68),p(f.left.y+f.left.height-8),'base-red').setOrigin(.5,1).setDisplaySize(p(Math.min(110,f.left.width*.45)),p(Math.min(140,f.left.height*.7))).setAlpha(.22);
  this.title=u.text(f.left.x+12,f.left.y+12,level.display.title,h<340?18:24,FANTASY_TEXT.primary,true,f.left.width-24);u.fit(this.title,f.left.width-24,54);
  const descY=this.title.y*k+this.title.height*k+8;this.description=u.scrollText(f.left.x+12,descY,f.left.width-24,Math.max(40,f.left.y+f.left.height-12-descY),level.display.description,12);
  u.text(f.right.x+12,f.right.y+10,'PRIMARY OBJECTIVES',h<340?11:13,FANTASY_TEXT.gold,true);
  this.objectiveText=u.scrollText(f.right.x+12,f.right.y+34,f.right.width-24,Math.max(24,f.right.height-98),objectives.map(o=>'◆ '+o).join('\n\n'),12);
  this.moreButton=u.button(f.right.x+8,f.right.y+f.right.height-56,f.right.width-16,'MORE DETAILS',()=>this.showDetails()).hit;
  const backWidth=(w-32)*.4;this.backButton=u.button(12,f.footer,backWidth,actions.backLabel,actions.back).hit;this.startButton=u.button(20+backWidth,f.footer,w-32-backWidth,'START BATTLE',actions.start,true).hit;
 }
 private showDetails(){
  if(this.detailsOpen)return;this.detailsOpen=true;const u=this.ui,{width:w,height:h,p,k}=u,top=48,height=h-112;const before=this.scene.children.list.length;
  const art=this.scene.add.graphics();drawFantasyPanel(art,{x:p(12),y:p(top),width:p(w-24),height:p(height)},k);u.text(24,top+12,'MISSION DETAILS',14,FANTASY_TEXT.gold,true);
  this.closeButton=u.button(w-132,top,108,'CLOSE DETAILS',()=>this.hideDetails()).hit;
  const value=this.level.display.briefing+'\n\nPRIMARY OBJECTIVES\n'+this.objectives.map(o=>'◆ '+o).join('\n')+'\n\nVICTORY REQUIREMENT\n'+(this.level.mission?'Complete all primary objectives.':'Destroy the Crimson Keep.')+'\n\nDEFEAT CONDITION\n'+this.defeat+(this.level.display.strategy?'\n\nTIP\n'+this.level.display.strategy:'');
  this.detailScroll=u.scrollText(24,top+50,w-48,Math.max(32,height-60),value,12);
  const objects=this.scene.children.list.slice(before);this.details=this.scene.add.container(0,0,objects).setDepth(50);
 }
 private hideDetails(){this.detailScroll?.destroy();this.detailScroll=undefined;this.details?.destroy(true);this.details=undefined;this.detailsOpen=false;}
}
