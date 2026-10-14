/** One bounded presentation channel. No backlog; duplicate calls never extend expiry. */
export class NoticeSlot {
 private current?:{message:string;identity:string;priority:number;until:number};
 private last?:{identity:string;until:number};
 clear(){this.current=undefined;}
 reset(){this.clear();this.last=undefined;}
 offer(message:string,now:number,priority:number,duration:number,identity=message){
  if(this.current&&now<this.current.until&&(this.current.identity===identity||priority<this.current.priority))return false;
  // Give identical repeat traffic a quiet interval after its bounded display.
  if(this.last?.identity===identity&&now<this.last.until+1000)return false;
  this.current={message,identity,priority,until:now+duration};this.last={identity,until:now+duration};return true;
 }
 isCurrent(identity:string){return this.current?.identity===identity;}
 update(identity:string,message:string,now:number){if(!this.isCurrent(identity)||!this.active(now))return false;this.current!.message=message;return true;}
 clearIdentity(identity:string){if(!this.isCurrent(identity))return false;this.clear();return true;}
 active(now:number){return !!this.current&&now<this.current.until;}
}
