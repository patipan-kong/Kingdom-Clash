// Subdued card decoration chosen from a mission's own objectives, using sprites the battlefield already loads. No per-mission art.
export type MissionArtTexture='tower'|'guardian'|'base-blue'|'base-red';
export interface MissionArt {readonly texture:MissionArtTexture;readonly height:number;readonly tint?:number}
export const MISSION_ART_TEXTURES:readonly MissionArtTexture[]=['tower','guardian','base-blue','base-red'];
interface Objective {readonly type:string;readonly targets?:readonly string[]}
const CRIMSON=0xe0766a;

/** Finale: Crimson Keep. Guardian/skill goals: the Guardian. Breaking enemy towers: a crimson-tinted Archer Tower. Otherwise defence: Archer Tower, or the Azure Keep when only waves must be held. */
export function missionArt(mission:{readonly phases:readonly {readonly objectives:readonly Objective[]}[]}|null,finale:boolean):MissionArt{
 if(finale||!mission)return {texture:'base-red',height:84};
 const all=mission.phases.flatMap(p=>p.objectives),has=(type:string)=>all.some(o=>o.type===type);
 if(has('guardian-level')||has('skill-impact'))return {texture:'guardian',height:80};
 if(all.some(o=>o.type==='destroy'&&o.targets?.some(t=>t!=='red-base')))return {texture:'tower',height:96,tint:CRIMSON};
 if(all.some(o=>o.type==='destroy'))return {texture:'base-red',height:84};
 if(has('structures-completed')||has('structures-standing')||has('tower-damage')||has('tower-kills'))return {texture:'tower',height:96};
 return {texture:'base-blue',height:84};
}
