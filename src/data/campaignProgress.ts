import type {ChapterDefinition} from './campaignChapters';
// Stage 2 S5: campaign progress as pure data. Only completed levels are saved; what is unlocked is always derived from the chapter
// order, so missions registered later unlock from existing saves without a migration. No DOM, no storage here.
// Six-mission redesign: the ids now name six-mission chapter slots, so progress lives under its own key. The schema is unchanged (version 1);
// the v1 key keeps the pre-redesign ids, is only ever read (once, to derive a first v2 save) and is never written, so a rollback still finds it.
export const PROGRESS_KEY='kingdom-clash.campaign.v2';
export const LEGACY_PROGRESS_KEY='kingdom-clash.campaign.v1';
export const SAVE_VERSION=1;
export interface CampaignSave{version:1;levels:Record<string,{clears:number}>}
export interface LevelRef{readonly id:string;readonly number:number}
// How a saved value was understood: absent, valid, valid after dropping bad data, or written by a newer build (never overwritten).
export type LoadStatus='fresh'|'ok'|'recovered'|'newer-version';
export interface LoadResult{save:CampaignSave;status:LoadStatus;writable:boolean}

// Levels outside the sequential campaign. They are always available, never count as campaign completion and are never a Continue target.
// This is the one place that distinguishes them; scenes ask isSequential()/specialLabel() instead of comparing ids.
// Chapter 2 S4: Full Battle left 'campaign-20' (reserved for the Chapter 2 finale) for its own id. It is never saved or counted as completion.
const special:Readonly<Record<string,string>>={'full-battle':'FULL BATTLE · ALWAYS AVAILABLE'};
const isSpecial=(id:string)=>Object.prototype.hasOwnProperty.call(special,id);
export const isSpecialLevelId=isSpecial;
// Briefing and result heading of a special mode, which has no chapter or level number.
export const specialModeHeading='FULL BATTLE · SPECIAL MODE';
export const isSequential=(level:LevelRef)=>!isSpecial(level.id);
export const specialLabel=(level:LevelRef)=>isSpecial(level.id)?special[level.id]:null;

const LEVEL_ID=/^campaign-\d{2,3}$/;
const emptySave=():CampaignSave=>({version:1,levels:{}});
const isRecord=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);

// Strict, never throwing. Invalid entries are dropped one by one; an unreadable or malformed save recovers to an empty one.
export function parseSave(raw:string|null):LoadResult{
 if(raw===null)return {save:emptySave(),status:'fresh',writable:true};
 let value:unknown;
 try{value=JSON.parse(raw);}catch{return {save:emptySave(),status:'recovered',writable:true};}
 if(!isRecord(value)||!Number.isSafeInteger(value.version)||(value.version as number)<1)return {save:emptySave(),status:'recovered',writable:true};
 if((value.version as number)>SAVE_VERSION)return {save:emptySave(),status:'newer-version',writable:false};
 const save=emptySave();let clean=isRecord(value.levels);
 if(clean)for(const [id,entry] of Object.entries(value.levels as Record<string,unknown>)){
  const clears=isRecord(entry)?entry.clears:undefined;
  if(LEVEL_ID.test(id)&&typeof clears==='number'&&Number.isSafeInteger(clears)&&clears>=1)save.levels[id]={clears};else clean=false;
 }
 return {save,status:clean?'ok':'recovered',writable:true};
}

// Merge two saves by the larger clear count: nothing earned in either is lost (multi-tab and storage-failure recovery).
export function mergeSaves(a:CampaignSave,b:CampaignSave):CampaignSave{
 const out=emptySave();
 for(const source of [a,b])for(const [id,e] of Object.entries(source.levels))out.levels[id]={clears:Math.max(out.levels[id]?.clears??0,e.clears)};
 return out;
}

// The playable campaign order: the slots of the released chapters in chapter and mission order, as far as they run unbroken. Level numbers
// are chapter blocks (1-6, 11-16, ...), so registration says nothing about order. The sequence stops at the first unreleased chapter and at the
// first slot without a registered story level, so a registered mission in an unreleased chapter (Chapter 3) is never unlocked or a Continue target.
export type SequenceChapter=Pick<ChapterDefinition,'number'|'release'|'slots'>;
export function sequenceOf<T extends LevelRef>(chapters:readonly SequenceChapter[],levels:readonly T[]):T[]{
 const registered=new Map(levels.filter(isSequential).map(l=>[l.id,l])),out:T[]=[];
 for(const chapter of [...chapters].sort((a,b)=>a.number-b.number)){
  if(chapter.release!=='available')break;
  for(const slot of [...chapter.slots].sort((a,b)=>a.localNumber-b.localNumber)){const l=registered.get(slot.levelId);if(!l)return out;out.push(l);}
 }
 return out;
}

export interface Progress<T extends LevelRef>{
 readonly sequence:readonly T[];
 readonly completed:readonly T[]; // the contiguous completed prefix of the sequence
 readonly next:T|null; // first unlocked, incomplete sequential level; null = up to date
 isUnlocked(level:LevelRef):boolean;
 isCompleted(level:LevelRef):boolean;
}
// Completed = the unbroken run of saved clears from the start of the sequence, so out-of-order or unknown entries unlock nothing.
export function progressOf<T extends LevelRef>(chapters:readonly SequenceChapter[],levels:readonly T[],save:CampaignSave):Progress<T>{
 const sequence=sequenceOf(chapters,levels),completed:T[]=[];
 for(const l of sequence){if(!save.levels[l.id])break;completed.push(l);}
 const done=new Set(completed.map(l=>l.id)),index=new Map(sequence.map((l,i)=>[l.id,i]));
 return {sequence,completed,next:sequence[completed.length]??null,
  isCompleted:l=>done.has(l.id),
  isUnlocked:l=>!isSequential(l)||(index.has(l.id)&&index.get(l.id)!<=completed.length)};
}

// The pre-redesign cleared prefix (old Levels 1..N cleared without a gap) each six-mission slot needs before a v1 save counts it as cleared.
// Conservative by design: a mission is cleared only once every old level it stands for has been, so a v1 save never gains progress.
const legacyThresholds:Readonly<Record<string,number>>={
 'campaign-01':2,'campaign-02':3,'campaign-03':5,'campaign-04':8,'campaign-05':9,'campaign-06':10,
 'campaign-11':11,'campaign-12':13,'campaign-13':14,'campaign-14':16,'campaign-15':19,'campaign-16':20,
};
export function legacyPrefix(legacy:CampaignSave):number{let n=0;while(legacy.levels[`campaign-${String(n+1).padStart(2,'0')}`])n++;return n;}
export function migrateLegacySave(legacy:CampaignSave):CampaignSave{
 const prefix=legacyPrefix(legacy),out=emptySave();
 for(const [id,threshold] of Object.entries(legacyThresholds))if(prefix>=threshold)out.levels[id]={clears:1};
 return out;
}

export function recordClear(save:CampaignSave,id:string):CampaignSave{
 const out=mergeSaves(save,emptySave());out.levels[id]={clears:(save.levels[id]?.clears??0)+1};return out;
}
