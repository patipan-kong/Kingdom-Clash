import Phaser from 'phaser';
import type {Simulation} from '../simulation/Simulation';
import {artifact} from '../data/artifacts';
import {RESOURCE_UNITS} from '../data/resources';
import {ShopModel,shopLayout,shopRestrictionLabel,shopAccessGuidance} from './shopModel';
import {shopGridLayout} from './shopGridLayout';
import {equipmentLayout} from './equipmentLayout';
import {shopItems,shopItemEffects} from './shopItems';
import {createShopItemIcon,hasFinalShopArt} from './ShopItemIcon';
const GOLD=0xdcbf7a,INK=0x102536,WHITE='#fff3d3',MUTED='#bdd0da';
type Button={hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text;pointer:number|null};
export class ShopPanel {
 readonly model=new ShopModel();readonly container:Phaser.GameObjects.Container;
 public bounds={x:0,y:0,width:0,height:0};public buttons=new Map<string,Button>();
 private bg:Phaser.GameObjects.Graphics;private blocker:Phaser.GameObjects.Rectangle;
 private gold:Phaser.GameObjects.Text;private status:Phaser.GameObjects.Text;
 private names:Phaser.GameObjects.Text[]=[];private prices:Phaser.GameObjects.Text[]=[];private checks:Phaser.GameObjects.Text[]=[];
 private icons:Phaser.GameObjects.Container[]=[];private portraits:Phaser.GameObjects.Container[]=[];
 private equipmentIcons:(Phaser.GameObjects.Container|undefined)[]=[];
 private slotNames:Phaser.GameObjects.Text[]=[];private slotNumbers:Phaser.GameObjects.Text[]=[];
 private detail:Phaser.GameObjects.Text;private title:Phaser.GameObjects.Text;private heading:Phaser.GameObjects.Text;private cost:Phaser.GameObjects.Text;
 private scale=1;private legacyTop=0;private actualTop=0;private utilityX=0;private compact=true;private legacy=false;
 private purchaseAfter=0;private inspectPoint={x:-1000,y:-1000};
 private lastTrade?:{key:string;at:number};
 constructor(private scene:Phaser.Scene,private sim:()=>Simulation,private close:()=>void){
  this.container=scene.add.container(0,0).setDepth(600).setVisible(false);this.bg=scene.add.graphics();
  this.blocker=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());this.container.add([this.bg,this.blocker]);
  this.button('shop','Shop',()=>{this.model.view=this.model.view==='components'?'fusion':'shop';this.model.confirming=false;this.model.confirmedInstance=undefined;});
  this.button('equipment','Equipment',()=>{if(this.model.view==='components')this.model.chooseComponent();else{this.model.view='equipment';this.model.confirming=false;this.model.confirmedInstance=undefined;}});
  this.button('close','Close',close);this.button('back','‹ Back',()=>{this.model.view='shop';});
  this.gold=this.text('');this.status=this.text('');this.title=this.text('',true);this.heading=this.text('',true);this.cost=this.text('');this.detail=this.text('');
  for(const [i,item] of shopItems.entries()){
   this.button(`item-${item.id}`,'',()=>this.inspect(item.id));this.button(item.id,'Buy',()=>this.buy(item.id));
   this.names.push(this.text(item.short,true).setOrigin(.5,0));this.prices.push(this.text('').setOrigin(.5,0));this.checks.push(this.text('✓',true));
   this.icons.push(createShopItemIcon(scene,item));this.portraits.push(createShopItemIcon(scene,item));this.container.add([this.icons[i],this.portraits[i]]);
  }
  this.button('recipe','Recipe',()=>{this.model.view='fusion';this.guardTransition();});
  for(let i=0;i<6;i++){
   this.button(`slot-${i}`,'Empty',()=>{const slots=this.sim().state.inventory.slots;if(this.model.view==='components')this.model.chooseComponent(slots[i]??undefined);else this.model.selectSlot(i,slots);});
   this.slotNames.push(this.text('',true).setOrigin(.5,0));this.slotNumbers.push(this.text(''));
  }
  for(const id of ['iron-sword','ruby-gem'] as const)this.button(`component-${id}`,'Choose',()=>{this.model.componentKind=id;this.model.view='components';this.model.message='';});
  this.button('combine','Combine',()=>{const q=this.fusionQuote();if(q?.available&&!this.model.pending&&!this.transitionTap())this.send('fusion','flame-blade','Flame Blade');});
  this.button('sell','Sell',()=>{if(!this.model.selected||this.model.pending)return;if(!this.model.confirming||this.model.confirmedInstance!==this.model.selected){this.model.confirming=true;this.model.confirmedInstance=this.model.selected;return;}this.sell();});this.button('cancel','Cancel',()=>{this.model.confirming=false;this.model.confirmedInstance=undefined;});
  const release=(p?:Phaser.Input.Pointer)=>{for(const b of this.buttons.values())if(!p||b.pointer===p.id)b.pointer=null;};
  scene.input.on('pointerup',release);scene.input.on('pointerupoutside',release);
  const cancel=()=>release();for(const event of ['clear-controls','pause-visual'])scene.game.events.on(event,cancel);
  for(const event of ['pointercancel','touchcancel','blur'])window.addEventListener(event,cancel);
  scene.events.once('shutdown',()=>{scene.input.off('pointerup',release);scene.input.off('pointerupoutside',release);for(const event of ['clear-controls','pause-visual'])scene.game.events.off(event,cancel);for(const event of ['pointercancel','touchcancel','blur'])window.removeEventListener(event,cancel);});
 }
 get visible(){return this.container.visible;}
 open(){this.model.reset();this.purchaseAfter=0;this.container.setVisible(true);this.render();}
 hide(){this.model.cancel();for(const b of this.buttons.values())b.pointer=null;this.container.setVisible(false);}
 private text(value:string,bold=false){const t=this.scene.add.text(0,0,value,{fontFamily:'Arial, sans-serif',fontSize:'14px',fontStyle:bold?'bold':'normal',color:WHITE});this.container.add(t);return t;}
 private button(id:string,label:string,action:()=>void){
  const hit=this.scene.add.rectangle(0,0,1,1,INK).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}),text=this.text(label,true).setOrigin(.5);
  const b:Button={hit,label:text,pointer:null};this.buttons.set(id,b);this.container.add(hit);this.container.bringToTop(text);
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(hit.input?.enabled&&b.pointer===null)b.pointer=p.id;});
  hit.on('pointerup',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const activate=b.pointer===p.id&&hit.input?.enabled;b.pointer=null;if(activate){action();this.render();}});
  return b;
 }
 private setButton(id:string,x:number,y:number,w:number,h:number,label:string,enabled=true,primary=false){
  const b=this.buttons.get(id)!,pressed=b.pointer!==null;
  b.hit.setPosition(x+w/2,y+h/2).setSize(w,h).setDisplaySize(w,h).setVisible(true).setFillStyle(!enabled?0x142c34:pressed?0x35688b:primary?GOLD:this.legacy?0x265460:0x19384c).setStrokeStyle(1/this.scale,primary&&enabled?0xffe5a0:GOLD);
  b.hit.input!.enabled=enabled;b.label.setPosition(x+w/2,y+h/2).setFontSize(this.legacy?Math.ceil(12/this.scale):12/this.scale).setText(label).setColor(enabled?(primary?'#102536':WHITE):MUTED).setVisible(!!label);
 }
 layout(scale:number,top:number,utilityX:number,actualTop=top){this.scale=scale;this.legacyTop=top;this.actualTop=actualTop;this.utilityX=utilityX;for(const b of this.buttons.values())b.pointer=null;this.updateBounds();if(!this.compact&&this.model.view==='detail')this.model.view='shop';this.render();}
 private updateBounds(){
  this.legacy=this.model.view==='components';
  const f=shopGridLayout(this.scale,this.actualTop,this.utilityX);this.compact=f.compact;
  const next=this.legacy?shopLayout(this.scale,this.legacyTop,this.utilityX):this.model.view==='equipment'?equipmentLayout(this.scale,this.actualTop,this.utilityX):f;
  const changed=['x','y','width','height'].some(k=>this.bounds[k as keyof typeof this.bounds]!==next[k as keyof typeof this.bounds]);
  this.bounds=next;if(changed&&this.visible)this.scene.game.events.emit('shop-obstruction',this.bounds);
 }
 private guardTransition(){const p=this.scene.input.activePointer;this.inspectPoint={x:p.x,y:p.y};this.purchaseAfter=this.scene.time.now+300;}
 // A double tap on a tile/Recipe must not activate a newly revealed Buy at the same point.
 private transitionTap(){const p=this.scene.input.activePointer;return this.scene.time.now<this.purchaseAfter&&Math.hypot(p.x-this.inspectPoint.x,p.y-this.inspectPoint.y)*this.scale<24;}
 private inspect(id:string){if(this.model.pending)return;this.model.product=id;this.model.message='';if(this.compact){this.model.view=id==='flame-blade'?'fusion':'detail';this.guardTransition();}}
 private buy(id:string){const q=this.sim().shopPurchaseQuote(id);if(!q.available||this.model.pending||this.transitionTap())return;this.send('buy',id,artifact(id).name);}
 private fusionQuote(){try{return this.sim().shopPurchaseQuote('flame-blade',this.model.componentIds);}catch{return undefined;}}
 private sell(){const sim=this.sim(),id=this.model.selected;if(!id||!sim.shopSaleQuote(id).available||this.model.pending)return;this.send('sell',id,artifact(sim.state.inventory.instances[id].itemId).name);}
 private send(action:'buy'|'sell'|'fusion',id:string,name:string){
  // An acknowledgment can arrive between two physical taps. Coalesce only the
  // same UI trade intent inside the double-tap window, even after that acknowledgment.
  const key=`${action}:${id}`,now=performance.now();if(this.lastTrade?.key===key&&now-this.lastTrade.at<350)return;
  const sim=this.sim(),command=this.model.request(sim.state.inventory.matchId,action,id,name);if(!command)return;
  this.lastTrade={key,at:now};if(!sim.send(command)){this.model.cancel();this.model.message='Trade unavailable now';}this.render();
 }
 render(){
  if(!this.visible||!this.utilityX)return;this.updateBounds();
  this.model.reconcileSelection(this.sim().state.inventory.slots,this.sim().state.inventory.instances);
  const p=(n:number)=>n/this.scale,f=this.bounds,left=f.x+p(8),top=f.y+p(8),inner=f.width-p(16),pending=!!this.model.pending;
  for(const b of this.buttons.values()){b.hit.setVisible(false);b.hit.input!.enabled=false;b.label.setVisible(false);}
  for(const t of [this.gold,this.status,this.title,this.heading,this.cost,this.detail,...this.names,...this.prices,...this.checks,...this.icons,...this.portraits,...this.slotNames,...this.slotNumbers,...this.equipmentIcons.filter((i):i is Phaser.GameObjects.Container=>!!i)])t.setVisible(false);
  this.bg.clear();
  if(this.legacy)this.bg.fillStyle(0x122d35,.97).fillRoundedRect(f.x,f.y,f.width,f.height,p(10)).lineStyle(1,GOLD,.9).strokeRoundedRect(f.x,f.y,f.width,f.height,p(10));
  else this.bg.fillStyle(0x061019,.35).fillRoundedRect(f.x,f.y+p(3),f.width,f.height,p(8)).fillStyle(INK,.98).fillRoundedRect(f.x,f.y,f.width,f.height,p(8)).lineStyle(p(1),GOLD,.8).strokeRoundedRect(f.x,f.y,f.width,f.height,p(8));
  this.blocker.setPosition(f.x,f.y).setSize(f.width,f.height).setDisplaySize(f.width,f.height);
  if(this.legacy){this.renderComponentPicker();return;}
  if(this.model.view==='equipment'){this.renderEquipment();return;}
  const isGrid=this.model.view==='shop',isDetail=this.model.view==='detail',fusion=this.model.view==='fusion';
  if(isGrid){
   const first=Math.max(52,Math.min(72,inner*this.scale-164)),second=inner*this.scale-first-64;
   this.setButton('shop',left,top,p(first),p(48),'Shop',!pending);this.buttons.get('shop')!.hit.setFillStyle(0x234e78);
   this.setButton('equipment',left+p(first+8),top,p(second),p(48),'Equipment',!pending);
  }else{
   this.setButton('back',left,top,p(48),p(48),'‹ Back',!pending);
   this.heading.setPosition(left+p(56),top+p(15)).setText(fusion?'Flame Blade':'Item details').setFontSize(p(16)).setVisible(true);
  }
  this.setButton('close',f.x+f.width-p(56),top,p(48),p(48),'×');this.buttons.get('close')!.label.setFontSize(p(22));
  if(fusion){this.renderFusion(left,top,inner);return;}
  const id=this.model.product,q=this.sim().shopPurchaseQuote(id),feedback=this.feedback();
  if(isGrid){
   this.gold.setPosition(left,top+p(50)).setFontSize(p(12)).setText(`Gold ${Math.floor(this.sim().state.gold)} · Equipped ${this.sim().state.inventory.slots.filter(Boolean).length}/6`).setVisible(true);
   const gap=p(8),w=(inner-gap*3)/4,h=p(this.compact?64:68),y=top+p(68);
   for(const [i,item] of shopItems.entries()){
    const x=left+(i%4)*(w+gap),cy=y+Math.floor(i/4)*(h+gap),quote=this.sim().shopPurchaseQuote(item.id),selected=id===item.id,b=this.buttons.get(`item-${item.id}`)!;
    this.setButton(`item-${item.id}`,x,cy,w,h,'',!pending);b.hit.setFillStyle(pending?0x142c34:b.pointer!==null?0x35688b:selected?0x234e78:0x19384c).setStrokeStyle(p(selected?2:1),selected?GOLD:0x66818c);
    const artSize=this.compact?32:36;
    this.icons[i].setPosition(x+w/2-p(artSize/2),cy+p(1)).setScale(p(artSize/46)).setAlpha(pending?.5:quote.available?1:.7).setVisible(true);
    this.names[i].setPosition(x+w/2,cy+p(this.compact?33:37)).setFontSize(p(12)).setVisible(true);
    this.prices[i].setPosition(x+w/2,cy+p(this.compact?48:52)).setFontSize(p(12)).setText(`${quote.quote.goldDue} G`).setColor(pending?MUTED:quote.quote.affordable?'#f0d797':'#ffb0a5').setVisible(true);
    this.checks[i].setPosition(x+w-p(12),cy+p(1)).setFontSize(p(12)).setText(pending?'…':selected?'✓':quote.reason==='Inventory full'?'×':quote.reason==='Return to Azure Keep'?'↗':quote.reason&&quote.reason!=='Not enough Gold'?'!':'').setVisible(true);
   }
   const emptyX=left+3*(w+gap),emptyY=y+h+gap;this.bg.lineStyle(p(1),0x526c78,.35).strokeRoundedRect(emptyX,emptyY,w,h,p(4));
   const notice=this.artNotice(),message=feedback||q.reason||'Combat ¼ speed';
   this.status.setPosition(this.compact?left:left+p(184),this.compact?f.y+f.height-p(30):top+p(50)).setWordWrapWidth(this.compact?inner:inner-p(184)).setText(notice?`${notice} · ${message}`:message).setFontSize(p(12)).setColor(this.statusColor(q.reason)).setVisible(true);
   if(!this.compact)this.renderProduct(id,left,y+2*h+gap+p(8),inner,true);
  }else if(isDetail){
   const i=shopItems.findIndex(item=>item.id===id);this.portraits[i].setPosition(left,top+p(52)).setScale(p(40/46)).setAlpha(1).setVisible(true);
   this.cost.setPosition(left+p(50),top+p(75)).setFontSize(p(14)).setColor('#f0d797').setText(`${q.quote.goldDue} Gold`).setVisible(true);
   this.renderProduct(id,left,top+p(51),inner,false);
   this.status.setPosition(left,f.y+f.height-p(84)).setWordWrapWidth(inner).setText([feedback||q.reason||'Auto-equipped · combat ¼',this.artNotice()].filter(Boolean).join(' · ')).setFontSize(p(12)).setColor(this.statusColor(q.reason)).setVisible(true);
  }
 }
 private renderProduct(id:string,left:number,y:number,inner:number,inline:boolean){
  const p=(n:number)=>n/this.scale,f=this.bounds,q=this.sim().shopPurchaseQuote(id),flame=id==='flame-blade';
  this.title.setPosition(left+p(inline?0:50),y).setFontSize(p(16)).setWordWrapWidth(inner-p(inline?96:50)).setText(artifact(id).name).setVisible(true);
  this.detail.setPosition(left,y+p(inline?23:48)).setFontSize(p(14)).setLineSpacing(p(2)).setWordWrapWidth(inner-p(inline?96:0)).setText(shopItemEffects(id).join('\n')).setVisible(true);
  const label=this.model.pending?'Pending…':flame?'Recipe':q.available?'Buy':shopRestrictionLabel(q.reason);
  this.setButton(flame?'recipe':id,inline?left+inner-p(88):left,inline?y+p(18):f.y+f.height-p(56),inline?p(88):inner,p(48),`${label}\n${q.quote.goldDue} Gold`,!this.model.pending&&(flame||q.available),true);
 }
 private feedback(){const m=this.model.message;return shopAccessGuidance(this.sim().shopAccessReason())||(m==='Return to Azure Keep'?'':m);}
 private artNotice(){return hasFinalShopArt(this.scene)?'':import.meta.env.DEV?'TEMP art':'Item art unavailable';}
 private statusColor(reason?:string){return this.model.pending?'#94d4ff':reason==='Not enough Gold'?'#f0d797':reason?'#ffb0a5':MUTED;}
 private renderFusion(left:number,top:number,inner:number){
  const p=(n:number)=>n/this.scale,f=this.bounds,q=this.fusionQuote(),pending=!!this.model.pending;
  this.detail.setPosition(left,top+p(51)).setFontSize(p(12)).setLineSpacing(0).setWordWrapWidth(inner).setText('ATK +35 · Crit chance +10%\nBurn 5/s for 3s · refreshes').setVisible(true);
  for(const [i,id] of (['iron-sword','ruby-gem'] as const).entries()){
   const selected=this.model.components[id],slot=this.sim().state.inventory.slots.indexOf(selected??null),valid=selected&&this.sim().state.inventory.instances[selected]?.itemId===id;
   const missing=q?.quote.missingComponents.find(c=>c.itemId===id)?.goldUnits;
   this.setButton(`component-${id}`,left+i*(inner+p(8))/2,top+p(88),(inner-p(8))/2,p(48),`${id==='iron-sword'?'Sword':'Gem'} · ${valid?`slot ${slot+1}`:'none'}\n${valid?'Consume owned':`Missing ${(missing??0)/RESOURCE_UNITS} Gold`}`,!pending);
  }
  const reason=q?.reason||(!q?'Selection stale · reselect':undefined),feedback=this.feedback();
  this.gold.setPosition(left,top+p(142)).setFontSize(p(12)).setText(`Fee ${(q?.quote.feeGoldUnits??300*RESOURCE_UNITS)/RESOURCE_UNITS} · Due ${q?.quote.goldDue??'—'} Gold`).setVisible(true);
  this.status.setPosition(left,top+p(158)).setWordWrapWidth(inner).setFontSize(p(12)).setText(feedback||reason||'Selected owned instances are consumed').setVisible(true);
  this.setButton('combine',left,f.y+f.height-p(56),inner,p(48),pending?'Pending…':q?.available?`${this.model.componentIds.length?'Combine':'Buy'} · ${q.quote.goldDue} Gold`:shopRestrictionLabel(reason),!!q?.available&&!pending,true);
 }
 private renderEquipment(){
  const sim=this.sim(),inv=sim.state.inventory,f=equipmentLayout(this.scale,this.actualTop,this.utilityX),p=(n:number)=>n/this.scale;
  const left=f.x+p(8),top=f.y+p(this.compact?4:8),inner=f.width-p(16),pending=!!this.model.pending,body=f.y+f.bodyTop;
  const first=p(52),second=inner-first-p(64);
  this.setButton('shop',left,top,first,p(48),'Shop',!pending);
  this.setButton('equipment',left+first+p(8),top,second,p(48),this.compact?`Equipment\n${Math.floor(sim.state.gold)} G · ${inv.slots.filter(Boolean).length}/6`:'Equipment',!pending);this.buttons.get('equipment')!.hit.setFillStyle(0x234e78);
  this.setButton('close',f.x+f.width-p(56),top,p(48),p(48),'×');this.buttons.get('close')!.label.setFontSize(p(22));
  for(let i=0;i<6;i++){
   const id=inv.slots[i],instance=id?inv.instances[id]:undefined,item=shopItems.find(item=>item.id===instance?.itemId);
   const x=left+(i%3)*(f.cellWidth+f.gap),y=body+Math.floor(i/3)*(f.cellHeight+f.gap),selected=this.model.selectedSlot===i;
   this.setButton(`slot-${i}`,x,y,f.cellWidth,f.cellHeight,'',!pending);
   this.buttons.get(`slot-${i}`)!.hit.setFillStyle(selected?0x234e78:item?0x19384c:0x112b3c).setStrokeStyle(p(selected?2:1),selected?GOLD:0x66818c).setData('instanceId',id).setData('slotIndex',i);
   let icon=this.equipmentIcons[i];
   if(icon&&icon.getData('itemId')!==item?.id){icon.destroy();icon=undefined;this.equipmentIcons[i]=undefined;}
   if(item){
    if(!icon){icon=createShopItemIcon(this.scene,item);this.equipmentIcons[i]=icon;this.container.add(icon);}
    const size=this.compact?32:44;
    icon.setPosition(x+(f.cellWidth-p(size))/2,y+p(this.compact?1:6)).setScale(p(size/46)).setAlpha(pending?.55:1).setData('instanceId',id).setData('slotIndex',i).setVisible(true);
   }
   this.slotNumbers[i].setPosition(x+p(2),y+p(1)).setFontSize(p(12)).setColor(selected?'#ffe5a0':MUTED).setText(String(i+1)).setVisible(true);
   this.slotNames[i].setPosition(x+f.cellWidth/2,y+p(this.compact?33:57)).setFontSize(p(12)).setColor(item?WHITE:'#879eac').setText(item?.short??'Empty').setVisible(true);
   if(!item)this.bg.lineStyle(p(1),0x526c78,.5).strokeRoundedRect(x+f.cellWidth/2-p(9),y+p(this.compact?14:22),p(18),p(16),p(3));
  }
  const gridBottom=body+2*f.cellHeight+f.gap;
  if(!this.compact)this.bg.lineStyle(p(1),0x66818c,.65).lineBetween(left+f.gridWidth+p(4),body,left+f.gridWidth+p(4),f.y+f.height-p(64));
  this.gold.setPosition(left,gridBottom+p(8)).setFontSize(p(12)).setText(`Gold ${Math.floor(sim.state.gold)} · ${inv.slots.filter(Boolean).length}/6`).setVisible(!this.compact);
  const x=this.compact?left:left+f.gridWidth+p(8),selected=this.model.selected?inv.instances[this.model.selected]:undefined,titleY=this.compact?gridBottom+p(2):body;
  this.title.setPosition(x,titleY).setFontSize(p(this.compact?14:16)).setWordWrapWidth(f.detailWidth,true).setText(selected?artifact(selected.itemId).name:this.model.selectedSlot!==undefined?`Slot ${this.model.selectedSlot+1} · Empty`:'Auto-equipped').setVisible(true);
  const detailY=titleY+this.title.height+p(this.compact?2:4);
  this.detail.setPosition(x,detailY).setFontSize(p(this.compact?12:14)).setLineSpacing(0).setWordWrapWidth(f.detailWidth,true).setText(selected?shopItemEffects(selected.itemId).join('\n'):this.model.selectedSlot!==undefined?'Purchases fill empty slots automatically.':'Select a slot to inspect its item.').setVisible(true);
  const sale=selected?sim.shopSaleQuote(selected.id):undefined;
  const feedback=this.feedback(),message=feedback?.startsWith('Move near Azure Keep')?'Move near Azure Keep':feedback?.endsWith(' purchased.')?'Purchase confirmed':feedback?.endsWith(' sold.')?'Sale confirmed':feedback?.endsWith(' combined.')?'Fusion confirmed':feedback==='Selection changed · choose a slot'?'Choose a slot again':feedback;
  this.status.setPosition(left,this.compact?f.y+f.height-p(22):gridBottom+p(24)).setFontSize(p(12)).setWordWrapWidth(f.gridWidth,true).setColor(this.statusColor(sale?.reason)).setText(message||sale?.reason||'Combat ¼ speed').setVisible(!this.compact||!selected);
  if(selected&&sale){
   const confirming=this.model.confirming&&this.model.confirmedInstance===selected.id;
   const label=pending?'Pending…':!sale.available?`${shopRestrictionLabel(sale.reason)} · ${sale.refundGold} Gold`:confirming?`Confirm · ${sale.refundGold} Gold`:`Sell · ${sale.refundGold} Gold`;
   const footer=f.y+f.height-p(this.compact?52:56);
   const sellWidth=this.compact?(confirming?inner-p(80):inner):p(160),sellX=this.compact?left:left+inner-sellWidth-p(confirming?80:0);
   this.setButton('sell',sellX,footer,sellWidth,p(48),label,sale.available&&!pending,!confirming);
   if(confirming)this.setButton('cancel',f.x+f.width-p(80),footer,p(72),p(48),'Cancel',!pending);
  }
 }
 /** Exact-instance component picker retains the approved Fusion workflow. */
 private renderComponentPicker(){
  const sim=this.sim(),f=this.bounds,p=(n:number)=>n/this.scale,touch=p(48),left=f.x+p(8),inner=f.width-p(16),top=f.y+p(4),picker=this.model.view==='components',pending=!!this.model.pending;
  this.setButton('shop',left,top,p(52),touch,picker?'Back':'Shop',!pending);this.setButton('equipment',left+p(56),top,p(92),touch,picker?'Use none':'Equipment',!pending);this.setButton('close',f.x+f.width-p(64),top,p(56),touch,'Close');
  this.gold.setPosition(left,top+touch+p(3)).setFontSize(p(12)).setText(picker?`Select ${artifact(this.model.componentKind).name} · exact slot`:`Gold ${Math.floor(sim.state.gold)} · Equipped ${sim.state.inventory.slots.filter(Boolean).length}/6`).setVisible(picker||!this.model.selected);
  const cell=(inner-p(8))/3;
  for(let i=0;i<6;i++){
   const id=sim.state.inventory.slots[i],item=id?sim.state.inventory.instances[id]:undefined,eligible=!!item&&item.itemId===this.model.componentKind;
   if(picker||!this.model.selected){this.setButton(`slot-${i}`,left+(i%3)*(cell+p(4)),top+touch+p(23)+Math.floor(i/3)*p(52),cell,touch,item?(picker&&eligible?`Slot ${i+1}\n${this.model.components[this.model.componentKind]===id?'Selected':'Choose'}`:artifact(item.itemId).name.replace('Guardian Shield','Guardian\nShield').replace("Builder's Crown","Builder's\nCrown").replace('Commander Banner','Commander\nBanner').replace('Siege Hammer','Siege\nHammer')):'Empty',!pending&&(!picker||eligible));this.buttons.get(`slot-${i}`)!.hit.setStrokeStyle(id===this.model.selected||id===this.model.components[this.model.componentKind]?2:1,GOLD);}
  }
  this.status.setPosition(left,f.y+f.height-p(27)).setFontSize(p(12)).setWordWrapWidth(inner).setColor(MUTED).setText(this.feedback()||'Combat continues at quarter speed.').setVisible(true);
 }
}
