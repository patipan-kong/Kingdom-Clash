import type {GameEvent,TradeCommand} from '../simulation/GameState';
// Presentation only: availability and restriction priority come from the simulation quote.
export function shopRestrictionLabel(reason?:string){
 return reason==='Return to Azure Keep'?'Too Far':reason==='Not enough Gold'?'Need Gold':reason==='Inventory full'?'Full':reason==='Selection stale · reselect'?'Need Items':reason||'Buy';
}
export function shopAccessGuidance(reason?:string){return reason==='Return to Azure Keep'?'Move near Azure Keep to buy equipment':reason;}
export class ShopModel {
 view:'shop'|'equipment'|'fusion'|'components'='shop';catalogPage=0;selected?:string;confirming=false;
 components:Partial<Record<'iron-sword'|'ruby-gem',string>>={};componentKind:'iron-sword'|'ruby-gem'='iron-sword';
 get componentIds(){return Object.values(this.components);}
 chooseComponent(id?:string){if(this.pending)return;if(id)this.components[this.componentKind]=id;else delete this.components[this.componentKind];this.view='fusion';this.message='';}
 pending?:{requestId:string;action:'buy'|'sell'|'fusion';name:string};message='';private sequence=0;
 reset(){this.catalogPage=0;this.view='shop';this.selected=undefined;this.components={};this.confirming=false;this.pending=undefined;this.message='';}
 cancel(){this.pending=undefined;this.confirming=false;}
 request(matchId:string,action:'buy'|'sell'|'fusion',id:string,name:string):TradeCommand|undefined {
  if(this.pending)return;const requestId=`shop-ui-${++this.sequence}`;
  this.pending={requestId,action,name};this.message='Waiting for transaction…';this.confirming=false;
  return action==='buy'?{type:'buy-item',matchId,heroId:'guardian',requestId,itemId:id}:action==='fusion'?{type:'fuse-item',matchId,heroId:'guardian',requestId,itemId:id,componentIds:[...this.componentIds]}:{type:'sell-item',matchId,heroId:'guardian',requestId,instanceId:id};
 }
 observe(event:GameEvent){
  if(!this.pending||!('requestId' in event)||event.requestId!==this.pending.requestId)return false;
  if(event.type==='item-traded'){this.message=`${this.pending.name} ${event.action==='buy'?'purchased':event.action==='fusion'?'combined':'sold'}.`;this.pending=undefined;if(event.action==='sell')this.selected=undefined;if(event.action==='fusion')this.components={};return true;}
  if(event.type==='rejected'){this.message=event.reason;this.pending=undefined;return true;}return false;
 }
}
// Between the left thumb and the unchanged utility/combat column. All values are
// logical canvas coordinates derived from CSS touch sizes and actual HUD clearance.
export function shopLayout(scale:number,topHudBottom:number,utilityX:number){
 const s=Math.max(.1,scale),x=124/s,y=topHudBottom+12/s,right=utilityX-32/s;
 return {x,y,width:right-x,height:Math.min(244/s,540-24/s-y),scale:s,touch:48/s};
}
