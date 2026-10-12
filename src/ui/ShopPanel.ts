import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import {artifact} from '../data/artifacts';
import {ShopModel,shopLayout} from './shopModel';
const GOLD=0xdcbf7a,INK=0x122d35,WHITE='#fff3d3',MUTED='#b5d0ce';
const products=['iron-sword','guardian-shield','ruby-gem'];
const effects:Record<string,string>=Object.fromEntries(products.map(id=>[id,artifact(id).modifiers.flatMap(m=>m.kind==='attack'||m.kind==='hp'||m.kind==='armor'?[`${m.kind==='attack'?'ATK':m.kind==='hp'?'HP':'Armor'} +${m.amount}`]:m.kind==='crit'?[`Crit Chance +${m.fraction*100}%`]:[]).join(' · ')]));
type Button={hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text};
export class ShopPanel {
 readonly model=new ShopModel();readonly container:Phaser.GameObjects.Container;
 public bounds={x:0,y:0,width:0,height:0};public buttons=new Map<string,Button>();
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;
 private gold:Phaser.GameObjects.Text;private status:Phaser.GameObjects.Text;
 private titles:Phaser.GameObjects.Text[]=[];private descriptions:Phaser.GameObjects.Text[]=[];private prices:Phaser.GameObjects.Text[]=[];
 private slots:Button[]=[];private detail:Phaser.GameObjects.Text;private scale=1;
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,private close:()=>void){
  this.container=scene.add.container(0,0).setDepth(600).setVisible(false);this.bg=scene.add.graphics();this.blocker=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.container.add([this.bg,this.blocker]);
  this.button('shop','Shop',()=>{this.model.view='shop';this.model.confirming=false;});this.button('equipment','Equipment',()=>{this.model.view='equipment';this.model.selected=undefined;this.model.confirming=false;});this.button('close','Close',close);
  this.gold=this.text('');this.status=this.text('');
  products.forEach((id,i)=>{this.titles.push(this.text(artifact(id).name,true));this.descriptions.push(this.text(effects[id]));this.prices.push(this.text(`${artifact(id).priceGold} Gold`));this.button(id,'Buy',()=>this.buy(id));});
  this.button('previous','‹ Back',()=>{this.model.catalogPage=Math.max(0,this.model.catalogPage-1);});this.button('next','Next ›',()=>{this.model.catalogPage=Math.min(products.length-1,this.model.catalogPage+1);});
  for(let i=0;i<6;i++){const b=this.button(`slot-${i}`,'Empty',()=>{this.model.selected=this.sim().state.inventory.slots[i]??undefined;this.model.confirming=false;});this.slots.push(b);}
  this.detail=this.text('');this.button('sell','Sell',()=>{if(!this.model.selected)return;if(!this.model.confirming){this.model.confirming=true;return;}this.sell();});this.button('cancel','Cancel',()=>{this.model.confirming=false;});
 }
 get visible(){return this.container.visible;}
 open(){this.model.reset();this.container.setVisible(true);this.render();}
 hide(){this.model.cancel();this.container.setVisible(false);}
 private text(value:string,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:'Arial, sans-serif',fontSize:'14px',fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(id:string,label:string,action:()=>void){
  const hit=this.scene.add.rectangle(0,0,1,1,INK).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true});const text=this.text(label,true).setOrigin(.5);
  hit.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled)action();});this.container.add(hit);this.container.bringToTop(text);const button={hit,label:text};this.buttons.set(id,button);return button;
 }
 private setButton(id:string,x:number,y:number,w:number,h:number,label:string,enabled=true,visible=true){const b=this.buttons.get(id)!;b.hit.setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setVisible(visible).setFillStyle(enabled?0x265460:0x142c34);b.hit.input!.enabled=visible&&enabled;b.label.setPosition(x+w/2,y+h/2).setFontSize(Math.ceil(12/this.scale)).setText(label).setColor(enabled?WHITE:MUTED).setVisible(visible);}
 layout(scale:number,top:number,utilityX:number){this.scale=scale;this.bounds=shopLayout(scale,top,utilityX);this.render();}
 private buy(id:string){const sim=this.sim(),q=sim.shopPurchaseQuote(id);if(!q.available||this.model.pending)return;this.send('buy',id,artifact(id).name);}
 private sell(){const sim=this.sim(),id=this.model.selected;if(!id||!sim.shopSaleQuote(id).available||this.model.pending)return;this.send('sell',id,artifact(sim.state.inventory.instances[id].itemId).name);}
 private send(action:'buy'|'sell',id:string,name:string){const sim=this.sim(),command=this.model.request(sim.state.inventory.matchId,action,id,name);if(!command)return;if(!sim.send(command)){this.model.cancel();this.model.message='Trade unavailable now';}this.render();}
 render(){
  if(!this.visible||!this.bounds.width)return;
  const sim=this.sim(),f=this.bounds,s=this.scale,p=(n:number)=>n/s,touch=p(48),left=f.x+p(8),inner=f.width-p(16),top=f.y+p(4),equip=this.model.view==='equipment',pending=!!this.model.pending;
  this.bg.clear().fillStyle(INK,.97).fillRoundedRect(f.x,f.y,f.width,f.height,p(10)).lineStyle(1,GOLD,.9).strokeRoundedRect(f.x,f.y,f.width,f.height,p(10));this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  this.setButton('shop',left,top,p(52),touch,'Shop',!pending);this.setButton('equipment',left+p(56),top,p(92),touch,'Equipment',!pending);this.setButton('close',f.x+f.width-p(64),top,p(56),touch,'Close');
  this.gold.setPosition(left,top+touch+p(3)).setFontSize(p(12)).setText(`Gold ${Math.floor(sim.state.gold)} · Equipped ${sim.state.inventory.slots.filter(Boolean).length}/6`).setVisible(!equip||!this.model.selected);
  products.forEach((id,i)=>{
   const shown=!equip&&i===this.model.catalogPage,y=top+touch+p(20),q=sim.shopPurchaseQuote(id);
   this.titles[i].setPosition(left,y).setFontSize(p(14)).setVisible(shown);this.descriptions[i].setPosition(left,y+p(20)).setFontSize(p(12)).setColor(MUTED).setVisible(shown);this.prices[i].setText(`${q.quote.goldDue} Gold`).setPosition(left,y+p(40)).setFontSize(p(12)).setColor('#f4d58e').setVisible(shown);
   this.setButton(id,f.x+f.width-p(76),y+p(3),p(68),touch,pending?'Pending':q.available?'Buy':q.reason==='Not enough Gold'?'Need Gold':q.reason==='Inventory full'?'Full':'Locked',q.available&&!pending,shown);
  });
  this.setButton('previous',left,top+touch+p(86),p(96),touch,'‹ Back',!pending&&this.model.catalogPage>0,!equip);this.setButton('next',f.x+f.width-p(104),top+touch+p(86),p(96),touch,`Next ${this.model.catalogPage+1}/3 ›`,!pending&&this.model.catalogPage<2,!equip);
  const cell=(inner-p(8))/3;
  this.slots.forEach((_b,i)=>{const id=sim.state.inventory.slots[i],item=id?sim.state.inventory.instances[id]:undefined;this.setButton(`slot-${i}`,left+(i%3)*(cell+p(4)),top+touch+p(23)+Math.floor(i/3)*p(52),cell,touch,item?(item.itemId==='guardian-shield'?'Guardian\nShield':artifact(item.itemId).name):'Empty',!pending,equip&&!this.model.selected);if(id===this.model.selected)this.slots[i].hit.setStrokeStyle(2,0xffe5a0);else this.slots[i].hit.setStrokeStyle(1,GOLD);});
  const selected=this.model.selected?sim.state.inventory.instances[this.model.selected]:undefined;if(!selected){this.model.selected=undefined;this.model.confirming=false;}
  const sale=selected?sim.shopSaleQuote(selected.id):undefined,detailY=top+touch+p(24);
  this.detail.setPosition(left,detailY).setFontSize(p(14)).setWordWrapWidth(inner).setText(selected?`${artifact(selected.itemId).name}\n${effects[selected.itemId]}\n\n${this.model.confirming?`Confirm sale · ${sale?.refundGold??0} Gold refund`:sale?.reason||'Automatically equipped.\nTap Equipment to return to slots.'}`:'Six equipped slots · tap an owned item').setVisible(equip&&!!selected);
  this.setButton('sell',left,f.y+f.height-touch-p(5),this.model.confirming?inner-p(72):inner,touch,pending?'Pending':this.model.confirming?`Confirm · ${sale?.refundGold??0} Gold`:selected&&sale?.available?`Sell · ${sale.refundGold} Gold`:sale?.reason==='Return to Azure Keep'?'Return to Azure Keep':sale?.reason||'Select an item',!!sale?.available&&!pending,equip&&!!selected);
  this.setButton('cancel',f.x+f.width-p(76),f.y+f.height-touch-p(5),p(68),touch,'Cancel',!pending,equip&&this.model.confirming);
  this.status.setPosition(left,f.y+f.height-p(27)).setFontSize(p(12)).setWordWrapWidth(inner).setText(this.model.message||sim.shopAccessReason()||'Combat continues at quarter speed.').setColor(MUTED).setVisible(!equip||!selected);
 }
}
