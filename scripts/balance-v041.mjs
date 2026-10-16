// Gameplay v0.4.1 durability experiment: runs the deterministic v0.4 bots (scripts/balance-v04.mjs) under combat variants A/B/C
// (src/data/gameplayV041.ts). Requires a fresh `npm test` (it transpiles src into .test-build). Not a human proxy.
// Usage: node scripts/balance-v041.mjs [scenario,...|all] [a,b,c|all|sens] [--full] [--json=path]
//   sens adds the sensitivity variants: bs/cs (HP scaled proportionally at every level) and c-hp/c-dmg (C split into its two halves).
// Every run uses the production v0.4 Keep and waves; only the Simulation's combat variant differs. No file or saved state changes.
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {SCEN,setCombat} from './balance-v04.mjs';
const require=createRequire(import.meta.url);
const {combatVariants}=require('../.test-build/data/gameplayV041.js');
const {a,b,c}=combatVariants;
export const V041={a,b,c,
 bs:{...b,id:'bs',label:'B scaled: HP x1100/1320 at every level',guardianBaseHp:1000,guardianHpGrowth:50},
 cs:{...c,id:'cs',label:'C scaled: HP x950/1320 at every level',guardianBaseHp:864,guardianHpGrowth:43},
 'c-hp':{...a,id:'c-hp',label:'C HP only',guardianBaseHp:c.guardianBaseHp},
 'c-dmg':{...c,id:'c-dmg',label:'C damage only',guardianBaseHp:a.guardianBaseHp},
};
// The nine required scenarios (rush/shield/hammer/dying run at bot reaction 1, 2 and 3 ticks).
export const REQUIRED=['rush','flankWing','flankWingS','shield','hammer','flankHammer','defend15','absent','dying','survive20'];
const row=(v,r)=>{const t=r.heroTaken,x=r.extra;return `${v.padEnd(5)} ${r.name.padEnd(13)} ${r.outcome.padEnd(7)} ${String(r.sec).padStart(6)}s d${String(r.deaths).padStart(2)} A${String(r.azure).padStart(4)} C${String(r.crimson).padStart(4)} L${String(r.level).padStart(2)} xp${String(x.xp).padStart(5)} G${String(r.gold).padStart(4)} buy${x.bought.length?x.bought.join('/'):'-'} taken m${t.rminion??0}/t${t.tower??0}/k${t.keep??0} struct${x.structSec}s reachAz${x.reachedAzure} kills${Object.values(r.killers).reduce((n,k)=>n+k,0)} minHpKeep${r.keep.minHpInRange??'-'} maxHp${x.maxHp}`;};
if(import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 const args=process.argv.slice(2).filter(s=>!s.startsWith('--')),full=process.argv.includes('--full'),json=process.argv.find(s=>s.startsWith('--json='))?.slice(7);
 const scen=!args[0]||args[0]==='all'?REQUIRED:args[0].split(',');
 const vs=!args[1]||args[1]==='all'?['a','b','c']:args[1]==='sens'?['a','b','c','bs','cs','c-hp','c-dmg']:args[1].split(',');
 for(const k of scen)if(!SCEN[k])throw new Error('unknown scenario '+k+'; known: '+Object.keys(SCEN).join(','));
 for(const v of vs)if(!V041[v])throw new Error('unknown variant '+v+'; known: '+Object.keys(V041).join(','));
 const out=[];
 for(const k of scen)for(const v of vs){setCombat(V041[v]);for(const r of [SCEN[k]()].flat()){out.push({variant:v,scenario:k,...r});console.log(row(v,r));
  if(full)console.log('   deathAt',r.deathAt.join(','),'| towerDeaths',r.towerDeaths.join(','),'| levelUps',r.extra.levelUps.map(l=>`L${l.level}@${l.t}s:${l.hpPct}%`).join(' '),'| timeline',r.timeline.join(' '));}}
 setCombat(undefined);
 if(json)writeFileSync(json,JSON.stringify(out,null,1));
}
