import type {GameEvent,TradeCommand} from '../simulation/GameState';
export class ShopModel {
 view:'shop'|'equipment'='shop';catalogPage=0;selected?:string;confirming=false;
 pending?:{requestId:string;action:'buy'|'sell';name:string};message='';private sequence=0;
 reset(){this.catalogPage=0;this.view='shop';this.selected=undefined;this.confirming=false;this.pending=undefined;this.message='';}
 cancel(){this.pending=undefined;this.confirming=false;}
 request(matchId:string,action:'buy'|'sell',id:string,name:string):TradeCommand|undefined {
  if(this.pending)return;const requestId=`shop-ui-${++this.sequence}`;
  this.pending={requestId,action,name};this.message='Waiting for transaction…';this.confirming=false;
  return action==='buy'?{type:'buy-item',matchId,heroId:'guardian',requestId,itemId:id}:{type:'sell-item',matchId,heroId:'guardian',requestId,instanceId:id};
 }
 observe(event:GameEvent){
  if(!this.pending||!('requestId' in event)||event.requestId!==this.pending.requestId)return false;
  if(event.type==='item-traded'){this.message=`${this.pending.name} ${event.action==='buy'?'purchased':'sold'}.`;this.pending=undefined;if(event.action==='sell')this.selected=undefined;return true;}
  if(event.type==='rejected'){this.message=event.reason;this.pending=undefined;return true;}return false;
 }
}
// Between the left thumb and the unchanged utility/combat column. All values are
// logical canvas coordinates derived from CSS touch sizes and actual HUD clearance.
export function shopLayout(scale:number,topHudBottom:number,utilityX:number){
 const s=Math.max(.1,scale),x=124/s,y=topHudBottom+12/s,right=utilityX-32/s;
 return {x,y,width:right-x,height:Math.min(244/s,540-24/s-y),scale:s,touch:48/s};
}
