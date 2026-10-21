import type {ObjectiveRow} from '../data/campaignUi';
/** Ephemeral tracking choice. Never writes to mission progress or saves. */
export class ObjectiveTracking {
 selectedId?:string;private wasComplete=false;
 sync(rows:readonly ObjectiveRow[]){
  let row=rows.find(r=>r.id===this.selectedId);
  if(!row||row.complete&&!this.wasComplete)row=rows.find(r=>!r.complete)??row??rows[0];
  this.selectedId=row?.id;this.wasComplete=row?.complete??false;return row;
 }
 select(id:string,rows:readonly ObjectiveRow[]){const row=rows.find(r=>r.id===id);if(!row)return;this.selectedId=id;this.wasComplete=row.complete;}
}
