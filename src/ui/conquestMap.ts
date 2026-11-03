// Chapter 4 Conquest Map (docs/CHAPTER4_CONQUEST_MAP.md): the pure layout. One painted background, six marker positions and five roads as data.
// Positions are in background pixels (1672x941, cover-fit to the 960x540 menu frame); nothing here touches Phaser or the save.
export const CONQUEST_CHAPTER='conquered-lands';
export const CONQUEST_ART={background:'conquest-map',azureKeep:'conquest-map-azure-keep',width:1672,height:941,
 /** The Azure Fortress overlay: drawn over the Crimson Fortress once Mission 6 is conquered (scripts/build-conquest-assets.mjs makes both files). */
 overlay:{x:1290,y:0,w:382,h:380}} as const;
export const CONQUEST_SCALE=960/CONQUEST_ART.width;

export type LabelSide='above'|'below'|'right';
export interface ConquestStop{readonly slot:number;readonly x:number;readonly y:number;readonly label:LabelSide}
export type Pt=readonly [number,number];

// One stop per chapter slot (1-6), on the spot the painting gives that mission's signature: forest flag, cliff keep, island, wall, canyon, fortress.
export const conquestStops:readonly ConquestStop[]=[
 {slot:1,x:205,y:548,label:'right'},
 {slot:2,x:497,y:320,label:'above'},
 {slot:3,x:742,y:386,label:'above'},
 {slot:4,x:962,y:404,label:'right'},
 {slot:5,x:1268,y:612,label:'below'},
 {slot:6,x:1488,y:282,label:'below'},
];
// Road i joins stop i+1 to stop i+2 and follows the tracks painted in the background.
export const conquestRoads:readonly (readonly Pt[])[]=[
 [[205,548],[300,540],[372,470],[410,396],[470,345],[497,320]],
 [[497,320],[540,400],[640,440],[700,430],[742,386]],
 [[742,386],[830,420],[900,418],[962,404]],
 [[962,404],[1010,470],[1110,520],[1210,545],[1268,612]],
 [[1268,612],[1340,560],[1400,470],[1360,395],[1430,330],[1488,282]],
];

export const toGame=(p:Pt):Pt=>[p[0]*CONQUEST_SCALE,p[1]*CONQUEST_SCALE];
export const markerRadius=(finale:boolean)=>finale?13:11;

/** Catmull-Rom through the waypoints, in game pixels, as a polyline. */
export function smoothRoad(points:readonly Pt[],perSegment=12):Pt[]{
 const q=points.map(toGame),out:Pt[]=[q[0]];
 for(let i=0;i<q.length-1;i++){
  const a=q[Math.max(0,i-1)],b=q[i],d=q[i+1],e=q[Math.min(q.length-1,i+2)];
  for(let s=1;s<=perSegment;s++){
   const t=s/perSegment,u=1-t,c1:Pt=[b[0]+(d[0]-a[0])/6,b[1]+(d[1]-a[1])/6],c2:Pt=[d[0]-(e[0]-b[0])/6,d[1]-(e[1]-b[1])/6];
   out.push([u*u*u*b[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*d[0],u*u*u*b[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*d[1]]);
  }
 }
 return out;
}
/** Dash segments along a polyline by arc length (Phaser Graphics has no dashed stroke). */
export function dashSegments(line:readonly Pt[],dash:number,gap:number):[Pt,Pt][]{
 const out:[Pt,Pt][]=[];let on=true,left=dash,start:Pt=line[0];
 for(let i=1;i<line.length;i++){
  let a=line[i-1];const b=line[i];let len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  while(len>0){
   const step=Math.min(len,left),t=step/len,p:Pt=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   if(on)out.push([start,p]);
   left-=step;len-=step;a=p;
   if(left<=1e-9){on=!on;left=on?dash:gap;}
   start=p;
  }
 }
 return out;
}
/** Side of the square tap area around a marker, in game pixels: 44 CSS px wherever that is more than the marker itself (k = CSS px per game pixel). */
export const tapSide=(k:number,finale=false)=>Math.max(44/Math.max(.1,k),2*markerRadius(finale)+8);

export interface Rect{x:number;y:number;w:number;h:number}
/** Estimated box of a stop's name label in game pixels (the scene measures the real text; tests use the estimate). */
export function labelBox(stop:ConquestStop,textWidth:number,fontSize:number,finale=false):Rect{
 const [x,y]=toGame([stop.x,stop.y]),r=markerRadius(finale),h=fontSize+2;
 if(stop.label==='right')return {x:x+r+8,y:y-h/2,w:textWidth,h};
 if(stop.label==='above')return {x:x-textWidth/2,y:y-r-34-h,w:textWidth,h};
 return {x:x-textWidth/2,y:y+r+8,w:textWidth,h};
}
export const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;

export type MarkerStyle='done'|'next'|'open'|'locked';
export type RoadStyle='done'|'next'|'locked';
/** Marker look from the selection model: conquered, the recommended next mission, any other open mission (all of them with ?unlock=all), or locked. */
export function markerStyle(m:{state:string;recommended:boolean}):MarkerStyle{
 return m.state==='completed'?'done':m.state==='available'?(m.recommended?'next':'open'):'locked';
}
export function roadStyle(to:{state:string}):RoadStyle{return to.state==='completed'?'done':to.state==='available'?'next':'locked';}
