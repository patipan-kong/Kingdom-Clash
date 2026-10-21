import {chapterOf,levelId} from './campaign';
import {isSequential,type LevelRef,type Progress} from './campaignProgress';
import type {ChapterDefinition,ChapterSlot} from './campaignChapters';

export interface ChapterMissionView {
 readonly slot:ChapterSlot;
 readonly state:'pending'|'completed'|'available'|'locked';
}
export interface ChapterViewModel {
 readonly chapter:ChapterDefinition;
 readonly missions:readonly ChapterMissionView[];
 readonly completed:number;
 readonly released:number;
 readonly total:number;
 readonly complete:boolean;
 readonly state:'available'|'locked'|'coming-soon';
}

/** Missing intended references are legal pending content, never fake registry entries.
 * Special-mode exclusion uses today's progression policy, not a permanent ID blacklist.
 * Full Battle lives at its own special id, so campaign-20 is free for the Chapter 2 finale.
 */
export function validateChapters(chapters:readonly ChapterDefinition[],levels:readonly LevelRef[]):void {
 const fail=(reason:string):never=>{throw new Error(`Invalid chapters: ${reason}`);};
 const ids=new Set<string>(),numbers=new Set<number>(),refs=new Set<string>();
 const registered=new Map<string,LevelRef>();
 for(const level of levels){if(registered.has(level.id))fail(`duplicate registered reference ${level.id}`);registered.set(level.id,level);}
 for(const chapter of chapters){
  if(!chapter.id||ids.has(chapter.id)||numbers.has(chapter.number))fail('duplicate or missing chapter identity');
  if(!Number.isSafeInteger(chapter.number)||chapter.number<1)fail('invalid chapter number');
  ids.add(chapter.id);numbers.add(chapter.number);
  if(!chapter.title||!chapter.subtitle||!chapter.narrative)fail('missing chapter text');
  if(chapter.slots.length!==10)fail(`${chapter.id} needs ten slots`);
  const locals=new Set<number>();
  for(const slot of chapter.slots){
   if(!Number.isSafeInteger(slot.localNumber)||slot.localNumber<1||slot.localNumber>10||locals.has(slot.localNumber))fail('invalid or duplicate local slot');
   locals.add(slot.localNumber);
   if(slot.levelNumber!==(chapter.number-1)*10+slot.localNumber||chapterOf(slot.levelNumber)!==chapter.number||slot.levelId!==levelId(slot.levelNumber))fail('invalid mission reference');
   if(refs.has(slot.levelId))fail(`duplicate mission reference ${slot.levelId}`);refs.add(slot.levelId);
   const level=registered.get(slot.levelId);
   if(level&&level.number!==slot.levelNumber)fail('registered reference number mismatch');
   if(chapter.release==='available'&&level&&!isSequential(level))fail('special mode cannot be released as a story mission');
  }
 }
}

/** Pure projection of the existing ProgressStore.progress; no storage or unlock rules here. */
export function chapterViews(chapters:readonly ChapterDefinition[],levels:readonly LevelRef[],progress:Progress<LevelRef>):ChapterViewModel[] {
 validateChapters(chapters,levels);
 const registered=new Map(levels.map(level=>[level.id,level]));
 return [...chapters].sort((a,b)=>a.number-b.number).map(chapter=>{
  const missions=[...chapter.slots].sort((a,b)=>a.localNumber-b.localNumber).map(slot=>{
   const level=registered.get(slot.levelId);
   const state:ChapterMissionView['state']=chapter.release==='coming-soon'||!level||!isSequential(level)?'pending':progress.isCompleted(level)?'completed':progress.isUnlocked(level)?'available':'locked';
   return {slot,state};
  });
  const completed=missions.filter(m=>m.state==='completed').length,released=missions.filter(m=>m.state!=='pending').length;
  return {chapter,missions,completed,released,total:missions.length,complete:completed===missions.length,
   state:chapter.release==='coming-soon'?'coming-soon':missions.some(m=>m.state==='available'||m.state==='completed')?'available':'locked'};
 });
}
