import { spawn,spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const BASE="http://127.0.0.1:8788";
const PASSWORD="vira-test-admin-password";
const CREATOR_COOKIE="vira_creator=vira-test-creator-token";
const CLIENT_COOKIE="vira_client=vira-test-client-token";

function run(command,args){const result=spawnSync(command,args,{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,CI:"true"}});if(result.status!==0)process.exit(result.status??1)}
function assert(condition,message){if(!condition)throw new Error(message)}
async function waitForServer(){for(let i=0;i<90;i++){try{const response=await fetch(`${BASE}/admin`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,500))}throw new Error("Timed out waiting for stabilization test server")}
async function submitExternal(deliverableId,url,note){const form=new FormData();form.append("url",url);form.append("note",note);return fetch(`${BASE}/api/portal/deliverables/${deliverableId}/submissions`,{method:"POST",headers:{Cookie:CREATOR_COOKIE},body:form})}

async function main(){
 rmSync(STATE,{recursive:true,force:true});
 run("npx",["wrangler","d1","migrations","apply","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE]);
 run("npx",["wrangler","d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--file","scripts/test-seed.sql"]);
 const server=spawn("npm",["run","dev","--","--webpack","--hostname","127.0.0.1","--port","8788"],{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,VIRA_ADMIN_PASSWORD:PASSWORD,VIRA_TEST_WRANGLER_CONFIG:CONFIG,VIRA_TEST_D1_STATE:STATE,NEXT_TELEMETRY_DISABLED:"1"}});
 try{
  await waitForServer();
  let response=await fetch(`${BASE}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:PASSWORD})});
  assert(response.ok,`Admin login failed with ${response.status}`);
  const cookie=(response.headers.get("set-cookie")||"").split(";")[0];
  const auth={Cookie:cookie,"Content-Type":"application/json"};

  response=await fetch(`${BASE}/api/admin/clients`,{method:"POST",headers:auth,body:JSON.stringify({action:"link",campaignId:1,clientId:1})});
  assert(response.ok,`Client link failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/campaign-creators`,{method:"POST",headers:auth,body:JSON.stringify({action:"add",campaignId:1,creatorId:1,status:"assigned"})});
  assert(response.ok,`Creator assignment failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/deliverables`,{method:"POST",headers:auth,body:JSON.stringify({campaignId:1,creatorId:1,title:"Stabilization Deliverable",status:"pending",creatorFee:10000})});
  assert(response.ok,`Deliverable creation failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/deliverables?campaignId=1`,{headers:{Cookie:cookie}});
  const deliverable=((await response.json()).deliverables||[])[0];assert(deliverable,"Missing stabilization deliverable");
  const deliverableId=deliverable.id;

  response=await submitExternal(deliverableId,"https://example.com/stabilization-v1","V1");
  assert(response.ok,`V1 submission failed with ${response.status}`);
  const v1=(await response.json()).version;
  response=await fetch(`${BASE}/api/admin/reviews`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId,versionId:v1.id,action:"approved"})});
  assert(response.ok,`V1 approval failed with ${response.status}`);

  response=await submitExternal(deliverableId,"https://example.com/illegal-v2","Should be blocked after approval");
  assert(response.status===409,`Expected creator upload after approval to be blocked with 409, got ${response.status}`);
  response=await fetch(`${BASE}/api/admin/deliverables`,{method:"PATCH",headers:auth,body:JSON.stringify({id:deliverableId,status:"done"})});
  assert(response.status===409,`Expected manual done transition to be blocked with 409, got ${response.status}`);

  response=await fetch(`${BASE}/api/admin/reporting`,{method:"PATCH",headers:auth,body:JSON.stringify({kind:"share",campaignId:1,deliverableId,clientApprovalStatus:"awaiting_client"})});
  assert(response.ok,`Initial client share failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/reporting`,{method:"PATCH",headers:auth,body:JSON.stringify({kind:"share",campaignId:1,deliverableId,clientApprovalStatus:"awaiting_client"})});
  assert(response.status===409,`Expected duplicate client share to be blocked with 409, got ${response.status}`);

  response=await fetch(`${BASE}/api/client/campaigns/1`,{method:"PATCH",headers:{Cookie:CLIENT_COOKIE,"Content-Type":"application/json"},body:JSON.stringify({deliverableId,status:"changes_requested",feedback:"Please revise"})});
  assert(response.ok,`Client revision request failed with ${response.status}`);
  response=await submitExternal(deliverableId,"https://example.com/stabilization-v2","V2 after client changes");
  assert(response.ok,`V2 revision submission failed with ${response.status}`);
  const v2=(await response.json()).version;
  response=await fetch(`${BASE}/api/admin/reviews`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId,versionId:v2.id,action:"approved"})});
  assert(response.ok,`V2 approval failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/reporting`,{method:"PATCH",headers:auth,body:JSON.stringify({kind:"share",campaignId:1,deliverableId,clientApprovalStatus:"awaiting_client"})});
  assert(response.ok,`V2 client share failed with ${response.status}`);
  response=await fetch(`${BASE}/api/client/campaigns/1`,{method:"PATCH",headers:{Cookie:CLIENT_COOKIE,"Content-Type":"application/json"},body:JSON.stringify({deliverableId,status:"approved"})});
  assert(response.ok,`Client approval failed with ${response.status}`);

  response=await fetch(`${BASE}/api/admin/deliverables?campaignId=1`,{headers:{Cookie:cookie}});
  const completed=((await response.json()).deliverables||[]).find(item=>item.id===deliverableId);
  assert(completed?.status==="done"&&completed?.client_approval_status==="approved","Client approval did not complete the deliverable");
  response=await submitExternal(deliverableId,"https://example.com/illegal-v3","Should be blocked after completion");
  assert(response.status===409,`Expected creator upload after completion to be blocked with 409, got ${response.status}`);

  response=await fetch(`${BASE}/api/admin/reviews?campaignId=1`,{headers:{Cookie:cookie}});
  const ledger=await response.json();
  const shares=(ledger.events||[]).filter(event=>event.action==="shared_with_client");
  assert(shares.length===2,`Expected exactly two legitimate client-share events, got ${shares.length}`);
  console.log("\n✓ End-to-end stabilization smoke test passed");
  console.log("✓ Verified approval upload guards, duplicate-share protection, manual completion guard, client revision loop and client-driven completion");
 }finally{
  if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",shell:true});else server.kill("SIGTERM");
 }
}

main().catch(error=>{console.error("\n✗ End-to-end stabilization smoke test failed");console.error(error);process.exitCode=1});
