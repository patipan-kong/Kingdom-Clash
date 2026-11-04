const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {AudioPreferencesStore,AUDIO_PREFERENCES_KEY}=require('../.test-build/audio/audioPreferences');
const {AudioManager}=require('../.test-build/audio/AudioManager');
const {BattleAudio}=require('../.test-build/audio/BattleAudio');
function storage(raw=null){let value=raw;return {getItem:()=>value,setItem:(k,v)=>{assert.equal(k,AUDIO_PREFERENCES_KEY);value=v;}};}
function fixture({missing=false,locked=false}={}){
 global.localStorage=storage();const sounds=[],sound=new EventEmitter();sound.locked=locked;
 sound.add=(key,config)=>{const s=new EventEmitter();Object.assign(s,{key,isPlaying:false,isPaused:false,volume:config.volume,dead:false,plays:0,setVolume(v){this.volume=v;},play(){this.isPlaying=true;this.isPaused=false;this.plays++;return true;},pause(){this.isPlaying=false;this.isPaused=true;},resume(){this.isPlaying=true;this.isPaused=false;},stop(){this.isPlaying=false;this.isPaused=false;},destroy(){this.dead=true;this.removeAllListeners();}});sounds.push(s);return s;};
 const scene={sound,cache:{audio:{exists:()=>!missing}}},manager=new AudioManager(scene);
 return {scene,sounds,manager,active:()=>sounds.filter(s=>!s.dead&&s.isPlaying)};
}
function state(){return {units:{guardian:{x:0,y:0},enemy:{x:40,y:0}},structures:{house:{team:'blue'},banner:{team:'blue',banner:true}},bases:{'blue-base':{x:-1000,y:0,hp:3000,maxHp:3000},'red-base':{x:2000,y:0,hp:3000,maxHp:3000}},match:{}};}
function adapter(){const calls=[],manager={setState:s=>calls.push(['state',s]),playSfx:(...args)=>calls.push(['sfx',...args])};return {calls,a:new BattleAudio(manager),s:state()};}
function advance(a,s,ms){for(let i=0;i<ms;i+=100)a.update(Math.min(100,ms-i),s);}
const hit=(id='enemy',sourceId='guardian',more={})=>({type:'damage',id,sourceId,amount:10,damageType:'physical',...more});
test('preferences persist, clamp, reject malformed/versioned data and survive unavailable storage',()=>{
 const mem=storage(),a=new AudioPreferencesStore(()=>mem);a.update({muted:true,music:2,sfx:-1});assert.deepEqual(new AudioPreferencesStore(()=>mem).current,{version:1,muted:true,music:1,sfx:0});
 for(const raw of ['bad','null','{"version":2,"music":1}','{"version":1,"music":"loud","sfx":null}'])assert.equal(new AudioPreferencesStore(()=>storage(raw)).current.music,.5);
 const failed=new AudioPreferencesStore(()=>{throw Error('denied');});assert.doesNotThrow(()=>failed.update({music:.2}));assert.equal(failed.current.music,.2);a.update({music:NaN});assert.equal(a.current.music,1);
});
test('missing assets remain silent through states, SFX, unlock and repeated cleanup',()=>{
 const f=fixture({missing:true});for(const s of ['battle','critical','victory']){f.manager.setState(s);f.manager.update(100);}assert.equal(f.manager.playSfx('sfx-build-complete',0),false);f.scene.sound.emit('unlocked');assert.equal(f.sounds.length,0);f.manager.dispose();f.manager.dispose();assert.equal(f.scene.sound.listenerCount('unlocked'),0);
});
test('unlock starts latest music and never queues transient effects',()=>{
 const f=fixture({locked:true});f.manager.setState('battle');assert.equal(f.manager.playSfx('sfx-build-complete',0),false);assert.equal(f.sounds.length,0);f.scene.sound.locked=false;f.scene.sound.emit('unlocked');assert.deepEqual(f.active().map(s=>s.key),['bgm-battle']);f.manager.dispose();
});
test('music switches without overlap, pauses, resumes, applies gains and restores mute',()=>{
 const f=fixture();assert.equal(f.active()[0].key,'bgm-exploration');f.manager.update(100);f.manager.setState('battle');for(let i=0;i<8;i++){f.manager.update(100);assert.ok(f.active().filter(s=>s.key.startsWith('bgm')).length<=1);}assert.equal(f.active()[0].key,'bgm-battle');
 f.manager.setPaused(true);assert.equal(f.active().length,0);f.manager.setPaused(false);assert.equal(f.active().length,1);f.manager.setPreferences({music:.2});assert.equal(f.active()[0].volume,.2);f.manager.setPreferences({muted:true});assert.equal(f.active().length,0);f.manager.setPreferences({muted:false});assert.equal(f.active().length,1);
 f.manager.setBackground(true);assert.equal(f.active().length,0);f.manager.setPaused(true);f.manager.setBackground(false);assert.equal(f.active().length,0);f.manager.setPaused(false);assert.equal(f.active().length,1);f.manager.dispose();assert.equal(f.active().length,0);
});
test('SFX cooldown, per-key limit, global limit, completion and gain changes',()=>{
 const f=fixture(),m=f.manager;assert.ok(m.playSfx('sfx-guardian-impact',0));assert.equal(m.playSfx('sfx-guardian-impact',50),false);assert.ok(m.playSfx('sfx-guardian-impact',200));assert.equal(m.playSfx('sfx-guardian-impact',400),false);
 assert.ok(m.playSfx('sfx-build-complete',0));assert.ok(m.playSfx('sfx-keep-warning',0));assert.equal(m.playSfx('sfx-banner-captured',0),false);m.setPreferences({sfx:.3});assert.equal(f.active().find(s=>s.key==='sfx-build-complete').volume,.3);
 f.active().find(s=>s.key==='sfx-build-complete').emit('complete');assert.ok(m.playSfx('sfx-banner-captured',500));m.dispose();assert.ok(f.sounds.every(s=>s.dead));
});
test('terminal overrides pause, plays once and prevents music resurrection',()=>{
 for(const outcome of ['victory','defeat']){const f=fixture();f.manager.setState(outcome);f.manager.setPaused(true);f.manager.setState('exploration');f.scene.sound.emit('unlocked');f.manager.setPaused(false);assert.deepEqual(f.active().map(s=>s.key),['sfx-'+outcome]);assert.equal(f.sounds.filter(s=>s.key==='sfx-'+outcome).length,1);f.manager.dispose();}
});
test('repeated manager lifetimes leave no sounds or unlock listeners',()=>{
 const f=fixture();f.manager.dispose();for(let i=0;i<25;i++){const m=new AudioManager(f.scene);m.playSfx('sfx-build-complete',0);m.setState('critical');m.dispose();assert.equal(f.active().length,0);assert.equal(f.scene.sound.listenerCount('unlocked'),0);}
});
test('battle needs two nearby hits, holds eight seconds, and obeys minimum dwell',()=>{
 const {a,s,calls}=adapter();a.observe(hit('enemy','enemy'),s);advance(a,s,300);assert.equal(a.state,'exploration');a.observe(hit(),s);advance(a,s,300);assert.equal(a.state,'exploration');a.observe(hit(),s);advance(a,s,300);assert.equal(a.state,'battle');advance(a,s,7000);assert.equal(a.state,'battle');advance(a,s,1500);assert.equal(a.state,'exploration');assert.deepEqual(calls.filter(c=>c[0]==='state').map(c=>c[1]),['battle','exploration']);
});
test('Crimson Keep vicinity can trigger battle without Guardian involvement',()=>{const {a,s}=adapter();s.units.enemy.x=1990;a.observe(hit('enemy','enemy'),s);a.observe(hit('enemy','enemy'),s);advance(a,s,300);assert.equal(a.state,'battle');});
test('critical needs positive keep damage or low HP, has hysteresis and priority',()=>{
 const {a,s}=adapter();a.observe(hit('blue-base','enemy',{amount:0}),s);advance(a,s,300);assert.equal(a.state,'exploration');a.observe(hit('blue-base','enemy'),s);advance(a,s,300);assert.equal(a.state,'exploration');a.observe(hit('blue-base','enemy'),s);advance(a,s,300);assert.equal(a.state,'critical');advance(a,s,9000);assert.equal(a.state,'critical');advance(a,s,1500);assert.equal(a.state,'exploration');s.bases['blue-base'].hp=900;advance(a,s,300);assert.equal(a.state,'critical');s.bases['blue-base'].hp=1100;advance(a,s,6500);assert.equal(a.state,'critical');s.bases['blue-base'].hp=1230;advance(a,s,300);assert.equal(a.state,'exploration');
});
test('SFX mapping excludes casts, zero damage, banner construction and terminal duplicates',()=>{
 const {a,s,calls}=adapter();a.observe(hit(),s);a.observe(hit('enemy','guardian',{castId:'skill'}),s);a.observe(hit('enemy','guardian',{damageType:'direct'}),s);a.observe(hit('enemy','guardian',{amount:0}),s);a.observe({type:'construction-complete',id:'banner'},s);a.observe({type:'construction-complete',id:'house'},s);a.observe({type:'post',change:'raising'},s);a.observe({type:'post',change:'captured'},s);a.observe({type:'match-end',outcome:'defeat'},s);a.observe({type:'match-end',outcome:'victory'},s);advance(a,s,10000);
 assert.deepEqual(calls.map(c=>c.slice(0,2)),[['sfx','sfx-guardian-impact'],['sfx','sfx-build-complete'],['sfx','sfx-banner-captured'],['state','defeat']]);assert.equal(a.state,'defeat');
});
