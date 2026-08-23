import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const WRANGLER=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));
const CAMPAIGN_ID=9001;

function execSql(sql){
  const result=spawnSync(process.execPath,[WRANGLER,"d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--command",sql,"--json"],{encoding:"utf8",shell:false,env:{...process.env,CI:"true"}});
  if(result.error)throw result.error;
  if(result.status!==0){process.stderr.write(result.stderr||"");process.exit(result.status??1)}
  const parsed=JSON.parse(result.stdout||"[]");
  return parsed?.[0]?.results||[];
}
function assert(condition,message){if(!condition)throw new Error(message)}

try{
  let rows=execSql("SELECT name,type FROM sqlite_master WHERE name IN ('campaigns','campaign_creators','shortlists','shortlist_creators') ORDER BY name");
  const objects=new Map(rows.map(row=>[row.name,row.type]));
  assert(objects.get('campaigns')==='table','campaigns must be the canonical table');
  assert(objects.get('campaign_creators')==='table','campaign_creators must be the canonical table');
  assert(objects.get('shortlists')==='view','shortlists compatibility view is missing');
  assert(objects.get('shortlist_creators')==='view','shortlist_creators compatibility view is missing');

  execSql(`DELETE FROM campaigns WHERE id=${CAMPAIGN_ID}`);
  execSql(`INSERT INTO shortlists (id,name,client,objective,creator_brief,budget,status,notes) VALUES (${CAMPAIGN_ID},'Legacy compatibility campaign','Legacy Client','Legacy objective','Legacy brief','KES 1','planning','compat smoke')`);
  rows=execSql(`SELECT name,client,status,creator_brief FROM campaigns WHERE id=${CAMPAIGN_ID}`);
  assert(rows.length===1&&rows[0].name==='Legacy compatibility campaign'&&rows[0].client==='Legacy Client'&&rows[0].status==='planning'&&rows[0].creator_brief==='Legacy brief','legacy shortlist INSERT did not reach canonical campaigns');

  execSql(`UPDATE shortlists SET name='Legacy compatibility updated',status='active' WHERE id=${CAMPAIGN_ID}`);
  rows=execSql(`SELECT name,status FROM campaigns WHERE id=${CAMPAIGN_ID}`);
  assert(rows.length===1&&rows[0].name==='Legacy compatibility updated'&&rows[0].status==='active','legacy shortlist UPDATE did not reach canonical campaigns');

  execSql(`INSERT OR IGNORE INTO shortlist_creators (shortlist_id,creator_id) VALUES (${CAMPAIGN_ID},1)`);
  execSql(`INSERT OR IGNORE INTO shortlist_creators (shortlist_id,creator_id) VALUES (${CAMPAIGN_ID},1)`);
  rows=execSql(`SELECT campaign_id,creator_id,status,updated_at FROM campaign_creators WHERE campaign_id=${CAMPAIGN_ID} AND creator_id=1`);
  assert(rows.length===1&&rows[0].status==='assigned','legacy shortlist creator INSERT did not reach canonical assignment exactly once');
  assert(typeof rows[0].updated_at==='string'&&rows[0].updated_at.length>0,'legacy shortlist creator INSERT did not populate updated_at');

  execSql(`DELETE FROM shortlist_creators WHERE shortlist_id=${CAMPAIGN_ID} AND creator_id=1`);
  rows=execSql(`SELECT COUNT(*) count FROM campaign_creators WHERE campaign_id=${CAMPAIGN_ID} AND creator_id=1`);
  assert(Number(rows[0]?.count)===0,'legacy shortlist creator DELETE did not reach canonical assignment');

  execSql(`DELETE FROM shortlists WHERE id=${CAMPAIGN_ID}`);
  rows=execSql(`SELECT COUNT(*) count FROM campaigns WHERE id=${CAMPAIGN_ID}`);
  assert(Number(rows[0]?.count)===0,'legacy shortlist DELETE did not reach canonical campaigns');

  rows=execSql("SELECT (SELECT COUNT(*) FROM campaigns) canonical_campaigns,(SELECT COUNT(*) FROM shortlists) legacy_campaigns,(SELECT COUNT(*) FROM campaign_creators) canonical_assignments,(SELECT COUNT(*) FROM shortlist_creators) legacy_assignments");
  assert(Number(rows[0]?.canonical_campaigns)===Number(rows[0]?.legacy_campaigns),'legacy campaign view count diverges from canonical table');
  assert(Number(rows[0]?.canonical_assignments)===Number(rows[0]?.legacy_assignments),'legacy assignment view count diverges from canonical table');

  console.log("\n✓ Release compatibility smoke test passed");
  console.log("✓ Verified legacy shortlist reads/writes remain compatible with canonical campaign tables during cutover");
}catch(error){
  console.error("\n✗ Release compatibility smoke test failed");
  console.error(error);
  process.exitCode=1;
}
