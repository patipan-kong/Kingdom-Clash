const test=require('node:test'),assert=require('node:assert/strict');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {objectiveLabel}=require('../.test-build/i18n/campaign.js');
const ids=[51,52,53,54,55,56].map(n=>'campaign-'+n);
test('every Chapter 6 objective has a Thai and a Japanese label with no leftover English',()=>{
 for(const id of ids){
  const level=campaign.get(id);assert.ok(level.mission,id);
  for(const phase of level.mission.phases)for(const o of phase.objectives)for(const [locale,script] of [['th',/[฀-๿]/],['ja',/[぀-ヿ一-鿿]/]]){
   const text=objectiveLabel(id,phase.id,o,locale);
   assert.match(text,script,`${id} ${phase.id}/${o.id} ${locale}`);
   assert.doesNotMatch(text,/[A-Za-z]{3,}/,`${id} ${phase.id}/${o.id} ${locale}: ${text}`);
  }
 }
});
test('Chapter 6 English objective labels are unchanged',()=>{
 const level=campaign.get('campaign-56');
 assert.equal(objectiveLabel('campaign-56','arena',level.mission.phases[2].objectives[0],'en'),'Defeat the Crimson Warlord');
});
