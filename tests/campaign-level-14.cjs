const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {play,standing,finalHash,towerLosses,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S9C: Level 14 "The Southern Flank" (Oasis). S8 introduced it with S7 flank tags; S9C replaces them with the seeded per-unit lane split (docs/CHAPTER2_S9C.md).
// Every balance value is provisional. Whether a north-only defence loses, or the Guardian must move, is a pending human playtest question.
const L=id=>campaign.get(id),ID='campaign-14',WAVES=[3,3,4,5,5,6,7,8],RAIDERS=[0,0,2,2,2,3,3,4];
const LANES=[{wave:3,south:[1,2],commit:true},{wave:4,south:[1,2],commit:true},{wave:5,south:[1,2],commit:true},{wave:6,south:[3,4],commit:true},{wave:7,south:[3,4],commit:true},{wave:8,south:[4,5],commit:true}]; // S9D: lane commitment on every split wave
const SEEDS=[1,2,3,4];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// Tower cells (col,row) found by probing placementReason: north-outpost cells, and one south-outpost cell for the balanced layout.
const CELLS={north:[[15,5],[16,5],[14,6]],balanced:[[15,5],[15,18],[16,5]]},ACTIVE={cast:{bash:true},leash:650,hold:{x:620,y:600}};
const redOf=(e,n)=>e.spawns.filter(s=>s.team==='red'&&s.wave===n);
const plan=(setup)=>{const p={};for(const s of setup.encounter.spawns)if(s.team==='red'&&s.lane)(p[s.wave]??={north:0,south:0})[s.lane]++;return p;};

test('Level 14 is The Southern Flank on Oasis: three towers, eight waves, the Keep above half, exact wave and lane data',()=>{
 const l=L(ID);
 assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[14,2,'The Southern Flank','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);
 assert.deepEqual(l.match,{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:WAVES,raidersPerWave:RAIDERS,alliedPerWave:0,lanes:LANES},defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true}});
 assert.equal(l.match.overrides.waves.flanks,undefined,'the S8 flank tags are gone');
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'defend',objectives:[
  {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Build 3 Archer Towers'}},
  {id:'waves',type:'waves-defeated',count:8,display:{label:'Defeat 8 Crimson waves'}}]}]});
 assert.ok(Object.isFrozen(l));
 const setup=campaign.setup(ID);assert.equal(setup.battlefield.id,'oasis');assert.equal(setup.shop,true);assert.deepEqual(setup.encounter.defenders,[]);assert.equal(setup.keepDefense.red,null,'the Crimson Keep is inert');assert.equal(setup.crimsonKeepInvulnerable,true,'S9D: and protected');
 const b=l.display.briefing;
 assert.match(b,/three Archer Towers/i);assert.match(b,/eight Crimson waves/i);assert.match(b,/south bank/i);assert.match(b,/wave notice/i);assert.match(b,/50% health/);assert.match(b,/defense mission/i);assert.match(b,/Crimson Keep is not a target/i);assert.doesNotMatch(b,/destroy|capture/i,'no Keep-destruction objective is implied');
 assert.doesNotMatch(l.display.briefing+l.display.strategy,/must (build|raise|place)[^.]*south|south tower is (required|mandatory)/i,'a south tower is not claimed to be mandatory');
 assert.match(l.display.strategy,/Guardian/);
});

test('Level 14 registers after Level 13 with sequential unlocks; Chapter 2 shows ten released missions (S10B, S10C-A, S10C-B2); Full Battle and Chapter 1 are unchanged',()=>{
 assert.equal(campaign.has(ID),true);assert.equal(campaign.has('campaign-17'),true);assert.equal(campaign.has('campaign-19'),true);assert.equal(campaign.has('campaign-20'),true);
 assert.equal(store(12).isUnlocked(L(ID)),false);assert.equal(store(13).isUnlocked(L(ID)),true);assert.equal(store(13).progress.next.id,ID);
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(10).released,10);assert.deepEqual(views(10).missions.map(m=>m.state),['available',...Array(9).fill('locked')]);
 assert.deepEqual(views(13).missions.slice(0,5).map(m=>m.state),['completed','completed','completed','available','locked']);
 assert.match(campaignChapters[1].narrative,/All ten missions are released/);
 const w=store(13).recordVictory(L(ID));assert.deepEqual([w.recorded,w.firstClear,w.upToDate],[true,true,false],'Level 15 is next after Level 14');
 const full=campaign.get('full-battle');assert.equal(full.mission,null);assert.equal(campaign.setup('full-battle').battlefield.id,'meadow');
 for(const l of campaign.list().filter(l=>l.number>=1&&l.number<=13||l.number===0)){const e=campaign.setup(l.id).encounter;assert.ok(!e.waves.some(w=>w.flank||w.lanes)&&!e.spawns.some(s=>s.lane),`${l.id} has no flank or lane data`);}
});

test('Level 14 waves: exact sizes, Raiders, ticks and no allied minions; waves 1 and 2 never split; waves 3 to 8 split every unit with both banks populated',()=>{
 for(const seed of SEEDS){
  const setup=campaign.setup(ID,seed),e=setup.encounter;
  assert.deepEqual(e.waves.map(w=>w.tick),WAVES.map((_,i)=>300+i*900));
  assert.deepEqual(WAVES.map((_,i)=>[redOf(e,i+1).length,redOf(e,i+1).filter(s=>s.archetype==='desert-raider').length]),WAVES.map((n,i)=>[n,RAIDERS[i]]));
  assert.equal(e.spawns.filter(s=>s.team==='blue').length,0,'no allied minions on Level 14');
  for(const n of [1,2])assert.ok(redOf(e,n).every(s=>!s.lane),`Wave ${n} has no lane data`);
  for(const {wave,south:[lo,hi]} of LANES){
   const red=redOf(e,wave),s=red.filter(x=>x.lane==='south').length,nn=red.filter(x=>x.lane==='north').length;
   assert.equal(s+nn,WAVES[wave-1],`seed ${seed} wave ${wave}: every unit has a lane`);assert.ok(s>=lo&&s<=hi&&s>=1&&nn>=1,`seed ${seed} wave ${wave}: south ${s} north ${nn}`);
   assert.deepEqual(e.waves[wave-1].lanes,{north:nn,south:s},'the wave payload equals the actual assignments');
  }
  assert.ok(e.waves.every(w=>!w.flank));
 }
});

// Four fixed deterministic scenarios (no balance matrix): the shared test bot, north-only or balanced towers, active or parked Guardian.
function scenario(layout,mode,seed=1,max=16000){
 const setup=campaign.setup(ID,seed),sim=new Simulation(`s9c-${layout}-${mode}-${seed}`,setup),log=[],cross={};
 const expire=sim.rewards.expire.bind(sim.rewards);let keepMin=Infinity;
 sim.rewards.expire=t=>{expire(t);
  for(const u of Object.values(sim.state.units)){if(u.team!=='red'||u.hp<=0)continue;const c=cross[u.id]??={lane:u.flank?.lane??null,bank:null};
   if(!c.bank&&u.x>=880&&u.x<=1120&&(u.y<420||u.y>780))c.bank=u.y<420?'N':'S';}
  keepMin=Math.min(keepMin,sim.state.bases['blue-base'].hp);};
 play(sim,max,{towers:3,cells:CELLS[layout],log,...(mode==='active'?ACTIVE:{park:true})});
 const all=Object.values(cross);
 return {sim,log,setup,sec:sim.clock.tick/HZ,keepEnd:sim.state.bases['blue-base'].hp,keepMin,guardianDeaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,towersLost:towerLosses(log),
  plannedS:all.filter(c=>c.lane==='south').length,plannedN:all.filter(c=>c.lane==='north').length,crossS:all.filter(c=>c.bank==='S').length,crossN:all.filter(c=>c.bank==='N').length,
  tagCross:all.filter(c=>c.bank&&c.lane).length,agree:all.filter(c=>c.bank&&c.lane&&(c.bank==='S')===(c.lane==='south')).length};
}
for(const layout of ['north','balanced']){
 for(const mode of ['parked','active']){
  test(`Level 14 ${layout}-towers ${mode} Guardian (seed 1): completable, both banks are crossed as assigned, nothing stalls`,()=>{
   const r=scenario(layout,mode);
   // An active Guardian wins. A Guardian that never fights is allowed to lose (an AFK defeat is the intended consequence, docs/CHAPTER2_S9C.md) but the match must always end legitimately.
   if(mode==='active')assert.deepEqual([r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);
   else assert.ok(r.sim.outcome&&(r.sim.outcome.outcome==='victory'?r.sim.outcome.reason==='objectives-complete':r.sim.outcome.reason==='azure-keep-hp-threshold'),'the parked match ends by an objective win or the Keep threshold');
   assert.equal(r.log.filter(e=>e.type==='match-end').length,1);
   if(r.sim.outcome.outcome==='victory'){assert.ok(r.sim.state.spawnedWaves>=8&&r.sim.clock.tick>=300+7*900,'no win before Wave 8 has spawned');assert.ok(r.sec>=180&&r.sec<400,`finishes in a plausible time (${r.sec} s)`);assert.ok(r.keepEnd>=1500,'the Azure Keep stayed above half');assert.equal(r.plannedS+r.plannedN,WAVES.slice(2).reduce((a,b)=>a+b,0),'all 33 units of waves 3 to 8 carry a lane');}
   assert.ok(r.crossS>=1&&r.crossN>=1,`units cross both banks (N ${r.crossN} S ${r.crossS})`);
   assert.ok(r.agree>=0.8*r.tagCross,`most assigned units cross their own bank (${r.agree} of ${r.tagCross})`);
   assert.equal(towerLosses(r.log)+standing(r.sim)>=3,true,'losses and survivors account for the three required towers');
  });
 }
}

test('no objective stalls: "Build 3 Archer Towers" counts cumulative completions (structures-completed, not structures-standing); two towers alone is not a win unless a lost one is rebuilt; with none the Keep falls',()=>{
 const two=new Simulation('s9c-two',campaign.setup(ID)),log=[];play(two,12000,{towers:2,cells:CELLS.north,log,...ACTIVE});
 // The objective counts completed towers, so a tower lost and rebuilt counts again (docs/CHAPTER2_S9C.md): the objective is complete exactly when three towers were completed.
 const built=log.filter(e=>e.type==='built').length;assert.equal(two.missionStatus().objectives.find(o=>o.id==='towers').complete,built>=3);assert.equal(two.outcome?.outcome==='victory',built>=3,'a win needs the towers objective');
 const idle=new Simulation('s9c-idle',campaign.setup(ID));play(idle,14000,{park:true,log:[]});assert.equal(idle.outcome?.outcome,'defeat');
 const sim=new Simulation('s9c-early',campaign.setup(ID));play(sim,300+7*900-1,{towers:3,cells:CELLS.north,log:[],...ACTIVE});
 const st=sim.missionStatus();assert.equal(st.status,'active','no win before Wave 8 spawns');assert.ok(st.objectives.find(o=>o.id==='waves').progress<8);
});

test('losing the Azure Keep ends Level 14 in defeat',()=>{
 const sim=new Simulation('s9c-defeat',campaign.setup(ID));sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp*.49;sim.advance(1000/30+.01);
 assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['defeat','azure-keep-hp-threshold']);
});

test('Level 14 bot matches replay identically from the same seed and inputs; the wave events carry the actual lane counts for waves 3 to 8 only',()=>{
 const a=scenario('balanced','active'),b=scenario('balanced','active');
 assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log));
 const lanes=a.log.filter(e=>e.type==='wave').filter(e=>e.index<=8).map(e=>[e.index,e.lanes?`${e.lanes.north}/${e.lanes.south}`:null]);
 const p=plan(a.setup);
 assert.deepEqual(lanes,[1,2,3,4,5,6,7,8].map(n=>[n,p[n]?`${p[n].north}/${p[n].south}`:null]));
 assert.ok(a.log.filter(e=>e.type==='wave').every(e=>!e.flank),'no S7 flank payload on Level 14');
 assert.equal(a.setup.laneSeed,1);
});

test('a different seed replays a different match, the same seed an identical one',()=>{
 const one=scenario('balanced','active',1),two=scenario('balanced','active',2),again=scenario('balanced','active',2);
 assert.equal(finalHash(two.sim,two.log),finalHash(again.sim,again.log));
 assert.notEqual(finalHash(one.sim,one.log),finalHash(two.sim,two.log));
});
