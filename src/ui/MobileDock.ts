import Phaser from 'phaser';
import {mobileHud,logicalRect,type HudRect} from './mobileHudLayout';
import {gameTransform} from './viewport';
import {drawFantasyPanel,drawFantasyButton,compactControlFrame,drawDivider,FANTASY_TEXT} from './fantasyTheme';
export type DockView={icon?:string;key?:string;details?:boolean;build?:boolean;choices?:Array<{icon?:string;label:string;enabled:boolean;activate:()=>void}>;title:string;text:string;action:string;enabled:boolean;activate:()=>void;previous:()=>void;next:()=>void;mode?:string;changeMode?:()=>void;hero?:()=>void};
/** Presentation adapter only: commands remain owned by each existing panel/model. */
export class MobileDock {
 readonly container:Phaser.GameObjects.Container;
 readonly buttons:Phaser.GameObjects.Rectangle[]=[];
 bounds:HudRect={x:0,y:0,width:0,height:0};minimized=false;restored=false;
 private icon:Phaser.GameObjects.Image;private choiceIcons:Phaser.GameObjects.Image[]=[];private bg:Phaser.GameObjects.Graphics;private title:Phaser.GameObjects.Text;private body:Phaser.GameObjects.Text;private hint:Phaser.GameObjects.Text;
 private bodyHit:Phaser.GameObjects.Rectangle;private mask:Phaser.GameObjects.Graphics;
 private controls:Array<{art:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text;pointer:number|null;fn:()=>void;pressedAction?:()=>void}>=[];
 private scroll=0;private signature='';private drag?:{id:number;y:number;scroll:number};private bodyRect:HudRect={x:0,y:0,width:0,height:0};private scale=1;
 constructor(private scene:Phaser.Scene,private close:()=>void){
  this.container=scene.add.container(0,0);this.bg=scene.add.graphics();this.container.add(this.bg);
  const blocker=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive();this.container.add(blocker);blocker.on('pointerdown',(_p:unknown,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.blocker=blocker;
  this.title=this.text().setStyle({fontStyle:'bold',color:'#f4d58e'});this.body=this.text();this.hint=this.text().setOrigin(1,1).setColor('#a5edff');
  this.icon=scene.add.image(0,0,'hud-build').setVisible(false);this.container.add(this.icon);for(let i=0;i<2;i++){const icon=scene.add.image(0,0,'wall').setVisible(false);this.choiceIcons.push(icon);this.container.add(icon);}
  this.mask=scene.make.graphics({});this.body.setMask(this.mask.createGeometryMask());
  this.bodyHit=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive();this.container.add(this.bodyHit);
  this.bodyHit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.drag={id:p.id,y:p.y,scroll:this.scroll};});
  this.bodyHit.on('wheel',(_p:unknown,_x:number,dy:number)=>{this.scroll+=dy;this.positionBody();});
  for(let i=0;i<8;i++){const art=scene.add.graphics(),hit=scene.add.rectangle(0,0,1,1,0,0).setInteractive(),label=this.text().setOrigin(.5);this.container.add([art,hit,label]);this.container.bringToTop(label);const c={art,hit,label,pointer:null as number|null,fn:()=>{},pressedAction:undefined as (()=>void)|undefined};this.controls.push(c);this.buttons.push(hit);
   hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled){c.pointer=p.id;c.pressedAction=c.fn;}});
   hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const ok=c.pointer===p.id&&hit.input?.enabled;c.pointer=null;if(ok)c.pressedAction?.();});
  }
  const move=(p:Phaser.Input.Pointer)=>{if(this.drag?.id===p.id){this.scroll=this.drag.scroll+this.drag.y-p.y;this.positionBody();}};
  const release=()=>{this.drag=undefined;for(const c of this.controls)c.pointer=null;};
  scene.input.on('pointermove',move);scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);scene.game.events.on('clear-controls',release);scene.game.events.on('pause-visual',release);
  scene.events.once('shutdown',()=>{scene.input.off('pointermove',move);scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);scene.game.events.off('clear-controls',release);scene.game.events.off('pause-visual',release);this.mask.destroy();});
 }
 private blocker:Phaser.GameObjects.Rectangle;
 private text(){const t=this.scene.add.text(0,0,'',{fontFamily:'Arial, sans-serif',fontSize:'12px',color:'#fff3d3'});this.container.add(t);return t;}
 reset(){this.minimized=false;this.restored=false;this.scroll=0;this.signature='';}
 minimize(y:number){if(this.restored)return;this.minimized=true;this.minimizedY=y;}
 private minimizedY=0;
 private positionBody(){const r=this.bodyRect;this.scroll=Phaser.Math.Clamp(this.scroll,0,Math.max(0,this.body.height-r.height));this.body.setPosition(r.x,r.y-this.scroll);this.hint.setVisible(!this.minimized&&this.body.height>r.height).setText(this.scroll>0?'↕ Scroll':'↓ Scroll');}
 render(view:DockView,collapsed=false,override?:HudRect){
  const mobile=mobileHud(this.scene);if(!mobile)return;this.scale=gameTransform(this.scene.game).scale;const s=this.scale,p=(n:number)=>n/s;
  this.body.setFontSize(p(12)).setWordWrapWidth(p(mobile.dock.width-16-(view.icon?40:0)),true).setText(view.text);
  const contentHeight=Math.min(mobile.dock.height,Math.max(192,128+(view.choices?64:Math.max(48,this.body.height*s))));
  const css=override??(this.minimized?{...mobile.dock,y:this.minimizedY,height:48}:collapsed?{x:mobile.dock.x,y:mobile.height-136,width:248,height:112}:{...mobile.dock,height:contentHeight});
  const f=this.bounds=logicalRect(css,s),left=f.x+p(view.details?16:8),inner=f.width-p(view.details?32:16);this.container.setVisible(true);
  drawFantasyPanel(this.bg,f,s);this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  this.title.setPosition(left,f.y+p(this.minimized?8:12)).setFontSize(p(13)).setWordWrapWidth(p(view.hero?64:120),true).setText(view.title);
  const control=(i:number,x:number,y:number,w:number,label:string,fn:()=>void,enabled=true,cssHeight=48)=>{const c=this.controls[i];c.hit.setPosition(x+w/2,y+p(cssHeight/2)).setSize(w,p(cssHeight)).setDisplaySize(w,p(cssHeight)).setVisible(true);c.hit.input!.enabled=enabled;c.fn=fn;const visual=compactControlFrame(x,y,w,p(cssHeight),s,cssHeight>48?'card':'secondaryCompact');drawFantasyButton(c.art,visual.x,visual.y,visual.width,visual.height,s,!enabled?'disabled':i===3?'primary':i===0?'selected':'secondary');c.art.setVisible(true);c.label.setColor(i===3&&enabled?FANTASY_TEXT.ink:FANTASY_TEXT.primary).setPosition(x+w/2,y+p(cssHeight/2)).setFontSize(p(12)).setText(label).setVisible(true);};
  for(const c of this.controls){c.hit.setVisible(false);c.hit.input!.enabled=false;c.art.setVisible(false);c.label.setVisible(false);}
  if(!view.details){control(0,left+inner-p(48),f.y+(this.minimized?0:p(8)),p(48),'Fight',()=>{this.scene.game.events.emit('clear-controls');this.close();});
  if(!collapsed)control(1,left+inner-p(104),f.y+(this.minimized?0:p(8)),p(48),this.minimized?'Open':view.mode??'Info',()=>{if(this.minimized){this.minimized=false;this.restored=true;}else view.changeMode?.();},this.minimized||!!view.changeMode);}
  if(view.hero&&!this.minimized&&!collapsed)control(5,left+inner-p(160),f.y+p(8),p(48),'Hero',view.hero);
  const footer=f.y+f.height-p(view.details?64:56),bodyY=f.y+p(view.details?72:64),height=Math.max(0,footer-p(8)-bodyY);
  const bodyLeft=left+p(view.icon?40:0),bodyWidth=inner-p(view.icon?40:0);this.bodyRect={x:bodyLeft,y:bodyY,width:bodyWidth,height};this.body.setFontSize(p(12)).setWordWrapWidth(bodyWidth,true).setText(view.text).setVisible(!this.minimized&&!collapsed);
  const signature=[view.key,view.title,view.text,view.action].join('|');
  if(this.signature!==signature){this.scroll=0;this.signature=signature;this.drag=undefined;for(const c of this.controls)c.pointer=null;}
  this.icon.setVisible(!!view.icon&&!this.minimized&&!collapsed);if(view.icon)this.icon.setTexture(view.icon).setPosition(left+p(18),bodyY+p(20)).setDisplaySize(p(36),p(36));this.choiceIcons.forEach(icon=>icon.setVisible(false));
  if(!this.minimized&&!collapsed)drawDivider(this.bg,left,bodyY-p(4),inner,s);
  this.mask.clear().fillStyle(0xffffff).fillRect(left,bodyY,inner,height);this.bodyHit.setPosition(left,bodyY).setSize(inner,height).setDisplaySize(inner,height).setVisible(!this.minimized&&!collapsed);this.bodyHit.input!.enabled=!this.minimized&&!collapsed;
  this.hint.setPosition(left+inner,bodyY+height).setFontSize(p(12));this.positionBody();if(collapsed)this.hint.setVisible(false);
  if(view.choices&&!this.minimized&&!collapsed){this.body.setVisible(false);this.bodyHit.setVisible(false);this.bodyHit.input!.enabled=false;this.hint.setVisible(false);view.choices.forEach((choice,i)=>{const width=(inner-p(8))/2,x=left+i*(width+p(8));control(6+i,x,bodyY,width,choice.label,choice.activate,choice.enabled,64);this.controls[6+i].label.setPosition(x+width/2,bodyY+p(46));this.container.bringToTop(this.choiceIcons[i]);if(choice.icon)this.choiceIcons[i].setTexture(choice.icon).setPosition(x+width/2,bodyY+p(16)).setDisplaySize(p(28),p(28)).setVisible(true);});}
  if(view.details){this.title.setPosition(left,f.y+p(20)).setWordWrapWidth(inner).setFontSize(p(16));control(2,left,footer,p(140),'Back',view.previous);control(3,left+p(148),footer,p(140),view.action,view.activate,view.enabled);}
  else if(view.build&&!this.minimized){control(2,left,footer,(inner-p(8))/2,'Cancel',view.previous);control(3,left+(inner+p(8))/2,footer,(inner-p(8))/2,view.action,view.activate,view.enabled);}
  else if(!this.minimized){control(2,left,footer,p(48),'‹',view.previous);control(3,left+p(56),footer,inner-p(112),view.action,view.activate,view.enabled);control(4,left+inner-p(48),footer,p(48),'›',view.next);}
  if(collapsed&&!this.minimized){this.title.setFontSize(p(12)).setText(view.title+'\n'+view.text).setWordWrapWidth(p(176),true).setPosition(left,f.y+p(4));this.title.setCrop(0,0,p(176),p(48));}else this.title.setCrop();
 }
}
