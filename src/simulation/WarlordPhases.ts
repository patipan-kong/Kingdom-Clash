import {HZ} from './Clock';

export const warlordPhases={
 ironHp:6336,furyHp:3168,ironTicks:60*HZ,bannerHp:1200,
 furyBasicTicks:23,furyCleaveTicks:6*HZ,
 banners:[{id:'red-war-banner-north',x:2088,y:336},{id:'red-war-banner-south',x:2088,y:864}],
 ironSlots:[[1992,432],[2184,768],[2232,432]],
 hornSlots:[[1800,504],[1848,552],[1848,648],[1800,696]],
} as const;

export type WarlordStage='iron'|'exposed'|'fury';
export type WarlordReinforcement='iron'|'horn';
