const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {guardianStats,minionStats,minionStatsOf,crimsonHero,crimsonElite}=require('../.test-build/data/combat.js');
const {enemyXpOf}=require('../.test-build/data/progression.js');
const {siege}=require('./support/barracksBot.cjs');
const {strike,until,DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 3 M6: Mission 6 "The Frost Warlord" (docs/CHAPTER3_M6.md): the Twin Walls battlefield with the Crimson Hero waiting in the courtyard. He is released when the Inner Gate falls, marches on the Azure Keep and fights nothing else,
// returns 30 s after each death while the Crimson Keep stands, and the garrison's soldiers are Crimson Elite Soldiers (480 HP). Azure Barracks: up to three. Every balance value is provisional; bot results are preliminary evidence, not a human playtest.
const L=campaign.get('campaign-26'),GO='red-gate-outer',GI='red-gate-inner',K='red-base',HERO='red-hero';
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// Advance with the log of events; hero events by tick offset.
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
const parkGuardian=sim=>{sim.state.units.guardian.x=300;sim.state.units.guardian.y=1000;};

test('Mission 6 is The Frost Warlord: one objective, destroy the Crimson Keep; the gates, Barracks and Hero are optional targets',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[26,3,'campaign-26','The Frost Warlord','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.match(L.display.briefing,/^Destroy the Crimson Keep/);assert.match(L.display.briefing,/three Azure Barracks/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:[K],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined);
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.start,o.gates],['twin-walls',true,{gold:0,wood:0,iron:0},[{id:GO,hp:1000},{id:GI,hp:3000}]]);
 assert.deepEqual(o.garrison,{after:GI,archetype:'crimson-elite',slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750});
 assert.deepEqual(o.hero,{spawn:[1560,744],delayTicks:0,respawnTicks:900});
 assert.equal(o.azure.limit,undefined,'the default limit of three Azure Barracks');
});
test('the approved Hero and Elite numbers: 833 HP (85% of the Guardian at level 1), 80 damage, armor 20, speed 95, 30 s respawn; Elite 480 HP, Crimson damage and speed',()=>{
 assert.equal(crimsonHero.stats.maxHp,833);assert.equal(Math.round(crimsonHero.stats.maxHp/980*100),85);assert.equal(guardianStats.damage,80);
 assert.deepEqual([crimsonHero.stats.damage,crimsonHero.stats.armor,crimsonHero.stats.speed],[80,20,95]);assert.equal(L.match.overrides.hero.respawnTicks,30*HZ);
 assert.deepEqual(minionStatsOf('crimson-elite'),{...minionStats,maxHp:480});assert.equal(minionStatsOf('crimson-elite').damage,18);assert.equal(minionStatsOf('crimson-elite').speed,95);
 assert.equal(minionStatsOf(),minionStats);assert.equal(minionStats.maxHp,240,'ordinary Crimson soldiers are unchanged');
 assert.equal(enemyXpOf({kind:'minion-red',archetype:'crimson-hero'}),crimsonHero.xp);assert.equal(enemyXpOf({kind:'minion-red',archetype:'crimson-elite'}),60);assert.equal(enemyXpOf({kind:'minion-red'}),60);
});
test('Mission 6 builds: the Hero is not on the field, two gates, three Barracks, eight towers and one Azure Barracks stand; up to three Azure Barracks are allowed',()=>{
 const sim=new Simulation('l26-build',campaign.setup(26)),st=sim.state.structures;
 assert.equal(sim.state.units[HERO],undefined);for(const id of [GO,GI,'red-barracks-north','red-barracks-south','red-barracks-court'])assert.ok(st[id]?.hp>0,id);
 assert.equal(Object.values(st).filter(b=>b.team==='red'&&b.kind==='tower').length,8);assert.equal(Object.values(st).filter(b=>b.azureBarracks).length,1);
 assert.equal(sim.azureLimit,3);assert.equal(new Simulation('l25',campaign.setup(25)).azureLimit,2,'Mission 5 keeps its limit of two');
});
test('the Hero is released the moment the Inner Gate falls, once, inside the courtyard; the Outer Gate, a Barracks or a tower do not release him',()=>{
 const sim=new Simulation('l26-release',campaign.setup(26)),log=[];parkGuardian(sim);play(sim,300,log);
 for(const id of [GO,'red-barracks-north','red-barracks-court','red-outer-north'])strike(sim,'guardian',id);play(sim,60,log);
 assert.equal(sim.state.units[HERO],undefined,'nothing but the Inner Gate releases him');
 strike(sim,'guardian',GI);play(sim,3,log);
 const h=sim.state.units[HERO];assert.ok(h,'released');assert.deepEqual([h.maxHp,h.hp,h.damage,h.armor,h.speed,h.archetype,h.team,h.kind],[833,833,80,20,95,'crimson-hero','red','minion-red']);
 assert.ok(Math.hypot(h.x-1560,h.y-744)<30,'in the courtyard: '+h.x+','+h.y);assert.equal(log.filter(e=>e.type==='spawn'&&e.id===HERO).length,1);
 play(sim,900,log);assert.equal(log.filter(e=>e.type==='spawn'&&e.id===HERO).length,1,'one release; no second Hero while he lives or on the garrison clock');
});
test('the Hero marches on the Azure Keep: no teleport, no detour for the Guardian, towers or Barracks, and he strikes the Keep',()=>{
 const sim=new Simulation('l26-march',campaign.setup(26)),log=[];parkGuardian(sim);play(sim,300,log);strike(sim,'guardian',GI);
 const g=sim.state.units.guardian;g.x=1390;g.y=720; // the Guardian waits beside the Inner Gate, a few cells from his road
 const t0=sim.clock.tick;let last=null,maxStep=0,reached=null,exited=null;const keep=sim.state.bases['blue-base'];
 while(sim.clock.tick<t0+60*HZ&&!sim.ended){play(sim,1,log);const h=sim.state.units[HERO];if(!h)continue;
  if(last)maxStep=Math.max(maxStep,Math.hypot(h.x-last.x,h.y-last.y));last={x:h.x,y:h.y};
  if(exited===null&&h.x<1440)exited=(sim.clock.tick-t0)/HZ;if(reached===null&&Math.hypot(h.x-keep.x,h.y-keep.y)<keep.radius+h.radius+h.range+20)reached=(sim.clock.tick-t0)/HZ;}
 assert.ok(maxStep<5,`the longest step was ${maxStep} px (95 px/s is 3.2 px per tick): no teleport`);
 assert.ok(exited!==null&&exited<10,`out of the gate in ${exited} s`);assert.ok(reached>=15&&reached<=35,`in range of the Azure Keep after ${reached} s`);
 const byHero=log.filter(e=>e.type==='damage'&&e.sourceId===HERO);
 assert.ok(byHero.length>0&&byHero.every(e=>e.id==='blue-base'),'the Hero hit only the Azure Keep: '+[...new Set(byHero.map(e=>e.id))]);
});
test('the Hero is respawned 30 s after each death while the Crimson Keep stands, at his spawn inside the courtyard, and never after the Keep falls',()=>{
 const sim=new Simulation('l26-respawn',campaign.setup(26)),log=[];parkGuardian(sim);play(sim,300,log);strike(sim,'guardian',GI);play(sim,60,log);
 assert.ok(sim.state.units[HERO]);const died=sim.clock.tick;strike(sim,'guardian',HERO);play(sim,1,log);assert.equal(sim.state.units[HERO],undefined);
 play(sim,30*HZ-5,log);assert.equal(sim.state.units[HERO],undefined,'not before 30 s');
 play(sim,10,log);const h=sim.state.units[HERO];assert.ok(h,'back after 30 s');assert.ok(Math.abs(sim.clock.tick-died-30*HZ)<=6,`${(sim.clock.tick-died)/HZ} s`);
 assert.equal(h.hp,833);assert.ok(Math.hypot(h.x-1560,h.y-744)<60,'at his spawn: '+h.x+','+h.y);
 const spawns=log.filter(e=>e.type==='spawn'&&e.id===HERO);assert.equal(spawns.length,2);
 strike(sim,'guardian',K);play(sim,2,log);assert.equal(sim.outcome&&sim.outcome.outcome,'victory');
 // a dead Crimson Keep also stops a pending respawn
 const sim2=new Simulation('l26-nolast',campaign.setup(26));parkGuardian(sim2);play(sim2,300);strike(sim2,'guardian',GI);play(sim2,60);strike(sim2,'guardian',HERO);play(sim2,5);
 sim2.state.bases[K].hp=0;play(sim2,31*HZ);assert.equal(sim2.state.units[HERO],undefined,'no respawn after the Crimson Keep fell');
});
test('the garrison is Elite: the Inner Gate releases Crimson Elite Soldiers (480 HP, 18 damage, speed 95); ordinary waves are Crimson soldiers (240 HP)',()=>{
 const sim=new Simulation('l26-elite',campaign.setup(26)),log=[];parkGuardian(sim);play(sim,300+750,log);
 const wave=Object.values(sim.state.units).filter(u=>/^red-w/.test(u.id));assert.ok(wave.length>0);assert.ok(wave.every(u=>u.maxHp===240&&u.archetype===undefined),'waves are ordinary Crimson soldiers');
 strike(sim,'guardian',GI);play(sim,200,log);
 const elite=Object.values(sim.state.units).filter(u=>/^red-g/.test(u.id));assert.ok(elite.length>=4,`${elite.length} Elite Soldiers after the first rally`);
 assert.ok(elite.every(u=>u.maxHp===480&&u.damage===18&&u.speed===95&&u.archetype==='crimson-elite'));
 assert.ok(log.filter(e=>e.type==='spawn'&&/^red-g/.test(e.id)).length>=4);
});
test('Hero and Elite data are validated: a Hero needs a garrison, a point in the sealed area that is open, and whole delay and respawn; the Elite archetype is the only garrison archetype',()=>{
 const o=L.match.overrides,mk=extra=>matchSetup('extended',{...o,...extra});
 assert.doesNotThrow(()=>mk({}));
 assert.throws(()=>matchSetup('extended',{...o,garrison:undefined}),/Invalid Crimson Hero/);
 for(const hero of [{...o.hero,respawnTicks:0},{...o.hero,respawnTicks:1.5},{...o.hero,delayTicks:-1},{...o.hero,spawn:[NaN,5]},{...o.hero,spawn:[100]},{...o.hero,spawn:[-5,5]}])assert.throws(()=>mk({hero}),/Invalid Crimson Hero/,JSON.stringify(hero));
 assert.throws(()=>mk({garrison:{...o.garrison,archetype:'crimson-hero'}}),/Invalid garrison/);assert.throws(()=>mk({garrison:{...o.garrison,archetype:'desert-raider'}}),/Invalid garrison/);
 assert.doesNotThrow(()=>mk({garrison:{...o.garrison,archetype:undefined}}));
 // the Simulation rejects a Hero standing outside the sealed area, or on a wall
 assert.throws(()=>new Simulation('x',mk({hero:{...o.hero,spawn:[1150,300]}})),/sealed area/);
 assert.throws(()=>new Simulation('x',mk({hero:{...o.hero,spawn:[1464,450]}})),/blocked/);
});
test('Mission 6 defeat is the Azure Keep reaching 0 HP; the Keep alone wins',()=>{
 const half=new Simulation('l26-half',campaign.setup(26));half.state.bases['blue-base'].hp=half.state.bases['blue-base'].maxHp*.4;until(half,half.clock.tick+30);assert.equal(half.ended,false);
 const dead=new Simulation('l26-0hp',campaign.setup(26));dead.state.bases['blue-base'].hp=0;until(dead,dead.clock.tick+2);assert.equal(dead.outcome&&dead.outcome.outcome,'defeat');
 const win=new Simulation('l26-win',campaign.setup(26));parkGuardian(win);for(const id of [GO,GI,'red-barracks-court'])strike(win,'guardian',id);assert.equal(win.ended,false,'gates and Barracks never complete it');
 strike(win,'guardian',K);until(win,win.clock.tick+2);assert.deepEqual(win.outcome&&[win.outcome.outcome,win.outcome.reason],['victory','objectives-complete']);
});
test('Mission 6 is Chapter 3 Mission 6 in the released chapter: it unlocks in order after Chapter 2 and the earlier Chapter 3 missions, never earlier',()=>{
 const {through}=require('./support/chapter3Save.cjs');
 assert.equal(campaignChapters[2].slots[5].levelId,'campaign-26');assert.equal(campaignChapters[2].release,'available');
 const v=chapterViews(campaignChapters,campaign.list(),through(5).progress)[2];assert.equal(v.state,'available');assert.equal(v.released,6);
 assert.equal(campaign.list().filter(l=>l.chapter===3).length,6);assert.equal(campaign.list().at(-1).id,'full-battle');
 assert.equal(through(5).isUnlocked(L),true,'unlocked once the mission before it is cleared');assert.equal(through(5).progress.next.id,'campaign-26');
 assert.equal(through(4).isUnlocked(L),false,'locked while the mission before it is not cleared');
 assert.equal(through(5).recordVictory(L).recorded,true);
});
test('M1-M5 are untouched by the Hero: no earlier level has a Hero, Elite garrison or archetype',()=>{
 for(const n of [21,22,23,24,25]){const l=campaign.get('campaign-'+n);assert.equal(l.match.overrides.hero,undefined,'campaign-'+n);assert.equal(l.match.overrides.garrison?.archetype,undefined,'campaign-'+n);}
 const m4=new Simulation('l24',campaign.setup(24));parkGuardian(m4);play(m4,300);strike(m4,'guardian',GI);play(m4,120);assert.equal(m4.state.units[HERO],undefined,'Mission 4 releases no Hero');
 assert.ok(Object.values(m4.state.units).filter(u=>/^red-g/.test(u.id)).every(u=>u.maxHp===240),'Mission 4 garrison stays ordinary');
});
// Bots: the shared recall-and-rebuild Barracks bot on the real level, the direct road. The Hero and his respawns run inside the real engine. Preliminary evidence, not a balance verdict: the race is close by design.
test('bot, direct road: the match resolves inside the cap, the Hero is released and returns, and every Hero hit lands on the Azure Keep',()=>{
 const sim=new Simulation('l26-bot',campaign.setup(26));
 const r=siege(sim,{targets:['red-outer-north','red-outer-south',GO,'red-court-north','red-court-south',GI,K]});
 assert.ok(sim.outcome,'the match ended inside the cap');assert.ok(['victory','defeat'].includes(sim.outcome.outcome));
 const spawns=r.log.filter(e=>e.type==='spawn'&&e.id===HERO);assert.ok(spawns.length>=1,'the Hero was released');assert.ok(r.at(GI)>0);assert.ok(spawns[0].at>=r.at(GI),'not before the Inner Gate fell');
 const hits=r.log.filter(e=>e.type==='damage'&&e.sourceId===HERO);assert.ok(hits.every(e=>e.id==='blue-base'));
 assert.ok(r.log.some(e=>e.type==='spawn'&&/^red-g/.test(e.id)),'the Elite garrison rallied');
 assert.ok(r.seconds>100&&r.seconds<900,`${r.seconds} s`);
});
