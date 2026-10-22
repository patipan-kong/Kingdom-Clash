const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {alliedBaseThreatened}=require('../.test-build/data/encounters.js');
const {play,standing,finalHash,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S8: Level 14 "The Southern Flank" (Oasis), the first mission that uses the S7 flank (docs/CHAPTER2_S7.md).
// Every balance value is provisional (docs/CHAPTER2_S8.md). Whether a north-only defence loses, or the Guardian must move, is a pending human playtest question.
const L=id=>campaign.get(id),ID='campaign-14',WAVES=[3,3,4,4,5,5,6,6],RAIDERS=[0,0,2,3,3,4,4,5];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// Tower cells (col,row) found by probing placementReason: north-outpost cells, and one south-outpost cell for the balanced layout.
const CELLS={north:[[15,5],[16,5],[14,6]],balanced:[[15,5],[15,18],[16,5]]},ACTIVE={cast:{bash:true},leash:650,hold:{x:620,y:600}};

test('Level 14 is The Southern Flank on Oasis: three towers, eight waves, the Keep above half, exact wave and flank data',()=>{
 const l=L(ID);
 assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[14,2,'The Southern Flank','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);
 assert.deepEqual(l.match,{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:WAVES,raidersPerWave:RAIDERS,alliedPerWave:1,
  flanks:[{wave:4,lane:'south',units:'raiders'},{wave:6,lane:'south',units:'raiders'},{wave:8,lane:'south',units:'all'}]},defenders:[],crimsonKeepArmed:false}});
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'defend',objectives:[
  {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Build 3 Archer Towers'}},
  {id:'waves',type:'waves-defeated',count:8,display:{label:'Defeat 8 Crimson waves'}}]}]});
 assert.ok(Object.isFrozen(l));
 const setup=campaign.setup(ID);assert.equal(setup.battlefield.id,'oasis');assert.equal(setup.shop,true);assert.deepEqual(setup.encounter.defenders,[]);assert.equal(setup.keepDefense.red,null,'the Crimson Keep is inert');
 const b=l.display.briefing;
 assert.match(b,/three Archer Towers/i);assert.match(b,/eight Crimson waves/i);assert.match(b,/south bank/i);assert.match(b,/wave notice/i);assert.match(b,/50% health/);
 assert.doesNotMatch(l.display.briefing+l.display.strategy,/must (build|raise|place)[^.]*south|south tower is (required|mandatory)/i,'a south tower is not claimed to be mandatory');
 assert.match(l.display.strategy,/Guardian/);
});

test('Level 14 registers after Level 13 with sequential unlocks; Chapter 2 shows four released missions and 15-20 pending; Full Battle and Chapter 1 are unchanged',()=>{
 assert.equal(campaign.has(ID),true);assert.equal(campaign.has('campaign-15'),false);
 assert.equal(store(12).isUnlocked(L(ID)),false);assert.equal(store(13).isUnlocked(L(ID)),true);assert.equal(store(13).progress.next.id,ID);
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(10).released,4);assert.deepEqual(views(10).missions.map(m=>m.state),['available','locked','locked','locked',...Array(6).fill('pending')]);
 assert.deepEqual(views(13).missions.slice(0,5).map(m=>m.state),['completed','completed','completed','available','pending']);
 assert.match(campaignChapters[1].narrative,/first four missions are released/);
 const w=store(13).recordVictory(L(ID));assert.deepEqual([w.recorded,w.firstClear,w.upToDate],[true,true,true],'the registered campaign is up to date after Level 14');
 const full=campaign.get('full-battle');assert.equal(full.mission,null);assert.equal(campaign.setup('full-battle').battlefield.id,'meadow');
 for(const l of campaign.list().filter(l=>l.number>=1&&l.number<=13||l.number===0)){const e=campaign.setup(l.id).encounter;assert.ok(!e.waves.some(w=>w.flank)&&!e.spawns.some(s=>s.lane),`${l.id} has no flank data`);}
});

test('Level 14 waves: exact sizes, Raiders, ticks, one ally per wave and flank tags only on south Raiders (waves 4 and 6) and the whole of Wave 8',()=>{
 const e=campaign.setup(ID).encounter,red=n=>e.spawns.filter(s=>s.team==='red'&&s.wave===n);
 assert.deepEqual(e.waves.map(w=>w.tick),WAVES.map((_,i)=>300+i*900));
 assert.deepEqual(WAVES.map((_,i)=>[red(i+1).length,red(i+1).filter(s=>s.archetype==='desert-raider').length]),WAVES.map((n,i)=>[n,RAIDERS[i]]));
 assert.deepEqual(WAVES.map((_,i)=>e.spawns.filter(s=>s.team==='blue'&&s.wave===i+1).length),Array(8).fill(1));
 const tagged=n=>red(n).filter(s=>s.lane).map(s=>[s.lane,!!s.archetype]);
 for(const n of [1,2,3,5,7])assert.deepEqual(tagged(n),[],`Wave ${n} does not flank`);
 assert.deepEqual(tagged(4),[['south',true],['south',true],['south',true]]);
 assert.deepEqual(tagged(6),Array(4).fill(['south',true]));
 assert.equal(tagged(8).length,6);assert.ok(tagged(8).every(t=>t[0]==='south'),'Wave 8 sends every Crimson unit south');assert.equal(red(8).filter(s=>s.archetype).length,5,'five Raiders and one infantry');
 assert.ok(!e.spawns.some(s=>s.team==='blue'&&s.lane),'allies are never tagged');
 assert.deepEqual(e.waves.map(w=>w.flank?[w.flank.lane,w.flank.units]:null),[null,null,null,['south','raiders'],null,['south','raiders'],null,['south','all']]);
});

// Four fixed deterministic scenarios (no balance matrix): the shared test bot, north-only or balanced towers, active or parked Guardian.
function scenario(layout,mode,max=16000){
 const sim=new Simulation(`s8-${layout}-${mode}`,campaign.setup(ID)),log=[],cross={},alerts={},waves=sim.encounter.waves.map(w=>w.tick),firstS={};
 const expire=sim.rewards.expire.bind(sim.rewards);let keepMin=Infinity;
 sim.rewards.expire=t=>{expire(t);const wi=waves.indexOf(t);if(wi>=0&&sim.encounter.waves[wi].flank)alerts[wi+1]=alliedBaseThreatened(sim.state,t);
  for(const u of Object.values(sim.state.units)){if(u.team!=='red'||u.hp<=0)continue;const c=cross[u.id]??={raider:u.archetype==='desert-raider',tagged:false,wave:+u.id.match(/^red-w(\d+)-/)[1],bank:null};if(u.flank)c.tagged=true;
   if(!c.bank&&u.x>=880&&u.x<=1120&&(u.y<420||u.y>780)){c.bank=u.y<420?'N':'S';if(c.tagged)firstS[c.wave]=Math.min(firstS[c.wave]??Infinity,t-waves[c.wave-1]);}}
  keepMin=Math.min(keepMin,sim.state.bases['blue-base'].hp);};
 play(sim,max,{towers:3,cells:CELLS[layout],log,...(mode==='active'?ACTIVE:{park:true})});
 const all=Object.values(cross),taggedC=all.filter(c=>c.tagged);
 return {sim,log,sec:sim.clock.tick/HZ,keepEnd:sim.state.bases['blue-base'].hp,keepMin,alerts,firstS,
  guardianDeaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,towersLost:log.filter(e=>e.type==='death'&&sim.state.structures[e.id]?.team==='blue').length,
  southTagged:taggedC.filter(c=>c.bank==='S').length,northTagged:taggedC.filter(c=>c.bank==='N').length,tagged:taggedC.length,
  raiderCrossings:{N:all.filter(c=>c.raider&&c.bank==='N').length,S:all.filter(c=>c.raider&&c.bank==='S').length}};
}
for(const layout of ['north','balanced']){
 for(const mode of ['parked','active']){
  test(`Level 14 ${layout}-towers ${mode} Guardian: completable, flanks cross the south bank, notices were not pre-empted, nothing stalls`,()=>{
   const r=scenario(layout,mode);
   assert.deepEqual([r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);
   assert.ok(r.sim.state.spawnedWaves>=8&&r.sim.clock.tick>=300+7*900,'no win before Wave 8 has spawned');
   assert.ok(r.sec>=180&&r.sec<400,`finishes in a plausible time (${r.sec} s)`);assert.equal(standing(r.sim),3);
   assert.ok(r.keepEnd>=1500,'the Azure Keep stayed above half');assert.equal(r.log.filter(e=>e.type==='match-end').length,1);
   // Flank observable: 3 + 4 + 6 tagged units were seen and none of them crossed by the north bank; at least the Raiders crossed south.
   assert.equal(r.tagged,13);assert.equal(r.northTagged,0);assert.ok(r.southTagged>=8,`south crossings of tagged units: ${r.southTagged}`);
   // Players have time to respond: the first tagged unit of each flank wave reaches the south bank at least 3 s after the wave notice.
   for(const w of [4,6,8])assert.ok(r.firstS[w]>=90,`Wave ${w} first south crossing after ${r.firstS[w]} ticks`);
   // The Keep alert did not occupy the notice slot when a flank wave spawned (the HUD notice would not have been suppressed).
   assert.deepEqual(r.alerts,{4:false,6:false,8:false});
  });
 }
}

test('no objective stalls: with only two towers built the mission is not won, and with none the Keep falls; a win needs both objectives',()=>{
 const two=new Simulation('s8-two',campaign.setup(ID)),log=[];play(two,12000,{towers:2,cells:CELLS.north,log,...ACTIVE});
 assert.notEqual(two.outcome?.outcome,'victory');assert.equal(two.missionStatus().objectives.find(o=>o.id==='towers').complete,false);
 const idle=new Simulation('s8-idle',campaign.setup(ID));play(idle,14000,{park:true,log:[]});assert.equal(idle.outcome?.outcome,'defeat');
 const sim=new Simulation('s8-early',campaign.setup(ID));play(sim,300+7*900-1,{towers:3,cells:CELLS.north,log:[],...ACTIVE});
 const st=sim.missionStatus();assert.equal(st.status,'active','no win before Wave 8 spawns');assert.ok(st.objectives.find(o=>o.id==='waves').progress<8);
});

test('losing the Azure Keep ends Level 14 in defeat',()=>{
 const sim=new Simulation('s8-defeat',campaign.setup(ID));sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp*.49;sim.advance(1000/30+.01);
 assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['defeat','azure-keep-hp-threshold']);
});

test('Level 14 bot matches replay identically from the same seed and inputs, and the wave events carry the flank payloads for waves 4, 6 and 8 only',()=>{
 const a=scenario('balanced','active'),b=scenario('balanced','active');
 assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log));
 const flanks=a.log.filter(e=>e.type==='wave').filter(e=>e.index<=8).map(e=>[e.index,e.flank?`${e.flank.lane}/${e.flank.units}`:null]);
 assert.deepEqual(flanks,[[1,null],[2,null],[3,null],[4,'south/raiders'],[5,null],[6,'south/raiders'],[7,null],[8,'south/all']]);
});
