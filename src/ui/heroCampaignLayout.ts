export function heroCampaignLayout(scale:number){
 const p=(n:number)=>n/Math.max(.1,scale),header=scale>=.9?64:48,frame={x:p(12),y:p(header),width:960-p(24),height:540-p(header+8)};
 const left={x:frame.x+p(6),y:frame.y+p(6),width:(frame.width-p(18))*.4,height:frame.height-p(12)};
 const right={x:left.x+left.width+p(12),y:frame.y+p(3),width:frame.x+frame.width-p(6)-(left.x+left.width+p(12)),height:frame.height-p(6)};
 const rowHeight=Math.max(p(48),Math.min(72,(right.height-p(10))/6)),gap=p(2),contentHeight: number=rowHeight*6+gap*5;
 const slots=Array.from({length:6},(_,i)=>({x:right.x+p(3),y:right.y+Math.max(0,(right.height-contentHeight)/2)+i*(rowHeight+gap),width:right.width-p(6),height:rowHeight}));
 return {frame,left,right,slots,minScroll:Math.min(0,right.height-contentHeight)};
}
