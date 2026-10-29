import {campaignChapters} from './campaignChapters';
import {chapterViews} from './chapterView';
import {isSequential,type LevelRef,type Progress} from './campaignProgress';

/** Transient scene data only. Never stored in campaign saves. */
export type CampaignDestination={scene:'ChapterSelect'}|{scene:'CampaignSelect';data:{chapterId:string;selectedLevelId?:string}};
export interface MissionNavigation {levelId:string;returnTo?:CampaignDestination}

/** Resolve identity from registered content; supplied context cannot override a story mission's chapter. */
export function campaignDestination(levels:readonly LevelRef[],progress:Progress<LevelRef>,levelId?:string,requested?:CampaignDestination):CampaignDestination {
 const chapters=chapterViews(campaignChapters,levels,progress),available=chapters.filter(c=>c.state==='available');
 const grid=(chapterId:string,selectedLevelId?:string):CampaignDestination=>({scene:'CampaignSelect',data:{chapterId,...(selectedLevelId?{selectedLevelId}:{})}});
 const level=levels.find(l=>l.id===levelId);
 if(level&&isSequential(level)){
  const chapter=available.find(c=>c.missions.some(m=>m.slot.levelId===level.id));
  if(chapter)return grid(chapter.chapter.id,progress.isUnlocked(level)?level.id:undefined);
 }
 // Legacy Full Battle keeps its entry location, without joining story completion or Chapter 2.
 if(level&&!isSequential(level)){
  if(requested?.scene==='CampaignSelect'){
   const chapter=available.find(c=>c.chapter.id===requested.data?.chapterId);
   if(chapter){
    const selected=chapter.missions.find(m=>m.slot.levelId===requested.data.selectedLevelId&&(m.state==='completed'||m.state==='available'));
    return grid(chapter.chapter.id,selected?.slot.levelId);
   }
  }
  return {scene:'ChapterSelect'};
 }
 return available[0]?grid(available[0].chapter.id):{scene:'ChapterSelect'};
}

/** The next mission in the same released chapter that the player may start now, or null. Never crosses a chapter and never returns a locked or unreleased mission. */
export function nextPlayableMission(levels:readonly LevelRef[],progress:Progress<LevelRef>,levelId:string):LevelRef|null {
 const chapter=chapterViews(campaignChapters,levels,progress).find(c=>c.missions.some(m=>m.slot.levelId===levelId));
 if(!chapter||chapter.state!=='available')return null;
 const at=chapter.missions.findIndex(m=>m.slot.levelId===levelId),next=chapter.missions[at+1];
 if(at<0||!next||(next.state!=='available'&&next.state!=='completed'))return null;
 return levels.find(l=>l.id===next.slot.levelId)??null;
}
