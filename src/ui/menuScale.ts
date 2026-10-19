import Phaser from 'phaser';
// Responsive sizing for the Campaign menu scenes. The canvas is a fixed 960x540 scaled to fit (Phaser FIT), so on a phone in landscape
// one game pixel is only ~0.72 CSS pixels. font() lifts a size so it renders at least `css` CSS pixels there; desktop sizes are unchanged.
// Only the menu scenes use this: the Battle HUD has its own scaling and is untouched.
export function menuScale(scene:Phaser.Scene){
 const k=Math.max(.1,scene.game.canvas.getBoundingClientRect().height/540),mobile=k<.9;
 return{k,mobile,font:(px:number,css=12)=>mobile?Math.max(px,css/k):px};
}
// Re-create the scene when the viewport crosses the mobile breakpoint (rotation, resize) so sizes follow the real canvas scale.
export function restartOnBreakpoint(scene:Phaser.Scene,mobile:boolean){
 const onResize=()=>{const m=scene.game.canvas.getBoundingClientRect().height/540<.9;if(m!==mobile&&scene.scene.isActive())scene.scene.restart();};
 scene.scale.on('resize',onResize);scene.events.once('shutdown',()=>scene.scale.off('resize',onResize));
}
