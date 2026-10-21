import Phaser from 'phaser';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from './fantasyTheme';
import {drawResultAccent,drawResultRule,resultTone} from './resultAccent';
import {mobileResultLayout} from './mobileResultLayout';
type Rect={x:number;y:number;width:number;height:number};
/** Presentation only: the original result hit objects retain their guarded callbacks. */
export class MobileResults {
 readonly container:Phaser.GameObjects.Container;
 readonly layout:ReturnType<typeof mobileResultLayout>;
 private cleanups:Array<()=>void>=[];
 readonly scrolls:Array<{text:Phaser.GameObjects.Text;hit:Phaser.GameObjects.Rectangle;max:number;offset:()=>number}>=[];
 constructor(private scene:Phaser.Scene,parent:Phaser.GameObjects.Container,scale:number,width:number,height:number,data:{victory:boolean;title:string;level:string;summary:string;objectives:string},hits:Phaser.GameObjects.Rectangle[]){
  const p=(n:number)=>n/scale,l=this.layout=mobileResultLayout(width,height,hits.length);
  this.container=scene.add.container();parent.add(this.container);
  const add=<T extends Phaser.GameObjects.GameObject>(o:T)=>{this.container.add(o);return o;};
  const text=(x:number,y:number,value:string,size:number,color:string=FANTASY_TEXT.primary,bold=false)=>add(scene.add.text(p(x),p(y),value,{fontFamily:UI_FONT,fontSize:p(size),color,fontStyle:bold?'bold':'normal'}));
  const frame=add(scene.add.graphics()),accent=add(scene.add.graphics()),rule=add(scene.add.graphics());
  const bounds={x:p(l.frame.x),y:p(l.frame.y),width:p(l.frame.width),height:p(l.frame.height)};
  drawFantasyPanel(frame,bounds,scale);
  const title=text(l.title.x,l.title.y,data.title,26,resultTone(data.victory).text,true).setOrigin(.5,0);
  drawResultAccent(accent,bounds,data.victory,{y:p(l.title.y+15),halfWidth:title.width/2},scale);
  text(l.subtitle.x,l.subtitle.y,data.level||'MATCH RESULTS',width<650?13:15,FANTASY_TEXT.gold,true).setOrigin(.5,0).setWordWrapWidth(p(l.subtitle.width),true).setAlign('center');
  drawResultRule(rule,p(l.frame.x+16),p(l.frame.y+77),p(l.frame.width-32),data.victory,scale);
  for(const [area,label,value] of [[l.summary,'BATTLE SUMMARY',data.summary],[l.objectives,data.level?'MISSION OBJECTIVES':'KEEP STATUS',data.objectives]] as const){
   text(area.x,area.y,label,11,FANTASY_TEXT.gold,true);
   this.scroll({...area,y:area.y+21,height:area.height-21},value,width<650?13:14,scale);
  }
  rule.lineStyle(p(1),0x6d8a99,.3).lineBetween(p(l.objectives.x-10),p(l.summary.y),p(l.objectives.x-10),p(l.summary.y+l.summary.height));
  hits.forEach((hit,i)=>{
   const b=l.buttons[i],g=add(scene.add.graphics());
   drawFantasyButton(g,p(b.x),p(b.y+4),p(b.width),p(40),scale,i?'secondary':'primary');
   hit.setPosition(p(b.x+b.width/2),p(b.y+24)).setSize(p(b.width),p(48)).setDisplaySize(p(b.width),p(48)).setFillStyle(0,0).setStrokeStyle(0).setVisible(true);
   const label=hit.getData('label') as Phaser.GameObjects.Text;
   label.setPosition(hit.x,hit.y).setFontSize(p(12)).setColor(i?FANTASY_TEXT.primary:FANTASY_TEXT.ink).setVisible(true);
   parent.bringToTop(hit);parent.bringToTop(label);
  });
 }
 private scroll(r:Rect,value:string,size:number,scale:number){
  const p=(n:number)=>n/scale,s=this.scene;
  const t=s.add.text(p(r.x),p(r.y),value,{fontFamily:UI_FONT,fontSize:p(size),color:FANTASY_TEXT.primary,wordWrap:{width:p(r.width-12),useAdvancedWrap:true},lineSpacing:p(5)});
  const mask=s.make.graphics({}).fillStyle(0xffffff).fillRect(p(r.x),p(r.y),p(r.width),p(r.height));t.setMask(mask.createGeometryMask());
  const hit=s.add.rectangle(p(r.x),p(r.y),p(r.width),p(r.height),0,0).setOrigin(0).setInteractive();
  this.container.add([t,hit]);const max=Math.max(0,t.height-p(r.height));let offset=0,drag:{id:number;y:number;offset:number}|undefined;
  const bar=s.add.graphics();this.container.add(bar);
  const set=(n:number)=>{offset=Phaser.Math.Clamp(n,0,max);t.y=p(r.y)-offset;bar.clear();if(max>0){const thumb=Math.max(p(18),p(r.height)*p(r.height)/t.height);bar.lineStyle(p(2),0x607c8d,.6).lineBetween(p(r.x+r.width-3),p(r.y),p(r.x+r.width-3),p(r.y+r.height));bar.fillStyle(0xd7b66a,.9).fillRoundedRect(p(r.x+r.width-5),p(r.y)+offset/max*(p(r.height)-thumb),p(4),thumb,p(2));}};
  hit.on('pointerdown',(pointer:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();drag={id:pointer.id,y:pointer.y,offset};});
  hit.on('wheel',(_p:unknown,_x:number,dy:number)=>set(offset+p(dy)));
  const move=(pointer:Phaser.Input.Pointer)=>{if(drag?.id===pointer.id)set(drag.offset+drag.y-pointer.y);};
  const up=()=>{drag=undefined;};s.input.on('pointermove',move).on('pointerup',up).on('pointerupoutside',up);
  this.cleanups.push(()=>{s.input.off('pointermove',move).off('pointerup',up).off('pointerupoutside',up);t.clearMask(true);mask.destroy();});
  this.scrolls.push({text:t,hit,max,offset:()=>offset});set(0);
 }
 destroy(){this.cleanups.splice(0).forEach(fn=>fn());this.container.destroy();}
}
