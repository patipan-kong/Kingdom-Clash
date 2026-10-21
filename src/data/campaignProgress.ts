// Stage 2 S5: campaign progress as pure data. Only completed levels are saved; what is unlocked is always derived from the registered
// campaign order, so levels registered later (Levels 6-10...) unlock from existing saves without a migration. No DOM, no storage here.
export const PROGRESS_KEY='kingdom-clash.campaign.v1';
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

// The playable campaign order: sequential levels by number, as far as the numbers run unbroken from 1. A registered level after a gap
// is not part of the sequence (and so is never unlocked) rather than being silently skipped to.
export function sequenceOf<T extends LevelRef>(levels:readonly T[]):T[]{
 const sorted=levels.filter(isSequential).sort((a,b)=>a.number-b.number),out:T[]=[];
 for(const l of sorted){if(l.number!==out.length+1)break;out.push(l);}
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
export function progressOf<T extends LevelRef>(levels:readonly T[],save:CampaignSave):Progress<T>{
 const sequence=sequenceOf(levels),completed:T[]=[];
 for(const l of sequence){if(!save.levels[l.id])break;completed.push(l);}
 const done=new Set(completed.map(l=>l.id)),index=new Map(sequence.map((l,i)=>[l.id,i]));
 return {sequence,completed,next:sequence[completed.length]??null,
  isCompleted:l=>done.has(l.id),
  isUnlocked:l=>!isSequential(l)||(index.has(l.id)&&index.get(l.id)!<=completed.length)};
}

export function recordClear(save:CampaignSave,id:string):CampaignSave{
 const out=mergeSaves(save,emptySave());out.levels[id]={clears:(save.levels[id]?.clears??0)+1};return out;
}
