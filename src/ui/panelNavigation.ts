// Desktop UX D2.1: keyboard navigation inside the Skills, Build and Shop popups. Pure geometry over the popups' own hit rectangles; no Phaser here.
export type NavRect={x:number;y:number;width:number;height:number};
export type NavDirection='left'|'right'|'up'|'down';
const centre=(r:NavRect)=>({x:r.x+r.width/2,y:r.y+r.height/2});
const overlap=(a0:number,a1:number,b0:number,b1:number)=>Math.min(a1,b1)-Math.max(a0,b0)>0;
/** The nearest control in a direction, following the popup's visual layout: candidates must lie that way (off the row or column, within 45°); one sharing the row (or column) wins over a diagonal one,
 * then the closest along the direction. Returns `from` when nothing lies that way (no wrap-around). */
export function spatialNext(rects:readonly NavRect[],from:number,direction:NavDirection):number{
 const a=rects[from];if(!a)return rects.length?0:-1;
 const c=centre(a),horizontal=direction==='left'||direction==='right',sign=direction==='right'||direction==='down'?1:-1;
 let best=from,score=Infinity;
 rects.forEach((b,i)=>{
  if(i===from)return;const d=centre(b),along=(horizontal?d.x-c.x:d.y-c.y)*sign;if(along<=1)return;
  const across=Math.abs(horizontal?d.y-c.y:d.x-c.x),aligned=horizontal?overlap(a.y,a.y+a.height,b.y,b.y+b.height):overlap(a.x,a.x+a.width,b.x,b.x+b.width);
  if(!aligned&&across>along)return; // off the row (or column): only within 45° of the direction, so the far edge of a grid never jumps to a distant corner
  const s=(aligned?0:1e6)+along+2*across;if(s<score){score=s;best=i;}
 });
 return best;
}
/** Reading order: rows from the top (controls whose vertical centres lie within half the smaller height share a row), left to right within a row. */
export function readingOrder(rects:readonly NavRect[]):number[]{
 const order=rects.map((_,i)=>i).sort((i,j)=>centre(rects[i]).y-centre(rects[j]).y);
 const rows:number[][]=[];
 for(const i of order){const row=rows[rows.length-1],r=rects[i];
  if(row&&Math.abs(centre(rects[row[0]]).y-centre(r).y)<=Math.min(rects[row[0]].height,r.height)/2)row.push(i);else rows.push([i]);}
 return rows.flatMap(row=>row.sort((i,j)=>centre(rects[i]).x-centre(rects[j]).x));
}
/** Tab / Shift+Tab: the next control in reading order, wrapping at either end. */
export function tabNext(rects:readonly NavRect[],from:number,step:1|-1):number{
 if(!rects.length)return -1;const order=readingOrder(rects),at=order.indexOf(from);
 return at<0?order[0]:order[(at+step+order.length)%order.length];
}
/** When the focused control disappears (the popup's content changed), the one nearest to where it stood. */
export function nearestTo(rects:readonly NavRect[],to:NavRect):number{
 const c=centre(to);let best=-1,d=Infinity;rects.forEach((r,i)=>{const e=centre(r),k=Math.hypot(e.x-c.x,e.y-c.y);if(k<d){d=k;best=i;}});return best;
}
