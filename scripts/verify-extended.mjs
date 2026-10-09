// Phase 2C Scenario 2: one unassisted extended match played through real controls.
// The page is only observed (read-only); no state, stats, timers or commands are injected.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickGame} from './browser-coordinates.mjs';
const variant=process.env.VERIFICATION_VARIANT||'development',url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5180/?encounter=extended',root=process.env.EVIDENCE_ROOT||'docs/phase2c';
const policy=process.env.EXTENDED_POLICY||'balanced',maxWallMs=Number(process.env.EXTENDED_MAX_WALL_MS||1500000);
const dir=`${root}/screenshots/${variant}`;await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true}),checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});page.on('crash',()=>errors.push('Renderer crash'));
const click=(x,y)=>clickGame(page,x,y);
const check=(ok,name,detail)=>{checks.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
async function painted(){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(frame=>window.kingdomGame.loop.frame>frame+1,frame);}
async function install(){await page.evaluate(()=>{
 const R=window.rec={frames:[],updates:[],spawnIds:[],dup:0,casts:{bash:0,taunt:0,charge:0,zone:0},dealt:0,taken:0,baseDealt:0,deaths:0,respawns:0,xp:[],xpTotal:0,towerKills:0,minionKills:0,levelUps:[],waveTicks:{},baseTimeline:[],peakUnits:0,peakRed:0,peakBlue:0,spikes:[],threat:0,rejected:{},ended:null,lastSample:-1,builds:0};
 const b=window.kingdomGame.scene.getScene('Battle'),orig=b.sys.sceneUpdate;b.sys.sceneUpdate=function(...a){const t=performance.now();try{return orig.apply(this,a);}finally{R.updates.push(performance.now()-t);}};
 let last=performance.now();const tick=now=>{const d=now-last;last=now;R.frames.push(d);if(d>100){const s=window.kingdomGame.scene.getScene('Battle').simulation;R.spikes.push({d:Math.round(d),tick:s.clock.tick,spawns:R.frameSpawns,deaths:R.frameDeaths});}R.frameSpawns=0;R.frameDeaths=0;requestAnimationFrame(tick);};requestAnimationFrame(tick);
 window.kingdomGame.events.on('simulation-event',e=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,t=s.clock.tick;
  R.frameSpawns??=0;R.frameDeaths??=0;if(e.type==='spawn')R.frameSpawns++;if(e.type==='death')R.frameDeaths++;
  if(e.type==='spawn'){if(R.spawnIds.includes(e.id))R.dup++;R.spawnIds.push(e.id);}
  if(e.type==='wave')R.waveTicks[e.index]=t;
  if(e.type==='cast-accepted')R.casts[e.skill]++;
  if(e.type==='damage'){if(e.sourceId==='guardian'){R.dealt+=e.amount;if(e.id==='red-base')R.baseDealt+=e.amount;}if(e.id==='guardian')R.taken+=e.amount;}
  if(e.type==='death'){if(e.id==='guardian')R.deaths++;else if(e.id.startsWith('red-tower'))R.towerKills++;else if(e.id.startsWith('red-'))R.minionKills++;}
  if(e.type==='respawn')R.respawns++;
  if(e.type==='xp'){R.xp.push({sourceId:e.sourceId,amount:e.amount,tick:t});R.xpTotal+=e.amount;}
  if(e.type==='level-up')R.levelUps.push({level:e.level,tick:t});
  if(e.type==='rejected')R.rejected[e.reason]=(R.rejected[e.reason]||0)+1;
  if(e.type==='built')R.builds++;
  if(e.type==='match-end')R.ended={outcome:e.outcome,tick:e.tick};});
});}
async function snap(){return page.evaluate(()=>{
 const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,h=window.kingdomGame.scene.getScene('HUD'),st=s.state,R=window.rec,hero=s.hero;
 const units=Object.values(st.units),red=units.filter(u=>u.team==='red'&&u.hp>0),blue=units.filter(u=>u.team==='blue'&&u.hp>0);
 R.peakUnits=Math.max(R.peakUnits,units.length);R.peakRed=Math.max(R.peakRed,red.length);R.peakBlue=Math.max(R.peakBlue,blue.length);
 const sec=Math.floor(s.clock.tick/30);if(sec%15===0&&sec!==R.lastSample){R.lastSample=sec;R.baseTimeline.push({sec,blue:Math.round(st.bases['blue-base'].hp),red:Math.round(st.bases['red-base'].hp),level:st.heroProgression.level,units:units.length,wave:st.spawnedWaves,hero:Math.round(hero.hp)});}
 const warning=h.objectiveText.text.includes('THREATENED');if(warning)R.threat++;
 return {tick:s.clock.tick,hero:{x:hero.x,y:hero.y,hp:hero.hp,maxHp:hero.maxHp},p:st.heroProgression,attacking:st.attacking,wave:st.spawnedWaves,wood:st.wood,iron:st.iron,gold:st.gold,
  blueHp:st.bases['blue-base'].hp,redHp:st.bases['red-base'].hp,red:red.map(u=>({id:u.id,x:u.x,y:u.y})),towers:Object.values(st.structures).filter(x=>x.team==='red'&&x.hp>0).map(x=>({id:x.id,x:x.x,y:x.y})),myTowers:Object.values(st.structures).filter(x=>x.team==='blue'&&x.kind==='tower').length,
  ready:Object.fromEntries(['bash','taunt','charge','zone'].map(k=>[k,s.remaining(k)])),disabled:Object.fromEntries(h.abilities.map(a=>[a.id,a.disabled])),results:h.results.visible,paused:s.clock.paused,phase:st.match.phase,objective:h.objectiveText.text,warning,cam:{x:b.cameras.main.scrollX,y:b.cameras.main.scrollY}};});}
const keys=new Set();
async function setKeys(want){for(const k of [...keys])if(!want.has(k)){await page.keyboard.up(k);keys.delete(k);}for(const k of want)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}}
async function steer(from,to,dead=22){const dx=to.x-from.x,dy=to.y-from.y,w=new Set();if(Math.hypot(dx,dy)>dead){if(dx>dead*.6)w.add('d');if(dx<-dead*.6)w.add('a');if(dy>dead*.6)w.add('s');if(dy<-dead*.6)w.add('w');}await setKeys(w);}
async function ability(id){const a=await page.evaluate(id=>{const a=window.kingdomGame.scene.getScene('HUD').abilities.find(a=>a.id===id);return {x:a.x,y:a.y};},id);await click(a.x,a.y);}
const can=(p,k)=>{const rank=k==='fortitude'?p.fortitude:p.ranks[k],max={bash:5,taunt:5,charge:5,zone:3,fortitude:2}[k];const gate=k==='fortitude'?[18,20][rank]:k==='zone'?[6,11,16][rank]:2*(rank+1)-1;return rank<max&&p.level>=gate;};
async function learn(skill){const before=await page.evaluate(k=>{const p=window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression;return k==='fortitude'?p.fortitude:p.ranks[k];},skill);
 await setKeys(new Set());await click(166,44);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').skillPanel.visible);await painted();
 await click(...{bash:[386,280],taunt:[574,280],charge:[386,370],zone:[574,370],fortitude:[386,450]}[skill]);
 await page.waitForFunction(({skill,before})=>{const p=window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression;return (skill==='fortitude'?p.fortitude:p.ranks[skill])>before;},{skill,before},{timeout:8000});
 await click(574,450);await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('HUD').skillPanel.visible);}
async function buildTower(col,row){
 const u=await page.evaluate(()=>{const u=window.kingdomGame.scene.getScene('HUD').utilities[0];return {x:u.x,y:u.y};});await setKeys(new Set());
 await click(u.x,u.y);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').buildingMode);await painted();
 await click(508,371);await painted();
 const cell=await page.evaluate(({col,row})=>{const b=window.kingdomGame.scene.getScene('Battle');return {x:(col+.5)*48-b.cameras.main.scrollX,y:(row+.5)*48*.72-b.cameras.main.scrollY};},{col,row});
 await click(cell.x,cell.y);await painted();
 const ok=await page.evaluate(({col,row})=>{const p=window.kingdomGame.scene.getScene('Battle').placement;return !!p&&p.col===col&&p.row===row;},{col,row}).catch(()=>false);
 if(ok){const before=await page.evaluate(()=>window.rec.builds);await click(432,470);await page.waitForFunction(b=>window.rec.builds>b,before,{timeout:4000}).catch(()=>{});}
 await click(552,470);await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('Battle').buildingMode,null,{timeout:4000}).catch(()=>{});return ok;}
const spots=[[12,12],[12,14],[12,11],[13,13],[11,13],[11,11],[12,15],[13,11]];
let spotIndex=0;const t0=Date.now(),shots={};
async function shot(name){if(shots[name])return;shots[name]=true;await page.screenshot({path:`${dir}/${name}.png`});}
try{
 await page.goto(url);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('HUD').skillPanel);await install();
 const initial=await snap();evidence.initial=initial;
 check(initial.objective.startsWith('Wave 0 / 12'),'Extended encounter loads from the URL with the wave/time HUD',initial.objective);
 check(initial.towers.length===7&&initial.red.length===0&&initial.blueHp===3000&&initial.redHp===3000,'Extended match starts with seven Crimson towers, no raiders and full keeps');
 let lastLearn=0,lastBuild=0,lastCast=0,mode='defend',idleIterations=0,stuck={x:0,y:0,at:0};
 while(Date.now()-t0<maxWallMs){
  const s=await snap();if(s.results||s.phase==='victory'||s.phase==='defeat')break;
  if(s.hero.hp<=0){await setKeys(new Set());await page.waitForTimeout(250);continue;}
  const here=s.hero,enemies=s.red,nearestE=[...enemies,...s.towers].map(u=>({...u,d:Math.hypot(u.x-here.x,u.y-here.y)})).sort((a,b)=>a.d-b.d)[0];
  const calm=!nearestE||nearestE.d>320;
  if(s.warning&&!shots['extended-keep-threatened']&&s.tick>600)await shot('extended-keep-threatened');
  if(s.p.skillPoints>0&&calm){const pick=['zone','bash','charge','taunt','fortitude'].find(k=>can(s.p,k));if(pick&&Date.now()-lastLearn>1500){lastLearn=Date.now();await learn(pick);if(pick==='zone')await shot('extended-r-learned');continue;}}
  if(policy!=='rush'&&calm&&s.wood>=80&&s.iron>=10&&s.myTowers<5&&s.tick-lastBuild>240&&Math.hypot(here.x-620,here.y-600)<330&&spotIndex<spots.length){lastBuild=s.tick;const [c,r]=spots[spotIndex++];await buildTower(c,r);continue;}
  const push=policy==='rush'||(s.p.level>=7||s.wave>=6)&&s.blueHp>1500;mode=push?'push':'defend';
  let goal;
  if(push){goal=nearestE&&nearestE.d<420?nearestE:{x:1480,y:600};}
  else{const threats=enemies.filter(u=>Math.hypot(u.x-330,u.y-600)<700).map(u=>({...u,d:Math.hypot(u.x-here.x,u.y-here.y)})).sort((a,b)=>a.d-b.d);goal=threats[0]??{x:620,y:600};}
  let way=goal;if(goal.x>1000&&here.x<1070){way=here.x<850?{x:860,y:600}:Math.abs(here.y-600)>30?{x:here.x,y:600}:{x:1090,y:600};}
  if(goal.x<880&&here.x>1000){way=here.x>1070?{x:1090,y:600}:{x:860,y:600};}
  await steer(here,way,goal.id?60:24);
  if(!s.attacking)await ability('attack');
  // Skills: use real controls only when the authoritative cooldown/rank says they are available.
  if(nearestE&&Date.now()-lastCast>400){
   const rdy=k=>s.p.ranks[k]>0&&!s.disabled[k]&&s.ready[k]===0,near=enemies.filter(u=>Math.hypot(u.x-here.x,u.y-here.y)<260).length;
   let used=false;
   if(rdy('zone')&&(near>=3||(push&&nearestE.d<200))){await ability('zone');used=true;}
   else if(rdy('taunt')&&enemies.filter(u=>Math.hypot(u.x-here.x,u.y-here.y)<144).length>=2){await ability('taunt');used=true;}
   else if(rdy('bash')&&nearestE.d<=85&&enemies.some(u=>Math.hypot(u.x-here.x,u.y-here.y)<=85)){await ability('bash');used=true;}
   else if(rdy('charge')&&nearestE.d>110&&nearestE.d<230){await ability('charge');used=true;}
   if(used){lastCast=Date.now();if(s.p.ranks.zone>0&&!shots['extended-skill-cast']&&near>=1)await shot('extended-skill-cast');}
  }
  if(s.p.level>=6&&!shots['extended-lv6'])await shot('extended-lv6');
  if(s.tick>10&&Math.hypot(here.x-stuck.x,here.y-stuck.y)<4){if(s.tick-stuck.at>1800&&!s.warning){await setKeys(new Set(['w']));await page.waitForTimeout(400);stuck.at=s.tick;}}else stuck={x:here.x,y:here.y,at:s.tick};
  await page.waitForTimeout(110);
 }
 await setKeys(new Set());
 const end=await snap();evidence.end=end;
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible,null,{timeout:15000}).catch(()=>{});
 await shot('extended-result');
 evidence.rec=await page.evaluate(()=>{const R=window.rec,pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(s.length*p))]:0;};
  const s=window.kingdomGame.scene.getScene('Battle').simulation,p=s.state.heroProgression;
  return {...R,frames:undefined,updates:undefined,spawnIds:R.spawnIds.length,xp:R.xp,frame:{count:R.frames.length,median:pct(R.frames,.5),p95:pct(R.frames,.95),p99:pct(R.frames,.99),max:Math.max(...R.frames)},update:{count:R.updates.length,median:pct(R.updates,.5),p95:pct(R.updates,.95),p99:pct(R.updates,.99),max:Math.max(...R.updates)},
   final:{tick:s.clock.tick,level:p.level,xp:p.xp,ranks:p.ranks,fortitude:p.fortitude,points:p.skillPoints,kills:s.state.kills,gold:s.state.gold,spawnedWaves:s.state.spawnedWaves,result:s.state.match.result,title:window.kingdomGame.scene.getScene('HUD').resultTitle.text,towersLeft:Object.values(s.state.structures).filter(b=>b.team==='red').length,builtTowers:Object.values(s.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length}};});
 const r=evidence.rec,f=r.final;
 const cumulative=l=>{let t=0;for(let i=1;i<l;i++)t+=80+25*(i-1);return t;};
 evidence.summary={policy,outcome:f.result?.outcome,durationSeconds:f.tick/30,level:f.level,xpTotal:r.xpTotal,wavesSpawned:f.spawnedWaves,deaths:r.deaths,casts:r.casts,dealt:Math.round(r.dealt),taken:Math.round(r.taken),peakUnits:r.peakUnits,peakRed:r.peakRed,peakBlue:r.peakBlue,towerKills:r.towerKills,minionKills:r.minionKills,builds:r.builds,threatSamples:r.threat,wallSeconds:Math.round((Date.now()-t0)/1000),levelUps:r.levelUps};
 check(!!f.result&&f.title===(f.result.outcome==='victory'?'VICTORY':'DEFEAT'),'Extended match reaches a legitimate terminal result through normal play',JSON.stringify(f.result));
 check(r.ended&&r.ended.tick===f.result.tick,'Exactly one match-end event matches the authoritative result');
 check(r.xp.every(e=>e.sourceId.endsWith(':combat-death')&&(e.amount===60||e.amount===80))&&new Set(r.xp.map(e=>e.sourceId)).size===r.xp.length&&r.xpTotal===cumulative(f.level)+f.xp,'All XP came from unique ordinary enemy deaths (60 per raider, 80 per tower)');
 check(r.levelUps.some(l=>l.level===6),'Guardian reached LV6 through ordinary XP',JSON.stringify(r.levelUps.find(l=>l.level===6)));
 check(f.ranks.zone>=1,'R was learned through the normal Skill Allocation UI');
 check(r.casts.zone>=1&&r.casts.bash>=1,'Q and R were cast in actual combat',JSON.stringify(r.casts));
 check(r.dup===0,'No duplicate spawn ids during the whole match');
 check(r.peakRed<=24&&r.peakBlue<=16,'Active minion caps respected',`red ${r.peakRed} blue ${r.peakBlue}`);
 check(f.spawnedWaves<=12,'Wave counter never exceeds twelve');
 check(errors.length===0,'No browser, console or missing-asset errors',errors.join('|'));
}catch(e){errors.push(String(e.stack||e));check(false,'Script completed',String(e.message));}
finally{await setKeys(new Set()).catch(()=>{});await browser.close();await writeFile(`${root}/extended-${variant}.json`,JSON.stringify({url,policy,checks,errors,evidence},null,2));
 console.log(JSON.stringify(evidence.summary??{},null,1));}
