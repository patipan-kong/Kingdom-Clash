const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
// Guardian skill VFX are render-only and are driven by the simulation's own events (browser behavior: scripts/verify-skill-vfx.mjs).
const battle=readFileSync('src/scenes/Battle.ts','utf8').replace(/\r\n/g,'\n');
const line=(re)=>battle.split('\n').find(l=>re.test(l))||'';
test('the Charge impact burst follows the simulation damage event of that very cast, never the end of the dash',()=>{
 const l=line(/this\.impactBurst\(t\.x,t\.y,0x9fe6ff,/);assert.match(l,/event\.type==='damage'/);assert.match(l,/event\.sourceId==='guardian'/);assert.match(l,/event\.castId===this\.chargeCast/);
 assert.match(line(/event\.type==='cast-effect'/),/else if\(event\.skill!=='charge'\)this\.effect\(/,'a Charge ending without contact draws no burst');
});
test('Bash sparks come from the resolved cast-effect hit list, at the primary target only',()=>{
 assert.match(battle,/private bashImpact\([\s\S]*?const prim=primaryId\?[\s\S]*?this\.impactBurst\(prim\.x,prim\.y,/);
 assert.match(line(/event\.type==='cast-effect'/),/event\.skill==='bash'&&event\.axis&&event\.hits\?\.length\)this\.bashImpact/);
});
test('shield bubbles are reused per unit, follow it, and exist only while a shield with HP remaining is held',()=>{
 const m=battle.match(/private drawShields\(\)\{[\s\S]*?\n \}/)[0];
 assert.match(m,/u\.shield&&u\.shield\.remaining>0/);assert.match(m,/this\.bubbles\.get\(u\.id\)/);assert.match(m,/setVisible\(false\)/);assert.match(m,/setPosition\(p\.x,p\.y-/);assert.match(m,/this\.bubbles\.delete\(id\)/);
});
test('the zone indicator pulses and fades only in the last second of its real lifetime',()=>{assert.match(battle,/left=z\.expiresTick\*1000\/HZ-this\.simMs\(\),fade=left<1000\?/);});
test('Charge trail is capped per dash and every temporary effect destroys itself',()=>{
 assert.match(battle,/if\(!dashing\)\{this\.trailLeft=TRAIL_MAX;/);
 for(const name of ['impactBurst','dashTrail']){const m=battle.match(new RegExp(`private ${name}\\([\\s\\S]*?\\n \\}`))[0];assert.match(m,/onComplete:\(\)=>[a-z]+\.destroy\(\)/,name);}
});
test('the VFX never feed the simulation: no send(), no state writes in the new methods',()=>{
 for(const name of ['impactBurst','dashTrail','drawShields']){const m=battle.match(new RegExp(`private ${name}\\([\\s\\S]*?\\n \\}`))[0];assert.doesNotMatch(m,/simulation\.send|\.state\.[a-zA-Z.]+\s*=[^=]/,name);}
});
