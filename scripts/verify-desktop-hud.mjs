// Desktop UX D2 (docs/DESKTOP_UX_D2.md): keyboard-mode HUD layout, shortcuts and input-mode switching in the browser, plus the touch HUD unchanged against the D1 baseline.
// Needs a dev server: DESKTOP_URL=http://127.0.0.1:5711/ node scripts/verify-desktop-hud.mjs (levels open through the dev-only ?debug=1&level=N; Allied Heroes through ?allyTest=1).
// Stills go to DESKTOP_EVIDENCE (default docs/screenshots/desktop-d2). SHOTS=0 skips the screenshot matrix and runs only the checks.
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.DESKTOP_URL||'http://127.0.0.1:5711/',dir=process.env.DESKTOP_EVIDENCE||'docs/screenshots/desktop-d2',shots=process.env.SHOTS!=='0';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;const results=[];
const check=(ok,name,detail)=>{if(!ok)failed++;results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
const DESKTOP={'1920x1080':[1920,1080],'1536x864':[1536,864],'1366x768':[1366,768],'1280x720':[1280,720],'embed-960x540':[960,540]};
async function open(w,h,query,{locale='en',touch=false}={}){
 const ctx=await browser.newContext({viewport:{width:w,height:h},...(touch?{hasTouch:true,isMobile:true}:{})}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(l=>localStorage.setItem('kingdom-clash.locale.v1',l),locale);
 await page.goto(`${base}?debug=1&${query}${process.env.DESKTOP_QUERY?`&${process.env.DESKTOP_QUERY}`:""}`); // DESKTOP_QUERY=res=1080 re-runs the checks in the D3-1 experiment
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:90000});
 await page.waitForTimeout(1200);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;window.H.perf?.setVisible(false);}); // the ?debug=1 FPS readout is not part of the HUD
 return {ctx,page,errors};
}
const frames=(page,n=4)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const key=async(page,code)=>{await page.keyboard.press(code);await frames(page);};
// Every visible HUD rectangle in page CSS px, tagged with the control that owns it (a button, its label and its badge share an owner).
const hudRects=page=>page.evaluate(()=>{
 const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,out=[];
 const add=(owner,part,r)=>{if(r&&r.width>0&&r.height>0)out.push({owner,part,x:+(c.x+r.x*k).toFixed(1),y:+(c.y+r.y*k).toFixed(1),w:+(r.width*k).toFixed(1),h:+(r.height*k).toFixed(1)});};
 const disc=b=>{const r=b.visibleRadius;return {x:b.x-r,y:b.y-r,width:2*r,height:2*r};};
 for(const a of H.abilities){add(a.id,'disc',disc(a));add(a.id,'label',a.nameLabel.getBounds());}
 for(const u of H.utilities){add(u.id,'disc',disc(u));add(u.id,'label',u.label.getBounds());}
 for(const [id,b] of H.keyBadges)if(b.visible)add(id==='skills'?'guardian':id,'badge',b.frame);
 if(H.controls.hint&&H.moveHint.plate.visible)add('hint','plate',H.controls.hint);
 if(H.joystickArt.visible){const j=H.controls.joystick;add('joystick','stick',{x:j.x-j.radius,y:j.y-j.radius,width:2*j.radius,height:2*j.radius});}
 add('guardian','plate',H.guardianLayout.guardian);add('match','plate',H.topPanels[0]);add('keep','plate',H.keepLayout);
 add('map','plate',{x:H.mapFrame.x-4,y:H.mapFrame.y-4,width:H.mapFrame.width+8,height:H.mapFrame.height+8});
 if(H.warlordHud?.bounds)add('warlord','bar',H.warlordHud.bounds);
 H.heroBar.bounds.forEach((r,i)=>add('hero-bar','slot'+i,r));
 if(H.heroBar.geometry&&H.heroState.mode==='menu')add('hero-bar','popover',H.heroBar.geometry.popover);
 if(H.toast.visible)add('toast','text',H.toast.getBounds());
 if(H.combatNotice.visible)add('notice','text',H.combatNotice.getBounds());
 return out;
});
const overlaps=rects=>{const hits=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(a.owner===b.owner)continue;
 if(a.x<b.x+b.w-1&&b.x<a.x+a.w-1&&a.y<b.y+b.h-1&&b.y<a.y+a.h-1)hits.push(`${a.owner}.${a.part} × ${b.owner}.${b.part}`);}return hits;};
const offscreen=(rects,w,h)=>rects.filter(r=>r.x<-1||r.y<-1||r.x+r.w>w+1||r.y+r.h>h+1).map(r=>`${r.owner}.${r.part}`);
const layoutState=page=>page.evaluate(()=>{const k=window.kingdomGame.canvas.getBoundingClientRect().height/540,css=v=>+(v*k).toFixed(1);
 return {tier:H.controls.tier,joystick:H.joystickArt.visible,hint:H.moveHint.plate.visible,badges:[...H.keyBadges.values()].filter(b=>b.visible).length,
  skills:Object.fromEntries(H.abilities.map(a=>[a.id,{x:css(a.x),y:css(a.y),d:css(a.visibleRadius*2),hit:css(a.hitRadius*2),font:css(parseFloat(a.nameLabel.style.fontSize))}])),
  utilities:Object.fromEntries(H.utilities.map(u=>[u.id,{x:css(u.x),y:css(u.y),d:css(u.visibleRadius*2),font:css(parseFloat(u.label.style.fontSize))}])),
  guardian:css(H.guardianLayout.guardian.width)+'x'+css(H.guardianLayout.guardian.height),match:css(H.guardianLayout.match.width)+'x'+css(H.guardianLayout.match.height),keep:css(H.keepLayout.width)+'x'+css(H.keepLayout.height),map:css(H.mapFrame.width)+'x'+css(H.mapFrame.height)};});
// Fixture: Taunt and Bash learned, Charge unlearned with points left, Protect locked (LV6); one real Taunt cast puts it on cooldown.
async function skillFixture(page){
 await page.evaluate(()=>{const p=S.state.heroProgression;S.progression.award('d2-fixture',80+105);for(const skill of ['taunt','bash'])S.send({type:'learn',requestId:'d2-learn-'+skill,skill});});
 await frames(page,6);
 // Past the cast's windup and lock, so the other buttons show their own states again rather than CAST.
 await key(page,'Digit3');await page.waitForFunction(()=>{const s=S.state.skills;return !s.cast&&S.clock.tick>=s.lockTick;},null,{timeout:10000});await frames(page,4);
}
async function layoutChecks(page,label,w,h){
 const rects=await hudRects(page),hits=overlaps(rects),off=offscreen(rects,w,h);
 check(!hits.length,`${label}: no HUD overlaps`,hits);check(!off.length,`${label}: every HUD element on screen`,off);
 return rects;
}

// 1. Keyboard-mode layout matrix: Build + Shop mission (level 3) with learned, unlearned, locked and cooling-down skills, at every desktop size in EN, TH and JA.
for(const locale of ['en','th','ja'])for(const [name,[w,h]] of Object.entries(DESKTOP)){
 const {ctx,page,errors}=await open(w,h,'level=3',{locale});const label=`${locale} ${name} L3`;
 await skillFixture(page);
 const s=await layoutState(page),cssH=Math.min(h,w*9/16),tier=cssH>=700?1.5:cssH>=500?1.25:1;
 check(s.tier===tier&&!s.joystick&&s.hint&&s.badges===7,`${label}: keyboard mode (tier ${tier}, no joystick, hint, 7 badges)`,s);
 const xs=['bash','charge','taunt','zone'].map(id=>s.skills[id]);
 check(xs.every((v,i)=>i===0||v.x>xs[i-1].x)&&xs.every(v=>Math.abs(v.y-xs[0].y)<.5),`${label}: skill bar runs Bash, Charge, Taunt, Protect left to right on one row`);
 check(Math.abs(s.skills.bash.d-43.2*tier)<.6&&Math.abs(s.utilities.build.d-34*tier)<.6,`${label}: skills and Build/Shop at ${tier*100}%`,{skill:s.skills.bash.d,build:s.utilities.build.d});
 check(s.skills.bash.font>=Math.ceil(12*Math.min(1.25,tier))-.5&&s.utilities.build.font>=12.5,`${label}: labels at 125%`,{skill:s.skills.bash.font,build:s.utilities.build.font});
 check(s.utilities.shop.y>s.utilities.build.y&&s.utilities.shop.y>cssH*.6,`${label}: Build/Shop low in the bottom-left corner`,s.utilities);
 const states=await page.evaluate(()=>Object.fromEntries(H.abilities.map(a=>[a.id,a.presentationState])));
 check(states.bash==='ready'&&states.charge==='Learn'&&states.zone==='LV6'&&states.taunt==='cooldown',`${label}: learned, unlearned, locked and cooldown states shown`,states);
 await layoutChecks(page,label,w,h);
 check(!errors.length,`${label}: no page errors`,errors);
 if(shots)await page.screenshot({path:`${dir}/${locale}-${name}-L3-skills.png`});
 await ctx.close();
}

// 2. Representative missions: Hero Bar with recruited heroes and two objectives (L44 + allyTest), the Warlord bar (L56), four objectives (L54).
const missions=[['L44-heroes','level=44&allyTest=1'],['L56-warlord','level=56'],['L54-objectives','level=54']];
for(const [tag,query] of missions)for(const [locale,name] of [['en','1920x1080'],['en','1366x768'],['en','1280x720'],['en','embed-960x540'],['th','embed-960x540'],['ja','embed-960x540'],['ja','1280x720']]){
 const [w,h]=DESKTOP[name],{ctx,page,errors}=await open(w,h,query,{locale});const label=`${locale} ${name} ${tag}`;
 await skillFixture(page);
 if(tag==='L44-heroes'){
  check((await page.evaluate(()=>H.heroBar.bounds.length))===3,`${label}: three Allied Heroes on the Hero Bar`);
  await page.evaluate(()=>{const id=H.heroBar.slots.find(s=>s.id)?.id;if(id)H.heroAction({type:'portrait',id});});await frames(page,6);
  check((await page.evaluate(()=>H.heroState.mode))==='menu',`${label}: hero command popover opens`);
 }
 // Test fixture only: the Warlord's bar appears once he can be hurt; drop his opening invulnerability so the bar is on screen for the layout check.
 if(tag==='L56-warlord'){await page.evaluate(()=>{S.state.units[S.setup.warlord.id].invulnerable=false;});await frames(page,6);}
 if(tag==='L56-warlord')check(await page.evaluate(()=>!!H.warlordHud?.bounds),`${label}: Warlord bar shown`);
 await layoutChecks(page,label,w,h);
 check(!errors.length,`${label}: no page errors`,errors);
 if(shots)await page.screenshot({path:`${dir}/${locale}-${name}-${tag}.png`});
 await ctx.close();
}

// 3. Keyboard behaviour at 1280x720 on L3: every key presses its control through that control's own checks.
{
 const {ctx,page,errors}=await open(1280,720,'level=3');const label='keys';
 await page.evaluate(()=>{window.casts=[];window.kingdomGame.events.on('cast',id=>window.casts.push(id));});
 const st=()=>page.evaluate(()=>({paused:H.paused,build:H.utilityPanel.visible,shop:H.shop.visible,skills:H.skillPanel.visible,notice:H.combatNotice.visible?H.combatNotice.text:'',casts:window.casts.slice(),
  ready:Object.fromEntries(H.abilities.map(a=>[a.id,a.presentationState]))}));
 await key(page,'Digit1');let s=await st();
 check(!s.casts.length&&s.notice==='Learn this skill first',`${label}: 1 on an unlearned Bash casts nothing and says so`,s);
 await key(page,'Digit4');s=await st();check(!s.casts.length,`${label}: 4 on a locked Protect casts nothing`,s);
 await key(page,'KeyK');s=await st();check(s.skills,`${label}: K opens Skills`,s);
 await page.evaluate(()=>{S.progression.award('d2-keys',80+105);S.send({type:'learn',requestId:'d2-k-taunt',skill:'taunt'});});await frames(page,6);
 await key(page,'Digit3');s=await st();check(!s.casts.length,`${label}: skills do not cast while the Skills panel is open`,s);
 await key(page,'KeyK');s=await st();check(!s.skills,`${label}: K closes Skills`,s);
 await key(page,'Digit3');await page.waitForFunction(()=>{const s=S.state.skills;return !s.cast&&S.clock.tick>=s.lockTick;},null,{timeout:10000});await frames(page,3);s=await st();check(s.casts.join()==='taunt'&&s.ready.taunt==='cooldown',`${label}: 3 casts Taunt through the tap path`,s);
 await page.waitForTimeout(2600);await key(page,'Digit3');s=await st();check(s.casts.length===1&&s.notice==='On cooldown',`${label}: 3 during the cooldown casts nothing and says so`,s);
 await page.evaluate(()=>{const b=H.abilities.find(a=>a.id==='taunt');b.casts=0;});
 await key(page,'KeyB');s=await st();check(s.build,`${label}: B opens Build`,s);
 await key(page,'KeyT');s=await st();check(s.shop&&!s.build,`${label}: T switches to the Shop`,s);
 await key(page,'Escape');s=await st();check(!s.shop&&!s.paused,`${label}: Esc closes the active panel first`,s);
 await key(page,'KeyB');await key(page,'Escape');s=await st();check(!s.build&&!s.paused,`${label}: Esc closes Build`,s);
 await key(page,'Escape');s=await st();check(s.paused,`${label}: Esc with nothing open pauses`,s);
 await key(page,'KeyB');await key(page,'KeyT');await key(page,'KeyK');await key(page,'Digit2');s=await st();check(!s.build&&!s.shop&&!s.skills&&s.casts.length===1,`${label}: shortcuts do nothing while paused`,s);
 await key(page,'Escape');s=await st();check(!s.paused,`${label}: Esc resumes`,s);
 await key(page,'Space');s=await st();check(s.paused,`${label}: Space still pauses`,s);await key(page,'Space');s=await st();check(!s.paused,`${label}: Space still resumes`,s);
 // A skill held with the mouse (aiming): number keys wait, Esc cancels the aim and nothing else.
 const bash=await page.evaluate(()=>{S.send({type:'learn',requestId:'d2-k-bash',skill:'bash'});const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,b=H.abilities.find(a=>a.id==='bash');return {x:c.x+b.x*k,y:c.y+b.y*k};});
 await frames(page,6);await page.mouse.move(bash.x,bash.y);await page.mouse.down();await frames(page);
 const held=await page.evaluate(()=>H.abilities.find(a=>a.id==='bash').holding);
 await key(page,'Digit1');s=await st();check(held&&s.casts.length===1,`${label}: number keys wait while a skill is held with the mouse`,{held,casts:s.casts});
 await key(page,'Escape');s=await st();check(!s.paused&&s.notice==='Cast cancelled'&&!(await page.evaluate(()=>H.abilities.some(a=>a.holding))),`${label}: Esc cancels the held skill and does not pause`,s);
 await page.mouse.up();
 // Movement: D moves the Guardian east, as before.
 const x0=await page.evaluate(()=>S.hero.x);await page.keyboard.down('KeyD');await page.waitForTimeout(600);await page.keyboard.up('KeyD');
 check((await page.evaluate(()=>S.hero.x))>x0+10,`${label}: D still moves the Guardian`);
 check(!errors.length,`${label}: no page errors`,errors);
 await ctx.close();
}
// L1: the Shop opens later in the campaign, so T does nothing and its badge is dimmed; the learn hint names K.
{
 const {ctx,page,errors}=await open(1280,720,'level=1');
 await key(page,'KeyT');const s=await page.evaluate(()=>({shop:H.shop.visible,dim:H.keyBadges.get('shop').label.alpha}));
 check(!s.shop&&s.dim<1,'L1: T leaves the closed Shop alone; its badge is dimmed',s);
 check(!errors.length,'L1: no page errors',errors);await ctx.close();
}

// 4. Input-mode switching on a desktop: a touch brings the joystick back, a movement key takes it away again.
{
 const {ctx,page,errors}=await open(1280,720,'level=3');
 const mode=()=>page.evaluate(()=>({joystick:H.joystickArt.visible,hint:H.moveHint.plate.visible,tier:H.controls.tier}));
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch'})));await frames(page);
 let m=await mode();check(m.joystick&&!m.hint&&m.tier===1,'switch: a touch shows the joystick and the touch layout',m);
 if(shots)await page.screenshot({path:`${dir}/en-1280x720-L3-after-touch.png`});
 await key(page,'KeyW');m=await mode();check(!m.joystick&&m.hint&&m.tier===1.5,'switch: a movement key returns to the keyboard layout',m);
 check(!errors.length,'switch: no page errors',errors);await ctx.close();
}
{
 const {ctx,page}=await open(1280,720,'level=3&input=touch');
 await key(page,'KeyW');const m=await page.evaluate(()=>H.joystickArt.visible);check(m,'?input=touch pins the touch HUD');await ctx.close();
}

// 5. Touch HUD unchanged: the S24-class 844x390 phone against the D1 baseline measurements (taken on main before D2), in EN, TH and JA.
{
 const baseline=JSON.parse(await readFile('docs/screenshots/desktop-d1/baseline/measure.json','utf8'));
 for(const locale of ['en','th','ja']){
  const {ctx,page,errors}=await open(844,390,'level=1',{locale,touch:true});const label=`${locale} mobile 844x390`;
  const now=await page.evaluate(()=>{const g=window.kingdomGame,s=g.canvas.getBoundingClientRect().height/540,css=v=>+(v*s).toFixed(1),b=o=>{const r=o.getBounds();return {x:css(r.x),y:css(r.y),w:css(r.width),h:css(r.height)};};
   return {abilities:H.abilities.map(a=>({id:a.id,diameter:css(a.visibleRadius*2),hit:css(a.hitRadius*2),label:b(a.nameLabel),labelFontCss:css(parseFloat(a.nameLabel.style.fontSize))})),
    utilities:H.utilities.map(u=>({id:u.id,diameter:css(u.visibleRadius*2),hit:css(u.hitRadius*2),label:b(u.label),labelFontCss:css(parseFloat(u.label.style.fontSize))})),
    guardian:{w:css(H.guardianLayout.guardian.width),h:css(H.guardianLayout.guardian.height)},match:{w:css(H.guardianLayout.match.width),h:css(H.guardianLayout.match.height)},
    keep:{w:css(H.keepLayout.width),h:css(H.keepLayout.height)},map:{w:css(H.mapFrame.width),h:css(H.mapFrame.height)},joystick:{d:css(H.controls.joystick.radius*2)},
    visible:{joystick:H.joystickArt.visible,hint:H.moveHint.plate.visible,badges:[...H.keyBadges.values()].some(k=>k.visible)}};});
  const was=baseline[`${locale}-mobile-844x390`],strip=v=>JSON.stringify({...v,canvas:undefined,visible:undefined});
  // Label widths depend on the label text only; Shop's text is the same in both runs (L1 has no Shop in either), so the whole record must match.
  check(strip(now)===strip({...was,abilities:was.abilities.map(({textRes,...a})=>a)}),`${label}: touch HUD geometry identical to the D1 baseline`,{now,was});
  check(now.visible.joystick&&!now.visible.hint&&!now.visible.badges,`${label}: joystick shown, no movement hint, no key badges`,now.visible);
  check(!errors.length,`${label}: no page errors`,errors);
  if(shots)await page.screenshot({path:`${dir}/${locale}-mobile-844x390-L1.png`});
  await ctx.close();
 }
}
await writeFile(`${dir}/report.json`,JSON.stringify({failed,results},null,1));
console.log(failed?`${failed} check(s) FAILED`:'All desktop HUD checks passed');
await browser.close();process.exit(failed?1:0);
