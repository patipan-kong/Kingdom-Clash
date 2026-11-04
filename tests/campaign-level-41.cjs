const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {mercenaries,reviveCost}=require('../.test-build/data/mercenaries.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/tavernBot.cjs');
const {allies,ally}=require('./support/allyBot.cjs');
// Chapter 5 Mission 1 "The Old Tavern" (docs/CHAPTER5_M1.md): Forest Edge's loop on the new old-tavern map with a Tavern, one hired Allied Hero and no Crimson Hero.
// Every balance value is provisional; the bot results guard against regressions and show that all four plans (no Hero, Roland, Borin, Kael) can finish, they are not a balance sign-off.
const L=campaign.get('campaign-41'),BANNER='c4-banner',NORTH='c5-outpost-north',SOUTH='c5-outpost-south',KEEP='red-base',PAD={col:24,row:13},RUIN={col:27,row:10};
const fresh=(id='l41')=>new Simulation(id,campaign.setup(41));
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
const money=(sim,gold=1e4,wood=1e4,iron=1e4)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
const homeCell=sim=>{for(let r=8;r<16;r++)for(let c=8;c<16;c++)if(sim.placementReason('tavern',c,r)==='')return {col:c,row:r};};
const buildTavern=sim=>{money(sim);const c=homeCell(sim);sim.send({type:'place',requestId:'tv',kind:'tavern',...c});play(sim,160);const t=Object.values(sim.state.structures).find(b=>b.tavern);assert.ok(t&&t.progress>=1,'the Tavern stands');return t;};
const hire=(sim,merc,id='h')=>{sim.send({type:'tavern',requestId:id,action:'hire',merc});return play(sim,2);};
const rejected=log=>log.filter(e=>e.type==='rejected').map(e=>e.reason);
const clearCamp=sim=>{for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);};

test('Mission 1 is The Old Tavern: Chapter 5, campaign-41, capture then destroy the Keep',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[41,5,'campaign-41','The Old Tavern','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.match(L.display.briefing,/^Capture the Old Outpost, then destroy the Crimson Keep/);assert.match(L.display.briefing,/Tavern/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Old Outpost'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined);assert.doesNotThrow(()=>campaign.setup(41));
});
test('the approved values: map, resources, waves, Outpost, Elites, Tavern and no Crimson Hero',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'old-tavern');assert.deepEqual(o.start,{gold:50,wood:140,iron:15});
 assert.deepEqual(o.waves.enemyPerWave,[5,5,5,6,6,6,7,7]);assert.equal(o.waves.firstWaveTick,25*HZ);assert.equal(o.waves.waveInterval,30*HZ);assert.equal(o.waves.flanks,undefined);
 assert.equal(o.crimsonKeepArmed,true);assert.deepEqual(o.defenders,['red-tower-front-north','red-tower-front-south',NORTH,SOUTH]);
 const p=o.post;assert.deepEqual([p.name,p.bannerHp,p.raiseTicks,p.repair,p.counter.count,p.hero,p.holders],['Old Outpost',2000,4*HZ,{percent:60,ticks:5*HZ},2,undefined,[NORTH,SOUTH]]);
 assert.equal(o.azure,undefined);assert.deepEqual(o.tavern,{cap:1,roster:['roland','borin','kael']});
 assert.equal(o.hero,undefined);assert.equal(o.posts,undefined);
});
test('the match starts with the Outpost Crimson, the Keep shielded, both watchtowers standing, no Crimson Hero, no Tavern, no Barracks pad',()=>{
 const sim=fresh(),s=sim.state;
 assert.deepEqual([s.gold,s.wood,s.iron],[50,140,15]);
 assert.deepEqual([s.post.owner,s.post.captured,s.post.bannerId,s.post.counterDone],['crimson',false,undefined,false]);
 for(const id of [NORTH,SOUTH,'red-tower-front-north','red-tower-front-south'])assert.ok(s.structures[id].hp>0,id);
 assert.equal(s.bases[KEEP].invulnerable,true);assert.equal(s.units['red-hero'],undefined);assert.equal(Object.values(s.units).filter(u=>u.team==='red'&&u.archetype==='crimson-hero').length,0);
 assert.deepEqual(s.tavern,{slots:[]});assert.equal(Object.values(s.structures).filter(b=>b.tavern||b.azureBarracks).length,0);assert.equal(sim.azurePads.length,0);
});
test('the old-tavern battlefield is a distinct Forest Edge variant: a bend, a wide basin, towers 288 px apart, one outpost circle',()=>{
 const f=battlefield('old-tavern'),e=battlefield('forest-edge');
 assert.equal(f.id,'old-tavern');assert.notDeepEqual(f.barriers,e.barriers);assert.deepEqual(f.outposts,[{x:1248,y:600,radius:168}]);assert.equal(f.flankVia,undefined);
 const [n,s]=f.towers;assert.deepEqual([n.id,s.id,Math.abs(n.y-s.y)],[NORTH,SOUTH,288]);assert.equal(f.territory,battlefield('meadow').territory);
 assert.ok(f.barriers.every(b=>b.look==='forest'));assert.equal(battlefield('forest-edge').id,'forest-edge');
});
test('the Tavern is built at home for 100 Wood and 10 Iron in 5 seconds, and not inside the Outpost before it is captured',()=>{
 const sim=calm(fresh()),s=sim.state,c=homeCell(sim);assert.ok(c,'a free home cell');
 assert.equal(sim.placementReason('tavern',27,12),'Capture the Old Outpost first');
 const w=sim.economy.woodUnits,i=sim.economy.ironUnits;sim.send({type:'place',requestId:'tv',kind:'tavern',...c});play(sim,1);
 assert.equal(Math.round((w-sim.economy.woodUnits+8)/RESOURCE_UNITS),100);assert.equal(Math.round((i-sim.economy.ironUnits+1)/RESOURCE_UNITS),10);
 play(sim,150);assert.ok(Object.values(s.structures).find(b=>b.tavern).progress>=1);
 assert.equal(sim.placementReason('tavern',c.col+1,c.row),'Tavern already built');
});
test('all three mercenaries can be hired for their Gold price: Wood and Iron stay untouched, the cap is one',()=>{
 for(const m of mercenaries){
  const sim=calm(fresh('hire-'+m.id));buildTavern(sim);money(sim,1000,0,0);const before=sim.economy.goldUnits;
  assert.deepEqual(rejected(hire(sim,m.id)),[]);assert.equal(allies(sim).length,1);assert.equal(allies(sim)[0].ally.merc,m.id);
  assert.equal(Math.round((before-sim.economy.goldUnits)/RESOURCE_UNITS),m.gold,m.id);assert.ok(sim.economy.woodUnits<=2*8,'only the two ticks of income: nothing was spent');
  const other=mercenaries.find(x=>x.id!==m.id);assert.deepEqual(rejected(hire(sim,other.id,'h2')),['Hero cap reached']);assert.equal(allies(sim).length,1);
 }
 assert.deepEqual(mercenaries.map(m=>m.gold),[150,180,200]);
});
test('Revive costs 45% of the hire price in Gold and the Hero returns after 30 seconds beside the Tavern',()=>{
 const sim=calm(fresh()),t=buildTavern(sim);hire(sim,'borin');const hero=allies(sim)[0];hero.hp=1;strike(sim,'red-base',hero.id);play(sim,2);
 assert.equal(allies(sim).length,0);assert.equal(sim.state.tavern.slots[0].status,'dead');
 const g=sim.economy.goldUnits;sim.send({type:'tavern',requestId:'rv',action:'revive',slot:0});play(sim,1);
 assert.equal(Math.round((g-sim.economy.goldUnits)/RESOURCE_UNITS),reviveCost(mercenaries.find(m=>m.id==='borin')).gold);play(sim,30*HZ+2);
 const back=allies(sim)[0];assert.ok(back&&back.ally.merc==='borin');assert.ok(Math.hypot(back.x-t.x,back.y-t.y)<140,'returns beside the Tavern');
});
test('Follow, Attack and Defend work on the new map and Attack walks to a watchtower',()=>{
 const sim=calm(fresh()),s=sim.state;buildTavern(sim);hire(sim,'roland');const id=allies(sim)[0].id;s.units[id].hp=s.units[id].maxHp=1e6;
 const send=order=>{sim.send({type:'ally',requestId:'o'+Math.random(),id,order});return play(sim,1);};
 assert.deepEqual(rejected(send({type:'attack',targetId:NORTH})),[]);assert.deepEqual(s.units[id].ally.order,{type:'attack',targetId:NORTH});
 const d0=Math.hypot(s.units[id].x-s.structures[NORTH].x,s.units[id].y-s.structures[NORTH].y);play(sim,8*HZ);
 assert.ok(Math.hypot(s.units[id].x-s.structures[NORTH].x,s.units[id].y-s.structures[NORTH].y)<d0-200,'the Hero marches on the watchtower');
 assert.deepEqual(rejected(send({type:'defend',x:900,y:600})),[]);{const o=s.units[id].ally.order;assert.ok(o.type==='defend'&&Math.hypot(o.x-900,o.y-600)<40,'Defend holds the point (snapped to open ground)');}
 assert.deepEqual(rejected(send({type:'follow'})),[]);assert.deepEqual(s.units[id].ally.order,{type:'follow'});
});
test('the Guardian and the Hero split the watchtowers: each destroys one, the Banner rises and the camp opens',()=>{
 const sim=calm(fresh()),s=sim.state;buildTavern(sim);hire(sim,'kael');const id=allies(sim)[0].id;
 sim.send({type:'ally',requestId:'o1',id,order:{type:'attack',targetId:SOUTH}});strike(sim,'guardian',NORTH);
 assert.ok(s.structures[SOUTH].hp>0,'the Guardian took only the north one');
 strike(sim,id,SOUTH);assert.equal(s.structures[SOUTH],undefined);
});
test('an Allied Hero captures the Outpost on its own, with the Guardian elsewhere',()=>{
 const sim=calm(fresh()),s=sim.state;buildTavern(sim);hire(sim,'roland');const id=allies(sim)[0].id;clearCamp(sim);
 assert.ok(sim.teleportHero(500,420));const u=s.units[id];u.x=1224;u.y=672;
 play(sim,3);assert.equal(s.post.bannerId,BANNER,'the Hero standing in the ring raises the Banner');assert.ok(Math.hypot(sim.hero.x-1224,sim.hero.y-600)>600);
 play(sim,125);assert.equal(s.post.owner,'azure');assert.equal(s.bases[KEEP].invulnerable,undefined,'the Keep loses its shield');
});
test('there is no Barracks pad; capture opens the Outpost for building, and a Barracks goes nowhere before or after it',()=>{
 const sim=calm(fresh()),s=sim.state;money(sim);assert.equal(sim.azurePads.length,0);
 for(const [c,r] of [[24,13],[10,10],[10,14],[13,12]])assert.match(sim.placementReason('barracks',c,r),/^(Not an Azure Barracks pad|Capture the Old Outpost first)$/);
 assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'Capture the Old Outpost first');
 clearCamp(sim);sim.teleportHero(1224,672);play(sim,130);assert.equal(s.post.owner,'azure');
 for(const [c,r] of [[24,13],[10,10]])assert.equal(sim.placementReason('barracks',c,r),'Not an Azure Barracks pad');
 for(const u of Object.values(s.units))if(u.id!=='guardian')u.hp=0;sim.teleportHero(400,600);play(sim,2);assert.equal(sim.placementReason('tower',RUIN.col,RUIN.row),'');
});
test('the Keep shield follows the Outpost: shielded until the Banner stands, shielded again when it falls',()=>{
 const sim=calm(fresh()),s=sim.state;assert.equal(s.bases[KEEP].invulnerable,true);
 clearCamp(sim);sim.teleportHero(1224,672);play(sim,130);assert.equal(s.bases[KEEP].invulnerable,undefined);
 s.structures[BANNER].hp=0;play(sim,2);assert.equal(s.post.owner,'crimson');assert.equal(s.bases[KEEP].invulnerable,true);
});
test('the first capture sends two Elite Soldiers once, never again',()=>{
 const sim=calm(fresh()),s=sim.state,log=[];clearCamp(sim);sim.teleportHero(1224,672);play(sim,130,log);play(sim,60,log);
 const elites=Object.values(s.units).filter(u=>u.team==='red'&&u.archetype==='crimson-elite');assert.equal(elites.length,2);
 s.structures[BANNER].hp=0;play(sim,2);play(sim,130);assert.equal(Object.values(s.units).filter(u=>u.id.startsWith('red-ca-')).length,2,'no second counterattack');
});
test('Crimson waves cross the new road: with nobody fighting, units leave their slots and reach the west road (no navigation deadlock)',()=>{
 const sim=fresh(),s=sim.state;play(sim,100*HZ);
 const reds=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0&&u.id.startsWith('red-w'));
 assert.ok(reds.length>=5,'waves spawned');assert.ok(reds.filter(u=>u.x<1100).length>=3,'most have crossed the basin and entered the west road: '+reds.map(u=>Math.round(u.x)));
});
test('Chapter 5 is Coming Soon: not in the played sequence, hidden until unlocked, the level resolves by number',()=>{
 const ch=campaignChapters.find(c=>c.number===5);assert.deepEqual([ch.id,ch.release,ch.slots.length],['rise-of-the-heroes','coming-soon',6]);assert.equal(ch.slots[0].levelId,'campaign-41');
 const store=new ProgressStore(()=>({getItem:()=>null,setItem(){}}));store.refresh();
 const v=chapterViews(campaignChapters,campaign.list(),store.progress).find(x=>x.chapter.number===5);assert.equal(v.state,'coming-soon');assert.equal(v.missions[0].state,'pending');
 assert.equal(campaign.get('campaign-41').chapter,5);assert.equal(campaign.has('campaign-42'),false);
});
test('no earlier level is touched: no Tavern in Chapters 1-4, and the Chapter 4 posts keep their Hero',()=>{
 for(const l of campaignLevels.filter(l=>l.id!=='campaign-41'&&l.match.overrides))assert.equal(l.match.overrides.tavern,undefined,l.id);
 assert.ok(campaign.get('campaign-31').match.overrides.post.hero);
 assert.throws(()=>matchSetup('extended',{...structuredClone(campaign.get('campaign-31').match.overrides),post:{...structuredClone(campaign.get('campaign-31').match.overrides.post),hero:undefined}}),/Invalid post/,'a Chapter 4 post still needs its Hero');
});
for(const plan of [{hero:'none'},{hero:'roland'},{hero:'borin'},{hero:'kael'},{hero:'roland',waitForHero:true},{hero:'kael',split:false,waitForHero:true}])
 test(`bot, ${plan.hero}${plan.waitForHero?' (waits for the hire)':''}${plan.split===false?' (together)':''}: finishes the mission from the production level`,()=>{
  const r=run(plan);assert.equal(r.outcome,'victory',JSON.stringify({...r,sim:undefined,log:undefined}));
  assert.ok(r.capture.length>=1,'the Outpost was captured');assert.equal(r.stalls,0,'no Allied Hero stall');assert.ok(r.keepMin>0,'the Azure Keep stood');
  if(plan.hero!=='none'){assert.ok(r.hired!==null,'the Hero was hired');assert.ok(r.tavernBuilt!==null,'the Tavern was built');}else assert.equal(r.hired,null);
  assert.ok(r.sec<=900);
 });
test('attack pressure: an unattended match reaches and destroys the Azure Keep, so the waves are not blocked by the map or the shield',()=>{
 for(const park of [null,[1500,300]]){
  const sim=fresh();if(park)sim.teleportHero(park[0],park[1]);let west=0,first=null;
  while(sim.clock.tick<150*HZ&&!sim.ended){sim.advance(DT);if(first===null&&sim.state.bases['blue-base'].hp<3000)first=sim.clock.tick/HZ;if(Object.values(sim.state.units).some(u=>u.team==='red'&&!u.ally&&u.hp>0&&u.x<700))west++;}
  assert.ok(first!==null&&first<90,'Crimson damages the Azure Keep within 90 s');assert.ok(west>0);assert.ok(sim.state.bases['blue-base'].hp<=0&&sim.ended,'and destroys it by 150 s');
 }
});
