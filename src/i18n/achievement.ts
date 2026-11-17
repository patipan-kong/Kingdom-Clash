import type {AchievementDef} from '../data/achievements';
import {t,type TranslationKey} from './index';

const content=new Map<string,readonly [TranslationKey,TranslationKey,TranslationKey]>([
 ['ballista-recovered',['achievementBallista','achievementBallistaDescription','achievementBallistaReward']],
 ['warcart-recovered',['achievementWarCart','achievementWarCartDescription','achievementWarCartReward']],
 ['elitebarracks-recovered',['achievementBarracks','achievementBarracksDescription','achievementBarracksReward']],
]);

export function achievementDisplay(def:AchievementDef){
 const keys=content.get(def.id);
 return keys?{title:t(keys[0]),description:t(keys[1]),reward:t(keys[2])}:def;
}
