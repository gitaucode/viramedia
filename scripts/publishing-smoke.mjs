import { spawn,spawnSync } from "node:child_process";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const BASE="http://127.0.0.1:8788";
const PASSWORD="vira-test-admin-password";

function assert(condition,message){if(!condition)throw new Error(message)}
async function waitForServer(){for(let i=0;i<90;i++){try{const r=await fetch(`${BASE}/admin`);if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,500))}throw new Error("Timed out waiting for publishing test server")}

async function main(){
 const server=spawn("npm",["run","dev","--","--webpack","--hostname","127.0.0.1","--port","8788"],{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,VIRA_ADMIN_PASSWORD:PASSWORD,VIRA_TEST_WRANGLER_CONFIG:CONFIG,VIRA_TEST_D1_STATE:STATE,NEXT_TELEMETRY_DISABLED:"1"}});
 try{
  await waitForServer();
  let response=await fetch(`${BASE}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:PASSWORD})});
  assert(response.ok,`Publishing admin login failed with ${response.status}`);
  const cookie=(response.headers.get("set-cookie")||"").split(";")[0];
  const auth={Cookie:cookie,"Content-Type":"application/json"};

  response=await fetch(`${BASE}/admin/campaigns/1/publishing`,{headers:{Cookie:cookie}});
  assert(response.ok,`Publishing workspace route failed with ${response.status}`);

  response=await fetch(`${BASE}/api/admin/deliverables?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Publishing deliverable lookup failed with ${response.status}`);
  const existing=(await response.json()).deliverables||[];
  assert(existing.length===1,"Expected reviewed deliverable from previous smoke stage");
  const approvedDeliverableId=existing[0].id;

  response=await fetch(`${BASE}/api/admin/deliverables`,{method:"POST",headers:auth,body:JSON.stringify({campaignId:1,title:"Unapproved Publishing Guard",status:"pending"})});
  assert(response.ok,`Could not create publishing guard deliverable: ${response.status}`);
  response=await fetch(`${BASE}/api/admin/deliverables?campaignId=1`,{headers:{Cookie:cookie}});
  const allDeliverables=(await response.json()).deliverables||[];
  const guard=allDeliverables.find(d=>d.title==="Unapproved Publishing Guard");
  assert(guard?.id,"Publishing guard deliverable missing");

  response=await fetch(`${BASE}/api/admin/publications`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId:guard.id,platform:"tiktok",postUrl:"https://www.tiktok.com/@test/video/unapproved"})});
  assert(response.status===409,`Expected unapproved publication to be blocked with 409, got ${response.status}`);

  response=await fetch(`${BASE}/api/admin/publications`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId:approvedDeliverableId,platform:"tiktok",postUrl:"https://www.tiktok.com/@test/video/1001",creatorAccount:"@testcreator",publishedAt:"2026-08-22T18:00:00",distributionType:"organic",platformPostId:"1001"})});
  assert(response.ok,`TikTok publication failed with ${response.status}`);
  const tiktok=await response.json();
  assert(tiktok.versionNumber===3,"TikTok publication was not tied to client-approved V3");

  response=await fetch(`${BASE}/api/admin/publications`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId:approvedDeliverableId,platform:"instagram",postUrl:"https://www.instagram.com/reel/test1002/",creatorAccount:"@testcreator",publishedAt:"2026-08-22T18:05:00",distributionType:"mixed",boostedSpend:3500,platformPostId:"test1002"})});
  assert(response.ok,`Instagram publication failed with ${response.status}`);
  const instagram=await response.json();
  assert(instagram.versionNumber===3,"Instagram publication was not tied to client-approved V3");

  response=await fetch(`${BASE}/api/admin/publications`,{method:"POST",headers:auth,body:JSON.stringify({deliverableId:approvedDeliverableId,platform:"instagram",postUrl:"https://www.instagram.com/reel/test1002/"})});
  assert(response.status===409,`Expected duplicate post URL 409, got ${response.status}`);

  response=await fetch(`${BASE}/api/admin/publications?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Publication listing failed with ${response.status}`);
  let publications=(await response.json()).publications||[];
  assert(publications.length===2,`Expected 2 publications, got ${publications.length}`);
  assert(publications.every(p=>p.version_number===3),"Publication list contains a non-approved submission version");
  assert(new Set(publications.map(p=>p.platform)).size===2,"Expected two distinct publication platforms");

  response=await fetch(`${BASE}/api/admin/publications`,{method:"PATCH",headers:auth,body:JSON.stringify({id:instagram.id,boostedSpend:5000,notes:"Boosted after initial organic traction"})});
  assert(response.ok,`Publication update failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/publications?campaignId=1`,{headers:{Cookie:cookie}});
  publications=(await response.json()).publications||[];
  const updated=publications.find(p=>p.id===instagram.id);
  assert(Number(updated?.boosted_spend)===5000,"Publication boosted spend update was not persisted");

  response=await fetch(`${BASE}/api/admin/publications`,{method:"DELETE",headers:auth,body:JSON.stringify({id:instagram.id})});
  assert(response.ok,`Publication removal failed with ${response.status}`);
  response=await fetch(`${BASE}/api/admin/publications?campaignId=1`,{headers:{Cookie:cookie}});
  publications=(await response.json()).publications||[];
  assert(publications.length===1&&publications[0].id===tiktok.id,"Publication removal did not leave the expected record");

  response=await fetch(`${BASE}/api/admin/activity?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Publishing activity lookup failed with ${response.status}`);
  const events=(await response.json()).events||[],types=new Set(events.map(e=>e.event_type));
  for(const expected of ["publication.created","publication.updated","publication.removed"])assert(types.has(expected),`Missing publishing activity event: ${expected}`);

  response=await fetch(`${BASE}/api/admin/logout`,{method:"POST",headers:{Cookie:cookie}});
  assert(response.ok,`Publishing logout failed with ${response.status}`);
  console.log("\n✓ Publishing smoke test passed");
  console.log("✓ Verified approval gate, multi-platform V3 publishing, duplicate protection, update/remove lifecycle and activity events");
 }finally{
  if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",shell:true});else server.kill("SIGTERM");
 }
}

main().catch(error=>{console.error("\n✗ Publishing smoke test failed");console.error(error);process.exitCode=1});
