import type {StorageLike,VictoryRecord} from './campaignProgressStore';

const KEY='kingdom-clash.interstitial.v1';
const COOLDOWN_MS=10*60*1000;

export class InterstitialFrequency{
 private count=0;
 private lastShown:number|null=null;
 private loaded=false;

 constructor(private readonly storage:()=>StorageLike|null){}

 // The caller records a legitimate Victory once per match through ProgressStore.
 // An opportunity belongs only to that result screen and is never persisted.
 recordVictory(victory:VictoryRecord):boolean{
  if(!victory.recorded||!victory.firstClear)return false;
  this.load();
  this.count=(this.count+1)%3;
  this.save();
  return this.count===0;
 }

 canShow(now=Date.now()):boolean{
  this.load();
  return this.lastShown===null||now-this.lastShown>=COOLDOWN_MS;
 }

 markShown(now=Date.now()){
  this.load();
  this.lastShown=now;
  this.save();
 }

 private load(){
  if(this.loaded)return;
  this.loaded=true;
  try{
   const data=JSON.parse(this.storage()?.getItem(KEY)??'null');
   if(Number.isInteger(data?.count)&&data.count>=0&&data.count<3)this.count=data.count;
   if(Number.isFinite(data?.lastShown)&&data.lastShown>=0)this.lastShown=data.lastShown;
  }catch{/* Keep session defaults if the save is unavailable. */}
 }

 private save(){
  try{this.storage()?.setItem(KEY,JSON.stringify({count:this.count,lastShown:this.lastShown}));}
  catch{/* Keep tracking in memory when storage is unavailable. */}
 }
}

export const interstitialFrequency=new InterstitialFrequency(()=>globalThis.localStorage);
