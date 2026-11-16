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
  if(chapter)return grid(chapter.chapter.id,progress.unlockAll||progress.isUnlocked(level)?level.id:undefined);
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

/** The Victory screen's primary action after winning a story mission. Uses the same chapter views as the menus, so it can only name a mission
 * the briefing would open: the next mission of the chapter, the first mission of the next chapter after a chapter's last one, or the end of
 * the campaign after the last mission of the last chapter once every mission is complete. null when the successor is not playable (locked, unreleased, coming soon); the
 * result screen then falls back to Chapter Select. */
export type VictoryTarget=
 |{readonly kind:'next-mission'|'next-chapter';readonly levelId:string;readonly chapterId:string}
 |{readonly kind:'campaign-complete'};
export function victoryTarget(levels:readonly LevelRef[],progress:Progress<LevelRef>,levelId:string):VictoryTarget|null {
 const level=levels.find(l=>l.id===levelId);if(!level||!isSequential(level))return null;
 const chapters=chapterViews(campaignChapters,levels,progress),at=chapters.findIndex(c=>c.missions.some(m=>m.slot.levelId===levelId));
 if(at<0||chapters[at].state!=='available')return null;
 const same=nextPlayableMission(levels,progress,levelId);
 if(same)return {kind:'next-mission',levelId:same.id,chapterId:chapters[at].chapter.id};
 const own=chapters[at];if(own.missions[own.missions.length-1]?.slot.levelId!==levelId)return null; // mid-chapter with a locked successor
 const following=chapters[at+1];
 // The last mission of the last chapter: complete only when the real progress says the whole campaign is (not a ?unlock=all replay).
 if(!following)return progress.isCompleted(level)&&!progress.next?{kind:'campaign-complete'}:null;
 const first=following.missions[0];
 if(following.state!=='available'||!first||(first.state!=='available'&&first.state!=='completed')||!levels.some(l=>l.id===first.slot.levelId))return null;
 return {kind:'next-chapter',levelId:first.slot.levelId,chapterId:following.chapter.id};
}
