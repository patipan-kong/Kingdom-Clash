const {test}=require('node:test');const assert=require('node:assert/strict');
const {mobileResultLayout}=require('../.test-build/ui/mobileResultLayout.js');
for(const [width,height] of [[936,432],[568,320],[512,292],[872,404]])for(const actions of [1,3])test('Results fit safe canvas '+width+'x'+height+' / '+actions+' actions',()=>{
 const l=mobileResultLayout(width,height,actions),f=l.frame;
 assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=width&&f.y+f.height<=height);
 assert.ok(l.summary.height>48&&l.summary.width>=160&&l.objectives.width>=200);
 assert.ok(l.summary.x+l.summary.width<l.objectives.x);
 for(const [i,b] of l.buttons.entries()){assert.equal(b.height,48);assert.ok(b.width>=48);assert.ok(b.y>=l.summary.y+l.summary.height+12);assert.ok(b.y+b.height<=f.y+f.height-12);if(i)assert.ok(l.buttons[i-1].x+l.buttons[i-1].width+8<=b.x);}
});
