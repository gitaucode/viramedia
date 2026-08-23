import { spawn,spawnSync } from "node:child_process";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/test-state";
const BASE="http://127.0.0.1:8788";
const PASSWORD="vira-test-admin-password";

function assert(condition,message){if(!condition)throw new Error(message)}
async function waitForServer(){for(let i=0;i<90;i++){try{const r=await fetch(`${BASE}/admin`);if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,500))}throw new Error("Timed out waiting for finance test server")}
async function json(response){return response.json().catch(()=>({}))}

async function main(){
 const server=spawn("npm",["run","dev","--","--webpack","--hostname","127.0.0.1","--port","8788"],{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,VIRA_ADMIN_PASSWORD:PASSWORD,VIRA_TEST_WRANGLER_CONFIG:CONFIG,VIRA_TEST_D1_STATE:STATE,NEXT_TELEMETRY_DISABLED:"1"}});
 try{
  await waitForServer();
  let response=await fetch(`${BASE}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:PASSWORD})});
  assert(response.ok,`Finance admin login failed with ${response.status}`);
  const cookie=(response.headers.get("set-cookie")||"").split(";")[0];
  const auth={Cookie:cookie,"Content-Type":"application/json"};

  response=await fetch(`${BASE}/api/admin/finance?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Finance GET failed with ${response.status}`);
  let data=await json(response);
  assert(Number(data.totals?.creatorCommitted)===25000,"Expected KES 25,000 creator commitment from smoke deliverable");

  response=await fetch(`${BASE}/api/admin/finance`,{method:"PATCH",headers:auth,body:JSON.stringify({campaignId:1,commercialValue:150000,invoicedAmount:120000})});
  assert(response.ok,`Commercial terms update failed with ${response.status}`);

  response=await fetch(`${BASE}/api/admin/finance`,{method:"POST",headers:auth,body:JSON.stringify({kind:"cost",campaignId:1,category:"production",amount:10000,vendor:"Test Production",incurredAt:"2026-08-22",notes:"Finance smoke"})});
  assert(response.ok,`Production cost failed with ${response.status}`);
  const production=await json(response);

  response=await fetch(`${BASE}/api/admin/finance`,{method:"POST",headers:auth,body:JSON.stringify({kind:"cost",campaignId:1,category:"media",amount:5000,vendor:"Test Media",incurredAt:"2026-08-22"})});
  assert(response.ok,`Media cost failed with ${response.status}`);
  const media=await json(response);

  response=await fetch(`${BASE}/api/admin/finance`,{method:"POST",headers:auth,body:JSON.stringify({kind:"payment",campaignId:1,clientId:1,amount:70000,paidAt:"2026-08-22",reference:"FIN-SMOKE-001"})});
  assert(response.ok,`Client payment failed with ${response.status}`);
  const payment=await json(response);

  response=await fetch(`${BASE}/api/admin/finance`,{method:"POST",headers:auth,body:JSON.stringify({kind:"payment",campaignId:1,clientId:999,amount:1000})});
  assert(response.status===400,`Expected unlinked client payment 400, got ${response.status}`);

  response=await fetch(`${BASE}/api/admin/finance?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Finance summary reload failed with ${response.status}`);
  data=await json(response);
  assert(Number(data.totals.commercialValue)===150000,"Commercial value mismatch");
  assert(Number(data.totals.invoicedAmount)===120000,"Invoiced amount mismatch");
  assert(Number(data.totals.clientPaid)===70000,"Client paid mismatch");
  assert(Number(data.totals.clientOutstanding)===50000,"Client outstanding mismatch");
  assert(Number(data.totals.creatorCommitted)===25000,"Creator committed mismatch");
  assert(Number(data.totals.productionCosts)===10000,"Production cost mismatch");
  assert(Number(data.totals.manualMediaCosts)===5000,"Manual media cost mismatch");
  assert(Number(data.totals.boostedSpend)===0,"Expected remaining organic publication to contribute zero boosted spend");
  assert(Number(data.totals.totalCosts)===40000,"Total cost mismatch");
  assert(Number(data.totals.grossMargin)===110000,"Gross margin mismatch");

  response=await fetch(`${BASE}/api/admin/activity?campaignId=1`,{headers:{Cookie:cookie}});
  assert(response.ok,`Finance activity lookup failed with ${response.status}`);
  const events=(await json(response)).events||[],types=new Set(events.map(e=>e.event_type));
  for(const expected of ["finance.commercial_updated","finance.cost_added","finance.client_payment_added"])assert(types.has(expected),`Missing finance activity event: ${expected}`);

  for(const [kind,id] of [["cost",production.id],["cost",media.id],["payment",payment.id]]){
   response=await fetch(`${BASE}/api/admin/finance`,{method:"DELETE",headers:auth,body:JSON.stringify({kind,id})});
   assert(response.ok,`Finance ${kind} cleanup failed with ${response.status}`);
  }
  response=await fetch(`${BASE}/api/admin/logout`,{method:"POST",headers:{Cookie:cookie}});
  assert(response.ok,`Finance logout failed with ${response.status}`);
  console.log("\n✓ Finance Lite smoke test passed");
  console.log("✓ Verified commercial value, invoicing, client receipts, creator/campaign costs, margin math, linked-client guard and finance activity events");
 }finally{
  if(process.platform==="win32")spawnSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",shell:true});else server.kill("SIGTERM");
 }
}

main().catch(error=>{console.error("\n✗ Finance Lite smoke test failed");console.error(error);process.exitCode=1});
