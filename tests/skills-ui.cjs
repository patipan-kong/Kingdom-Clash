const test=require('node:test'),assert=require('node:assert/strict');
const {SkillsModel,allocationState}=require('../.test-build/ui/skillsModel');
const {skillsLayout}=require('../.test-build/ui/skillsLayout');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {Simulation}=require('../.test-build/simulation/Simulation');
const fixture=()=>new Simulation('skills-ui','extended');
test('Skills gates reflect authoritative points, level and rank without cross-skill prerequisites',()=>{
 const s=fixture();assert.equal(allocationState(s,'bash').available,true);assert.equal(allocationState(s,'zone').gate,6);assert.equal(allocationState(s,'fortitude').gate,18);
 s.state.heroProgression.skillPoints=0;assert.equal(allocationState(s,'bash').state,'No points');s.state.heroProgression.ranks.bash=5;assert.equal(allocationState(s,'bash').state,'Max rank');
});
test('Skills pending and rapid taps submit once without optimistic rank or point mutation',()=>{
 const s=fixture(),m=new SkillsModel(),c=m.request(s,'bash',1000);assert.ok(c);assert.equal(s.state.heroProgression.skillPoints,1);assert.equal(m.request(s,'taunt',1001),undefined);s.send(c);s.advance(34);m.sync(s);assert.equal(s.state.heroProgression.ranks.bash,1);assert.equal(s.state.heroProgression.skillPoints,0);assert.equal(m.pending,undefined);assert.match(m.message,/rank 1 learned/);
 s.state.heroProgression.level=20;s.state.heroProgression.skillPoints=5;assert.equal(m.request(s,'bash',1100),undefined);assert.ok(m.request(s,'bash',1400));
});
test('Skills observes execution rejection and Pause cancellation without forged success',()=>{
 const s=fixture(),m=new SkillsModel(),c=m.request(s,'bash',0);s.send(c);s.state.heroProgression.skillPoints=0;s.advance(34);m.sync(s);assert.equal(s.state.heroProgression.ranks.bash,0);assert.match(m.message,/not applied/);
 s.state.heroProgression.skillPoints=1;s.state.heroProgression.level=20;s.send(m.request(s,'bash',1000));s.setPaused(true);m.sync(s);assert.equal(m.pending,undefined);assert.equal(s.state.heroProgression.skillPoints,1);
});
test('Skills close/reopen keeps queued allocations and unique IDs; dead Guardian may learn',()=>{
 const s=fixture(),m=new SkillsModel();s.hero.hp=0;s.hero.respawnTick=10000;const c=m.request(s,'bash',0);s.send(c);m.open();assert.ok(m.pending);s.advance(34);m.sync(s);assert.equal(s.state.heroProgression.ranks.bash,1);s.state.heroProgression.skillPoints=1;assert.notEqual(m.request(s,'taunt',1000).requestId,c.requestId);m.move(-1);assert.equal(m.selected,4);
});
test('Skills compact/grid geometry retains controls and 24px gesture space at FIT safe sizes',()=>{
 for(const [h,top] of [[390,110],[540,113],[720,148],[370,106],[515.25,110],[695.25,143.1875]]){const s=h/540,c=controlLayout(s),f=skillsLayout(s,top/s,c.panelAnchorX);assert.ok(f.x*s>=124-1e-8);assert.ok((f.x+f.width)*s<=c.panelAnchorX*s-30+1e-8);assert.ok((f.y+f.height)*s<=h-24+1e-8);assert.ok(f.width*s-16-104>=48);}
});
