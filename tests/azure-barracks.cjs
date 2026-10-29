const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {BARRACKS_TEST_PADS:PADS,barracksTestFromSearch,barracksTestSetup}=require('../.test-build/data/barracksTest.js');
const {SLOTS,TRAIN_TICKS,TRAIN_STAGGER,REPLACE_TICKS}=require('../.test-build/simulation/AzureBarracks.js');
// Chapter 3 Azure Barracks V1 (src/simulation/AzureBarracks.ts) on Mission 2's battlefield, before its first Crimson wave (tick 300) reaches anyone.
const make=(pads=PADS)=>{const s=campaign.setup(22),t=barracksTestSetup(s),sim=new Simulation('ab',{...t,start:{...t.start,wood:800,iron:120}});sim.azurePads=pads;return sim;};
const run=(sim,ticks)=>{for(let i=0;i<ticks&&!sim.ended;i++){sim.advance(1000/30+.01);sim.drainEvents();}};
let n=0;
const build=(sim,pad)=>{const id=`t${++n}`;sim.send({type:'place',requestId:id,kind:'barracks',col:pad.col,row:pad.row});run(sim,1);return `built-${id}`;};
const soldiers=(sim,of)=>Object.values(sim.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0&&(!of||u.id.startsWith(`blue-s-${of}-`)));
// The long tests outlast the first Crimson wave, so the soldiers that must stay alive are made unkillable; only the ones a test kills on purpose die.
const tough=sim=>{for(const u of soldiers(sim))u.hp=u.maxHp=1e6;};
const ready=()=>150+TRAIN_TICKS+TRAIN_STAGGER+25; // build time plus both first trainings

test('cost: 120 Wood + 20 Iron, no Gold; the pad cells are valid on Mission 2',()=>{
 const sim=make(),q=sim.constructionQuote('barracks');
 assert.deepEqual([q.wood,q.iron],[120,20]);
 const before={g:sim.state.gold,w:sim.economy.woodUnits,i:sim.economy.ironUnits};
 for(const p of PADS)assert.equal(sim.placementReason('barracks',p.col,p.row),'',`pad ${p.col},${p.row}`);
 build(sim,PADS[0]);
 const paid=Object.values(sim.state.structures).find(b=>b.azureBarracks).paidResources;
 assert.deepEqual(paid,{wood:120,iron:20},'charged 120 Wood and 20 Iron');
 assert.ok(sim.economy.woodUnits<before.w&&sim.economy.woodUnits>before.w-121*120,'Wood fell by about 120 (plus income)');assert.ok(sim.state.gold>=before.g,'no Gold spent');
});

test('placement: only authored pads; none exist outside the scenario; occupied pads are refused',()=>{
 const sim=make();
 assert.equal(sim.placementReason('barracks',PADS[0].col+1,PADS[0].row),'Not an Azure Barracks pad');
 assert.equal(sim.placementReason('barracks',9,9),'Not an Azure Barracks pad');
 assert.equal(new Simulation('plain',campaign.setup(22)).placementReason('barracks',PADS[0].col,PADS[0].row),'Not an Azure Barracks pad','no pads in a normal match');
 build(sim,PADS[0]);assert.notEqual(sim.placementReason('barracks',PADS[0].col,PADS[0].row),'','a built pad is taken');
 const poor=new Simulation('poor',campaign.setup(22));poor.azurePads=PADS;assert.equal(poor.placementReason('barracks',PADS[0].col,PADS[0].row),'Not enough resources');
});

test('at most three active Barracks; a destroyed one frees its place',()=>{
 const pads=[...PADS,{col:13,row:18}],sim=make(pads);
 const ids=PADS.map(p=>build(sim,p));
 assert.equal(sim.placementReason('barracks',13,18),'Barracks limit reached');
 sim.state.structures[ids[0]].hp=0;
 assert.equal(sim.placementReason('barracks',13,18),'');
});

test('each Barracks trains exactly two soldiers, never more; three Barracks give six',()=>{
 const sim=make();const ids=PADS.map(p=>build(sim,p));
 run(sim,150+TRAIN_TICKS-12);assert.equal(soldiers(sim).length,0,'nothing before construction and training finish');
 run(sim,ready()-(150+TRAIN_TICKS-12));
 for(const id of ids)assert.equal(soldiers(sim,id).length,SLOTS,id);
 assert.equal(soldiers(sim).length,6);
 run(sim,30);assert.equal(soldiers(sim).length,6,'no extra soldiers');
 assert.ok(sim.soldierProto&&sim.soldierProto.mode==='hybrid'&&sim.soldierProto.leash===400,'hybrid, 400 px leash');
 const u=soldiers(sim)[0];assert.deepEqual([u.maxHp,u.armor,u.damage,u.speed],[320,10,20,120]);
});

test('replacement: a free soldier 15 s after a death, not before',()=>{
 const sim=make(),id=build(sim,PADS[1]);run(sim,ready());
 tough(sim);const dead=soldiers(sim,id)[0];dead.hp=0;run(sim,1);
 assert.equal(soldiers(sim,id).length,1,'the slot is empty');
 run(sim,REPLACE_TICKS-10);assert.equal(soldiers(sim,id).length,1,'not yet');
 run(sim,15);assert.equal(soldiers(sim,id).length,2,'replaced after about 15 s');
 assert.notEqual(soldiers(sim,id).find(u=>u.id!==dead.id&&!sim.state.units[dead.id]?.hp>0)?.id,dead.id,'a new soldier, not the old one');
});

test('a destroyed Barracks stops producing; its living soldiers stay and nothing moves to another Barracks',()=>{
 const sim=make(),a=build(sim,PADS[0]),b=build(sim,PADS[1]);run(sim,ready());
 tough(sim);const survivor=soldiers(sim,a)[0];
 sim.state.structures[a].hp=0;soldiers(sim,a)[1].hp=0;
 run(sim,REPLACE_TICKS+60);
 assert.equal(soldiers(sim,a).length,1,'one soldier left of the destroyed Barracks');assert.equal(sim.state.units[survivor.id].hp>0,true);
 assert.equal(soldiers(sim,b).length,2,'the other Barracks keeps exactly its own two');assert.equal(soldiers(sim).length,3);
});

test('a blocked Barracks site cannot stall other Barracks or the ordinary spawn queue',()=>{
 const sim=make(),a=build(sim,PADS[0]),b=build(sim,PADS[1]);
 const A=sim.state.structures[a],blocked=sim.geo.blocked.bind(sim.geo);
 sim.geo.blocked=(x,y,r,s)=>Math.hypot(x-A.x,y-A.y)<110||blocked(x,y,r,s);
 sim.spawnQueue.push({tick:sim.clock.tick+1,team:'blue',id:'blue-q-1',x:600,y:700,wave:0});
 run(sim,ready());
 assert.equal(soldiers(sim,a).length,0,'the walled-in Barracks waits');assert.equal(soldiers(sim,b).length,2,'the other is unaffected');
 assert.ok(sim.state.units['blue-q-1'],'the spawn queue still runs');
 sim.geo.blocked=blocked;run(sim,5);assert.equal(soldiers(sim,a).length,2,'it trains as soon as there is room');
});

test('the test URL is dev-only and exact; a normal Mission 2 has no pads, no Barracks, no soldiers',()=>{
 assert.equal(barracksTestFromSearch('?debug=1&chapter=3&mission=2&barracksTest=1',true),true);
 for(const q of ['?barracksTest=1','?debug=1&barracksTest=2','?debug=1',''])assert.equal(barracksTestFromSearch(q,true),false,q);
 assert.equal(barracksTestFromSearch('?debug=1&barracksTest=1',false),false,'never in production');
 const sim=new Simulation('plain',campaign.setup(22));run(sim,600);
 assert.equal(sim.azurePads.length,0);assert.equal(sim.soldierProto,undefined);assert.equal(soldiers(sim).length,0);
});
