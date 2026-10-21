const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const path=require('node:path');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
// Chapter 2 S2b (D5): only the dev server may open a quick match on Canyon Pass, with ?battlefield=canyon-pass. Production is always Meadow.

const SEARCHES=['?battlefield=canyon-pass','?encounter=extended&battlefield=canyon-pass','battlefield=canyon-pass','?battlefield=Canyon-Pass','?battlefield=CANYON-PASS',
 '?battlefield=','?battlefield','?battlefield=canyon-pass&battlefield=canyon-pass','?battlefield=canyon-pass&battlefield=meadow','?battlefield=nowhere','?battlefield=meadow',
 '?battlefield=toString','?battlefield=__proto__','?battlefield=%20canyon-pass','?battlefield=canyon-pass%20','?battlefield=canyon_pass','','?'];

test('production ignores the battlefield query entirely',()=>{
 for(const search of SEARCHES)assert.equal(battlefieldFromSearch(search,false),'meadow',search);
});

test('the dev server accepts exactly one registered battlefield id, and nothing else',()=>{
 const canyon=new Set(['?battlefield=canyon-pass','?encounter=extended&battlefield=canyon-pass','battlefield=canyon-pass']);
 for(const search of SEARCHES)assert.equal(battlefieldFromSearch(search,true),canyon.has(search)?'canyon-pass':'meadow',search);
});

test('the override is wired to the dev flag and to quick play only',()=>{
 const src=f=>readFileSync(path.join(__dirname,'..','src',f),'utf8');
 const battle=src('scenes/Battle.ts'),menu=src('scenes/MainMenu.ts');
 // One call site, gated by import.meta.env.DEV; Meadow keeps passing the bare encounter id; only the quick branch reads it.
 const all=['scenes','ui','data','world','simulation'].flatMap(d=>readdirSync(path.join(__dirname,'..','src',d)).filter(f=>f.endsWith('.ts')).map(f=>`${d}/${f}`));
 assert.deepEqual(all.filter(f=>src(f).includes('battlefieldFromSearch(')),['scenes/Battle.ts','world/battlefieldLaunch.ts']);
 assert.equal(battle.split('battlefieldFromSearch(').length-1,1);
 assert.ok(battle.includes('battlefieldFromSearch(location.search,import.meta.env.DEV)'));
 assert.ok(battle.includes("return field==='meadow'?encounter:matchSetup(encounter,{battlefield:field});"));
 assert.equal(battle.split('const quickSetup=').length-1,1,'defined once');assert.equal(battle.split('quickSetup(').length-1,1,'called once');
 assert.ok(battle.includes("this.launch.mode==='quick'?quickSetup(this.launch.encounter??encounterFromUrl())"));
 assert.ok(menu.includes("import.meta.env.DEV&&(q.get('campaignFixture')==='staged'||q.has('battlefield'))"));
});
