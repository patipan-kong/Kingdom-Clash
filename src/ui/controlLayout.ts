/** Presentation coordinates in the existing 960x540 FIT canvas; sizes are CSS pixels. */
export function controlLayout(scale:number,logicalWidth=960,mobile=false){
 const s=Math.max(.1,scale),w=logicalWidth*s,h=540*s,p=(v:number)=>v/s;
 const ability=(id:string,x:number,y:number,r=24)=>({id,x:p(x),y:p(y),radius:p(r)});
 if(mobile){const compact=w<800||h<340,r=24;return {
  abilities:[...[195,160,125,90].map((degrees,i)=>{const angle=degrees*Math.PI/180;return ability(['bash','taunt','charge','zone'][i],w-60+94*Math.cos(angle),h-72-94*Math.sin(angle),r);}),ability('attack',w-60,h-72,36)],
  utilities:['build','shop','army'].map((id,i)=>({id,x:p(168+i*56),y:p(h-104),radius:p(20),hitRadius:p(24)})),
  joystick:{x:p(80),y:p(h-84),radius:p(52),travel:p(25)},attackLabel:{x:p(w-60),y:p(h-58)},
  cancel:{x:p(w-204),y:p(Math.max((compact?64:72)+32,h-208)),radius:p(24)},
  feedback:{x:p(144+Math.min(240,w-392)/2),y:p((compact?72:80)+20),width:p(Math.min(240,w-392))},bottomCssInset:24
 };}
 const right=w-60,bottom=h-24,low=bottom-50,high=low-108,mid=low-72,left=right-130;

 return {
  abilities:[ability('bash',left,low),ability('taunt',left,mid),ability('charge',right-68,high),ability('zone',right,high),ability('attack',right,low-8,36)],
  utilities:['build','shop','army'].map((id,i)=>({id,x:p(left-76),y:p(low-8-(2-i)*72),radius:p(17),hitRadius:p(24)})),
  joystick:{x:p(75),y:p(bottom-43),radius:p(43),travel:p(25)},
  attackLabel:{x:p(right),y:p(low+31)},
  cancel:{x:p(left-156),y:p(low-72),radius:p(24)},
  feedback:{x:p(right-60),y:p(high-38),width:p(180)},
  bottomCssInset:24
 };
}
