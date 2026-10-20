import {campaign} from './campaignLevels';
import {PROGRESS_KEY,isSequential,mergeSaves,parseSave,progressOf,recordClear,type CampaignSave,type LevelRef,type Progress} from './campaignProgress';

export interface StorageLike{getItem(key:string):string|null;setItem(key:string,value:string):void}
// 'unavailable' = storage could not be read; a failed write is tracked separately (writeFailed). Either way progress lives on in memory.
export type StoreStatus='fresh'|'ok'|'recovered'|'newer-version'|'unavailable';
// firstClear: this Victory completed the level for the first time (judged on session memory, so a failed write cannot turn it into a replay).
export interface VictoryRecord{recorded:boolean;firstClear:boolean;next:LevelRef|null;upToDate:boolean}

// Progress for this page session, backed by LocalStorage when it works. The in-memory copy is never replaced by a smaller stored one:
// reads merge into it, so a failing or newer-version store cannot lose what was earned this session.
// Multi-tab behaviour is best effort: each write first re-reads and merges the stored save (larger clear count wins), but the
// read-merge-write is not atomic, so two tabs finishing a level in the same instant can still overwrite each other.
export class ProgressStore{
 private memory:CampaignSave={version:1,levels:{}};
 private writable=true;
 private writeFailed=false; // sticky until a write succeeds, so the warning survives scene changes
 public status:StoreStatus='fresh';
 constructor(private readonly storage:()=>StorageLike|null,private readonly levels:()=>readonly LevelRef[]=()=>campaign.list()){}
 // Re-reads the stored save (call when a scene opens). Never throws.
 refresh():void{
  let raw:string|null;
  try{const s=this.storage();if(!s)throw new Error('no storage');raw=s.getItem(PROGRESS_KEY);}
  catch{this.writable=false;this.status='unavailable';return;}
  const loaded=parseSave(raw);
  this.writable=loaded.writable;this.status=loaded.status;
  this.memory=mergeSaves(this.memory,loaded.save);
 }
 // False when progress made now would not survive a reload (storage unreadable, unwritable, or holding a newer save).
 get persistent(){return this.writable&&!this.writeFailed&&this.status!=='unavailable';}
 get progress():Progress<LevelRef>{return progressOf(this.levels(),this.memory);}
 isUnlocked(level:LevelRef){return this.progress.isUnlocked(level);}
 isCompleted(level:LevelRef){return this.progress.isCompleted(level);}
 // Records one clear of a legitimately unlocked sequential level. Anything else is refused.
 recordVictory(level:LevelRef):VictoryRecord{
  this.refresh();
  if(!isSequential(level)||!this.progress.isUnlocked(level))return {recorded:false,firstClear:false,next:null,upToDate:false};
  const firstClear=!this.progress.isCompleted(level);
  this.memory=recordClear(this.memory,level.id);
  if(this.writable){
   try{const s=this.storage();if(!s)throw new Error('no storage');s.setItem(PROGRESS_KEY,JSON.stringify(this.memory));this.writeFailed=false;if(this.status==='fresh'||this.status==='recovered')this.status='ok';}
   catch{this.writeFailed=true;}
  }
  const seq=this.progress.sequence,i=seq.findIndex(l=>l.id===level.id),next=seq[i+1]??null;
  return {recorded:true,firstClear,next,upToDate:!next};
 }
}

export const campaignProgress=new ProgressStore(()=>globalThis.localStorage);
