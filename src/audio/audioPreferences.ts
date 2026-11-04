export interface AudioPreferences {version:1;muted:boolean;music:number;sfx:number}
export const AUDIO_PREFERENCES_KEY='kingdom-clash.audio.v1';
export const defaultAudioPreferences:AudioPreferences={version:1,muted:false,music:0.5,sfx:0.7};
export function audioVolume(value:unknown,fallback:number){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;}
export class AudioPreferencesStore {
 private value:AudioPreferences={...defaultAudioPreferences};
 constructor(private storage:()=>Pick<Storage,'getItem'|'setItem'>|null=()=>globalThis.localStorage){
  try{const raw=this.storage()?.getItem(AUDIO_PREFERENCES_KEY);const p=raw?JSON.parse(raw):null;
   if(p?.version===1)this.value={version:1,muted:typeof p.muted==='boolean'?p.muted:false,music:audioVolume(p.music,0.5),sfx:audioVolume(p.sfx,0.7)};
  }catch{/* Private browsing or invalid data: keep usable defaults. */}
 }
 get current():AudioPreferences{return {...this.value};}
 update(p:Partial<Omit<AudioPreferences,'version'>>){
  this.value={version:1,muted:typeof p.muted==='boolean'?p.muted:this.value.muted,music:audioVolume(p.music,this.value.music),sfx:audioVolume(p.sfx,this.value.sfx)};
  try{this.storage()?.setItem(AUDIO_PREFERENCES_KEY,JSON.stringify(this.value));}catch{/* Session preferences still work. */}
  return this.current;
 }
}
