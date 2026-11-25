import type {LevelDefinition} from './campaign';
import {HZ} from '../simulation/Clock';
import {lastWarlord,warlordArena,warlordArenaGates,warlordForwardPost,warlordForwardRespawn} from '../world/battlefield';

export const lastWarlordLevelId='campaign-56';
const holders=lastWarlord.towers!.map(t=>t.id);
const bossId='red-warlord';
// Original arena data, also used directly by the Phase E regression fixtures.
export const lastWarlordPhaseELevel:LevelDefinition={
 id:lastWarlordLevelId,number:56,chapter:6,
 display:{title:'The Last Warlord',difficulty:'standard',
  description:'Rally the Azure army and face the Crimson Warlord.',
  briefing:'Break the two frontline towers, then raise the Azure Banner at Forward Post to open the arena gates. Hold the post to build and respawn there. Lead your Heroes and soldiers into the arena and defeat the Warlord before the Azure Keep falls.'},
 match:{encounter:'extended',overrides:{
  battlefield:'last-warlord',
  start:{guardian:{x:552,y:600},gold:350,wood:300,iron:40},
  defenders:holders,
  defenderHp:Object.fromEntries(holders.map(id=>[id,1625])),
  gates:warlordArenaGates.map(({id})=>({id,hp:1000,faction:true,arenaGate:true})),
  waves:{firstWaveTick:5*HZ,waveInterval:22.5*HZ,enemyPerWave:[5,5,6,6,6,7,7,7],alliedPerWave:1,
   caps:{red:19,blue:16},redSlots:[[1848,360],[1848,840]]},
  post:{id:'forward',name:'Forward Post',circle:warlordForwardPost,
   flag:{x:warlordForwardPost.x,y:warlordForwardPost.y},
   ring:120,holders,ruin:{col:29,row:10},bannerHp:2000,raiseTicks:8*HZ,repair:{percent:60,ticks:150},
   counter:{count:0,slots:[]},hero:{anchor:[1416,504],spawn:[1416,504],guard:216,respawnTicks:2700}},
  respawnChain:[{post:'forward',candidates:warlordForwardRespawn}],contestForwardRespawn:true,
  crimsonKeepArmed:false,crimsonKeepInvulnerable:true,crimsonKeepScenery:true,
  warlord:{id:bossId,anchor:[warlordArena.x,warlordArena.y],leash:warlordArena.radius,
   hp:9600,armor:30,speed:85,damage:110,cooldownTicks:30,windupTicks:9,range:60,cleave:true,charge:true,phases:true},
  azure:{pads:[{col:9,row:10},{col:32,row:10}],initial:[{col:9,row:10}],limit:2},
  tavern:{cap:2,roster:['roland','borin','kael'],initial:{col:9,row:14}},
 }},
 mission:{waveMode:'until-objectives',phases:[
  {id:'break-line',objectives:[{id:'frontline',type:'destroy',targets:holders,display:{label:'Destroy both frontline towers'}}]},
  {id:'seize-post',objectives:[{id:'forward-post',type:'capture',display:{label:'Capture Forward Post'}}]},
  {id:'arena',objectives:[{id:'warlord',type:'defeat-unit',unit:bossId,display:{label:'Defeat the Crimson Warlord'}}]},
 ]},
};
