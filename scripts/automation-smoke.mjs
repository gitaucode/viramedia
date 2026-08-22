import { spawnSync } from "node:child_process";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const NPX=process.platform==="win32"?"npx.cmd":"npx";

function execSql(sql){
  const result=spawnSync(NPX,["wrangler","d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--command",sql,"--json"],{encoding:"utf8",shell:false,env:{...process.env,CI:"true"}});
  if(result.error)throw result.error;
  if(result.status!==0){process.stderr.write(result.stderr||"");process.exit(result.status??1)}
  const parsed=JSON.parse(result.stdout||"[]");
  return parsed?.[0]?.results||[];
}
function assert(condition,message){if(!condition)throw new Error(message)}
function isoDate(offsetDays){const d=new Date();d.setUTCDate(d.getUTCDate()+offsetDays);return d.toISOString().slice(0,10)}

try{
  const tomorrow=isoDate(1),yesterday=isoDate(-1);
  let rows=execSql("SELECT name FROM sqlite_master WHERE type='table' AND name='notification_log'");
  assert(rows.length===1,"notification_log table is missing");

  execSql("DELETE FROM notification_log WHERE notification_key LIKE 'automation-smoke:%'");
  execSql("INSERT OR IGNORE INTO notification_log (notification_key,recipient_type,recipient_id,recipient_email,campaign_id,deliverable_id,kind) VALUES ('automation-smoke:once','creator',1,'creator-test@example.com',1,1,'smoke')");
  execSql("INSERT OR IGNORE INTO notification_log (notification_key,recipient_type,recipient_id,recipient_email,campaign_id,deliverable_id,kind) VALUES ('automation-smoke:once','creator',1,'creator-test@example.com',1,1,'smoke')");
  rows=execSql("SELECT COUNT(*) count FROM notification_log WHERE notification_key='automation-smoke:once'");
  assert(Number(rows[0]?.count)===1,"notification idempotency key allowed a duplicate");

  execSql(`UPDATE deliverables SET status='in_progress',due_date='${tomorrow}',client_approval_status='not_ready',updated_at=CURRENT_TIMESTAMP WHERE id=1`);
  rows=execSql("SELECT d.id FROM deliverables d JOIN creators c ON c.id=d.creator_id WHERE c.status='approved' AND d.status IN ('pending','in_progress','changes_requested') AND d.due_date IS NOT NULL AND date(d.due_date)=date('now','+1 day') AND d.id=1");
  assert(rows.length===1,"due-tomorrow automation candidate query did not match");

  execSql(`UPDATE deliverables SET due_date='${yesterday}' WHERE id=1`);
  rows=execSql("SELECT d.id FROM deliverables d JOIN creators c ON c.id=d.creator_id WHERE c.status='approved' AND d.status IN ('pending','in_progress','changes_requested') AND d.due_date IS NOT NULL AND date(d.due_date)<date('now') AND d.id=1");
  assert(rows.length===1,"overdue automation candidate query did not match");

  execSql("UPDATE deliverables SET status='done',creator_fee=25000,payment_status='pending',due_date=NULL WHERE id=1");
  rows=execSql("SELECT id FROM deliverables WHERE status='done' AND creator_fee>0 AND payment_status!='paid' AND id=1");
  assert(rows.length===1,"creator payment automation candidate query did not match");

  execSql("DELETE FROM notification_log WHERE notification_key LIKE 'automation-smoke:%'");
  console.log("\n✓ Workflow automation smoke test passed");
  console.log("✓ Verified canonical notification log, idempotency, due/overdue and payment candidate rules");
}catch(error){
  console.error("\n✗ Workflow automation smoke test failed");
  console.error(error);
  process.exitCode=1;
}
