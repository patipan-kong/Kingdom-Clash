import type {LevelDefinition} from './campaign';
import type {MissionStatus,OutcomeReason} from '../simulation/Mission';

export type BattleLaunch={mode:'quick';encounter?:'prototype'|'extended'}|{mode:'campaign';levelId:string};

export interface ObjectiveRow{
 readonly id:string;
 readonly phaseId:string;
 readonly label:string;
 readonly progress:number;
 readonly target:number;
 readonly complete:boolean;
 readonly state:'complete'|'active'|'locked';
}

export interface MissionPanelView{
 readonly heading:string;
 readonly rows:readonly ObjectiveRow[];
 readonly activePhase:string|null;
 readonly completedPhases:readonly string[];
 readonly azure:{hp:number;maxHp:number;minimum:number|null;safe:boolean};
 readonly crimson:{hp:number;maxHp:number}|null;
 readonly complete:boolean;
}

const fallbackLabel=(type:string)=>({
 'waves-defeated':'Defeat Crimson Waves','destroy':'Destroy Targets','structures-completed':'Complete Structures',
 'structures-standing':'Keep Structures Standing','tower-kills':'Archer Tower Kills','tower-damage':'Archer Tower Damage',
 'skill-impact':'Skill Effects','guardian-level':'Guardian Level','skill-rank':'Skill Rank',
}[type]??'Mission Objective');

export function missionPanelView(level:LevelDefinition,status:MissionStatus|null,bases:{blue:{hp:number;maxHp:number};red:{hp:number;maxHp:number}}):MissionPanelView{
 const threshold=level.mission?.failure?.azureKeepHpBelow;
 const minimum=threshold===undefined?null:bases.blue.maxHp*threshold;
 const azure={hp:bases.blue.hp,maxHp:bases.blue.maxHp,minimum,safe:minimum===null||bases.blue.hp>=minimum};
 if(!level.mission)return {heading:'Destroy the Crimson Keep',rows:[],activePhase:null,completedPhases:[],azure,crimson:{hp:bases.red.hp,maxHp:bases.red.maxHp},complete:bases.red.hp<=0};
 const rows=(status?.objectives??[]).map(o=>({
  id:o.id,phaseId:o.phaseId,label:o.display?.label??fallbackLabel(o.type),progress:o.progress,target:o.target,complete:o.complete,
  state:o.complete?'complete':o.active?'active':'locked',
 } as ObjectiveRow));
 return {heading:rows.find(r=>r.state==='active')?.label??rows.at(-1)?.label??level.display.title,rows,activePhase:status?.activePhase??null,
  completedPhases:status?.completedPhases??[],azure,crimson:null,
  complete:status?.status==='victory'||rows.length>0&&rows.every(r=>r.complete)};
}

export function outcomeReason(reason:OutcomeReason|undefined){
 return ({
  'objectives-complete':'All mission objectives completed.',
  'azure-keep-destroyed':'The Azure Keep was destroyed.',
  'azure-keep-hp-threshold':'The Azure Keep fell below the required minimum HP.',
  'crimson-keep-destroyed':'The Crimson Keep was destroyed.',
  'both-keeps-destroyed':'Both Keeps fell together; defeat takes precedence.',
 } as Partial<Record<OutcomeReason,string>>)[reason!]??'The battle has ended.';
}
