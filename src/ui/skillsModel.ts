import {skillLevel,upgradeRules,type GuardianUpgrade} from '../data/progression';
import type {Simulation} from '../simulation/Simulation';
export const skillOrder:GuardianUpgrade[]=['bash','taunt','charge','zone','fortitude'];
export function allocationState(sim:Simulation,skill:GuardianUpgrade){
 const p=sim.state.heroProgression,rules=upgradeRules[skill],rank=skill==='fortitude'?p.fortitude:p.ranks[skill];
 const gate=rank<rules.maxRank?skillLevel(skill,rank+1):undefined;
 const state=gate===undefined?'Max rank':p.level<gate?'Locked':p.skillPoints<1?'No points':rank?'Upgrade':'Learn';
 return{rank,gate,state,available:gate!==undefined&&p.level>=gate&&p.skillPoints>0,max:rules.maxRank};
}
export class SkillsModel {
 selected=0;message='';pending?:{skill:GuardianUpgrade;rank:number;tick:number};private sequence=0;private last?:{skill:GuardianUpgrade;at:number};
 open(){this.message='';}
 move(delta:number){if(!this.pending)this.message='';this.selected=(this.selected+delta+5)%5;}
 request(sim:Simulation,skill:GuardianUpgrade,now:number){
  const a=allocationState(sim,skill);
  if(this.pending||!a.available||sim.ended||sim.clock.paused||this.last?.skill===skill&&now-this.last.at<350)return;
  this.pending={skill,rank:a.rank,tick:sim.clock.tick};this.last={skill,at:now};this.message='Upgrade pending…';
  return{type:'learn' as const,requestId:`skill-ui-${++this.sequence}`,skill};
 }
 sync(sim:Simulation){
  const p=this.pending;if(!p)return;
  const rank=allocationState(sim,p.skill).rank;
  if(rank>p.rank){this.message=`${upgradeRules[p.skill].name} rank ${rank} learned`;this.pending=undefined;}
  else if(sim.clock.tick>p.tick||sim.clock.paused||sim.ended){this.message='Upgrade not applied · check availability';this.pending=undefined;}
 }
}
