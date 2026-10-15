import Phaser from 'phaser';
import {shopItems} from './shopItems';
type Icon=typeof shopItems[number]['icon'];
export function preloadShopItemIcons(scene:Phaser.Scene){for(const item of shopItems)if(!scene.textures.exists(item.texture))scene.load.image(item.texture,`${import.meta.env.BASE_URL}assets/${item.file}`);}
export function hasFinalShopArt(scene:Phaser.Scene){return shopItems.every(item=>scene.textures.exists(item.texture));}
/** Fixed 46-unit wrapper keeps existing CSS layout independent of source dimensions. */
export function createShopItemIcon(scene:Phaser.Scene,item:typeof shopItems[number]){
 const container=scene.add.container(0,0).setSize(46,46),ready=scene.textures.exists(item.texture);
 if(ready){const image=scene.add.image(0,0,item.texture).setOrigin(0),s=46/Math.max(image.width,image.height);image.setScale(s).setPosition((46-image.displayWidth)/2,(46-image.displayHeight)/2);container.add(image);}
 else container.add(createPlaceholder(scene,item.icon));
 return container.setData('finalArt',ready).setData('itemId',item.id);
}
/** Explicitly temporary emergency fallback; never presented as painted final artwork. */
function createPlaceholder(scene:Phaser.Scene,icon:Icon){
 const g=scene.add.graphics();
 const poly=(points:number[],color:number)=>g.fillStyle(color).fillPoints(points.reduce<Phaser.Geom.Point[]>((a,n,i)=>{if(i%2===0)a.push(new Phaser.Geom.Point(n,points[i+1]));return a;},[]),true);
 if(icon==='sword'||icon==='flame'){
  if(icon==='flame')poly([8,38,3,27,12,30,10,17,21,23,28,4,33,14,39,11,36,30,25,42],0xe88d38);
  poly([31,3,37,9,18,30,12,24],0xcbdce3);poly([11,20,23,32,19,36,7,24],0xdcbf7a);poly([11,29,16,34,6,44,1,39],0x397eae);
 }else if(icon==='shield'){
  poly([4,8,21,2,38,8,34,29,21,44,8,29],0xdcbf7a);poly([8,11,21,6,34,11,30,28,21,38,12,28],0x3577ac);
  g.lineStyle(3,0xc8dfeb).lineBetween(21,10,21,33).lineBetween(12,20,30,20);
 }else if(icon==='ruby'){
  poly([10,6,32,6,41,19,21,43,1,19],0xce4e65);g.lineStyle(2,0xffb0a5).strokePoints([{x:10,y:6},{x:15,y:19},{x:21,y:43},{x:27,y:19},{x:32,y:6}],false).lineBetween(2,19,40,19);
 }else if(icon==='crown'){
  poly([3,13,13,24,21,5,29,24,39,13,34,39,8,39],0xdcbf7a);g.fillStyle(0x397eae).fillRect(10,31,22,6).fillStyle(0xa0d8ff).fillCircle(21,29,3);
 }else if(icon==='hammer'){
  poly([24,17,30,23,12,44,6,38],0xb99a5a);poly([7,8,17,1,40,20,30,30],0xcbdce3);g.lineStyle(4,0x55788f).lineBetween(15,7,34,24);
 }else{
  g.lineStyle(4,0xdcbf7a).lineBetween(8,3,8,44);poly([10,7,39,7,32,19,39,30,10,30],0x397eae);poly([21,10,28,18,21,26,15,18],0xdcbf7a);
 }
 return g;
}
