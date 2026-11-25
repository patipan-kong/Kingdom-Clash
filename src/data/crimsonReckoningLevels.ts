import {CampaignRegistry,type LevelDefinition} from './campaign';
import {serpentValeLevels} from './lowGatePrototype';
import {ridgebackLevel} from './ridgebackPrototype';
import {razeOrSeizeLevel} from './razeOrSeizePrototype';
import {lastWarlordLevel} from './lastWarlordE2Prototype';

export const crimsonReckoningLevels:readonly LevelDefinition[]=[
 ...serpentValeLevels,ridgebackLevel,razeOrSeizeLevel,lastWarlordLevel,
];

// The approved levels on their own, for the Chapter 6 test scripts; the campaign registers the same six definitions (campaignLevels.ts).
export const crimsonReckoningCampaign=new CampaignRegistry(crimsonReckoningLevels);
