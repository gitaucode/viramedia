import { spawn,spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const BASE="http://127.0.0.1:8788";
const PASSWORD="vira-test-admin-password";
const CREATOR_COOKIE="vira_creator=vira-test-creator-token";

function run(command,args){const result=spawnSync(command,args,{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,CI:"true"}});if(result.status!==0)process.exit(result.status??1)}
function assert(condition,message){if(!condition)throw new Error(message)}
async function waitForServer(){for(let i=0;i<90;i++){try{const response=await fetch(`${BASE}/admin`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,500))}throw new Error("Timed out waiting for opportunity test server")}

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
  const admin={Cookie:cookie,"Content-Type":"application/json"};

  response=await fetch(`${BASE}/api/admin/opportunities`,{method:"PATCH",headers:admin,body:JSON.stringify({kind:"campaign",campaignId:1,applicationMode:"matched",summary:"Lifestyle creators wanted",niches:["beauty"],cities:["Nairobi"],platform:"tiktok",compensation:"KES 20,000",deadline:"2099-01-01"})});
  assert(response.ok,`Opportunity mismatch setup failed with ${response.status}`);
  response=await fetch(`${BASE}/api/portal/opportunities`,{headers:{Cookie:CREATOR_COOKIE}});
  assert(response.ok,`Creator opportunity list failed with ${response.status}`);
  let body=await response.json();
  assert(!(body.opportunities||[]).some(item=>item.id===1),"Mismatched creator should not see campaign");

  response=await fetch(`${BASE}/api/admin/opportunities`,{method:"PATCH",headers:admin,body:JSON.stringify({kind:"campaign",campaignId:1,applicationMode:"matched",summary:"Lifestyle creators wanted",niches:["lifestyle"],cities:["Nairobi"],platform:"tiktok",compensation:"KES 20,000",deadline:"2099-01-01"})});
  assert(response.ok,`Opportunity match setup failed with ${response.status}`);
  response=await fetch(`${BASE}/api/portal/opportunities`,{headers:{Cookie:CREATOR_COOKIE}});
  body=await response.json();
  assert((body.opportunities||[]).some(item=>item.id===1),"Matched creator should see campaign");

  response=await fetch(`${BASE}/api/portal/opportunities`,{method:"POST",headers:{Cookie:CREATOR_COOKIE,"Content-Type":"application/json"},body:JSON.stringify({campaignId:1,pitch:"I create lifestyle short-form content for this audience.",proposedRate:"KES 20,000",availability:"Available next week"})});
  assert(response.ok,`Creator application failed with ${response.status}`);

  response=await fetch(`${BASE}/api/admin/opportunities?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Admin application list failed with ${response.status}`);
  body=await response.json();
  const application=(body.applications||[]).find(item=>item.creator_id===1);
  assert(application?.status==="applied","Creator application was not recorded as applied");

  response=await fetch(`${BASE}/api/admin/opportunities`,{method:"PATCH",headers:admin,body:JSON.stringify({kind:"application",applicationId:application.id,status:"shortlisted"})});
  assert(response.ok,`Application shortlist failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/campaign-creators?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Campaign creator list failed with ${response.status}`);
  body=await response.json();
  const shortlisted=(body.creators||[]).find(item=>item.id===1);
  assert(shortlisted?.assignment_status==="shortlisted","Shortlisted applicant was not added to campaign shortlist");

  console.log("\n✓ Creator opportunity smoke test passed");
  console.log("✓ Verified matching, visibility, application capture and shortlist handoff");
 }finally{
  if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",shell:true});else server.kill("SIGTERM");
 }
}

main().catch(error=>{console.error("\n✗ Creator opportunity smoke test failed");console.error(error);process.exitCode=1});
