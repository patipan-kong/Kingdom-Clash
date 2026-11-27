const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const DT=1000/30+.01;
const alternatives={'campaign-03':'front','campaign-04':'razed','campaign-05':'camp',
 'campaign-11':'waves','campaign-13':'gatetowers','campaign-14':'barracks'};
const make=id=>new Simulation(id,campaign.setup(id,1));
// Runs act(tick) inside the simulation step (before commands), so deaths and kills are observed exactly as in play.
function hooked(sim,act){const r=sim.rewards,expire=r.expire.bind(r);r.expire=t=>{expire(t);act(t);};}
const strike=(sim,t)=>{t.protectionTick=0;sim.hit(sim.state.bases['blue-base'],t,t.hp+1e6,'direct');};
const killRaiders=sim=>{for(const u of Object.values(sim.state.units))if(u.team==='red')strike(sim,u);};
const run=(sim,ticks)=>{for(let i=0;i<ticks&&!sim.ended;i++){sim.advance(DT);sim.drainEvents();}};
const towers=(sim,n)=>{const c=[];for(let col=4;col<15&&c.length<n;col+=2)for(let row=8;row<17&&c.length<n;row+=2)if(sim.placementReason('tower',col,row)==='')c.push([col,row]);assert.equal(c.length,n);c.forEach(([col,row],i)=>assert.equal(sim.send({type:'place',requestId:`t${sim.clock.tick}-${i}`,kind:'tower',col,row}),true));};
const verdict=sim=>sim.outcome&&[sim.outcome.outcome,sim.outcome.reason];

test('C1M1 completes after five defeated waves, Keep intact',()=>{
 const sim=make('campaign-01');hooked(sim,()=>killRaiders(sim));run(sim,30*60*5);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);assert.ok(sim.state.bases['red-base'].hp>0);
 assert.equal(sim.missionStatus().objectives.find(o=>o.id==='waves').progress,5);
});
test('C1M1 also wins when the Crimson Keep alone falls, with no defeated waves and all eight towers standing',()=>{
 const sim=make('campaign-01');hooked(sim,()=>strike(sim,sim.state.bases['red-base']));run(sim,2);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.complete]),[['waves',false],['keep',true]]);
 assert.equal(Object.values(sim.state.structures).filter(u=>u.team==='red'&&u.hp>0).length,8);
});
test('C1M1 is lost when both Keeps fall on the same tick',()=>{
 const sim=make('campaign-01'),red=sim.state.bases['red-base'],blue=sim.state.bases['blue-base'];
 hooked(sim,()=>{sim.hit(red,blue,blue.hp,'direct');strike(sim,red);});run(sim,2);
 assert.deepEqual(verdict(sim),['defeat','azure-keep-destroyed']);
 assert.equal(sim.state.bases['red-base'].hp,0);assert.equal(sim.state.bases['blue-base'].hp,0);
});
test('C1M2 completes through two Archer Towers and six defeated waves, Keep intact',()=>{
 const sim=make('campaign-02');towers(sim,2);hooked(sim,()=>killRaiders(sim));
 run(sim,30*60*6);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress]),[['towers',2],['waves',6],['keep',0]]);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);assert.equal(sim.state.bases['red-base'].hp,4000);
});
test('C1M2 credits the Keep alternative but waits for both Azure towers to finish',()=>{
 const sim=make('campaign-02'),keep=sim.state.bases['red-base'];
 assert.equal(keep.damage,0);assert.equal(keep.hp,4000);
 hooked(sim,t=>{if(t===1)strike(sim,keep);});run(sim,2);
 assert.equal(sim.outcome,null);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress]),[['towers',0],['waves',0],['keep',1]]);
 towers(sim,1);run(sim,210);assert.equal(sim.outcome,null);
 assert.equal(sim.missionStatus().objectives[0].progress,1);
 towers(sim,1);run(sim,210);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);
 assert.equal(Object.values(sim.state.structures).filter(u=>u.team==='red'&&u.hp>0).length,8);
});
test('C1M2 does not end without the towers, even with every wave beaten',()=>{
 const sim=make('campaign-02');hooked(sim,()=>killRaiders(sim));run(sim,30*60*5);
 assert.equal(sim.outcome,null);assert.equal(sim.missionStatus().objectives.find(o=>o.id==='waves').progress,6);
});
for(const [id,primary] of Object.entries(alternatives))test(id+': the unarmed Keep wins by itself, before any other objective is complete',()=>{
 const sim=make(id),keep=sim.state.bases['red-base'],towers=sim.setup.encounter.defenders;
 assert.equal(keep.hp,id==='campaign-11'?4000:3000);
 assert.equal(keep.damage,0);assert.equal(sim.setup.crimsonKeepScenery,undefined);
 assert.deepEqual(sim.setup.mission.phases[0].anyOf.ids,[primary,'keep']);
 hooked(sim,t=>{if(t===1)strike(sim,keep);});run(sim,2);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.complete]),[[primary,false],['keep',true]]);
 assert.ok(towers.every(t=>sim.state.structures[t.id]?.hp>0));
 if(id==='campaign-03')assert.ok(sim.state.units['red-warden-ford-captain']?.hp>0);
 for(const b of sim.setup.barracks??[])assert.ok(sim.state.structures[b.id]?.hp>0);
});
test('only C2M2 and C6M6 exclude Keep victory and draw it as scenery',()=>{
 const story=campaign.levels.filter(l=>l.number>0);
 const keepRoute=l=>l.mission?.phases.some(p=>p.objectives.some(o=>o.type==='destroy'&&o.targets.includes('red-base')));
 assert.deepEqual(story.filter(l=>!keepRoute(l)).map(l=>l.id),['campaign-12','campaign-56']);
 assert.deepEqual(story.filter(l=>campaign.setup(l.id).crimsonKeepScenery).map(l=>l.id),['campaign-12','campaign-56']);
 assert.equal('crimsonKeepScenery' in require('../.test-build/data/matchSetup.js').matchSetup('extended'),false,'Full Battle keeps its Keep');
});
for(const id of ['campaign-12','campaign-56'])test(id+': the scenery Keep remains unarmed and protected',()=>{
 const sim=make(id),keep=sim.state.bases['red-base'];assert.equal(keep.invulnerable,true);assert.equal(keep.damage,0);
 assert.notEqual(sim.send({type:'ally',order:{type:'attack',targetId:'red-base'}}),true);
 keep.protectionTick=0;sim.hit(sim.hero,keep,1e6,'direct');assert.equal(keep.hp,keep.maxHp);
});
test('the scenery flag is presentation only: the Keep entity, its footprint and the mission are identical with and without it',()=>{
 const {matchSetup}=require('../.test-build/data/matchSetup.js');
 const base={defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true},a=new Simulation('m',matchSetup('extended',base)),b=new Simulation('m',matchSetup('extended',{...base,crimsonKeepScenery:true}));
 assert.deepEqual(b.state.bases['red-base'],a.state.bases['red-base']);
 for(let i=0;i<600;i++){a.advance(DT);b.advance(DT);a.drainEvents();b.drainEvents();}
 assert.deepEqual(b.state.units,a.state.units);assert.deepEqual(b.state.bases,a.state.bases);
 assert.throws(()=>matchSetup('extended',{...base,crimsonKeepInvulnerable:false,crimsonKeepScenery:true}),/Keep scenery/);
});
for(const id of ['campaign-06','campaign-15','campaign-21'])test(id+': the offensive Keep stays destroyable',()=>{
 const sim=make(id),keep=sim.state.bases['red-base'];assert.notEqual(keep.invulnerable,true);const hp=keep.hp;keep.protectionTick=0;sim.hit(sim.hero,keep,100,'direct');assert.ok(keep.hp<hp);
});
