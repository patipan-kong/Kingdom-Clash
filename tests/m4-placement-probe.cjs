const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {structuresFor,combatStructures}=require('../.test-build/simulation/GameState.js');
// Chapter 4 M4 placement probe (docs/CHAPTER4_M4.md): every authored point of Fortress Approach is open ground and reachable by the side that needs it, and no gate seals a Crimson slot.
const L=campaign.get('campaign-34'),o=L.match.overrides;
const fresh=()=>new Simulation('m4-probe',campaign.setup(34));
const reachable=(sim,radius,structs,from)=>{const C=40,R=24,seen=new Set(),q=[[Math.floor(from[0]/48),Math.floor(from[1]/48)]];
 while(q.length){const [c,r]=q.pop(),k=r*C+c;if(c<0||r<0||c>=C||r>=R||seen.has(k)||sim.geo.blocked((c+.5)*48,(r+.5)*48,radius,structs))continue;seen.add(k);q.push([c+1,r],[c-1,r],[c,r+1],[c,r-1]);}
 return p=>seen.has(Math.floor(p[1]/48)*40+Math.floor(p[0]/48));};
const cell=(c,r)=>[(c+.5)*48,(r+.5)*48];
const SITES=o.cart.sites.map(s=>cell(s.col,s.row)),ELITE=o.captures.find(c=>c.elite).elite.slots;

test('P1 the level builds (every authored point is open ground, every validation passes) and is campaign-34 of Chapter 4',()=>{
 const sim=fresh();assert.deepEqual([L.id,L.number,L.chapter],['campaign-34',34,4]);
 assert.equal(sim.setup.captures.length,3);assert.equal(sim.setup.cart.sites.length,3);assert.ok(sim.state.guard&&sim.state.units['red-hero'].hp>0);
});
test('P2 Azure, with every gate solid, reaches all three wreck sites, both gate rings and the Elite Barracks ring, and nothing behind the gates',()=>{
 const sim=fresh(),can=reachable(sim,20,structuresFor(sim.state,'blue'),[sim.hero.x,sim.hero.y]);
 for(const s of SITES)assert.ok(can(s),`wreck site ${s} reachable`);
 assert.ok(can([984,600]),'the Forward Gatehouse ring (Azure side)');assert.ok(can([1104,1008]),'the Elite Barracks ring, through the south road');
 assert.ok(!can([1128,600]),'the corridor is behind the Forward Gatehouse');assert.ok(!can([1776,600]),'the courtyard is sealed');assert.ok(!can([1272,600]),'the Hero anchor is behind the gate');
});
test('P3 Crimson (gates it owns transparent) reaches the Azure Keep from the cart start, both wave slots and the Elite slots; the Hero anchor and spawn are reachable too',()=>{
 const sim=fresh(),can=reachable(sim,12,structuresFor(sim.state,'red'),[1776,600]),keep=[sim.field.objectives.red.x,sim.field.objectives.red.y];
 assert.ok(can(keep),'the cart route reaches the Azure Keep');for(const s of o.waves.redSlots)assert.ok(can(s),`wave slot ${s}`);
 for(const s of ELITE)assert.ok(can(s),`Elite slot ${s} reaches the Azure side (via the south road)`);
 assert.ok(can(o.guard.anchor)&&can(o.guard.spawn),'the Hero anchor and respawn point are inside the same network');
 for(const s of SITES)assert.ok(can(s),'the cart can die on any wreck site');
});
test('P4 towers stand on cell centres, gates are one by three cells in the necks, the Elite Barracks fills the pocket site, and nothing sits within 26 px of a spawn slot',()=>{
 const sim=fresh(),t=Object.values(sim.state.structures).filter(s=>s.kind==='tower');
 assert.equal(t.length,6);for(const s of t)assert.deepEqual([s.x%48,s.y%48],[24,24],`${s.id} on a cell centre`);
 const gate=id=>sim.state.structures[id];
 assert.deepEqual([gate('red-forward-gate').x,gate('red-forward-gate').columns,gate('red-forward-gate').rows,gate('red-main-gate').x],[1032,1,3,1368]);
 assert.ok(gate('red-forward-gate').gate&&gate('red-main-gate').gate,'both are faction gates');assert.deepEqual([sim.state.structures['red-barracks-elite'].columns,sim.state.structures['red-barracks-elite'].rows],[2,2]);
 const slots=[...o.waves.redSlots,...ELITE,o.cart.start];for(const s of slots)for(const st of Object.values(sim.state.structures))assert.ok(Math.hypot(st.x-s[0],st.y-s[1])>=26+24,`slot ${s} clear of ${st.id}`);
 for(const s of ELITE)assert.ok(!o.waves.redSlots.some(w=>w[0]===s[0]&&w[1]===s[1]),'Elite slots are not wave slots');
});
test('P5 the three wreck sites are three distinct open cells outside every structure footprint, on the Azure side',()=>{
 const sim=fresh();assert.equal(new Set(o.cart.sites.map(s=>`${s.col},${s.row}`)).size,3);
 for(const [x,y] of SITES){assert.ok(x<1008,'west of the gates');assert.ok(!sim.geo.blocked(x,y,12,combatStructures(sim.state)));}
});
test('P6 the opening Azure units and the Guardian stand on the Azure side (none inside a gate footprint)',()=>{
 const sim=fresh();for(const u of Object.values(sim.state.units).filter(u=>u.team==='blue'))assert.ok(u.x<1000,`${u.id} at ${u.x}`);
});
test('P7 the lower route is walkable in real movement: joystick steering from the start reaches the Elite Barracks ring and the Guardian can hit it',()=>{
 const sim=fresh(),h=sim.hero,DT=1000/30+.01;h.hp=h.maxHp=1e7;
 const adv=n=>{for(let i=0;i<n;i++){sim.advance(DT);sim.drainEvents();}};
 let wi=0;const wps=[[984,640],[984,936],[1128,936],[1128,1008]];
 for(let t=0;t<1800&&wi<wps.length;t++){const [wx,wy]=wps[wi],dx=wx-h.x,dy=wy-h.y,d=Math.hypot(dx,dy);if(d<14){wi++;continue;}sim.send({type:'move',x:dx/d,y:dy/d});adv(1);}
 sim.send({type:'move',x:0,y:0});assert.equal(wi,wps.length,`the Guardian walks the whole lower route (stopped at ${h.x|0},${h.y|0})`);
 const eb=sim.state.structures['red-barracks-elite'],hp=eb.hp;sim.send({type:'target',id:'red-barracks-elite'});sim.send({type:'attack',active:true});
 for(let t=0;t<600;t++){const d=Math.hypot(eb.x-h.x,eb.y-h.y);if(d>110)sim.send({type:'move',x:(eb.x-h.x)/d,y:(eb.y-h.y)/d});else sim.send({type:'move',x:0,y:0});adv(1);}
 assert.ok(eb.hp<hp,'the Guardian damages the Elite Barracks from the lower route');
});
