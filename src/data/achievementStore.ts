import {ACHIEVEMENT_KEY,applyRun,emptyAchievementSave,mergeAchievementSaves,parseAchievementSave,technologiesOf,type AchievementLoadStatus,type AchievementSave} from './achievementSave';
import type {RunSummary} from './achievements';
import type {StorageLike} from './campaignProgressStore';

export type AchievementStoreStatus=AchievementLoadStatus|'unavailable';
// Achievements for this page session, backed by LocalStorage when it works; same conventions as ProgressStore (campaignProgressStore.ts): the in-memory copy never shrinks,
// reads merge into it, a newer-version save is never overwritten and a failed write only costs persistence, never what was earned this session.
export class AchievementStore{
 private memory:AchievementSave=emptyAchievementSave();
 private writable=true;
 private writeFailed=false;
 public status:AchievementStoreStatus='fresh';
 constructor(private readonly storage:()=>StorageLike|null){}
 // Re-reads the stored save (call when a scene opens). Never throws.
 refresh():void{
  let raw:string|null;
  try{const s=this.storage();if(!s)throw new Error('no storage');raw=s.getItem(ACHIEVEMENT_KEY);}
  catch{this.writable=false;this.status='unavailable';return;}
  const loaded=parseAchievementSave(raw);
  this.writable=loaded.writable;this.status=loaded.status;
  this.memory=mergeAchievementSaves(this.memory,loaded.save);
 }
 /** False when what is earned now would not survive a reload. */
 get persistent(){return this.writable&&!this.writeFailed&&this.status!=='unavailable';}
 get save():AchievementSave{return this.memory;}
 get technologies(){return technologiesOf(this.memory);}
 hasTechnology(name:string){return this.technologies.includes(name);}
 /** Records one finished match: returns the ids unlocked for the first time. Safe to call twice for the same match (nothing changes the second time). */
 record(run:RunSummary,now=Date.now()):string[]{
  this.refresh();
  const {save,newlyUnlocked}=applyRun(this.memory,run,now);
  const changed=JSON.stringify(save)!==JSON.stringify(this.memory);
  this.memory=save;if(changed)this.write();
  return newlyUnlocked;
 }
 private write(){
  if(!this.writable)return;
  try{const s=this.storage();if(!s)throw new Error('no storage');s.setItem(ACHIEVEMENT_KEY,JSON.stringify(this.memory));this.writeFailed=false;if(this.status==='fresh'||this.status==='recovered')this.status='ok';}
  catch{this.writeFailed=true;}
 }
}
export const achievements=new AchievementStore(()=>globalThis.localStorage);
