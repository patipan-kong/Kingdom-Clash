import type Phaser from 'phaser';
export const audioKeys=['bgm-exploration','bgm-battle','bgm-critical','sfx-guardian-impact','sfx-keep-warning','sfx-build-complete','sfx-banner-captured','sfx-victory','sfx-defeat'] as const;
export type AudioKey=typeof audioKeys[number];
// Vite discovers only shipped, approved MP3s. An empty directory is valid.
const shipped=import.meta.glob('/public/assets/audio/*.mp3',{eager:true,query:'?url',import:'default'});
export function preloadAudio(scene:Phaser.Scene){
 for(const key of audioKeys)if(`/public/assets/audio/${key}.mp3` in shipped&&!scene.cache.audio.exists(key))scene.load.audio(key,`${import.meta.env.BASE_URL}assets/audio/${key}.mp3`);
}
