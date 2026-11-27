'use strict';
// Desktop UX D2: the keyboard-mode control layout (docs/DESKTOP_UX_D2.md). Touch keeps controlLayout; these check the desktop variant only.
const test=require('node:test'),assert=require('node:assert/strict');
const {controlLayout,desktopControlLayout,desktopTier,desktopLabelScale,keyBadgeCss}=require('../.test-build/ui/controlLayout');
const {heroBarLayout,HERO_SLOTS}=require('../.test-build/ui/heroBarLayout');
globalThis.document??={}; // inputMode reuses fullscreen's coarsePointer; that module names `document` when it loads
const {parseInputOverride,KEYBOARD_CODES}=require('../.test-build/ui/inputMode');
test('tiers follow the canvas CSS height: 150% from 700 px, 125% from 500 px, otherwise 100%',()=>{
 assert.equal(desktopTier(1080),1.5);assert.equal(desktopTier(720),1.5);assert.equal(desktopTier(700),1.5);assert.equal(desktopTier(699),1.25);
 assert.equal(desktopTier(540),1.25);assert.equal(desktopTier(500),1.25);assert.equal(desktopTier(499),1);
 assert.equal(desktopLabelScale(1.5),1.25);assert.equal(desktopLabelScale(1),1);
 assert.deepEqual([1,1.25,1.5].map(keyBadgeCss),[16,18,20]);
});
for(const h of [450,540,720,768,864,1080])test(`${h} px: skill bar, corner column, hint and Hero Bar clear of each other`,()=>{
 const s=h/540,k=desktopTier(h),c=desktopControlLayout(s,k),css=v=>v*s,touch=controlLayout(s);
 const bar=['bash','charge','taunt','zone'].map(id=>c.abilities.find(a=>a.id===id));
 assert.deepEqual(c.abilities.map(a=>a.id),['bash','taunt','charge','zone'],'same id order as the touch layout');
 for(let i=1;i<bar.length;i++){assert.ok(bar[i].x>bar[i-1].x,'left to right: Bash, Charge, Taunt, Protect');assert.equal(bar[i].y,bar[0].y,'one row');
  assert.ok(css(bar[i].x-bar[i].hitRadius)-css(bar[i-1].x+bar[i-1].hitRadius)>=14*k-1e-6,'targets apart by the gap');}
 assert.ok(Math.abs(css(bar[0].radius)*2-43.2*k)<1e-6&&Math.abs(css(bar[0].hitRadius)*2-48*k)<1e-6,'skills scaled by the tier');
 assert.ok(css(bar[3].x+bar[3].hitRadius)<=960*s-24+1e-6,'bar inside the right margin');
 const hint=c.hint,[build,shop]=c.utilities;
 assert.ok(hint&&css(hint.y+hint.height)<=540*s-18+1e-6&&css(hint.x)>=18-1e-6,'hint in the bottom-left corner');
 assert.ok(css(shop.y+shop.hitRadius)<=css(hint.y)-8,'Shop above the hint');assert.ok(css(build.y+build.hitRadius)<=css(shop.y-shop.hitRadius),'Build above Shop');
 assert.ok(Math.abs(css(build.radius)*2-34*k)<1e-6,'Build/Shop scaled by the tier');
 assert.deepEqual(c.cancel,touch.cancel,'aim-cancel target unchanged');assert.equal(c.panelAnchorX,touch.panelAnchorX,'panel anchor unchanged');
 const hero=heroBarLayout(c,s,HERO_SLOTS);
 assert.ok(hero.slots[0].x-hero.slots[0].hitRadius>=hint.x+hint.width,'Hero Bar starts past the hint');
 const last=hero.slots[HERO_SLOTS-1];assert.ok(last.x+last.hitRadius<bar[0].x-bar[0].hitRadius,'Hero Bar ends before the skill bar');
 assert.ok(hero.popover.x+hero.popover.width<=bar[0].x-bar[0].hitRadius+1e-6,'hero popover ends before the skill bar');
});
test('touch layout is untouched by the desktop variant',()=>{
 for(const h of [250,360,390,540]){const c=controlLayout(h/540);assert.equal(c.hint,undefined);assert.equal(c.tier,1);}
});
test('input mode override and keyboard codes',()=>{
 assert.equal(parseInputOverride('?input=touch'),'touch');assert.equal(parseInputOverride('?input=keyboard'),'keyboard');assert.equal(parseInputOverride('?input=x'),undefined);
 for(const code of ['KeyW','ArrowLeft','Digit1','Numpad4','KeyB','KeyT','KeyK'])assert.ok(KEYBOARD_CODES.has(code));
 assert.ok(!KEYBOARD_CODES.has('Space')&&!KEYBOARD_CODES.has('Escape'),'Pause keys do not decide the mode');
});
