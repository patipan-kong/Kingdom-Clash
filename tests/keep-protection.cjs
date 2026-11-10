const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
// Chapter 1 missions 01-05 never use the Crimson Keep as an objective, so it is protected; offensive missions keep a destroyable Keep.
const DT=1000/30+.01,PROTECTED=['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05'];
const make=id=>new Simulation(id,campaign.setup(id,1));
// Runs act(tick) inside the simulation step (before commands), so deaths and kills are observed exactly as in play.
function hooked(sim,act){const r=sim.rewards,expire=r.expire.bind(r);r.expire=t=>{expire(t);act(t);};}
const strike=(sim,t)=>{t.protectionTick=0;sim.hit(sim.state.bases['blue-base'],t,t.hp+1e6,'direct');};
const killRaiders=sim=>{for(const u of Object.values(sim.state.units))if(u.team==='red')strike(sim,u);};
const run=(sim,ticks)=>{for(let i=0;i<ticks&&!sim.ended;i++){sim.advance(DT);sim.drainEvents();}};
const towers=(sim,n)=>{const c=[];for(let col=4;col<15&&c.length<n;col+=2)for(let row=8;row<17&&c.length<n;row+=2)if(sim.placementReason('tower',col,row)==='')c.push([col,row]);assert.equal(c.length,n);c.forEach(([col,row],i)=>assert.equal(sim.send({type:'place',requestId:'t'+i,kind:'tower',col,row}),true));};
const verdict=sim=>sim.outcome&&[sim.outcome.outcome,sim.outcome.reason];

for(const id of PROTECTED)test(id+': the Crimson Keep cannot be targeted or damaged',()=>{
 const sim=make(id),keep=sim.state.bases['red-base'];assert.equal(keep.invulnerable,true);assert.equal(keep.hp,3000);
 assert.notEqual(sim.send({type:'ally',order:{type:'attack',targetId:'red-base'}}),true);
 keep.protectionTick=0;sim.hit(sim.hero,keep,1e6,'direct');assert.equal(keep.hp,3000);
 run(sim,900);assert.equal(keep.hp,3000);
});
test('allied minions never attack the protected Keep',()=>{
 for(const id of PROTECTED){const sim=make(id),keep=sim.state.bases['red-base'];hooked(sim,()=>killRaiders(sim));let hits=0;
  for(let i=0;i<30*60*3;i++){sim.advance(DT);for(const e of sim.drainEvents())if(e.targetId==='red-base'&&(e.type==='attack'||e.type==='damage'))hits++;}
  assert.equal(hits,0,id);assert.equal(keep.hp,3000,id);}
});
test('C1M1 completes after five defeated waves, Keep intact',()=>{
 const sim=make('campaign-01');hooked(sim,()=>killRaiders(sim));run(sim,30*60*5);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);assert.equal(sim.state.bases['red-base'].hp,3000);
});
test('C1M2 completes through two Archer Towers and six defeated waves, Keep intact',()=>{
 const sim=make('campaign-02');towers(sim,2);hooked(sim,()=>killRaiders(sim));
 run(sim,30*60*6);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress]),[['towers',2],['waves',6]]);
 assert.deepEqual(verdict(sim),['victory','objectives-complete']);assert.equal(sim.state.bases['red-base'].hp,3000);
});
test('C1M2 does not end without the towers, even with every wave beaten',()=>{
 const sim=make('campaign-02');hooked(sim,()=>killRaiders(sim));run(sim,30*60*5);
 assert.equal(sim.outcome,null);assert.equal(sim.missionStatus().objectives.find(o=>o.id==='waves').progress,6);
});
for(const id of ['campaign-03','campaign-04','campaign-05'])test(id+' still completes through its tower objective, Keep intact',()=>{
 const sim=make(id),obj=sim.missionStatus().objectives.find(o=>o.type==='destroy');assert.ok(obj);
 let done=false;hooked(sim,t=>{if(t<5||done)return;done=true;for(const tid of obj.definition.targets){const x=sim.state.structures[tid];if(x)strike(sim,x);}});
 run(sim,200);assert.deepEqual(verdict(sim),['victory','objectives-complete']);assert.equal(sim.state.bases['red-base'].hp,3000);
});
test('the Keep is drawn as scenery in missions 01 and 02 only; 03-05 and the offensive missions keep the Keep sprite',()=>{
 for(const id of PROTECTED)assert.equal(campaign.setup(id).crimsonKeepScenery,id==='campaign-01'||id==='campaign-02'?true:undefined,id);
 for(const id of ['campaign-06','campaign-11','campaign-14','campaign-21'])assert.equal('crimsonKeepScenery' in campaign.setup(id),false,id);
});
test('the scenery flag is presentation only: the Keep entity, its footprint and the mission are identical with and without it',()=>{
 const {matchSetup}=require('../.test-build/data/matchSetup.js');
 const base={defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true},a=new Simulation('m',matchSetup('extended',base)),b=new Simulation('m',matchSetup('extended',{...base,crimsonKeepScenery:true}));
 assert.deepEqual(b.state.bases['red-base'],a.state.bases['red-base']);
 for(let i=0;i<600;i++){a.advance(DT);b.advance(DT);a.drainEvents();b.drainEvents();}
 assert.deepEqual(b.state.units,a.state.units);assert.deepEqual(b.state.bases,a.state.bases);
 assert.throws(()=>matchSetup('extended',{...base,crimsonKeepInvulnerable:false,crimsonKeepScenery:true}),/Keep scenery/);
});
for(const id of ['campaign-06','campaign-14','campaign-21'])test(id+': the offensive Keep stays destroyable',()=>{
 const sim=make(id),keep=sim.state.bases['red-base'];assert.notEqual(keep.invulnerable,true);const hp=keep.hp;keep.protectionTick=0;sim.hit(sim.hero,keep,100,'direct');assert.ok(keep.hp<hp);
});
