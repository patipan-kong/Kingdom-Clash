/** HUD-only layout in logical coordinates, measured against the FIT canvas. */
export function controlLayout(scale:number){
 const s=Math.max(.1,scale),skill=Math.max(33.5,24/s),zone=Math.max(35.5,24/s),attack=Math.max(53,34/s);
 const utility=skill*.7,utilityHit=Math.max(utility,24/s),bottom=24/s;
 const ax=960-24/s-attack,ay=540-bottom-attack-20;
 const tauntX=ax-attack-skill-40,tauntY=ay-64;
 const ux=tauntX-skill-utilityHit-16/s;
 const labelBottom=utility+9+Math.max(12,9/s)/2+2;
 const uy=540-bottom-Math.max(utilityHit,labelBottom),step=2*utilityHit+16/s;
 return {
  abilities:[
   {id:'bash',x:ax-attack-skill-24,y:ay+30,radius:skill},
   {id:'taunt',x:tauntX,y:tauntY,radius:skill},
   {id:'charge',x:ax-92,y:ay-attack-skill-50,radius:skill},
   {id:'zone',x:ax+4,y:ay-attack-zone-28,radius:zone},
   {id:'attack',x:ax,y:ay,radius:attack}
  ],
  utilities:['build','shop','army'].map((id,i)=>({id,x:ux,y:uy-(2-i)*step,radius:utility,hitRadius:utilityHit})),
  attackLabel:{x:ax,y:ay+attack+12},bottomCssInset:24
 };
}
