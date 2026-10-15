import type {Simulation} from '../simulation/Simulation';
import type {BuildingKind} from '../data/buildings';
import type {GameEvent} from '../simulation/GameState';
export type BuildPlacement={kind:BuildingKind;col:number;row:number};
export class BuildModel {
 kind?:BuildingKind;collapsed=false;message='';pending?:{requestId:string;placement:BuildPlacement;tick:number};
 started?:string;private sequence=0;private last?:{key:string;at:number};
 reset(){this.kind=undefined;this.collapsed=false;this.message='';this.pending=undefined;this.started=undefined;}
 choose(kind:BuildingKind){if(this.pending)return false;this.kind=kind;this.collapsed=true;this.message='';this.started=undefined;return true;}
 request(sim:Simulation,placement:BuildPlacement|undefined,now:number){
  if(this.pending||!placement||placement.kind!==this.kind||sim.ended||sim.clock.paused||sim.placementReason(placement.kind,placement.col,placement.row))return;
  const key=`${placement.kind}:${placement.col}:${placement.row}`;if(this.last?.key===key&&now-this.last.at<350)return;
  const requestId=`ui-${++this.sequence}`;this.last={key,at:now};this.pending={requestId,placement:{...placement},tick:sim.clock.tick};this.message='Pending construction…';return requestId;
 }
 observe(event:GameEvent){
  if(event.type!=='built'||event.requestId!==this.pending?.requestId)return false;
  this.started=event.id;this.pending=undefined;this.message='Construction started · charged once';return true;
 }
 sync(sim:Simulation){
  const pending=this.pending;if(!pending)return false;
  const structure=sim.state.structures[`built-${pending.requestId}`];
  if(structure){this.started=structure.id;this.pending=undefined;this.message='Construction started · charged once';return true;}
  // Every queued place is processed in the next simulation step. Rejections
  // have no request ID, so infer only our own failure from tick + structure ID.
  if(sim.clock.tick>pending.tick){
   this.pending=undefined;this.message='Construction rejected';
  }
  return false;
 }
}
