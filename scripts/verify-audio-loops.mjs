import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const root=process.env.AUDIO_EVIDENCE_ROOT||'docs/audio-foundation/assets/loops',url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5217/?encounter=prototype';
await mkdir(root,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling']});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:780,height:360},hasTouch:true});await page.goto(url);await page.waitForFunction(()=>window.visualReady);await page.touchscreen.tap(95,340);
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.kingdomGame.scene.getScene('HUD').setPause(false);b.simulation.setPaused(true);b.audio.setPreferences({muted:false,music:.2,sfx:.3});});
 for(const state of ['exploration','battle','critical']){
  await page.evaluate(state=>window.kingdomGame.scene.getScene('Battle').audio.setState(state),state);await page.waitForFunction(state=>{const a=window.kingdomGame.scene.getScene('Battle').audio;return a.music?.key==='bgm-'+state&&a.music.isPlaying&&a.fade>=.999;},state);
  const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').audio.music,expectedBoundary=s.loopTime,started=g.sound.context.currentTime;let maxBgm=0;const sample=()=>{maxBgm=Math.max(maxBgm,g.sound.sounds.filter(x=>x.isPlaying&&x.key.startsWith('bgm-')).length);};g.events.on('poststep',sample);const timer=setTimeout(()=>{g.events.off('poststep',sample);reject(Error('No loop event'));},(s.duration+10)*1000);s.once('looped',()=>{clearTimeout(timer);g.events.off('poststep',sample);resolve({key:s.key,duration:s.duration,waitedSeconds:g.sound.context.currentTime-started,expectedBoundary,actualScheduledStart:s.startTime,schedulingGapSeconds:s.startTime-expectedBoundary,eventObservedAfterBoundarySeconds:g.sound.context.currentTime-s.startTime,isPlaying:s.isPlaying,loopEnabled:s.loop,maxBgm,volume:s.volume});});}));
  assert.ok(result.isPlaying&&result.loopEnabled&&result.maxBgm<=1&&Math.abs(result.schedulingGapSeconds)<1/48000);results.push(result);console.log('PASS full natural loop '+result.key+' ('+result.duration.toFixed(3)+'s), scheduling gap '+result.schedulingGapSeconds+'s');
 }
 await writeFile(root+'/loop-results.json',JSON.stringify({results,scope:'Actual supplied MP3 buffers played through a full natural Phaser loop at normal speed. Simulation frozen only for loop isolation; no files trimmed, extended, crossfaded or remixed. Zero scheduling gap does not remove silence already encoded in each asset or establish subjective loop quality.'},null,2));
}finally{await browser.close();}
