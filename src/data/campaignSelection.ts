import type {LevelDefinition} from './campaign';
import type {ChapterDefinition} from './campaignChapters';
import {chapterViews,type ChapterMissionView} from './chapterView';
import type {LevelRef,Progress} from './campaignProgress';

export interface MissionSelectionView {
 readonly id:string;
 readonly number:number;
 readonly title:string;
 readonly description:string;
 readonly state:ChapterMissionView['state'];
 readonly selectable:boolean;
 readonly recommended:boolean;
 readonly finale:boolean;
 /** One short card badge: 'PLAY' on the next mission, 'COMING SOON' on an unreleased slot, otherwise empty. */
 readonly badge:'PLAY'|'COMING SOON'|'';
}

/** Display-only resolution: all content comes from real registry entries, never placeholder levels. */
export function campaignSelection(chapters:readonly ChapterDefinition[],levels:readonly (LevelRef&{readonly display:Pick<LevelDefinition['display'],'title'|'description'>})[],progress:Progress<LevelRef>,chapterId:string,preferredId?:string){
 const chapter=chapterViews(chapters,levels,progress).find(v=>v.chapter.id===chapterId);
 if(!chapter||chapter.state!=='available')return null;
 const registry=new Map(levels.map(level=>[level.id,level]));
 const missions:MissionSelectionView[]=chapter.missions.map(({slot,state})=>{
  const level=state==='pending'?undefined:registry.get(slot.levelId),recommended=state==='available'&&progress.next?.id===slot.levelId;
  const selectable=state==='completed'||state==='available';
  return {id:slot.levelId,number:slot.localNumber,title:level?.display.title??(slot.localNumber===chapter.total?'Chapter finale':`Mission ${slot.localNumber}`),
   description:level?.display.description??'Content not yet released. This slot will open when its campaign mission is registered.',
   state,selectable,recommended,finale:slot.localNumber===chapter.total,
   badge:recommended?'PLAY':state==='pending'?'COMING SOON':''};
 });
 const selectedId=missions.find(m=>m.id===preferredId&&m.selectable)?.id??missions.find(m=>m.recommended)?.id??[...missions].reverse().find(m=>m.selectable)?.id??null;
 return {chapter,missions,selectedId};
}
