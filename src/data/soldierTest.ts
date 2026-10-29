import type {Simulation} from '../simulation/Simulation';
// Development-only human playtest of the Hybrid Soldier prototype (src/simulation/SoldierProto.ts): ?debug=1&chapter=3&mission=2&soldierTest=400 (or 600).
// Pure parse; production (dev=false), a missing debug=1 and any value but 400 or 600 return null, so normal play never has soldiers.
export const SOLDIER_TEST_COUNT=4;
export function soldierTestFromSearch(search:string,dev:boolean):number|null{
 if(!dev)return null;
 const q=new URLSearchParams(search),v=q.get('soldierTest');
 return q.get('debug')==='1'&&(v==='400'||v==='600')?Number(v):null;
}
// Queues the four Azure Soldiers once, on open ground around the Guardian's start. They are not replaced when they die.
export function applySoldierTest(sim:Simulation,leash:number){
 sim.soldierProto={mode:'hybrid',leash};
 const h=sim.hero,spots=[[-60,-48],[-60,48],[-110,0],[-110,-96],[-110,96],[-160,0]];
 let n=0;
 for(const [dx,dy] of spots){
  if(n>=SOLDIER_TEST_COUNT)break;
  const x=h.x+dx,y=h.y+dy;
  if(sim.geo.blocked(x,y,12,sim.state.structures))continue;
  sim.spawnQueue.push({tick:sim.clock.tick+1+n*6,team:'blue',id:`blue-s-${n}`,x,y,wave:0});n++;
 }
 // Footman stats, applied to each soldier the tick after it spawns (the stock Azure minion is 240 HP, 18 damage, speed 95).
 const advance=sim.advance.bind(sim),patched=new Set<string>();
 sim.advance=(ms:number)=>{const r=advance(ms);for(const u of Object.values(sim.state.units))if(u.id.startsWith('blue-s-')&&!patched.has(u.id)){patched.add(u.id);Object.assign(u,{maxHp:320,hp:320,armor:10,damage:20,speed:120});}return r;};
 console.info(`[Kingdom Clash] SOLDIER TEST: hybrid, leash ${leash} px, ${n} soldiers`);
}
