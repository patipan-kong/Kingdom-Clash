import Phaser from 'phaser';

/** Secondary controls retain their own pointer, independent of joystick/skills. */
export class UtilityButton {
 public pressed=false;
 public disabled=false;
 public activations=0;
 private pointer:number|null=null;
 private base:Phaser.GameObjects.Arc;
 private image?:Phaser.GameObjects.Image;
 private detail:Phaser.GameObjects.Graphics;
 private label:Phaser.GameObjects.Text;
 private art:Phaser.GameObjects.Container;
 private mask?:Phaser.GameObjects.Graphics;
 private hit:Phaser.GameObjects.Arc;
 public get visibleRadius(){return this.radius*this.art.scaleX;}
 private cleanup:Array<()=>void>=[];
 private onWindow(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 constructor(scene:Phaser.Scene,public id:string,public x:number,public y:number,public radius:number,private action:()=>void,public hitRadius=radius){
  this.art=scene.add.container(x,y);
  const shadow=scene.add.circle(1,4,radius+3,0x071c23,.55);
  this.base=scene.add.circle(0,0,radius,0x132e3b).setStrokeStyle(3,0xcab879);
  if(id!=='pause'){
   this.image=scene.add.image(0,0,`hud-${id}`).setDisplaySize(radius*1.85,radius*1.85);
   this.mask=scene.make.graphics({x,y}).fillCircle(0,0,radius-3);
   this.image.setMask(this.mask.createGeometryMask());
  }
  const rim=scene.add.circle(0,0,radius-2).setStrokeStyle(1,0xffe8b0,.6);
  this.detail=scene.add.graphics();
  this.label=scene.add.text(x,y+radius+9,id==='pause'?'':id.toUpperCase(),{fontFamily:'Arial, sans-serif',fontSize:'12px',fontStyle:'bold',color:'#fff3d3'}).setOrigin(.5).setShadow(0,1,'#122d35',3);
  this.art.add([shadow,this.base,...(this.image?[this.image]:[]),rim,this.detail]);
  this.hit=scene.add.circle(x,y,hitRadius,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(hitRadius,hitRadius,hitRadius),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true});
  this.hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{
   e.stopPropagation();if(this.disabled||this.pointer!==null)return;this.pointer=p.id;this.pressed=true;this.paint();
  });
  scene.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
   if(p.id!==this.pointer)return;const inside=Math.hypot(p.x-this.x,p.y-this.y)<=this.hitRadius;this.release();
   if(inside&&!this.disabled){this.activations++;this.action();}
  });
  scene.input.on('pointerupoutside',(p:Phaser.Input.Pointer)=>{if(p.id===this.pointer)this.release();});
  const cancel=()=>this.release();
  scene.game.events.on('pause-visual',cancel);scene.game.events.on('clear-controls',cancel);
  this.onWindow('pointercancel',cancel);this.onWindow('touchcancel',cancel);this.onWindow('blur',cancel);
  scene.events.once('shutdown',()=>{
   this.cleanup.splice(0).forEach(f=>f());scene.game.events.off('pause-visual',cancel);scene.game.events.off('clear-controls',cancel);
   window.removeEventListener('pointercancel',cancel);window.removeEventListener('touchcancel',cancel);window.removeEventListener('blur',cancel);
  });
  this.paint();
 }
 public setLayout(x:number,y:number,radius:number,hitRadius:number,scale:number){
  this.release();this.art.setPosition(x,y).setScale(radius/this.radius);this.mask?.setPosition(x,y).setScale(radius/this.radius);
  this.x=x;this.y=y;this.hitRadius=hitRadius;this.hit.setPosition(x,y).setRadius(hitRadius);
  (this.hit.input!.hitArea as Phaser.Geom.Circle).setTo(hitRadius,hitRadius,hitRadius);
  this.label.setPosition(x,y+radius+9).setFontSize(Math.max(12,9/scale));
 }
 public release(){this.pointer=null;this.pressed=false;this.paint();}
 public setDisabled(v:boolean){this.disabled=v;if(v)this.release();this.paint();}
 private paint(){
  this.base.setStrokeStyle(this.pressed?4:3,this.disabled?0x77868c:this.pressed?0xffeeac:0xcab879).setFillStyle(this.pressed?0x31546a:0x132e3b);
  this.image?.setScale(this.radius*1.85/this.image.width*(this.pressed?.92:1)).setTint(this.disabled?0x687b85:0xffffff);
  this.label.setColor(this.disabled?'#84989f':'#fff3d3');
  this.detail.clear();
  if(this.id==='pause'){
   // Bevelled gold bars use the same material palette as the generated icons.
   for(const dx of [-9,3]){
    this.detail.fillStyle(0x071a22,.7).fillRoundedRect(dx+1,-9,7,22,2);
    this.detail.fillStyle(this.pressed?0xffe4a4:0xdcbf7a).fillRoundedRect(dx,-11,7,22,2);
    this.detail.fillStyle(0xffefc3).fillRoundedRect(dx,-11,2,20,1);
   }
  }
  if(this.pressed)this.detail.lineStyle(3,0xffe4a4,.8).strokeCircle(0,0,this.radius+3);
 }
}
