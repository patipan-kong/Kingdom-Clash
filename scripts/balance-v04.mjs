// Gameplay v0.4 balance harness: deterministic headless bots comparing the a7e1cea baseline with v0.4 (docs/GAMEPLAY_V0_4.md).
// Requires a fresh `npm test` (it transpiles src into .test-build). Not a browser measurement and not a human proxy.
// Usage: node scripts/balance-v04.mjs [scenario,...|all] [baseline|v04|both] [--full]
//   e.g. node scripts/balance-v04.mjs rush,flankHammer both --full
//        node scripts/balance-v04.mjs queue30,stress30 v04
// Variants are applied by mutating the loaded gameplayV04 data object in this process only; no file or saved state changes.
// "baseline" = inert Keeps + v0.3 waves, which reproduces a7e1cea (the v0.4 Keep shot origin only affects attacking Keeps).
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {upgradeRules,skillLevel,respawnTicks}=require('../.test-build/data/progression.js');
const {gameplayV04}=require('../.test-build/data/gameplayV04.js');
const {canAttack}=require('../.test-build/simulation/Combat.js');
const {blocked}=require('../.test-build/simulation/Collision.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
// v0.4.1: optional combat-durability variant (src/data/gameplayV041.ts) for every Simulation this harness builds; undefined = the Simulation default (active Variant B).
let COMBAT;export const setCombat=v=>{COMBAT=v;};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),DT=1000/30+.01;
const V04={red:{...gameplayV04.keepDefense.red},blue:gameplayV04.keepDefense.blue,waves:{...gameplayV04.waves,enemyPerWave:[...gameplayV04.waves.enemyPerWave]}};
export const VARIANTS={
 baseline:{red:null,blue:null,waves:{enemyPerWave:[3,3,4,4,5,5,6,6,7,7,8,8],lateStartCount:8,lateStepEveryWaves:3,lateCap:10}},
 v04:V04,
};
export function apply(v){
 gameplayV04.keepDefense.red=v.red?{...v.red}:null;gameplayV04.keepDefense.blue=v.blue?{...v.blue}:null;
 gameplayV04.waves.enemyPerWave.splice(0,12,...v.waves.enemyPerWave);
 Object.assign(gameplayV04.waves,{lateStartCount:v.waves.lateStartCount,lateStepEveryWaves:v.waves.lateStepEveryWaves,lateCap:v.waves.lateCap});
}
const cat=id=>id==='guardian'?'guardian':id==='red-base'?'keep':id==='blue-base'?'azure':id.startsWith('red-tower')?'tower':id.startsWith('built-')?'built':id.startsWith('blue')?'bminion':id.startsWith('red')?'rminion':id;
function learn(sim,req){const p=sim.state.heroProgression;if(p.skillPoints>0){const pick=['zone','bash','charge','taunt','fortitude'].find(k=>{const rank=k==='fortitude'?p.fortitude:p.ranks[k];return rank<upgradeRules[k].maxRank&&p.level>=skillLevel(k,rank+1);});if(pick)sim.send({type:'learn',requestId:'l'+(++req.n),skill:pick});}}
function cast(sim,req,foes,enemies){
 const h=sim.hero,p=sim.state.heroProgression,nearest=foes.filter(u=>dist(u,h)<=240).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(!nearest)return;
 const ready=k=>p.ranks[k]>0&&sim.remaining(k)===0;
 if(ready('zone')&&enemies.filter(u=>dist(u,h)<260).length>=3&&h.hp<h.maxHp*.8)sim.send({type:'cast',requestId:'c'+(++req.n),skill:'zone'});
 else if(ready('taunt')&&enemies.filter(u=>dist(u,h)<144).length>=2)sim.send({type:'cast',requestId:'c'+(++req.n),skill:'taunt'});
 else if(ready('bash')&&dist(nearest,h)<=90&&nearest.kind.startsWith('minion'))sim.send({type:'cast',requestId:'c'+(++req.n),skill:'bash'});
 else if(ready('charge')&&dist(nearest,h)>110)sim.send({type:'cast',requestId:'c'+(++req.n),skill:'charge',direction:{x:nearest.x-h.x,y:nearest.y-h.y}});
}
// Metrics observed after every tick.
function metrics(){return {heroTaken:{},dealtTo:{tower:0,keep:0,rminion:0},azureBy:{},deaths:[],towerDeaths:[],azFirst:null,peakRed:0,peakRedQueue:0,timeline:[],
 keepShots:0,keepLanded:0,keepTargets:{},keepGuardianSkipped:0,ticksInKeepRange:0,ticksHittingKeep:0,keepHitStart:null,keepAttackHp:[],minHpInRange:null,lastX:{},killers:{},queue:[],
 structSwings:0,reached:new Set(),xp:0,levelUps:[],respawns:0,bought:[]};}
function observe(sim,M,o){
 const s=sim.state,t=sim.clock.tick,h=sim.hero,keep=s.bases['red-base'],st=combatStructures(s);
 const reds=Object.values(s.units).filter(u=>u.kind==='minion-red'),redQ=sim.spawnQueue.filter(e=>e.team==='red').length;
 for(const u of reds)M.lastX[u.id]=u.x;
 M.peakRed=Math.max(M.peakRed,reds.length);M.peakRedQueue=Math.max(M.peakRedQueue,redQ);
 if(h.hp>0&&keep.hp>0){
  const inRange=keep.range>0?canAttack(keep,h,st):canAttack({...keep,range:140,damage:1},h,st); // baseline: would-be v0.4 reach
  if(inRange){M.ticksInKeepRange++;M.minHpInRange=Math.min(M.minHpInRange??h.hp,h.hp);}
  if(canAttack(h,keep,st)){M.ticksHittingKeep++;if(M.keepHitStart===null)M.keepHitStart=t;}
  // Targeting audit: the Keep must not pick a non-Guardian target while the Guardian is attackable.
  if(keep.targetId&&keep.targetId!=='guardian'&&canAttack(keep,h,st))M.keepGuardianSkipped++;
 }
 for(const e of sim.drainEvents()){
  const tc=cat(e.id||''),sc=cat(e.sourceId||'');
  if(e.type==='attack'&&e.id==='red-base'){M.keepShots++;const k=cat(e.targetId);M.keepTargets[k]=(M.keepTargets[k]??0)+1;}
  if(e.type==='damage'){
   if(e.sourceId==='red-base')M.keepLanded++;
   if(e.sourceId==='guardian'&&M.dealtTo[tc]!==undefined)M.dealtTo[tc]+=e.amount;
   if(tc==='guardian')M.heroTaken[sc]=(M.heroTaken[sc]??0)+e.amount;
   if(tc==='azure'){M.azureBy[sc]=(M.azureBy[sc]??0)+e.amount;if(M.azFirst===null)M.azFirst=+(t/30).toFixed(1);}
  }
  // v0.4.1 extras: Guardian swings at structures, distinct Crimson minions that reached (damaged) Azure, XP, level-ups, respawns, purchases.
  if(e.type==='attack'&&e.id==='guardian'&&['tower','keep'].includes(cat(e.targetId)))M.structSwings++;
  if(tc==='azure'&&e.type==='damage'&&sc==='rminion')M.reached.add(e.sourceId);
  if(e.type==='xp')M.xp+=e.amount;if(e.type==='respawn'&&e.id==='guardian')M.respawns++;
  if(e.type==='level-up')M.levelUps.push({t:+(t/30).toFixed(0),level:e.level,hpPct:Math.round(100*h.hp/h.maxHp)});
  if(e.type==='item-traded'&&e.action==='buy')M.bought.push(+(t/30).toFixed(1));
  if(e.type==='death'&&tc==='rminion')M.killers[sc]=(M.killers[sc]??0)+1;
  if(e.type==='death'){if(e.id==='guardian')M.deaths.push(+(t/30).toFixed(0));if(tc==='tower')M.towerDeaths.push(e.id.replace('red-tower-','')+'@'+Math.round(t/30));}
 }
 if(M.keepHitStart!==null&&t%30===0&&M.keepAttackHp.length<40)M.keepAttackHp.push(h.hp>0?Math.round(h.hp):'dead');
 if(t%1800===0){M.timeline.push(`${t/30}s:A${Math.round(s.bases['blue-base'].hp)}/C${Math.round(keep.hp)}/L${s.heroProgression.level}/G${Math.floor(s.gold)}/r${reds.length}`);
  if(o.queue)M.queue.push({min:t/1800,active:reds.length,queued:redQ,azure:Math.round(s.bases['blue-base'].hp),wave:s.spawnedWaves});}
}
function finish(sim,M,name){
 const s=sim.state,r=s.match.result,round=x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,Math.round(v)]));
 return {name,outcome:r?.outcome??'timeout',sec:+(sim.clock.tick/30).toFixed(1),deaths:M.deaths.length,deathAt:M.deaths,azure:Math.round(s.bases['blue-base'].hp),crimson:Math.round(s.bases['red-base'].hp),azFirst:M.azFirst,level:s.heroProgression.level,gold:Math.floor(s.gold),waves:s.spawnedWaves,
  heroTaken:round(M.heroTaken),dealtTo:round(M.dealtTo),azureBy:round(M.azureBy),towersLeft:Object.values(s.structures).filter(b=>b.team==='red').length,towerDeaths:M.towerDeaths,peakRed:M.peakRed,peakRedQueue:M.peakRedQueue,timeline:M.timeline,killers:M.killers,
  keep:{shots:M.keepShots,landed:M.keepLanded,targets:M.keepTargets,guardianSkipped:M.keepGuardianSkipped,secInRange:+(M.ticksInKeepRange/30).toFixed(1),secHittingKeep:+(M.ticksHittingKeep/30).toFixed(1),firstHitKeep:M.keepHitStart===null?null:+(M.keepHitStart/30).toFixed(1),minHpInRange:M.minHpInRange===null?null:Math.round(M.minHpInRange),hpPerSecFromFirstHit:M.keepAttackHp},queue:M.queue,
  extra:{structSec:+(M.structSwings*23/30).toFixed(1),reachedAzure:M.reached.size,xp:M.xp,levelUps:M.levelUps,respawns:M.respawns,bought:M.bought,maxHp:Math.round(sim.hero.maxHp)}};
}
const PRICE={'siege-hammer':550,'guardian-shield':500};
// Lane bot (adapted from the v0.3 scenario driver): push = nearest foe within 400 else the Keep; defend = nearest threat to Azure.
// dead: Guardian never respawns. park: Guardian stands aside. build: places up to 4 towers. killAt: forced deaths (seconds) with the real respawn formula.
// killEvery: forced death every N seconds. immortalAzure: stress probe only (Azure HP made huge so the match never ends).
export function lane(name,o={}){
 const {mode='push',buy=[],farmUntilBuy=false,maxMin=15,dead=false,park=false,killAt=[],killEvery=0,build=false,reaction=1,immortalAzure=false,queue=false}=o;
 const sim=new Simulation('v04-'+name,'extended',undefined,COMBAT),s=sim.state,h=sim.hero,mid=s.inventory.matchId,req={n:0},M=metrics(),wanted=[...buy];name+=reaction>1?'/r'+reaction:'';
 let pushing=mode==='push'&&!farmUntilBuy;
 if(dead){h.hp=0;h.respawnTick=1e9;}if(park)sim.teleportHero(250,1050);
 if(immortalAzure){const b=s.bases['blue-base'];b.hp=b.maxHp=1e12;}
 const kills=new Set([...killAt.map(k=>Math.round(k*30))]);
 while(!sim.ended&&sim.clock.tick<maxMin*1800){
  const t=sim.clock.tick;learn(sim,req);
  if((kills.has(t)||(killEvery&&t>0&&t%(killEvery*30)===0))&&h.hp>0){h.hp=0;h.strike=undefined;h.respawnTick=t+respawnTicks(s.heroProgression.level,s.guardianDeaths);s.guardianDeaths++;M.deaths.push(t/30);}
  const enemies=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0),foes=[...enemies,...Object.values(s.structures).filter(b=>b.team==='red'&&b.hp>0)],base=s.bases['red-base'];
  if(wanted.length&&t%10===0&&sim.shopPurchaseQuote(wanted[0]).available){sim.send({type:'buy-item',matchId:mid,heroId:'guardian',requestId:'b'+(++req.n),itemId:wanted.shift()});if(farmUntilBuy&&!wanted.length)pushing=true;}
  if(!park&&h.hp>0&&t%reaction===0){
   let goal;
   if(pushing){goal={x:base.x-130,y:base.y};const near=foes.filter(u=>dist(u,h)<400).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(near)goal=near;}
   else{const threat=enemies.filter(u=>dist(u,{x:330,y:600})<650).sort((a,b)=>dist(a,h)-dist(b,h))[0];goal=threat??{x:620,y:600};if(wanted.length&&s.gold>=PRICE[wanted[0]]&&!threat)goal={x:480,y:600};}
   let way=goal;if(goal.x>1050&&h.x<1100)way=(h.x<870&&Math.abs(h.y-575)>12)?{x:830,y:575}:{x:1120,y:575};else if(goal.x<870&&h.x>1050)way=(Math.abs(h.y-575)>12&&h.x>1030)?{x:1075,y:575}:{x:830,y:575};
   const d=dist(h,way),stop=(way===goal&&goal.id)?70:(way===goal?30:10);
   sim.send({type:'move',...(d>stop?{x:(way.x-h.x)/d,y:(way.y-h.y)/d}:{x:0,y:0})});sim.send({type:'attack'});cast(sim,req,foes,enemies);
  }
  if(build&&t%15===0&&s.wood>=80&&s.iron>=10&&Object.values(s.structures).filter(b=>b.team==='blue').length<4){for(const [c,r] of [[10,11],[10,13],[12,10],[12,14],[9,9],[9,15],[13,12],[11,8]]){if(!sim.placementReason('tower',c,r)){sim.send({type:'place',requestId:'p'+(++req.n),kind:'tower',col:c,row:r});break;}}}
  sim.advance(DT);observe(sim,M,{queue});
 }
 return finish(sim,M,name);
}
// Least-defended spot from which the Guardian can hit `target`, counting Crimson towers only. The Keep itself is deliberately
// not counted, so the bot replays the v0.3.1A exploit route and v0.4 shows whether the Keep now answers it.
function bestSpot(sim,target,from){
 const s=sim.state,st=combatStructures(s),towers=Object.values(s.structures).filter(t=>t.team==='red'&&t.hp>0&&t!==target);let best=null;
 const cnt=(x,y)=>{const q={...sim.hero,x,y,hp:1};return towers.filter(t=>canAttack(t,q,st)).length;};
 for(let x=1400;x<=1900;x+=4)for(let y=300;y<=900;y+=4){if(blocked(x,y,20,st))continue;if(!canAttack({...sim.hero,x,y,hp:1},target,st))continue;
  if([[8,0],[-8,0],[0,8],[0,-8]].some(([a,b])=>blocked(x+a,y+b,20,st)||!canAttack({...sim.hero,x:x+a,y:y+b,hp:1},target,st)))continue;
  const n=Math.max(cnt(x,y),cnt(x+8,y),cnt(x-8,y),cnt(x,y+8),cnt(x,y-8)),d=dist({x,y},from);if(!best||n<best.n||(n===best.n&&d<best.d))best={x,y,n,d};}
 return best;
}
function bfs(st,a,b){const G=8,k=(x,y)=>x+','+y,sx=Math.round(a.x/G)*G,sy=Math.round(a.y/G)*G,tx=Math.round(b.x/G)*G,ty=Math.round(b.y/G)*G,prev=new Map([[k(sx,sy),null]]),q=[[sx,sy]];
 for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty)break;for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G],[G,G],[G,-G],[-G,G],[-G,-G]]){const nx=x+dx,ny=y+dy;if(prev.has(k(nx,ny))||blocked(nx,ny,21,st))continue;prev.set(k(nx,ny),[x,y]);q.push([nx,ny]);}}
 const path=[];let c=[tx,ty];if(!prev.has(k(tx,ty)))throw new Error('no path');while(c){path.unshift({x:c[0],y:c[1]});c=prev.get(k(c[0],c[1]));}return path.filter((p,i)=>i%3===0||i===path.length-1);}
// Wing flank: take the north (or south) lane, destroy each tower in `kill` from its least-defended spot, then hit the Keep from
// its least-defended spot, respawning and repeating. Never defends Azure. hammer: farm/defend at home until the Hammer is bought.
export function flank(name,{kill=['keep-north'],side='north',hammer=false,maxMin=15}={}){
 const sim=new Simulation('v04-'+name,'extended',undefined,COMBAT),s=sim.state,h=sim.hero,mid=s.inventory.matchId,req={n:0},M=metrics();
 const laneY=side==='north'?316:892;let route=null,wi=0,spot=null,spotFor=null;M.spots=[];
 while(!sim.ended&&sim.clock.tick<maxMin*1800){
  learn(sim,req);
  if(h.hp<=0){route=null;spot=null;sim.advance(DT);observe(sim,M,{});continue;}
  if(hammer&&!s.inventory.slots.some(id=>id&&s.inventory.instances[id].itemId==='siege-hammer')){
   const threat=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0&&dist(u,{x:330,y:600})<650).sort((a,b)=>dist(a,h)-dist(b,h))[0],g=threat??{x:480,y:600},d=dist(h,g);
   if(sim.clock.tick%10===0&&sim.shopPurchaseQuote('siege-hammer').available){sim.send({type:'buy-item',matchId:mid,heroId:'guardian',requestId:'b'+(++req.n),itemId:'siege-hammer'});M.boughtAt=+(sim.clock.tick/30).toFixed(1);}
   sim.send({type:'move',...(d>(threat?70:20)?{x:(g.x-h.x)/d,y:(g.y-h.y)/d}:{x:0,y:0})});sim.send({type:'attack'});sim.advance(DT);observe(sim,M,{});route=null;continue;}
  if(!route){route=[...bfs(combatStructures(s),h,{x:1200,y:laneY}),{x:1856,y:laneY}];wi=0;}
  let goal,target;
  if(wi<route.length){goal=route[wi];if(dist(h,goal)<14)wi++;}
  else{
   const next=kill.map(id=>s.structures['red-tower-'+id]).find(t=>t&&t.hp>0);target=next??s.bases['red-base'];
   if(spotFor!==target.id||!spot){spot=bestSpot(sim,target,h);spotFor=target.id;M.spots.push(`${target.id.replace('red-tower-','')}@(${spot.x},${spot.y})n${spot.n}`);}
   goal=spot;sim.send({type:'target',id:target.id});sim.send({type:'attack'});
  }
  const d=goal?dist(h,goal):0,k=Math.min(1,d/(280/30))/(d||1);sim.send({type:'move',...(goal&&d>1?{x:(goal.x-h.x)*k,y:(goal.y-h.y)*k}:{x:0,y:0})});
  sim.advance(DT);observe(sim,M,{});
 }
 return {...finish(sim,M,name),spots:[...new Set(M.spots)].join(' '),boughtAt:M.boughtAt??null};
}
const R3=f=>[1,2,3].map(f);
export const SCEN={
 rush:()=>R3(r=>lane('rush',{mode:'push',reaction:r})),
 flankWing:()=>flank('flankWing',{kill:['keep-north']}),
 flankWingS:()=>flank('flankWingS',{kill:['keep-south'],side:'south'}),
 flankWingRear:()=>flank('flankWingRear',{kill:['keep-north','keep-rear']}),
 flankHammer:()=>flank('flankHammer',{kill:['keep-north'],hammer:true}),
 flankHammerDirect:()=>flank('flankHammerDirect',{kill:[],hammer:true}),
 shield:()=>R3(r=>lane('shield',{mode:'push',farmUntilBuy:true,buy:['guardian-shield'],reaction:r})),
 hammer:()=>R3(r=>lane('hammer',{mode:'push',farmUntilBuy:true,buy:['siege-hammer'],reaction:r})),
 defend15:()=>R3(r=>lane('defend15',{mode:'defend',maxMin:15,reaction:r})),
 absent:()=>lane('absent',{dead:true,maxMin:15}),
 dying:()=>R3(r=>lane('dying',{mode:'push',killAt:[60,120,180,240,300,360,420,480],reaction:r})),
 park4:()=>lane('park4',{mode:'defend',park:true,build:true,maxMin:15}),
 survive20:()=>lane('survive20',{mode:'defend',maxMin:20}),
 // Extended queue validation (per-minute active Crimson / queued Crimson / Azure HP).
 queue15:()=>lane('defend15q',{mode:'defend',maxMin:15,queue:true}),
 queue25:()=>lane('defend25q',{mode:'defend',maxMin:25,queue:true}),
 queue30:()=>lane('defend30q',{mode:'defend',maxMin:30,queue:true}),
 dyingDefend30:()=>lane('dyingDefend30',{mode:'defend',maxMin:30,killEvery:90,queue:true}),
 absent30:()=>lane('absent30',{dead:true,maxMin:30,queue:true}),
 stress30:()=>lane('stress30',{dead:true,maxMin:30,immortalAzure:true,queue:true}), // probe: cap saturated for 30 min
};
const short=r=>`${r.name.padEnd(17)} ${r.outcome.padEnd(7)} ${String(r.sec).padStart(6)}s d${String(r.deaths).padStart(2)} A${String(r.azure).padStart(4)} C${String(r.crimson).padStart(4)} L${r.level} G${r.gold} w${r.waves} towersLeft ${r.towersLeft} dealt T${r.dealtTo.tower}/K${r.dealtTo.keep} taken ${JSON.stringify(r.heroTaken)} peakRed ${r.peakRed} peakQ ${r.peakRedQueue} keepShots ${r.keep.shots}/${r.keep.landed}${r.spots?' spots '+r.spots:''}`;
if(import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),full=process.argv.includes('--full');
 const scen=(!args[0]||args[0]==='all'?Object.keys(SCEN).filter(k=>!k.startsWith('queue')&&!k.endsWith('30')):args[0].split(','));
 const vs=(args[1]??'both')==='both'?['baseline','v04']:[args[1]];
 for(const k of scen)if(!SCEN[k])throw new Error('unknown scenario '+k+'; known: '+Object.keys(SCEN).join(','));
 for(const v of vs){apply(VARIANTS[v]);for(const k of scen)for(const r of [SCEN[k]()].flat()){
  console.log(v.padEnd(9),short(r));
  if(full){console.log('   timeline',r.timeline.join(' '),'| deathAt',r.deathAt.join(','),'| towerDeaths',r.towerDeaths.join(','),'| azureBy',JSON.stringify(r.azureBy),r.boughtAt?'| Hammer bought '+r.boughtAt+'s':'');
   console.log('   keep',JSON.stringify(r.keep));}
  if(r.queue.length)console.log('   queue min:active/queued/azure/wave',r.queue.map(q=>`${q.min}:${q.active}/${q.queued}/${q.azure}/w${q.wave}`).join(' '));
 }}
 apply(V04);
}
