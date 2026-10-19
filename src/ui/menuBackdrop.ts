import Phaser from 'phaser';
// Shared static backdrop for Main Menu, Campaign Select and Mission Briefing: the battlefield's own grass, river, bridge and Keeps,
// darkened so panels and text stay readable. Static images only; no Simulation and no new artwork.
const keys=['grass','water','bridge','base-blue','base-red','trees'];
export function preloadMenuBackdrop(scene:Phaser.Scene){
 for(const key of keys)if(!scene.textures.exists(key))scene.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.png`);
}
export function drawMenuBackdrop(scene:Phaser.Scene){
 const W=960,H=540,depth=-100;
 scene.cameras.main.setBackgroundColor('#0b1a22');
 const has=(k:string)=>scene.textures.exists(k);
 if(has('grass'))scene.add.tileSprite(W/2,H/2,W,H,'grass').setTileScale(.5).setDepth(depth).setName('menu-grass');
 if(has('water'))scene.add.tileSprite(W/2,H/2,W,120,'water').setTileScale(.5).setDepth(depth+1).setName('menu-water');
 const banks=scene.add.graphics().setDepth(depth+2);
 banks.fillStyle(0x24401f,.55).fillRect(0,H/2-64,W,6).fillRect(0,H/2+58,W,6);
 if(has('bridge'))scene.add.image(W/2,H/2,'bridge').setDisplaySize(190,73).setDepth(depth+3);
 if(has('trees')){scene.add.image(70,H-28,'trees').setOrigin(.5,1).setScale(.34).setDepth(depth+3);scene.add.image(W-60,H-24,'trees').setOrigin(.5,1).setScale(.3).setDepth(depth+3);}
 if(has('base-red'))scene.add.image(W-120,H/2-70,'base-red').setOrigin(.5,1).setScale(.3).setDepth(depth+3);
 if(has('base-blue'))scene.add.image(120,H/2+150,'base-blue').setOrigin(.5,1).setScale(.3).setDepth(depth+3);
 // Dark navy wash plus an edge vignette: the scene reads as the battlefield at dusk and keeps contrast above 7:1 for UI text.
 const shade=scene.add.graphics().setDepth(depth+4);
 shade.fillStyle(0x071622,.7).fillRect(0,0,W,H);
 for(let i=0;i<8;i++){const a=.07*(8-i)/8*2,t=i*14;shade.fillStyle(0x020810,a).fillRect(0,t,W,14).fillRect(0,H-t-14,W,14).fillRect(t,0,14,H).fillRect(W-t-14,0,14,H);}
}
