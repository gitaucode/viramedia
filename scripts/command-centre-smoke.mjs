import { spawn,spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const BASE="http://127.0.0.1:8788";
const PASSWORD="vira-test-admin-password";
const WRANGLER=fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js",import.meta.url));

function assert(condition,message){if(!condition)throw new Error(message)}
function execSql(sql){const r=spawnSync(process.execPath,[WRANGLER,"d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--command",sql,"--json"],{encoding:"utf8",shell:false,env:{...process.env,CI:"true"}});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr||"D1 command failed");}
async function waitForServer(){for(let i=0;i<90;i++){try{const r=await fetch(`${BASE}/admin`);if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,500))}throw new Error("Timed out waiting for Command Centre server")}
async function json(response){return response.json().catch(()=>({}))}

async function main(){
 execSql("UPDATE deliverables SET status='submitted',due_date=date('now','-2 day'),client_approval_status='not_ready' WHERE id=1");
 execSql("INSERT INTO deliverables (campaign_id,creator_id,title,due_date,status,notes,creator_fee,payment_status) VALUES (1,1,'Command Centre payout smoke',NULL,'done','',12000,'pending')");
 const server=spawn("npm",["run","dev","--","--webpack","--hostname","127.0.0.1","--port","8788"],{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,VIRA_ADMIN_PASSWORD:PASSWORD,VIRA_TEST_WRANGLER_CONFIG:CONFIG,VIRA_TEST_D1_STATE:STATE,NEXT_TELEMETRY_DISABLED:"1"}});
 try{
  await waitForServer();
  let response=await fetch(`${BASE}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:PASSWORD})});
  assert(response.ok,`Command Centre admin login failed with ${response.status}`);
  const cookie=(response.headers.get("set-cookie")||"").split(";")[0];
  response=await fetch(`${BASE}/api/admin/dashboard`,{headers:{Cookie:cookie}});
  assert(response.ok,`Command Centre dashboard failed with ${response.status}`);
  const data=await json(response),actions=data.actions||[];
  assert(Number(data.stats?.openActions)>=3,"Expected at least three operational actions");
  assert(Number(data.stats?.highPriorityActions)>=2,"Expected review and overdue actions to be high priority");
  const review=actions.find(a=>a.kind==="internal_review"&&a.campaignId===1);
  const overdue=actions.find(a=>a.kind==="overdue_deliverable"&&a.campaignId===1);
  const creatorPayment=actions.find(a=>a.kind==="creator_payment"&&a.campaignId===1);
  const clientBalance=actions.find(a=>a.kind==="client_balance"&&a.campaignId===1);
  assert(review?.priority==="high","Internal review action missing or incorrectly prioritized");
  assert(overdue?.priority==="high","Overdue deliverable action missing or incorrectly prioritized");
  assert(Number(creatorPayment?.amount)===12000,"Creator payment action amount mismatch");
  assert(Number(clientBalance?.amount)===120000,"Client balance action amount mismatch");
  assert(actions.indexOf(review)<actions.indexOf(creatorPayment),"High-priority review should sort ahead of medium-priority payment");
  response=await fetch(`${BASE}/api/admin/logout`,{method:"POST",headers:{Cookie:cookie}});assert(response.ok,"Command Centre logout failed");
  console.log("\n✓ Command Centre V2 smoke test passed");
  console.log("✓ Verified review, overdue, creator payment and client balance actions with priority ordering");
 }finally{
  execSql("DELETE FROM deliverables WHERE title='Command Centre payout smoke'");
  execSql("UPDATE deliverables SET status='done',due_date=NULL WHERE id=1");
  if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",shell:true});else server.kill("SIGTERM");
 }
}
main().catch(error=>{console.error("\n✗ Command Centre V2 smoke test failed");console.error(error);process.exitCode=1});
