import type {LevelDefinition} from './campaign';
import {lastWarlordPhaseELevel} from './lastWarlordPrototype';
import {HZ} from '../simulation/Clock';
import {lastWarlordE2FieldId,xlArena,xlArenaGates,xlCamps,xlFortRespawn,xlPost,xlPostGates,xlWalls} from '../world/battlefield';

const [northCamp,southCamp]=xlCamps;
const arenaSlots=[[3288,552],[3288,1032]];
const gateHp:Readonly<Record<string,number>>={
 'red-north-camp-gate':1500,'red-south-camp-gate':1500,
 'red-main-gate':2400,'red-north-postern':1800,'red-south-postern':1800,
};
const defenderHp={
 'm6-ncamp-gate':900,'m6-ncamp-inner':900,'m6-scamp-gate':900,'m6-scamp-inner':900,
 'm6-gate-north':1100,'m6-gate-south':1100,'m6-front-north':1625,'m6-front-south':1625,
};

const base=lastWarlordPhaseELevel.match.overrides!,post=base.post!;
export const lastWarlordLevel:LevelDefinition={...lastWarlordPhaseELevel,
  display:{...lastWarlordPhaseELevel.display,
   description:'Survive the Crimson counterattacks and break through to the Warlord.',
   briefing:'Advance north, south or through the center. Destroy camp Barracks to cut off reinforcements and raids. Break both Fortress towers, raise the Azure Banner at Forward Post, then defeat the Crimson Warlord.'},
  match:{...lastWarlordPhaseELevel.match,overrides:{...base,
   battlefield:lastWarlordE2FieldId,
   start:{...base.start,guardian:{x:552,y:792}},
   defenders:Object.keys(defenderHp),defenderHp,
   gates:[
    ...xlArenaGates.map(({id})=>({id,hp:1000,faction:true as const,arenaGate:true as const})),
    ...xlWalls.map(({id})=>({id,hp:gateHp[id],faction:true as const,assist:true as const})),
    ...xlPostGates.map(({id})=>({id,hp:1500,faction:true as const,assist:true as const})),
   ],
   waves:{...base.waves,enemyPerWave:[6,6,6,7,7,8,8,8],elitesPerWave:[0,0,0,0,2,2,2,2],
    caps:{red:22,blue:16},redSlots:[0,1].flatMap(i=>[[...northCamp.slots[i]],[...southCamp.slots[i]],arenaSlots[i]])},
   barracks:xlCamps.map(({id,slots})=>({id,slots,hp:2000})),
   post:{...post,circle:xlPost,flag:{x:xlPost.x,y:xlPost.y},ruin:{col:60,row:14},
    hero:{anchor:[2760,792],spawn:[2760,792],guard:240,respawnTicks:90*HZ}},
   respawnChain:[{post:'forward',candidates:xlFortRespawn}],
   warlord:{...base.warlord!,anchor:[xlArena.x,xlArena.y]},
   wardens:[
    {id:'red-warden-north-camp',anchor:[2400,384],radius:216,respawnTicks:100*HZ,barracks:northCamp.id},
    {id:'red-warden-south-camp',anchor:[2400,1200],radius:216,respawnTicks:100*HZ,barracks:southCamp.id},
   ],
   commanders:[{id:'red-assault-warden',role:'shadowblade',name:'Assault Warden',
    spawns:{north:[1848,360],south:[1848,1224]},sources:{north:northCamp.id,south:southCamp.id},
    firstTick:80*HZ,warningTicks:6*HZ,restTicks:60*HZ,flankTimeoutTicks:40*HZ,
    hp:1,damage:1,attackSpeed:1,speed:1,structureBonus:1,keepBonus:.35,
    escort:{count:2,matchSpeed:true,delayTicks:0}}],
   azure:{pads:[{col:9,row:14},{col:62,row:14}],initial:[{col:9,row:14}],limit:2},
   tavern:{...base.tavern!,initial:{col:9,row:18}},
  }},
};
