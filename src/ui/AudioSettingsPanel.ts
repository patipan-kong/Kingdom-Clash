import Phaser from 'phaser';
import type {AudioManager} from '../audio/AudioManager';
import {drawFantasyPanel,drawFantasyButton,FANTASY_TEXT,UI_FONT} from './fantasyTheme';
export class AudioSettingsPanel {
 readonly root:Phaser.GameObjects.Container;
 readonly muteHit:Phaser.GameObjects.Rectangle;readonly backHit:Phaser.GameObjects.Rectangle;
 readonly sliders:Array<{channel:'music'|'sfx';hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text;art:Phaser.GameObjects.Graphics}>=[];
 private art:Phaser.GameObjects.Graphics;private muteArt:Phaser.GameObjects.Graphics;private backArt:Phaser.GameObjects.Graphics;private title:Phaser.GameObjects.Text;private muteLabel:Phaser.GameObjects.Text;private backLabel:Phaser.GameObjects.Text;
 private bounds={x:0,y:0,width:0,height:0};private scale=1;
 constructor(private scene:Phaser.Scene,private audio:AudioManager,private back:()=>void){
  this.root=scene.add.container(0,0).setDepth(1500).setVisible(false);
  const shade=scene.add.rectangle(480,270,960,540,0x020810,.85).setInteractive();
  const stop=(_p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>e.stopPropagation();
  shade.on('pointerdown',stop).on('pointerup',stop);
  this.art=scene.add.graphics();this.muteArt=scene.add.graphics();this.backArt=scene.add.graphics();this.title=this.text('AUDIO SETTINGS',20);this.muteLabel=this.text('',16);this.backLabel=this.text('BACK',16);
  this.muteHit=scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});this.backHit=scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});
  this.root.add([shade,this.art,this.muteArt,this.backArt,this.title,this.muteHit,this.muteLabel,this.backHit,this.backLabel]);
  this.muteHit.on('pointerdown',stop).on('pointerup',(p:Phaser.Input.Pointer,x:number,y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();audio.setPreferences({muted:!audio.settings.muted});this.render();});
  this.backHit.on('pointerdown',stop).on('pointerup',(p:Phaser.Input.Pointer,x:number,y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.hide();back();});
  for(const channel of ['music','sfx'] as const){
   const art=scene.add.graphics(),label=this.text('',14),hit=scene.add.rectangle(0,0,1,1,0,0).setInteractive({useHandCursor:true});
   scene.input.setDraggable(hit);const row={channel,hit,label,art};this.sliders.push(row);this.root.add([art,label,hit]);
   const change=(p:Phaser.Input.Pointer)=>{if(!this.root.visible)return;const b=hit.getBounds();audio.setPreferences({[channel]:Math.round(Math.max(0,Math.min(1,(p.x-b.left)/b.width))*10)/10});this.render();};
   hit.on('pointerdown',(p:Phaser.Input.Pointer,x:number,y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();change(p);}).on('pointerup',stop).on('drag',(p:Phaser.Input.Pointer)=>change(p));
  }
 }
 private text(value:string,size:number){return this.scene.add.text(0,0,value,{fontFamily:UI_FONT,fontSize:size,color:FANTASY_TEXT.primary}).setOrigin(.5);}
 get visible(){return this.root.visible;}
 show(){this.root.setVisible(true);this.layout(this.scene.game.canvas.getBoundingClientRect().height/540);}
 hide(){this.root.setVisible(false);}
 layout(scale:number){
  this.scale=Math.max(.1,scale);const p=(v:number)=>v/this.scale,width=Math.min(p(344),960-p(24)),height=p(324);
  this.bounds={x:480-width/2,y:270-height/2,width,height};const f=this.bounds,w=width-p(40),top=f.y;
  this.title.setPosition(480,top+p(25)).setFontSize(p(20));
  for(const [hit,label,y] of [[this.muteHit,this.muteLabel,73],[this.backHit,this.backLabel,290]] as const){hit.setPosition(480,top+p(y)).setSize(w,p(44)).setDisplaySize(w,p(44));label.setPosition(480,top+p(y)).setFontSize(p(16));}
  this.sliders.forEach((r,i)=>{r.label.setPosition(480,top+p(119+i*72)).setFontSize(p(14));r.hit.setPosition(480,top+p(145+i*72)).setSize(w,p(44)).setDisplaySize(w,p(44));});this.render();
 }
 private render(){
  const s=this.scale,p=(n:number)=>n/s,a=this.art.clear(),f=this.bounds;drawFantasyPanel(a,f,s);
  for(const [hit,art] of [[this.muteHit,this.muteArt],[this.backHit,this.backArt]] as const){const b=hit.getBounds();drawFantasyButton(art,b.x,b.y,b.width,b.height,s,'secondary');}
  const prefs=this.audio.settings;this.muteLabel.setText(`MUTE ALL: ${prefs.muted?'ON':'OFF'}`);
  for(const row of this.sliders){const b=row.hit.getBounds(),v=prefs[row.channel];row.label.setText(`${row.channel==='music'?'Music':'SFX'} volume: ${Math.round(v*100)}%`);row.art.clear().fillStyle(0x102f38).fillRoundedRect(b.x,b.centerY-p(4),b.width,p(8),p(4)).fillStyle(0xe3bf72).fillRoundedRect(b.x,b.centerY-p(4),Math.max(p(8),b.width*v),p(8),p(4)).fillCircle(b.x+b.width*v,b.centerY,p(9));}
 }
 destroy(){this.root.destroy(true);}
}
