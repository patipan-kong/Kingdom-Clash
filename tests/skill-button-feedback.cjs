const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
// Skill button feedback (browser behavior: scripts/verify-skill-vfx.mjs). Source guards for the trigger rules.
const btn=readFileSync('src/ui/AbilityButton.ts','utf8').replace(/\r\n/g,'\n'),hud=readFileSync('src/scenes/HUD.ts','utf8').replace(/\r\n/g,'\n');
test('the activation flash fires only from an accepted cast, never from a press or a rejection',()=>{
 const l=hud.split('\n').find(x=>x.includes("e.type==='cast-accepted'")&&x.includes('.flash()'));assert.ok(l);assert.match(l,/abilities\.find\(a=>a\.id===e\.skill\)\?\.flash\(\)/);
 assert.doesNotMatch(btn.match(/pointerdown[^\n]*/)[0],/flash\(|readyPulse\(/);assert.doesNotMatch(hud,/'rejected'[^\n]*\.flash\(/);
});
test('the ready pulse fires once, on the change from a positive cooldown to zero',()=>{
 assert.match(btn,/public observe\(remaining:number\)\{const was=this\.remaining;this\.remaining=remaining;if\(was>0&&remaining<=0\)this\.readyPulse\(\);/);
});
test('the flash and the ready ring reuse one object each and restart cleanly',()=>{
 assert.match(btn,/killTweensOf\(\[this\.art,this\.glow\]\)/);assert.match(btn,/killTweensOf\(this\.ping\)/);assert.match(btn,/this\.baseScale=radius\/this\.radius/);
});
