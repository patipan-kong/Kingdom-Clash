const test=require('node:test'),assert=require('node:assert/strict');
const {topHudLayout}=require('../.test-build/ui/topHudLayout');
for(const height of [390,540,720,370,520])test(`UI-A1 ${height}px Guardian targets fit beside unchanged Match and preserve Shop anchor`,()=>{
 const s=height/540,f=topHudLayout(s),g=f.guardian,p=f.portrait,k=f.skills,b=f.body;
 assert.ok(Math.abs(g.height*s-64)<1e-8);assert.ok(g.width*s<=232);assert.ok((g.x+g.width)*s+8<=308*s+1e-8);
 assert.ok(Math.abs(k.width*s-48)<1e-8);assert.ok(Math.abs(k.height*s-48)<1e-8);assert.ok(Math.abs(p.hitRadius*s-24)<1e-8);
 assert.ok(p.x+p.hitRadius<k.x-k.width/2);assert.ok(b.x+b.width+8/s<=k.x-k.width/2+1e-8);assert.ok(b.xpBarWidth>0);
 assert.equal(f.shopHudBottom,Math.max(140,90+Math.ceil(48/s),98,46+24/s)+8/s);
});
test('target232px fits at960 and responsive206.44px avoids844 Match overlap',()=>{
 assert.equal(topHudLayout(1).guardian.width,232);assert.ok(Math.abs(topHudLayout(390/540).guardian.width*(390/540)-206.44444444444446)<1e-8);
});
test('portrait/tiny transient canvas dimensions keep finite positive presentation sizes',()=>{
 for(const scale of [0,.1,.4]){const f=topHudLayout(scale);assert.ok(f.guardian.width>0&&f.body.width>0&&f.body.xpBarWidth>0);}
});
