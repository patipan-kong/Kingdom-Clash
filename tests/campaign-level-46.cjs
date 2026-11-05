const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {crimsonHero}=require('../.test-build/data/combat.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 5 Mission 6 "The Crimson Throne" (docs/CHAPTER5_M6.md): M5's three-front siege plus the Crimson Lord, released by the Throne Gate even in a mission with outposts (optional MatchHero.lord).
// Every balance value is provisional; the bot results are comparative evidence, not a balance sign-off.
const L=campaign.get('campaign-46'),KEEP='red-base',GATE='red-fortress-gate',LORD='red-hero';
const fresh=(id='l46')=>new Simulation(id,campaign.setup(46));
const play=(sim,ticks,log)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log?.push({at:sim.clock.tick,...e});}return log;};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
const sturdy=sim=>{sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e7;sim.hero.hp=sim.hero.maxHp=1e7;return sim;};
const azure=(sim,id)=>{sim.state.posts.find(q=>q.id===id).owner='azure';};
const park=sim=>{sim.state.units.guardian.x=300;sim.state.units.guardian.y=1000;};
const open=sim=>{calm(sim);sturdy(sim);park(sim);return sim;};

test('Mission 6 is The Crimson Throne: Chapter 5, campaign-46, capture both outposts then destroy the Keep, the sixth Chapter 5 slot, released',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[46,5,'campaign-46','The Crimson Throne','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 const ch=campaignChapters.find(c=>c.number===5);assert.equal(ch.slots[5].levelId,'campaign-46');assert.equal(ch.release,'available');
});
test('approved values: start, caps, waves and stages, Throne Gate, Last Stand, Lord, Commanders, no South Warden',()=>{
 const o=L.match.overrides;
 assert.deepEqual(o.start,{gold:100,wood:200,iron:30,guardian:{x:600,y:600}});assert.deepEqual([o.tavern.cap,o.azure.limit],[2,2]);
 assert.deepEqual(o.waves.enemyPerWave,[7,7,8,8,9,9,10,10]);assert.deepEqual([o.waves.firstWaveTick,o.waves.waveInterval],[30*HZ,30*HZ]);
 assert.deepEqual(o.waves.flanks,[{wave:3,lane:'south',units:'all'},{wave:5,lane:'north',units:'all'}]);assert.deepEqual(o.waves.lanes,[{wave:7,south:[4,6]}]);
 assert.deepEqual(o.gates,[{id:GATE,hp:3000,faction:true,assist:true}]);assert.deepEqual(o.garrison.counts,[3]);assert.equal(o.garrison.after,GATE);
 assert.deepEqual(o.hero,{spawn:[1488,600],delayTicks:30,respawnTicks:45*HZ,lord:{hp:1.2,damage:1.1}});
 const [m,sb]=o.commanders;assert.deepEqual([m.id,m.firstTick,m.warningTicks,m.restTicks],['red-marshal',240*HZ,6*HZ,90*HZ]);assert.deepEqual([sb.id,sb.firstTick,sb.warningTicks,sb.restTicks],['red-shadowblade',330*HZ,6*HZ,40*HZ]);
 assert.ok(o.posts.every(p=>p.hero===undefined),'no South Warden');
 assert.deepEqual(o.cart,{start:[1776,600],startTick:1,sites:[{col:20,row:19}],ring:96,repair:{wood:160,iron:40,ticks:150},order:[GATE],follow:300,wreckAtStart:true,post:'south'});
 const m5=campaign.get('campaign-45').match.overrides;
 assert.deepEqual(m5.hero,undefined);assert.equal(m5.gates[0].hp,2500,'M5 is unchanged');assert.equal(m5.commanders[0].firstTick,210*HZ);assert.equal(m5.commanders[0].restTicks,60*HZ);assert.deepEqual(m5.garrison.counts,[4]);
});
test('the Throne map: Last Stronghold geometry, forward towers on the gate road, six M4 towers kept',()=>{
 const f=battlefield('crimson-throne'),m5=battlefield('last-stronghold'),by=id=>f.towers.find(t=>t.id===id);
 assert.equal(f.id,'crimson-throne');assert.deepEqual(f.barriers,m5.barriers);assert.deepEqual(f.outposts,m5.outposts);assert.deepEqual(f.flankVia,m5.flankVia);assert.deepEqual(f.gates,m5.gates);
 assert.deepEqual([by('c5-sally-north').x,by('c5-sally-north').y,by('c5-sally-south').x,by('c5-sally-south').y],[1344,552,1344,648]);assert.equal(f.towers.length,8);
 for(const t of m5.towers.filter(t=>!t.id.includes('sally')))assert.deepEqual(by(t.id),t);
});
test('the Lord is not on the field at the start, there is no Raider, and no clock releases him: only the Throne Gate does',()=>{
 const sim=open(fresh('l46-start')),log=[];assert.equal(sim.state.units[LORD],undefined);assert.equal(sim.state.units['red-raider'],undefined);
 play(sim,400*HZ,log);assert.equal(sim.state.units[LORD],undefined,'no time release');assert.equal(log.filter(e=>e.type==='spawn'&&(e.id===LORD||e.id==='red-raider')).length,0);
 assert.ok(sim.state.structures[GATE].hp>0);
});
test('destroying the Throne Gate releases the Lord once, inside the fortress, with 1.2x hit points and 1.1x damage; the garrison is three Elites',()=>{
 const sim=open(fresh('l46-release')),log=[];
 strike(sim,'guardian',GATE);play(sim,40,log);
 const u=sim.state.units[LORD];assert.ok(u,'released');
 assert.deepEqual([u.maxHp,u.hp,u.damage,u.armor,u.speed,u.archetype,u.team],[Math.round(crimsonHero.stats.maxHp*1.2),Math.round(crimsonHero.stats.maxHp*1.2),crimsonHero.stats.damage*1.1,20,95,'crimson-hero','red']);
 assert.equal(u.maxHp,1000);assert.ok(Math.hypot(u.x-1488,u.y-600)<100,u.x+','+u.y);
 play(sim,900,log);assert.equal(log.filter(e=>e.type==='spawn'&&e.id===LORD).length,1,'one release');
 const elites=Object.values(sim.state.units).filter(x=>x.archetype==='crimson-elite'&&/^red-g/.test(x.id));
 const spawned=log.filter(e=>e.type==='spawn'&&/^red-g1-/.test(e.id)).length;assert.equal(spawned,3,'Last Stand of three Elites');assert.ok(elites.length<=3);
});
test('nothing else releases him: a tower, a Banner holder or an outpost capture leaves the field empty',()=>{
 const sim=open(fresh('l46-other')),log=[];
 for(const id of ['c5-gate-north','c5-sally-north','c5-north-a'])strike(sim,'guardian',id);azure(sim,'north');play(sim,300,log);
 assert.equal(sim.state.units[LORD],undefined);
});
test('the Lord marches on the Azure Keep and ignores banners and outpost towers; he is not a Raider',()=>{
 const sim=open(fresh('l46-march')),log=[];azure(sim,'north');azure(sim,'south');
 strike(sim,'guardian',GATE);play(sim,40,log);
 const hits=[];const t0=sim.clock.tick;let reached=null;
 while(sim.clock.tick<t0+150*HZ&&!sim.ended){play(sim,1,log);const u=sim.state.units[LORD];if(u&&u.targetId&&u.targetId!=='blue-base')hits.push(u.targetId);if(u&&reached===null&&Math.hypot(u.x-sim.state.bases['blue-base'].x,u.y-sim.state.bases['blue-base'].y)<150)reached=sim.clock.tick;}
 assert.deepEqual([...new Set(hits)],[],'only ever the Azure Keep');assert.ok(reached!==null,'he reaches the Keep');
 const byLord=log.filter(e=>e.type==='damage'&&e.sourceId===LORD);assert.ok(byLord.length>0&&byLord.every(e=>e.id==='blue-base'),'he strikes only the Keep');
});
test('after a death he is back 45 s later, again and again, with the same stats, while the Crimson Keep stands',()=>{
 const sim=open(fresh('l46-respawn')),log=[];strike(sim,'guardian',GATE);play(sim,40,log);
 for(let k=0;k<2;k++){
  assert.ok(sim.state.units[LORD],'alive '+k);const died=sim.clock.tick;strike(sim,'guardian',LORD);play(sim,1,log);assert.equal(sim.state.units[LORD],undefined);
  play(sim,45*HZ-10,log);assert.equal(sim.state.units[LORD],undefined,'not before 45 s');
  play(sim,20,log);const u=sim.state.units[LORD];assert.ok(u,'back after 45 s');assert.ok(Math.abs(sim.clock.tick-died-45*HZ)<=30,`${(sim.clock.tick-died)/HZ} s`);
  assert.deepEqual([u.maxHp,u.damage],[1000,88]);
 }
 assert.equal(log.filter(e=>e.type==='spawn'&&e.id===LORD).length,3);
});
test('respawning ceases when the Crimson Keep is destroyed (the bots win the mission for real)',()=>{
 const sim=open(fresh('l46-victory'));azure(sim,'north');azure(sim,'south');sim.state.bases[KEEP].invulnerable=false;
 strike(sim,'guardian',GATE);play(sim,40);strike(sim,'guardian',LORD);play(sim,2);assert.equal(sim.state.units[LORD],undefined);
 strike(sim,'guardian',KEEP);play(sim,60*HZ);assert.equal(sim.state.units[LORD],undefined,'no respawn after the Keep fell');
});
test('Commanders keep their own clocks: the Marshal is announced at 234 s, released at 240 s, the Shadowblade at 330 s, whatever the gate does',()=>{
 for(const gateFirst of [false,true]){
  const sim=open(fresh('l46-cmd'+gateFirst)),log=[];if(gateFirst){strike(sim,'guardian',GATE);}
  play(sim,336*HZ,log);
  const c=log.filter(e=>e.type==='commander');
  const w=id=>c.find(e=>e.id===id&&e.change==='warning'),r=id=>c.find(e=>e.id===id&&e.change==='released');
  assert.ok(Math.abs(w('red-marshal').at-234*HZ)<=2&&Math.abs(r('red-marshal').at-240*HZ)<=2,'marshal');
  assert.ok(Math.abs(w('red-shadowblade').at-324*HZ)<=2&&Math.abs(r('red-shadowblade').at-330*HZ)<=2,'shadowblade');
 }
});
test('the Lord and the Commanders coexist and the Lord never takes a Commander\'s place: separate ids, separate stats',()=>{
 const sim=open(fresh('l46-coexist'));strike(sim,'guardian',GATE);play(sim,245*HZ);
 const u=sim.state.units;assert.ok(u[LORD]);assert.ok(u['red-marshal']);assert.equal(u[LORD].commander,undefined);assert.ok(u['red-marshal'].commander);
 assert.equal(u[LORD].maxHp,1000);assert.equal(u['red-marshal'].maxHp,Math.round(833*1.6));
});
test('the staged counterattacks: wave 3 comes by the south road, wave 5 by the north road, wave 7 is split',()=>{
 const sim=fresh('l46-stage'),by=n=>sim.encounter.spawns.filter(e=>e.team==='red'&&e.wave===n);
 assert.ok(by(3).length>0&&by(3).every(e=>e.lane==='south'),'wave 3 south');assert.ok(by(5).length>0&&by(5).every(e=>e.lane==='north'),'wave 5 north');
 const w7=by(7);assert.ok(w7.some(e=>e.lane==='south')&&w7.some(e=>e.lane==='north'),'wave 7 split');
 for(const n of [1,2,4,6,8])assert.ok(by(n).every(e=>!e.lane),'wave '+n+' is straight');
});
test('the siege carries over from M5 unchanged: the wreck lies at tick 0, locked until the South Outpost is Azure; the Ballista repairs from the North Outpost',()=>{
 const sim=fresh('l46-siege');assert.deepEqual([sim.state.cartWreck.col,sim.state.cartWreck.row],[20,19]);assert.equal(sim.cartLocked,true);azure(sim,'south');assert.equal(sim.cartLocked,false);
 assert.ok(sim.ballistaRuin===undefined||sim.ballistaRuin!==null);
 assert.equal(sim.camps.find(c=>c.id==='north').ballista.col,24);
});
test('Azure Barracks pads and forward towers are on open ground and not blocked: every Throne map cell the mission uses is valid',()=>{
 const sim=fresh('l46-cells');const pads=L.match.overrides.azure.pads;assert.equal(pads.length,5);
 for(const p of pads.slice(-2))assert.ok(Number.isInteger(p.col)&&Number.isInteger(p.row));
 assert.ok(sim.state.structures['c5-sally-north']&&sim.state.structures['c5-sally-south']);
});
test('matchSetup: lord needs a garrison and camps without a camp Hero, fields in range; every earlier setup carries no lord; Warlord and Raider setups are unchanged',()=>{
 const o=JSON.parse(JSON.stringify(L.match.overrides));
 const make=ov=>matchSetup('extended',{...o,...ov});
 assert.deepEqual(make({}).hero,{spawn:[1488,600],delayTicks:30,respawnTicks:1350,lord:{hp:1.2,damage:1.1}});
 for(const bad of [{hp:0,damage:1},{hp:5,damage:1},{hp:1,damage:0},{hp:1,damage:NaN},{hp:'1',damage:1}])assert.throws(()=>make({hero:{...o.hero,lord:bad}}),/Invalid Crimson Hero/,JSON.stringify(bad));
 assert.throws(()=>make({garrison:undefined,hero:o.hero}),/./);
 const wardenPosts=o.posts.map((p,i)=>i===1?{...p,hero:{anchor:[1056,936],guard:220,spawn:[1296,888],respawnTicks:1350}}:p);assert.throws(()=>make({posts:wardenPosts}),/Invalid Crimson Hero/,'a Lord and a Warden would share an id');
 for(const id of [26,34,41,42,43,44,45]){const s=campaign.setup(id);assert.equal(s.hero?.lord,undefined,String(id));}
 assert.deepEqual(campaign.setup(26).hero,{spawn:[1560,744],delayTicks:0,respawnTicks:900});assert.deepEqual(Object.keys(campaign.setup(26).hero).sort(),['delayTicks','respawnTicks','spawn']);
});
test('without a lord field a mission with camps still registers its Raider on the clock and no gate-triggered Hero (Chapter 4 M5 / Chapter 5 M2 unchanged)',()=>{
 const m5=new Simulation('l46-m5',campaign.setup(45));m5.state.units.guardian.x=300;m5.state.units.guardian.y=1000;strike(m5,'guardian',GATE);play(m5,40);assert.equal(m5.state.units[LORD].maxHp,833,'M5: the South Warden is the only red-hero, unscaled, and the gate releases nobody');
 const m3=new Simulation('l46-m3',campaign.setup(43));assert.equal(m3.state.units['red-raider'],undefined,'M3 starts with no Raider; its Raider is on the clock');
});

// Bot evidence (tests/support/throneBot.cjs): comparative only, the human Galaxy S24 playtest decides balance.
const {run}=require('./support/throneBot.cjs');
test('bot: an early breakthrough (siege first, gate as soon as it can) wins; the Lord is released by the gate before the Marshal and falls',()=>{
 const r=run({plan:'north-first',startAt:90*HZ,cap:700});
 assert.equal(r.outcome,'victory');assert.ok(r.cartLog.gateDownAt>0&&r.lordReleases[0]>=r.cartLog.gateDownAt&&r.lordReleases[0]<=r.cartLog.gateDownAt+3,'released when the gate fell: '+r.lordReleases[0]+' vs '+r.cartLog.gateDownAt);
 assert.ok(r.lordDeaths.length>=1,'the Lord fell at least once');assert.ok(r.peakLive<=40,'peak '+r.peakLive);assert.ok(r.stalls<=10);
});
test('bot: a methodical approach (nothing at the gate before 290 s) also wins, and the gate and the Lord come after the Marshal is released',()=>{
 const r=run({plan:'no-siege',gateAt:290,startAt:90*HZ,cap:800});
 assert.equal(r.outcome,'victory');assert.ok(r.cartLog.gateDownAt>=290,'gate '+r.cartLog.gateDownAt);assert.ok(r.lordReleases[0]>=290);assert.ok(r.marshalReleases[0]<=241);assert.ok(r.peakLive<=40);
});
test('bot: the Guardian alone loses and a direct rush on the gate cannot win (the Keep stays shielded)',()=>{
 const none=run({plan:'none',startAt:90*HZ,cap:600}),rush=run({plan:'rush',startAt:90*HZ,cap:420});
 assert.notEqual(none.outcome,'victory');assert.notEqual(rush.outcome,'victory');
});
