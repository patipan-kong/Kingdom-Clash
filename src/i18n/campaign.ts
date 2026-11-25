import type {LevelDisplay} from '../data/campaign';
import type {ChapterDefinition} from '../data/campaignChapters';
import {objectiveTarget,type ObjectiveDefinition} from '../data/mission';
import {chapterContent,missionContent} from './campaignContent';
import {currentLocale,translate,type TranslationKey} from './index';

const chapterTitles:Readonly<Partial<Record<string,TranslationKey>>>={
 'first-war':'firstWar','burning-frontier':'burningFrontier','frozen-crown':'frozenCrown',
 'conquered-lands':'conqueredLands','rise-of-the-heroes':'riseOfHeroes','crimson-reckoning':'crimsonReckoning',
};
export function chapterDisplay(chapter:ChapterDefinition,locale=currentLocale()){
 const key=chapterTitles[chapter.id],row=locale==='en'?undefined:chapterContent[chapter.id]?.[locale];
 return {title:locale!=='en'&&key?translate(key,locale):chapter.title,
  subtitle:row?.[0]??chapter.subtitle,narrative:row?.[1]??chapter.narrative};
}

export function missionDisplay<T extends Pick<LevelDisplay,'title'>&Partial<LevelDisplay>>(id:string,english:T,locale=currentLocale()):T{
 const row=locale==='en'?undefined:missionContent[id]?.[locale];
 if(!row)return english;
 const [title,description,briefing,strategy]=row;
 return {...english,title,description,briefing,strategy};
}

type ObjectiveLabels=Readonly<Partial<Record<string,TranslationKey>>>;
const keep={'assault/keep':'destroyKeep'} as const;
const camps={...keep,'capture/rim':'captureRim','capture/basin':'captureBasin'} as const;
const outposts={...keep,'capture/north':'captureNorth','capture/south':'captureSouth'} as const;
export const objectiveLabels:Readonly<Partial<Record<string,ObjectiveLabels>>>={
 'campaign-01':{'hold/waves':'defeatWaves'},
 'campaign-02':{'fortify/towers':'buildTowers','fortify/waves':'defeatWaves'},
 'campaign-03':{'break/front':'destroyFront'},
 'campaign-04':{'batteries/razed':'destroyBatteries'},
 'campaign-05':{'muster/camp':'destroyCamp'},
 'campaign-06':{'siege/keep':'destroyKeep'},
 'campaign-11':{'defend/waves':'defeatWaves'},
 'campaign-12':{'shore/stuns':'stunCrimson','charge/slows':'slowCrimson','banks/damage':'towerDamage'},
 'campaign-13':{'gates/gatetowers':'destroyGateTowers'},
 'campaign-14':{'siege/barracks':'destroyBarracks'},
 'campaign-15':{'siege/crimson':'destroyKeep'},
 'campaign-16':{'keep/crimson':'destroyKeep'},
 'campaign-21':{'hold/towers':'buildTowers','hold/waves':'defeatWaves','storm/keep':'destroyKeep'},
 'campaign-22':keep,
 'campaign-23':keep,
 'campaign-24':keep,
 'campaign-25':keep,
 'campaign-26':keep,
 'campaign-31':{...keep,'capture/camp':'captureForest'},
 'campaign-32':{...keep,'capture/camp':'captureCliff'},
 'campaign-33':{...keep,'capture/camp':'captureIsland'},
 'campaign-34':keep,
 'campaign-35':camps,
 'campaign-36':keep,
 'campaign-41':{...keep,'capture/camp':'captureOld'},
 'campaign-42':{...keep,'capture/camp':'captureCrossroads'},
 'campaign-43':camps,
 'campaign-44':outposts,
 'campaign-45':outposts,
 'campaign-46':outposts,
 'campaign-51':{'foothold/forest':'captureForestPost','advance/camp':'captureCampPost',...keep},
 'campaign-52':{'foothold/forest':'captureForestPost','advance/camp':'captureCampPost','siege-position/outpost':'captureOutpostPost',...keep},
 'campaign-53':{'assault/forest':'captureForestPost',...keep},
 'campaign-54':{'assault/forest':'captureForestPost','assault/ridge':'captureRidgePost','assault/camp':'captureCrimsonCamp',...keep},
 'campaign-55':{'assault/central':'captureCentralPost',...keep},
 'campaign-56':{'break-line/frontline':'destroyFrontTowers','seize-post/forward-post':'captureForwardPost','arena/warlord':'defeatWarlord'},
};

export function objectiveLabel(levelId:string,phaseId:string,objective:ObjectiveDefinition,locale=currentLocale()){
 const key=objectiveLabels[levelId]?.[`${phaseId}/${objective.id}`];
 const english=objective.display?.label??objective.type;
 return locale==='en'||!key?english:translate(key,locale,{count:objectiveTarget(objective)},english);
}
