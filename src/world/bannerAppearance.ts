// Chapter 4 M1: the Azure Banner a captured post is raised with. A 1 x 1 wall (Simulation.updatePost) drawn as a pole, a pennant and a stone base on a canvas texture Battle bakes once per game; no image is loaded.
// Presentation only: the simulation reads the structure's footprint and hit points, never this.
export const bannerTexture='azure-banner';
export const bannerVisual={name:'Azure Banner',texture:bannerTexture,width:64,height:100} as const;
export function drawBannerTexture(texture:Phaser.Textures.CanvasTexture){
 const c=texture.context;
 c.fillStyle='rgba(20,53,43,.32)';c.beginPath();c.ellipse(34,112,26,8,0,0,Math.PI*2);c.fill();
 c.fillStyle='#8a9496';c.beginPath();c.ellipse(32,108,22,8,0,0,Math.PI*2);c.fill();c.fillStyle='#aab3b5';c.beginPath();c.ellipse(32,105,17,6,0,0,Math.PI*2);c.fill();
 c.fillStyle='#4a3626';c.fillRect(29,14,5,92);c.fillStyle='#6b4f36';c.fillRect(29,14,2,92);
 c.fillStyle='#2e8fd1';c.beginPath();c.moveTo(34,16);c.lineTo(62,22);c.lineTo(54,32);c.lineTo(62,44);c.lineTo(34,50);c.closePath();c.fill();
 c.strokeStyle='#bfe9ff';c.lineWidth=2;c.stroke();
 c.fillStyle='#e9f7ff';c.beginPath();c.moveTo(40,28);c.lineTo(50,30);c.lineTo(40,40);c.closePath();c.fill();
 c.fillStyle='#f3d27a';c.beginPath();c.arc(31.5,11,5,0,Math.PI*2);c.fill();
 texture.refresh();
}
