import type Phaser from 'phaser';
import type {AudioKey} from './audioAssets';
import {AudioPreferencesStore,type AudioPreferences} from './audioPreferences';
export type MusicState='exploration'|'battle'|'critical'|'victory'|'defeat';
type Sound=Phaser.Sound.WebAudioSound|Phaser.Sound.HTML5AudioSound|Phaser.Sound.NoAudioSound;
const terminal=(s:MusicState)=>s==='victory'||s==='defeat';
export class AudioManager {
 readonly preferences=new AudioPreferencesStore();
 private music?:Sound;private musicKey?:AudioKey;private desired:MusicState='exploration';
 private effects=new Set<Sound>();private last=new Map<AudioKey,number>();
 private paused=false;private hidden=false;private disposed=false;private ended=false;
 private terminalPlayed=false;private fade=1;private fading=false;
 constructor(private scene:Phaser.Scene){scene.sound.on('unlocked',this.unlocked);this.sync();}
 get state(){return this.desired;}
 get settings(){return this.preferences.current;}
 setPreferences(p:Partial<Omit<AudioPreferences,'version'>>){this.preferences.update(p);this.applyVolumes();this.sync();}
 private unlocked=()=>this.sync();
 private available(key:AudioKey){return this.scene.cache.audio.exists(key)&&!this.scene.sound.locked&&!this.disposed;}
 private create(key:AudioKey,loop=false):Sound|undefined{
  if(!this.available(key))return;
  try{return this.scene.sound.add(key,{loop,volume:0}) as Sound;}catch{return;}
 }
 private applyVolumes(){const p=this.settings;this.music?.setVolume(p.muted?0:p.music*this.fade);for(const s of this.effects)s.setVolume(p.muted?0:p.sfx);}
 setState(state:MusicState){
  if(this.disposed||this.ended)return;
  if(terminal(state)){this.ended=true;this.desired=state;this.stopMusic();this.stopEffects();this.sync();return;}
  this.desired=state;this.sync();
 }
 setPaused(value:boolean){this.paused=value;if(value&&!this.ended)this.stopEffects();this.sync();}
 setBackground(value:boolean){this.hidden=value;if(value)this.stopEffects();this.sync();}
 private sync(){
  if(this.disposed)return;
  if(this.ended){if(!this.hidden&&!this.scene.sound.locked&&!this.terminalPlayed){this.terminalPlayed=true;this.playSfx(`sfx-${this.desired}` as AudioKey,performance.now(),0,true);}return;}
  const p=this.settings;
  if(this.paused||this.hidden||p.muted||p.music===0){if(this.music?.isPlaying)this.music.pause();return;}
  const key=`bgm-${this.desired}` as AudioKey;
  if(this.musicKey!==key){
   if(this.music){this.fading=true;return;}
   this.music=this.create(key,true);this.musicKey=this.music?key:undefined;this.fade=0;
   if(this.music){this.applyVolumes();try{if(!this.music.play())this.stopMusic();}catch{this.stopMusic();}}
  }else {this.fading=false;if(this.music?.isPaused){try{this.music.resume();}catch{this.stopMusic();}}}
 }
 update(delta:number){
  if(this.disposed||this.paused||this.hidden||this.ended)return;
  const step=Math.min(delta,100)/250;
  this.fade=this.fading?Math.max(0,this.fade-step):Math.min(1,this.fade+step);
  if(this.fading&&this.fade===0){this.stopMusic();this.sync();}
  this.applyVolumes();
 }
 playSfx(key:AudioKey,now:number,cooldown=150,isTerminal=false){
  if(this.disposed||this.hidden||(!isTerminal&&(this.paused||this.ended))||this.settings.muted||this.settings.sfx===0||this.scene.sound.locked)return false;
  if(now-(this.last.get(key)??-Infinity)<cooldown||this.effects.size>=4||[...this.effects].filter(s=>s.key===key).length>=2)return false;
  const sound=this.create(key);if(!sound)return false;
  this.last.set(key,now);this.effects.add(sound);sound.once('complete',()=>{this.effects.delete(sound);sound.destroy();});this.applyVolumes();
  try{if(!sound.play()){this.effects.delete(sound);sound.destroy();return false;}}catch{this.effects.delete(sound);sound.destroy();return false;}return true;
 }
 private stopEffects(){for(const s of this.effects){s.stop();s.destroy();}this.effects.clear();}
 private stopMusic(){this.music?.stop();this.music?.destroy();this.music=undefined;this.musicKey=undefined;this.fade=1;this.fading=false;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.sound.off('unlocked',this.unlocked);this.stopMusic();this.stopEffects();this.last.clear();}
}
