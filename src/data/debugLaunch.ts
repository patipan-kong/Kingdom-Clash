import type {ChapterDefinition} from './campaignChapters';
import {levelId} from './campaign';
// Development-only direct mission launch: ?debug=1&level=21 or ?debug=1&chapter=3&mission=1. The global level id stays the internal identifier;
// chapter and mission are the human-facing coordinates, resolved through the chapter slots. Pure: it reads nothing but its arguments.
// Production (dev=false), a missing debug=1, a malformed or unknown coordinate and an unregistered level all return null, so the normal menu opens.
const whole=(v:string|null)=>v!==null&&/^\d{1,3}$/.test(v)?Number(v):null;
export function debugLevelFromSearch(search:string,dev:boolean,chapters:readonly ChapterDefinition[],has:(id:string)=>boolean):string|null{
 if(!dev)return null;
 const q=new URLSearchParams(search);
 if(q.get('debug')!=='1')return null;
 const level=whole(q.get('level')),chapter=whole(q.get('chapter')),mission=whole(q.get('mission'));
 const id=level!==null?levelId(level):chapter!==null&&mission!==null?chapters.find(c=>c.number===chapter)?.slots.find(s=>s.localNumber===mission)?.levelId:undefined;
 return id&&has(id)?id:null;
}
