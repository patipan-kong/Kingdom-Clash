import type Phaser from 'phaser';
/** Desktop UX D2: a compact key cap. Every badge (skills, Build, Shop, Skills entry) and every movement-hint cap uses this one look: a square of the same size per tier,
 * the HUD's ink fill, a gold border and a bold centred key. The key is a KeyboardEvent key name, the same in every locale. */
export class KeyBadge{
 private art:Phaser.GameObjects.Graphics;
 readonly label:Phaser.GameObjects.Text;
 /** The cap's square in logical units, from the last layout. */
 frame={x:0,y:0,width:0,height:0};
 constructor(scene:Phaser.Scene,readonly key:string,depth?:number){
  this.art=scene.add.graphics();
  this.label=scene.add.text(0,0,key,{fontFamily:'Arial, sans-serif',fontSize:'12px',fontStyle:'bold',color:'#ffe3a0'}).setOrigin(.5);
  if(depth!==undefined){this.art.setDepth(depth);this.label.setDepth(depth);}
 }
 /** Centre (x, y) in logical units; size in CSS px at the given canvas scale. */
 layout(x:number,y:number,sizeCss:number,scale:number){
  const s=Math.max(.1,scale),side=sizeCss/s,r=Math.max(2,sizeCss*.18)/s;this.frame={x:x-side/2,y:y-side/2,width:side,height:side};
  this.art.clear().fillStyle(0x0d2229,.95).fillRoundedRect(x-side/2,y-side/2,side,side,r).lineStyle(1.5/s,0xdcbf7a,1).strokeRoundedRect(x-side/2,y-side/2,side,side,r);
  this.label.setPosition(x,y+.5/s).setFontSize(Math.round(sizeCss*.64)/s);
  return this;
 }
 setVisible(v:boolean){this.art.setVisible(v);this.label.setVisible(v);return this;}
 /** Dimmed while its control cannot be used at all (a Shop that opens later in the campaign). */
 setDimmed(v:boolean){this.art.setAlpha(v?.5:1);this.label.setAlpha(v?.5:1);return this;}
 get visible(){return this.art.visible;}
}
