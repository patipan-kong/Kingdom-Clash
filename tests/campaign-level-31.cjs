const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {validateMission}=require('../.test-build/data/mission.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {crimsonHero,crimsonElite,minionStatsOf}=require('../.test-build/data/combat.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/forestBot.cjs');
// Chapter 4 Mission 1 "Forest Edge" (docs/CHAPTER4_M1.md): Capture, Repair, Defend, Advance. The Forest Camp is held by two Crimson watchtowers and a Crimson Hero; the Guardian destroys the towers, stands in the capture ring and the
// Azure Banner rises; the camp then opens for building, its ruined tower is repaired at 60% of the price, and the Crimson Keep loses its shield. Every balance value is provisional; bot results guard against regressions, not for balance sign-off.
const L=campaign.get('campaign-31'),HERO='red-hero',BANNER='c4-banner',NORTH='c4-camp-north',SOUTH='c4-camp-south',KEEP='red-base',RUIN={col:24,row:11};
const fresh=(id='l31')=>new Simulation(id,campaign.setup(31));
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
// Clear the camp: kill the Hero and both holders, stand the Guardian in the ring (80 px south of the flag) and let the Banner rise.
const capture=(sim,log=[])=>{strike(sim,'guardian',HERO);for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);sim.teleportHero(1080,576);play(sim,125,log);return log;};
const money=(sim,wood=1e4,iron=1e4)=>{sim.economy.balances.wood=wood*120;sim.economy.balances.iron=iron*120;};

test('Mission 1 is Forest Edge: Chapter 4, campaign-31, capture then destroy the Keep',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[31,4,'campaign-31','Forest Edge','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.match(L.display.briefing,/^Capture the Forest Camp, then destroy the Crimson Keep/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Forest Camp'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined);
});
test('the approved starting values: waves, flanks, resources, Banner, repair, counterattack and Hero',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'forest-edge');assert.deepEqual(o.start,{gold:0,wood:100,iron:10});
 assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.equal(o.waves.waveInterval,25*HZ);assert.equal(o.waves.alliedPerWave,1);
 assert.deepEqual(o.waves.flanks,[{wave:3,lane:'south',units:'all'},{wave:6,lane:'south',units:'all'}]);
 assert.equal(o.crimsonKeepArmed,true);assert.deepEqual(o.defenders,['red-tower-front-north','red-tower-front-south',NORTH,SOUTH]);
 const p=o.post;assert.deepEqual([p.bannerHp,p.raiseTicks,p.repair,p.counter.count,p.hero.guard,p.hero.respawnTicks],[2000,4*HZ,{percent:60,ticks:5*HZ},4,260,30*HZ]);
 assert.deepEqual([p.circle,p.ruin],[{x:1104,y:600,radius:144},RUIN]);
 assert.deepEqual([crimsonHero.stats.maxHp,crimsonHero.stats.armor,crimsonHero.stats.damage],[833,20,80]);assert.deepEqual(minionStatsOf('crimson-elite'),crimsonElite.stats);
});
test('the match starts with the camp Crimson: Hero at his anchor, both watchtowers standing, the Crimson Keep shielded, no Banner',()=>{
 const sim=fresh(),s=sim.state,h=s.units[HERO];
 assert.deepEqual([s.wood,s.iron,s.gold],[100,10,0]);
 assert.deepEqual([s.post.owner,s.post.captured,s.post.losses,s.post.bannerId,s.post.counterDone],['crimson',false,0,undefined,false]);
 assert.deepEqual([h.maxHp,h.hp,h.archetype,h.team,h.x,h.y],[833,833,'crimson-hero','red',1128,600]);
 for(const id of [NORTH,SOUTH,'red-tower-front-north','red-tower-front-south'])assert.ok(s.structures[id].hp>0,id);
 assert.equal(s.bases[KEEP].invulnerable,true);assert.equal(s.structures[BANNER],undefined);
 assert.equal(Object.values(s.structures).filter(b=>b.team==='red').length,4);assert.equal(sim.azureBarracks.constructor.name,'AzureBarracks');
});
test('the Banner cannot be raised while a holder stands, from outside the ring, or on an occupied flag',()=>{
 const sim=fresh();sim.teleportHero(1080,576);strike(sim,'guardian',HERO);play(sim,10);assert.equal(sim.state.post.bannerId,undefined,'holders alive');
 strike(sim,'guardian',NORTH);play(sim,10);assert.equal(sim.state.post.bannerId,undefined,'one holder still stands');
 strike(sim,'guardian',SOUTH);sim.teleportHero(1080,660);play(sim,10);assert.equal(sim.state.post.bannerId,undefined,'outside the ring');
 sim.teleportHero(1080,576);sim.state.units['blue-1'].x=1080;sim.state.units['blue-1'].y=504;play(sim,2);assert.equal(sim.state.post.bannerId,undefined,'a unit stands on the flag');
 sim.state.units['blue-1'].x=700;sim.state.units['blue-1'].y=300;play(sim,2);assert.equal(sim.state.post.bannerId,BANNER,'the flag is clear and the Guardian is in the ring');
});
test('capture: the Banner rises in 4 seconds (2,000 HP, hit points rising with construction), then the camp is Azure and the Keep loses its shield',()=>{
 const sim=fresh(),s=sim.state,log=[];strike(sim,'guardian',HERO);for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);sim.teleportHero(1080,576);
 play(sim,1,log);const b=s.structures[BANNER];assert.ok(b&&b.banner&&b.team==='blue'&&b.kind==='wall');assert.deepEqual([b.x,b.y,b.maxHp],[1080,504,2000]);assert.equal(b.completeTick-b.startTick,4*HZ);
 assert.ok(b.hp>0&&b.hp<100,'a Banner that has just begun is fragile');assert.equal(s.post.owner,'crimson');assert.equal(s.bases[KEEP].invulnerable,true);
 play(sim,60,log);assert.ok(b.hp>800&&b.hp<1200,'about half way up after 2 s');assert.equal(s.post.owner,'crimson');assert.equal(s.bases[KEEP].invulnerable,true);
 play(sim,62,log);assert.equal(b.hp,2000);assert.deepEqual([s.post.owner,s.post.captured,s.post.losses],['azure',true,0]);assert.equal(s.bases[KEEP].invulnerable,undefined);
 assert.deepEqual(log.filter(e=>e.type==='post').map(e=>[e.change,e.first]),[['raising',undefined],['captured',true]]);
});
test('the Crimson Keep is shielded until the camp is Azure, and again whenever the Banner falls',()=>{
 const sim=fresh(),s=sim.state;strike(sim,'guardian',KEEP);assert.equal(s.bases[KEEP].hp,s.bases[KEEP].maxHp,'shielded from the start');
 capture(sim);strike(sim,'guardian',KEEP,100);assert.equal(s.bases[KEEP].hp,s.bases[KEEP].maxHp-100,'unshielded once captured');
 strike(sim,'red-base',BANNER);play(sim,2);assert.equal(s.post.owner,'crimson');strike(sim,'guardian',KEEP,100);assert.equal(s.bases[KEEP].hp,s.bases[KEEP].maxHp-100,'shielded again after the Banner fell');
});
test('the first capture alone sends four Elite Soldiers; a lost and retaken camp sends none',()=>{
 const sim=fresh(),s=sim.state,log=[];capture(sim,log);
 const elites=()=>[...sim.spawnQueue,...Object.values(s.units)].filter(e=>/^red-ca-/.test(e.id));
 assert.equal(elites().length,4);assert.equal(s.post.counterDone,true);play(sim,200,log);
 const e=Object.values(s.units).filter(u=>/^red-ca-/.test(u.id));assert.equal(e.length,4);assert.ok(e.every(u=>u.archetype==='crimson-elite'&&u.maxHp===480&&u.team==='red'));
 for(const u of e)strike(sim,'guardian',u.id);
 strike(sim,'red-base',BANNER);play(sim,2,log);assert.deepEqual([s.post.owner,s.post.losses],['crimson',1]);
 sim.teleportHero(1080,576);play(sim,125,log);assert.equal(s.post.owner,'azure','retaken');
 assert.equal([...sim.spawnQueue,...Object.values(s.units)].filter(u=>/^red-ca-/.test(u.id)).length,0,'no second counterattack');
 assert.deepEqual(log.filter(e=>e.type==='post').map(e=>e.change),['raising','captured','lost','raising','captured']);
 assert.equal(log.filter(e=>e.type==='post'&&e.first).length,1);
});
test('a Banner destroyed while it rises fails the capture: no loss is counted, the Keep stays shielded and a new Banner can be raised',()=>{
 const sim=fresh(),s=sim.state,log=[];strike(sim,'guardian',HERO);for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);sim.teleportHero(1080,576);play(sim,30,log);
 assert.ok(s.structures[BANNER].hp>0);strike(sim,KEEP,BANNER);play(sim,2,log);
 assert.deepEqual([s.post.owner,s.post.losses],['crimson',0]);assert.equal(s.bases[KEEP].invulnerable,true);assert.ok(log.some(e=>e.type==='post'&&e.change==='failed'));
 assert.ok(s.structures[BANNER].hp<100&&s.structures[BANNER].startTick>=30,'the Guardian is still in the ring, so a fresh Banner has begun');play(sim,125,log);assert.equal(s.post.owner,'azure');assert.equal(s.post.losses,0);
});
test('building at the camp needs the camp: Crimson-held ground rejects every placement, Azure ground accepts them; the Keep territory is never affected',()=>{
 const sim=fresh();money(sim);
 assert.equal(sim.placementReason('tower',23,12),'Capture the Forest Camp first');assert.equal(sim.placementReason('wall',22,13),'Capture the Forest Camp first');
 assert.equal(sim.placementReason('tower',12,12),'','Keep territory');assert.equal(sim.inTerritory(1104,600),false);assert.equal(sim.inTerritory(330,700),true);
 capture(sim);money(sim);assert.equal(sim.inTerritory(1104,600),true);
 assert.equal(sim.placementReason('tower',23,13),'','a free camp cell');
 strike(sim,'red-base',BANNER);play(sim,2);assert.equal(sim.placementReason('tower',23,13),'Capture the Forest Camp first','lost again');
});
test('repair: a tower on the ruin costs 60% (48 Wood, 6 Iron), takes 5 seconds and is never instant; every other cell and kind is charged normally',()=>{
 const sim=fresh(),s=sim.state;capture(sim);const log=[];
 assert.equal(sim.repairSite('tower',RUIN.col,RUIN.row),true);assert.equal(sim.repairSite('tower',23,13),false);assert.equal(sim.repairSite('wall',RUIN.col,RUIN.row),false);
 assert.deepEqual(['wood','iron'].map(k=>sim.placementQuote('tower',RUIN.col,RUIN.row)[k]),[48,6]);assert.deepEqual(['wood','iron'].map(k=>sim.placementQuote('tower',23,13)[k]),[80,10]);
 assert.equal(sim.placementReason('wall',RUIN.col,RUIN.row),'Ruined tower: repair it with a tower');
 sim.economy.balances.wood=47*120;sim.economy.balances.iron=10*120;assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'Not enough resources','47 Wood is short of 48');
 sim.economy.balances.wood=100*120;sim.economy.balances.iron=10*120;const w0=sim.economy.woodUnits,i0=sim.economy.ironUnits;
 sim.send({type:'place',requestId:'repair-1',kind:'tower',col:RUIN.col,row:RUIN.row});play(sim,1,log);
 const t=s.structures['built-repair-1'];assert.ok(t,'construction started');assert.equal(t.kind,'tower');assert.equal(t.team,'blue');
 assert.equal(w0-sim.economy.woodUnits,48*120-8,'48 Wood charged (less one tick of income)');assert.equal(i0-sim.economy.ironUnits,6*120-1,'6 Iron charged');assert.deepEqual(t.paidResources,{wood:48,iron:6});
 assert.equal(t.completeTick-t.startTick,5*HZ);assert.ok(t.hp<30&&t.progress<.1,'not restored instantly');
 play(sim,70,log);assert.ok(t.hp>250&&t.hp<400&&t.progress<1,'half built after about 2.5 s');assert.equal(log.filter(e=>e.type==='construction-complete'&&e.id===t.id).length,0);
 play(sim,90,log);assert.equal(t.hp,650);assert.equal(log.filter(e=>e.type==='construction-complete'&&e.id===t.id).length,1);assert.ok(log.some(e=>e.type==='post'&&e.change==='repairing'));
 // charged once, and a normal tower elsewhere at the full price and time
 sim.economy.balances.wood=100*120;sim.economy.balances.iron=10*120;const w1=sim.economy.woodUnits;sim.send({type:'place',requestId:'t-2',kind:'tower',col:23,row:13});play(sim,1);
 assert.equal(w1-sim.economy.woodUnits,80*120-8);const n=s.structures['built-t-2'];assert.equal(n.completeTick-n.startTick,150);
});
test('the repair needs resources that exist: without enough Wood or Iron nothing is built and nothing is charged',()=>{
 const sim=fresh(),s=sim.state;capture(sim);sim.economy.balances.wood=47*120;sim.economy.balances.iron=100*120;
 sim.send({type:'place',requestId:'broke',kind:'tower',col:RUIN.col,row:RUIN.row});const log=play(sim,3);
 assert.equal(s.structures['built-broke'],undefined);assert.ok(log.some(e=>e.type==='rejected'&&e.reason==='Not enough resources'));
});
test('losing the camp stops building there but never flips a structure: a repaired tower keeps standing and firing',()=>{
 const sim=fresh(),s=sim.state;capture(sim);money(sim);sim.send({type:'place',requestId:'rep',kind:'tower',col:RUIN.col,row:RUIN.row});play(sim,160);
 const t=s.structures['built-rep'];assert.equal(t.hp,650);strike(sim,'red-base',BANNER);play(sim,2);
 assert.equal(s.post.owner,'crimson');assert.deepEqual([t.team,t.kind,t.hp],['blue','tower',650]);assert.equal(s.structures['built-rep'],t);
 assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'Capture the Forest Camp first','nothing more can be built here until the camp is retaken');
 // a repaired tower that dies is a ruin again (the cell is free) and cannot be repaired until the camp is retaken
 strike(sim,'red-base','built-rep');play(sim,2);assert.equal(s.structures['built-rep'],undefined);assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'Capture the Forest Camp first');
 sim.teleportHero(1080,576);play(sim,125);assert.equal(s.post.owner,'azure');money(sim);assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'');
});
test('mission: Capture the Forest Camp completes with the capture, then the Keep becomes the objective and its destruction wins',()=>{
 const sim=fresh(),s=sim.state;let m=sim.missionStatus();
 assert.deepEqual([m.activePhase,m.objectives.map(o=>[o.id,o.progress,o.target,o.complete,o.active])],['capture',[['camp',0,1,false,true],['keep',0,1,false,false]]]);
 capture(sim);m=sim.missionStatus();assert.deepEqual([m.activePhase,m.completedPhases],['assault',['capture']]);assert.deepEqual(m.objectives.map(o=>[o.id,o.complete]),[['camp',true],['keep',false]]);
 strike(sim,'guardian',KEEP);play(sim,2);assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
});
test('the capture objective stays complete after the camp is lost; the Keep cannot be won while Crimson holds the camp',()=>{
 const sim=fresh();capture(sim);strike(sim,'red-base',BANNER);play(sim,2);assert.equal(sim.state.post.owner,'crimson');
 assert.equal(sim.missionStatus().objectives.find(o=>o.id==='camp').complete,true);strike(sim,'guardian',KEEP);play(sim,2);assert.equal(sim.ended,false,'shielded again');
});
test('the Warden holds the camp: he fights what comes within 260 px of his anchor and ignores the rest',()=>{
 const sim=fresh(),s=sim.state,h=s.units[HERO];s.units.guardian.hp=s.units.guardian.maxHp=1e6;for(const id of ['blue-0','blue-1','blue-2'])delete s.units[id];
 sim.teleportHero(700,600);play(sim,150);assert.ok(Math.hypot(h.x-1128,h.y-600)<=31,'stays at his anchor while the Guardian is far away');assert.equal(h.targetId,undefined);
 sim.teleportHero(1000,600);play(sim,10);assert.equal(h.targetId,'guardian','the Guardian is within 260 px');
 sim.teleportHero(700,600);play(sim,120);assert.ok(Math.hypot(h.x-1128,h.y-600)<=31||h.x>1000,'he does not chase');assert.ok(Math.hypot(h.x-1128,h.y-600)<260);
});
test('once the camp is Azure the Hero is a Raider: he goes for the Banner first, then the Azure towers in the camp, then the Azure Keep',()=>{
 const sim=fresh(),s=sim.state;capture(sim);s.units.guardian.hp=s.units.guardian.maxHp=1e6;sim.teleportHero(330,300);for(const id of ['blue-0','blue-1','blue-2'])delete s.units[id];
 while(!s.units[HERO]&&sim.clock.tick<2000)play(sim,1);const r=s.units[HERO];assert.ok(r,'he returns after the helper killed him');assert.ok(Math.hypot(r.x-1752,r.y-600)<=70,'at the spawn point east of the Keep');
 play(sim,3*HZ);assert.equal(r.targetId,BANNER,'the Banner first');assert.ok(r.x<1752,'and he walks towards it');
 money(sim);sim.send({type:'place',requestId:'f1',kind:'tower',col:23,row:13});play(sim,160);strike(sim,KEEP,BANNER);play(sim,3);
 assert.equal(s.post.owner,'crimson');play(sim,HZ);assert.equal(r.targetId,'built-f1','Warden again: he fights the Azure tower within 260 px of his anchor');
});
test('the Hero returns 30 seconds after each death, at his spawn point, at full hit points',()=>{
 const sim=fresh(),s=sim.state,log=[];strike(sim,'guardian',HERO);const died=sim.clock.tick;play(sim,1,log);assert.equal(s.units[HERO],undefined);
 play(sim,29*HZ,log);assert.equal(s.units[HERO],undefined,'not yet');while(!s.units[HERO]&&sim.clock.tick<died+2000)play(sim,1,log);
 const h=s.units[HERO];assert.ok(h);assert.deepEqual([h.hp,h.maxHp],[833,833]);assert.ok(Math.hypot(h.x-1752,h.y-600)<=70);assert.ok(log.some(e=>e.type==='spawn'&&e.id===HERO));
 assert.ok(sim.clock.tick-died>=30*HZ);
});
test('Forest Edge terrain: a forest belt with the camp road and a south trail; trees block, the road and trail are open, the flank waypoint is on the trail',()=>{
 const f=battlefield('forest-edge'),sim=fresh();
 assert.deepEqual(f.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1,b.look]),[[768,0,1440,480,'forest'],[768,720,1440,936,'forest'],[768,1032,1440,1152,'forest']]);
 assert.deepEqual([f.territory,f.outposts,f.flankVia],[{x:330,y:600,radius:384},[{x:1104,y:600,radius:144}],{south:{x:1104,y:984}}]);
 for(const [x,y] of [[1100,300],[1100,800],[1100,1100]])assert.equal(sim.geo.blocked(x,y,12),true,`forest at ${x},${y}`);
 for(const [x,y] of [[1100,600],[1100,500],[1100,700],[1104,984],[900,984],[1300,984]])assert.equal(sim.geo.blocked(x,y,12),false,`open at ${x},${y}`);
 assert.equal(sim.geo.blocked(1104,984,20),false);assert.deepEqual(f.towers.map(t=>t.id),[NORTH,SOUTH]);
});
test('every Crimson route stays open: the spawn slots reach the Azure Keep with every camp tower standing, and the south trail reaches it with the camp band closed',()=>{
 const sim=fresh(),st={...sim.state.structures,...sim.state.bases},cols=40,rows=24;
 const seen=(from,extra)=>{const cell=(x,y)=>Math.floor(y/48)*cols+Math.floor(x/48),set=new Set([cell(...from)]),stack=[...set];while(stack.length){const i=stack.pop(),c=i%cols,r=Math.floor(i/cols);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,n=nr*cols+nc,x=(nc+.5)*48,y=(nr+.5)*48;if(nc<0||nr<0||nc>=cols||nr>=rows||set.has(n)||sim.geo.blocked(x,y,12,st)||extra(x,y))continue;set.add(n);stack.push(n);}}return {set,cell};};
 const closed=(x,y)=>x>=1008&&x<=1296&&y>=456&&y<=744; // the whole camp band
 const b=seen([1776,480],()=>false);assert.ok(b.set.has(b.cell(450,600)),'the road reaches the Azure Keep with every camp tower standing');
 const a=seen([1776,480],closed);assert.ok(a.set.has(a.cell(450,600)),'the south trail alone reaches the Azure Keep');assert.ok(a.set.has(a.cell(1104,984)));
 for(const [x,y] of sim.setup.waveRules.redSlots)assert.equal(sim.geo.blocked(x,y,12,st),false,'spawn slots are open');
});
test('the flank waves take the south trail: waves 3 and 6 carry the flank, the others do not',()=>{
 const sim=fresh(),log=[];sim.state.bases['blue-base'].invulnerable=true;play(sim,300+5*750+2,log);const waves=log.filter(e=>e.type==='wave');
 assert.deepEqual(waves.map(e=>[e.index,e.flank?.lane]),[[1,undefined],[2,undefined],[3,'south'],[4,undefined],[5,undefined],[6,'south']]);
});
test('Chapter 4 is released behind Chapter 3: Mission 1 unlocks only after Chapter 3 Mission 6, and Continue then targets it',()=>{
 const all=Object.fromEntries([1,2,3,4,5,6,11,12,13,14,15,16,21,22,23,24,25,26].map(n=>[`campaign-${String(n).padStart(2,'0')}`,{clears:1}]));let raw=JSON.stringify({version:1,levels:all});
 const store=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));store.refresh();assert.equal(store.progress.next.id,'campaign-31','Continue offers Chapter 4 Mission 1 after Chapter 3');
 assert.deepEqual(store.progress.sequence.slice(18,24).map(l=>l.id),[31,32,33,34,35,36].map(n=>`campaign-${n}`));assert.equal(store.isUnlocked(campaign.get('campaign-31')),true);assert.equal(store.isUnlocked(campaign.get('campaign-32')),false);
 const v=chapterViews(campaignChapters,campaign.list(),store.progress)[3];assert.deepEqual([v.chapter.release,v.state,v.missions[0].state,v.missions[1].state],['available','available','available','locked']);
 // One mission short of the end of Chapter 3: Chapter 4 is still locked and nothing in it is playable.
 const short=JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5,6,11,12,13,14,15,16,21,22,23,24,25].map(n=>[`campaign-${String(n).padStart(2,'0')}`,{clears:1}]))});
 const early=new ProgressStore(()=>({getItem:()=>short,setItem:()=>{}}));early.refresh();assert.equal(early.isUnlocked(campaign.get('campaign-31')),false);assert.equal(chapterViews(campaignChapters,campaign.list(),early.progress)[3].state,'locked');
});
test('no earlier level has a post: Chapters 1-3 setups and states carry nothing of Chapter 4',()=>{
 for(const l of campaignLevels.filter(l=>l.id!=='campaign-31'&&l.id!=='campaign-32'&&l.id!=='campaign-33'&&l.id!=='campaign-34'&&l.id!=='campaign-35'&&l.id!=='campaign-36'&&l.id!=='campaign-41'&&l.id!=='campaign-42'&&l.id!=='campaign-43'&&l.id!=='campaign-44'&&l.id!=='campaign-45'&&l.id!=='campaign-46')){const setup=campaign.setup(l.id);assert.equal(setup.post,undefined,l.id);const sim=new Simulation('chk',setup);assert.equal(sim.state.post,undefined,l.id);assert.equal(Object.values(sim.state.structures).some(b=>b.banner),false);assert.equal(sim.state.units['red-hero']!==undefined,false,`${l.id} starts without a Hero on the field`);}
});
test('matchSetup rejects a post that does not belong to its battlefield or match',()=>{
 const o=()=>structuredClone(L.match.overrides),build=over=>matchSetup('extended',{...over,mission:structuredClone(L.mission)});
 assert.doesNotThrow(()=>build(o()));
 const bad=[['a circle that is not an outpost',x=>{x.post.circle={x:1104,y:600,radius:100};}],['an unknown holder',x=>{x.post.holders=['nobody'];}],['a flag outside the circle',x=>{x.post.flag={x:300,y:300};}],['a ruin outside the circle',x=>{x.post.ruin={col:2,row:2};}],
  ['no hit points',x=>{x.post.bannerHp=0;}],['a repair above 100%',x=>{x.post.repair.percent=101;}],['no raise time',x=>{x.post.raiseTicks=0;}],['an Elite count without slots',x=>{x.post.counter={count:2,slots:[]};}],['a protected Keep',x=>{delete x.crimsonKeepArmed;x.crimsonKeepInvulnerable=true;}],['a Chapter 3 Hero beside it',x=>{x.hero={spawn:[1752,600],delayTicks:0,respawnTicks:900};}]];
 for(const [why,edit] of bad){const x=o();edit(x);assert.throws(()=>build(x),/Invalid post|Invalid|garrison/,why);}
 assert.throws(()=>validateMission({phases:[{id:'p',objectives:[{id:'c',type:'capture'}]}]},{defenders:[],finite:false,scriptedWaves:1,crimsonSpawns:1,extended:true}),/no post to capture/);
 assert.throws(()=>matchSetup('extended',{mission:{waveMode:'until-objectives',phases:[{id:'p',objectives:[{id:'c',type:'capture'}]}]}}),/no post to capture/);
});
test('the bot regression: a conquering player wins, captures the camp and repairs it; the Azure Keep is never in danger',()=>{
 const r=run({cap:600});assert.equal(r.outcome,'victory');assert.ok(r.sec<=480,`won in ${r.sec} s`);assert.ok(r.capture.length>=1&&r.capture[0]<=150,'first capture within 150 s');assert.ok(r.repairs>=1);
 assert.ok(r.lost.length<=5,'no endless recapture loop');assert.ok(r.keepMin>=2000,'the Azure Keep is not in danger');
});
test('the bot regression: never building at all still wins, only slower; the same bot is deterministic',()=>{
 const a=run({cap:700,repair:false,forward:0}),b=run({cap:700,repair:false,forward:0}),c=run({cap:600});
 assert.equal(a.outcome,'victory');assert.equal(a.sec,b.sec);assert.deepEqual([a.capture,a.lost],[b.capture,b.lost]);assert.ok(a.sec>=c.sec,`without building ${a.sec} s is no faster than conquering ${c.sec} s`);
});
test('playtest 1: one ordinary Azure Barracks is available: pads only, 120 Wood and 20 Iron, limit one, two soldiers that follow, replaced free after 15 seconds',()=>{
 const sim=fresh('bk'),s=sim.state;assert.equal(L.match.overrides.azure.limit,1);assert.deepEqual(L.match.overrides.azure.initial,[]);assert.equal(sim.azurePads.length,3);
 assert.ok(!Object.values(s.structures).some(b=>b.azureBarracks),'none stands at the start');assert.ok(!s.units['blue-s-azure-barracks-0-0-1']);
 const pad=sim.azurePads[0];money(sim,100,10);
 assert.equal(sim.placementReason('barracks',pad.col,pad.row),'Not enough resources','100 Wood and 10 Iron cannot buy it');
 assert.notEqual(sim.placementReason('barracks',20,3),'','off a pad');assert.equal(sim.placementReason('barracks',20,3),'Not an Azure Barracks pad');
 money(sim,120,20);assert.equal(sim.placementReason('barracks',pad.col,pad.row),'');
 const w0=sim.economy.woodUnits;sim.send({type:'place',requestId:'bk1',kind:'barracks',col:pad.col,row:pad.row});play(sim,1);
 assert.ok(s.wood<1,'120 Wood charged once');assert.ok(s.iron<1,'20 Iron charged once');assert.ok(w0>sim.economy.woodUnits);
 const b=Object.values(s.structures).find(x=>x.azureBarracks);assert.ok(b,'under construction');
 assert.equal(sim.placementReason('barracks',sim.azurePads[1].col,sim.azurePads[1].row),'Barracks limit reached','one at a time');
 assert.equal(Object.keys(s.units).filter(id=>id.startsWith('blue-s-')).length,0,'no soldier while it builds');
 const soldiers=()=>Object.values(s.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0),t0=sim.clock.tick;while(soldiers().length<1&&sim.clock.tick<t0+400)play(sim,1);
 assert.equal(soldiers().length,1,'the first soldier');assert.ok(sim.clock.tick-t0>=200&&sim.clock.tick-t0<=250,'about 5 s build plus 3 s training');play(sim,30);assert.equal(soldiers().length,2,'the second a second later');
 for(const u of soldiers())assert.equal(u.team,'blue');
 const died=sim.clock.tick;strike(sim,HERO,soldiers()[0].id);play(sim,1);const w1=s.wood,i1=s.iron;assert.equal(soldiers().length,1);
 play(sim,14*HZ);assert.equal(soldiers().length,1,'not replaced before 15 s');play(sim,2*HZ);assert.equal(soldiers().length,2,'replaced free after 15 s');assert.ok(s.wood>=w1&&s.iron>=i1,'replacement is free');assert.ok(sim.clock.tick-died>=15*HZ);
});
test('playtest 1: the Barracks changes nothing else: no Elite Barracks, no pads in Chapters 1-3 except where they already were, Banner, repair and Hero values unchanged',()=>{
 const p=L.match.overrides.post;assert.deepEqual([p.bannerHp,p.raiseTicks,p.repair.percent,p.counter.count,p.hero.respawnTicks],[2000,120,60,4,900]);
 const sim=fresh('bk2');assert.equal(sim.azureLimit,1);assert.ok(!sim.azurePads.some(q=>q.elite));
 for(const l of campaignLevels.filter(l=>l.number!==31&&l.number!==32&&l.number!==33&&l.number!==41&&l.number!==42&&l.number!==43))assert.notEqual(l.match.overrides?.post!==undefined,true);
 assert.equal(campaign.setup(26).azure.limit,undefined,'Chapter 3 keeps the default limit of three');
});
test('playtest 1: allied soldiers fight at the camp road: a Barracks soldier follows the Guardian and engages Crimson units',()=>{
 const sim=fresh('bk3'),s=sim.state;money(sim);const pad=sim.azurePads[0];sim.send({type:'place',requestId:'k',kind:'barracks',col:pad.col,row:pad.row});play(sim,300);
 const sol=Object.values(s.units).filter(u=>u.id.startsWith('blue-s-'));assert.equal(sol.length,2);
 sim.teleportHero(700,600);play(sim,4*HZ);for(const u of sol)assert.ok(Math.hypot(u.x-s.units.guardian.x,u.y-s.units.guardian.y)<500,'within the leash of the Guardian');
});
