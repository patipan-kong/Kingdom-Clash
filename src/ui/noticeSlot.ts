/** One bounded presentation channel. No backlog; duplicate calls never extend expiry. */
export class NoticeSlot {
 private current?:{message:string;priority:number;until:number};
 private last?:{message:string;until:number};
 clear(){this.current=undefined;}
 reset(){this.clear();this.last=undefined;}
 offer(message:string,now:number,priority:number,duration:number){
  if(this.current&&now<this.current.until&&(this.current.message===message||priority<this.current.priority))return false;
  // Give identical repeat traffic a quiet interval after its bounded display.
  if(this.last?.message===message&&now<this.last.until+1000)return false;
  this.current={message,priority,until:now+duration};this.last={message,until:now+duration};return true;
 }
 active(now:number){return !!this.current&&now<this.current.until;}
}
