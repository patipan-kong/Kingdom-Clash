// The pre-redesign campaign (Levels 1-22 and Full Battle under their original ids and numbers) as a registry of its own. The six-mission chapters
// reuse these definitions unchanged (tests/six-missions.cjs proves it), so the level and gameplay tests keep running against the source definitions.
const {CampaignRegistry}=require('../../.test-build/data/campaign.js');
const {legacyCampaignLevels}=require('../../.test-build/data/campaignLevels.js');
module.exports={campaign:new CampaignRegistry(legacyCampaignLevels),campaignLevels:legacyCampaignLevels};
