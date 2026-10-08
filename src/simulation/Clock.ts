export const HZ=30;
export class Clock {
 tick=0; paused=false; timeScale=1; private accumulator=0;
 get seconds(){return this.tick/HZ;}
 reset(){this.accumulator=0;}
 advance(delta:number,step:()=>void){
  if(this.paused||!Number.isFinite(delta)||delta<=0)return;
  this.accumulator+=Math.min(delta,100)*this.timeScale;
  let count=0;
  while(this.accumulator+1e-8>=1000/HZ&&count<5){this.accumulator-=1000/HZ;this.tick++;step();count++;}
  if(count===5)this.accumulator=0;
 }
}
