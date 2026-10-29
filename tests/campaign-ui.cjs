const test=require('node:test');
const assert=require('node:assert/strict');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {missionPanelView,outcomeReason}=require('../.test-build/data/campaignUi.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');

const bases=sim=>({blue:sim.state.bases['blue-base'],red:sim.state.bases['red-base']});

test('campaign mission panel derives progress and thresholds from authoritative state',()=>{
 const l1=campaign.byNumber(1),sim=new Simulation('ui',campaign.setup(1));
 let view=missionPanelView(l1,sim.missionStatus(),bases(sim));
 assert.equal(view.heading,'Defeat 5 Crimson waves');assert.deepEqual(view.rows.map(r=>[r.progress,r.target,r.state]),[[0,5,'active']]);
 const l5=campaign.get('campaign-03'),bulwark=new Simulation('ui5',campaign.setup('campaign-03')); // Iron Bulwark (old Level 5) is Chapter 1 Mission 3
 view=missionPanelView(l5,bulwark.missionStatus(),bases(bulwark));
 assert.equal(view.azure.minimum,null,'Chapter 1 has no HP-fraction line');assert.equal(view.azure.safe,true);
 bulwark.state.bases['blue-base'].hp=1;view=missionPanelView(l5,bulwark.missionStatus(),bases(bulwark));assert.equal(view.azure.safe,true,'1 HP is still alive');
 const l20=campaign.get('full-battle'),full=new Simulation('ui20',campaign.setup('full-battle'));
 full.state.bases['red-base'].hp=2100;view=missionPanelView(l20,null,bases(full));
 assert.deepEqual(view.crimson,{hp:2100,maxHp:3000});assert.equal(view.heading,'Destroy the Crimson Keep');
});

test('mission panel represents completed, active and locked staged phases',()=>{
 const level={...campaign.byNumber(1),mission:{phases:[{id:'first',objectives:[]},{id:'second',objectives:[]}]}};
 const status={status:'active',outcome:null,activePhase:'second',activePhaseIndex:1,completedPhases:['first'],objectives:[
  {id:'a',phaseId:'first',type:'destroy',definition:{},target:1,progress:1,complete:true,active:false,display:{label:'First'}},
  {id:'b',phaseId:'second',type:'destroy',definition:{},target:2,progress:1,complete:false,active:true,display:{label:'Second'}},
  {id:'c',phaseId:'third',type:'destroy',definition:{},target:1,progress:0,complete:false,active:false,display:{label:'Third'}},
 ]};
 const view=missionPanelView(level,status,{blue:{hp:3000,maxHp:3000},red:{hp:3000,maxHp:3000}});
 assert.deepEqual(view.rows.map(r=>r.state),['complete','active','locked']);assert.deepEqual(view.completedPhases,['first']);assert.equal(view.activePhase,'second');
});

test('campaign result reasons are specific',()=>{
 assert.match(outcomeReason('azure-keep-hp-threshold'),/below the required minimum/);
 assert.match(outcomeReason('objectives-complete'),/objectives completed/);
 assert.match(outcomeReason('both-keeps-destroyed'),/Both Keeps/);
});
