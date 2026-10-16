import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import {nextLevelXp,upgradeRules,type GuardianUpgrade} from '../data/progression';
import {SkillsModel,skillOrder,allocationState} from './skillsModel';
import {skillsLayout} from './skillsLayout';
import {compactControlFrame,drawDivider,drawFantasyButton,drawFantasyPanel,drawInsetCard,FANTASY,FANTASY_TEXT,UI_FONT,type ButtonTone,type ControlVariant} from './fantasyTheme';
const WHITE=FANTASY_TEXT.primary,MUTED=FANTASY_TEXT.muted;
const effects:Record<GuardianUpgrade,string>={bash:'Stun one nearby enemy',taunt:'Draw nearby enemies to you',charge:'Charge; stops at blockers',zone:'Shield allies in a protective zone',fortitude:'More health and armor'};
type Row={skill:GuardianUpgrade;card:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Rectangle;title:Phaser.GameObjects.Text;effect:Phaser.GameObjects.Text;label:Phaser.GameObjects.Text;action:Phaser.GameObjects.Text;cost:Phaser.GameObjects.Text;icon?:Phaser.GameObjects.Image;passive?:Phaser.GameObjects.Text};
export class SkillsPanel {
 readonly model=new SkillsModel();readonly container:Phaser.GameObjects.Container;readonly rows:Row[]=[];
 readonly heading:Phaser.GameObjects.Text;readonly progress:Phaser.GameObjects.Text;readonly status:Phaser.GameObjects.Text;
 readonly closeHit:Phaser.GameObjects.Rectangle;readonly previous:Phaser.GameObjects.Rectangle;readonly next:Phaser.GameObjects.Rectangle;
 bounds={x:0,y:0,width:0,height:0};compact=true;
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;private scale=1;private top=0;private utilityX=0;
 private controls:Array<{hit:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;pointer:number|null}>=[];
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,close:()=>void){
  this.container=scene.add.container(0,0).setDepth(500).setVisible(false);this.bg=scene.add.graphics();
  this.blocker=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.container.add([this.bg,this.blocker]);
  this.heading=this.text('',16,true);this.progress=this.text('',12);this.status=this.text('',12);
  this.closeHit=this.button('Close',close);this.previous=this.button('‹',()=>this.model.move(-1));this.next=this.button('›',()=>this.model.move(1));
  for(const skill of skillOrder){
   const card=scene.add.graphics();this.container.add(card);
   const title=this.text('',12,true),effect=this.text(effects[skill],12),label=this.text('',12);
   const hit=this.button('',()=>{const c=this.model.request(this.sim(),skill,performance.now());if(c)this.sim().send(c);});
   const action=this.controls.find(c=>c.hit===hit)!.label,cost=this.text('',12).setOrigin(.5);
   const icon=skill==='fortitude'?undefined:scene.add.image(0,0,`ability-${skill}`).setOrigin(0);
   const passive=skill==='fortitude'?this.text('P',16,true).setOrigin(.5):undefined;
   if(icon)this.container.add(icon);this.rows.push({skill,card,hit,title,effect,label,action,cost,icon,passive});
  }
  this.container.bringToTop(this.status);
  const release=(p?:Phaser.Input.Pointer)=>{for(const c of this.controls)if(!p||p.id===c.pointer)c.pointer=null;};
  scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);const cancel=()=>release();
  for(const name of ['pointercancel','touchcancel','blur'])window.addEventListener(name,cancel);
  scene.game.events.on('clear-controls',cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);scene.game.events.off('clear-controls',cancel);for(const name of ['pointercancel','touchcancel','blur'])window.removeEventListener(name,cancel);});
 }
 private text(value:string,size:number,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(value:string,fn:()=>void){
  const art=this.scene.add.graphics();this.container.add(art);const hit=this.scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});this.container.add(hit);const label=this.text(value,12,true).setOrigin(.5),c={hit,art,label,pointer:null as number|null};this.controls.push(c);
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled&&c.pointer===null)c.pointer=p.id;});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const activate=c.pointer===p.id&&hit.input?.enabled;c.pointer=null;if(activate){fn();this.render();}});return hit;
 }
 open(){this.model.open();this.container.setVisible(true);this.render();}
 hide(){this.container.setVisible(false);for(const c of this.controls)c.pointer=null;}
 layout(scale:number,top:number,utilityX:number){this.scale=scale;this.top=top;this.utilityX=utilityX;for(const c of this.controls)c.pointer=null;this.render();}
 private control(hit:Phaser.GameObjects.Rectangle,x:number,y:number,w:number,h:number,label:string,enabled=true,primary=false,tone?:ButtonTone,variant:ControlVariant='secondaryCompact'){
  const c=this.controls.find(c=>c.hit===hit)!,p=(n:number)=>n/this.scale,visual=compactControlFrame(x,y,w,h,this.scale,variant);
  hit.setVisible(true).setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setFillStyle(0,0);hit.input!.enabled=enabled;c.art.setVisible(true);
  drawFantasyButton(c.art,visual.x,visual.y,visual.width,visual.height,this.scale,!enabled?'disabled':tone??(primary?'primary':'secondary'),c.pointer!==null);
  c.label.setVisible(true).setPosition(visual.x+visual.width/2,visual.y+visual.height/2+(c.pointer!==null?p(1):0)).setFontSize(p(12)).setText(label).setColor(primary&&enabled?FANTASY_TEXT.ink:enabled?WHITE:MUTED);
 }
 render(){
  const sim=this.sim();this.model.sync(sim);if(!this.container.visible||!this.utilityX)return;
  const f=skillsLayout(this.scale,this.top,this.utilityX),p=(n:number)=>n/this.scale;this.bounds={x:f.x,y:f.y,width:f.width,height:f.height};this.compact=f.compact;
  this.scene.game.events.emit('shop-obstruction',this.bounds);
  drawFantasyPanel(this.bg,f,this.scale);drawDivider(this.bg,f.x+p(10),f.y+p(f.compact?52:56),f.width-p(20),this.scale);
  this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  const left=f.x+p(8),inner=f.width-p(16),progression=sim.state.heroProgression,next=nextLevelXp(progression.level);
  this.heading.setPosition(left,f.y+p(7)).setFontSize(p(16)).setText(f.compact?`SKILLS · ${progression.skillPoints} ${progression.skillPoints===1?'POINT':'POINTS'}`:`SKILLS · ${progression.skillPoints} SKILL ${progression.skillPoints===1?'POINT':'POINTS'}`).setColor(FANTASY_TEXT.gold);
  this.progress.setPosition(left,f.y+p(f.compact?58:34)).setFontSize(p(12)).setText(`LV ${progression.level} · ${next?`XP ${progression.xp} / ${next}`:'XP MAX'} · Combat continues`);
  this.control(this.closeHit,f.x+f.width-p(72),f.y+p(8),p(64),p(48),'Close',true,false,undefined,'iconCompact');
  for(const c of this.controls.slice(1)){c.hit.setVisible(false);c.art.setVisible(false);c.hit.input!.enabled=false;c.label.setVisible(false);}
  for(const [i,row] of this.rows.entries()){
   const a=allocationState(sim,row.skill),visible=!f.compact||this.model.selected===i,rules=upgradeRules[row.skill];
   const objects=[row.card,row.title,row.effect,row.label,row.hit,row.action,row.cost,row.icon,row.passive];for(const o of objects)o?.setVisible(visible);
   if(!visible){row.hit.input!.enabled=false;continue;}
   const passive=row.skill==='fortitude',x=f.compact?left:left+(i%2)*(inner+p(8))/2,y=f.compact?f.y+p(76):f.y+p(64+(i<2?0:i<4?96:192));
   const w=f.compact||passive?inner:(inner-p(8))/2,h=p(f.compact?72:passive?72:88);
   drawInsetCard(row.card,x,y,w,h,this.scale,f.compact||this.model.selected===i,a.available);
   if(row.icon)row.icon.setPosition(x+p(4),y+p(4)).setDisplaySize(p(32),p(32)).setAlpha(a.available?1:.65);
   row.passive?.setPosition(x+p(20),y+p(20)).setFontSize(p(16)).setColor(`#${FANTASY.gold.toString(16).padStart(6,'0')}`);
   row.title.setPosition(x+p(42),y+p(4)).setFontSize(p(12)).setText(`${passive?'':rules.key+' · '}${rules.name}${passive?' · Passive':''}`);
   row.label.setPosition(x+p(42),y+p(22)).setFontSize(p(12)).setText(f.compact?`Rank ${a.rank}/${a.max} · ${a.gate===undefined?'Max':`LV${a.gate}`} · ${i+1}/5`:`Rank ${a.rank}/${a.max}${a.gate===undefined?'':` · ${a.rank?'Next':'Available'} LV${a.gate}`}`);
   row.effect.setPosition(x+p(4),y+p(42)).setFontSize(p(12)).setWordWrapWidth(f.compact?w-p(8):w-p(108),true).setColor(MUTED);
   const pending=!!this.model.pending,enabled=a.available&&!pending&&!sim.clock.paused&&!sim.ended;
   const text=pending&&this.model.pending?.skill===row.skill?'Pending…':a.available?(a.rank?'Upgrade':'Learn'):a.state;
   const hx=f.compact?left+p(52):x+w-p(96),hy=f.compact?f.y+p(176):y+p(passive?16:38),hw=f.compact?inner-p(104):p(92);
   const actionFrame=compactControlFrame(hx,hy,hw,p(48),this.scale,'skillCompact');this.control(row.hit,hx,hy,hw,p(48),text,enabled,true,undefined,'skillCompact');row.action.setY(actionFrame.y+p(a.available&&!pending?10:20));row.cost.setPosition(actionFrame.x+actionFrame.width/2,actionFrame.y+p(27)).setFontSize(p(12)).setText(a.available&&!pending?'1 point':'').setColor(enabled?'#102536':MUTED);
  }
  const a=allocationState(sim,skillOrder[this.model.selected]),gate=a.gate===undefined?'Max rank':`Requires LV${a.gate} · 1 point`;
  this.status.setPosition(left,f.y+p(f.compact?148:328)).setFontSize(p(12)).setWordWrapWidth(inner,true).setText(this.model.message||(f.compact?gate:progression.level===1&&progression.skillPoints?'Spend your point to learn a skill.':'Each upgrade costs 1 skill point.')).setColor(this.model.pending?'#94d4ff':MUTED);
  if(f.compact){this.control(this.previous,left,f.y+p(176),p(48),p(48),'‹',true,false,undefined,'iconCompact');this.control(this.next,left+inner-p(48),f.y+p(176),p(48),p(48),'›',true,false,undefined,'iconCompact');}
 }
}
