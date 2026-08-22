import openNextWorker from "./.open-next/worker.js";

function esc(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function site(env){return String(env.VIRA_SITE_URL||"https://viramedia.stephen-gitau.workers.dev").replace(/\/$/,"")}
function today(){return new Date().toISOString().slice(0,10)}

async function sendEmail(env,to,subject,html){
  if(!env.RESEND_API_KEY||!env.VIRA_FROM_EMAIL||!to)return false;
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:env.VIRA_FROM_EMAIL,to:[to],subject,html})});
  return r.ok;
}

async function sendOnce(env,input){
  if(!env.VIRA_DB||!input.to)return false;
  const claim=await env.VIRA_DB.prepare(`INSERT OR IGNORE INTO notification_log (notification_key,recipient_type,recipient_id,recipient_email,campaign_id,deliverable_id,kind,metadata_json) VALUES (?,?,?,?,?,?,?,?)`).bind(input.key,input.recipientType,input.recipientId??null,input.to,input.campaignId??null,input.deliverableId??null,input.kind,JSON.stringify(input.metadata||{})).run();
  if(Number(claim?.meta?.changes||0)===0)return false;
  const sent=await sendEmail(env,input.to,input.subject,input.html);
  if(!sent){await env.VIRA_DB.prepare("DELETE FROM notification_log WHERE notification_key=?").bind(input.key).run();return false}
  return true;
}

async function creatorDeadlineReminders(env){
  const rows=(await env.VIRA_DB.prepare(`SELECT d.id,d.title,d.due_date,camp.id campaign_id,camp.name campaign_name,c.id creator_id,c.full_name,c.email FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id JOIN creators c ON c.id=d.creator_id WHERE c.status='approved' AND d.status IN ('pending','in_progress','changes_requested') AND d.due_date IS NOT NULL AND date(d.due_date)=date('now','+1 day')`).all()).results||[];
  for(const row of rows)await sendOnce(env,{key:`creator_due_tomorrow:${row.id}:${row.due_date}`,recipientType:"creator",recipientId:row.creator_id,to:row.email,campaignId:row.campaign_id,deliverableId:row.id,kind:"creator_due_tomorrow",subject:`Due tomorrow — ${row.campaign_name}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Deliverable due tomorrow</h2><p>Hi ${esc(row.full_name)}, <strong>${esc(row.title)}</strong> for <strong>${esc(row.campaign_name)}</strong> is due on <strong>${esc(row.due_date)}</strong>.</p><p><a href="${site(env)}/portal/campaigns/${row.campaign_id}">Open Creator Portal</a></p></div>`,metadata:{dueDate:row.due_date}});
}

async function creatorOverdueReminders(env){
  const rows=(await env.VIRA_DB.prepare(`SELECT d.id,d.title,d.due_date,camp.id campaign_id,camp.name campaign_name,c.id creator_id,c.full_name,c.email FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id JOIN creators c ON c.id=d.creator_id WHERE c.status='approved' AND d.status IN ('pending','in_progress','changes_requested') AND d.due_date IS NOT NULL AND date(d.due_date)<date('now')`).all()).results||[];
  const day=today();
  for(const row of rows)await sendOnce(env,{key:`creator_overdue:${row.id}:${day}`,recipientType:"creator",recipientId:row.creator_id,to:row.email,campaignId:row.campaign_id,deliverableId:row.id,kind:"creator_overdue",subject:`Overdue deliverable — ${row.campaign_name}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Deliverable overdue</h2><p>Hi ${esc(row.full_name)}, <strong>${esc(row.title)}</strong> for <strong>${esc(row.campaign_name)}</strong> was due on <strong>${esc(row.due_date)}</strong>.</p><p>Please update or submit it in Vira.</p><p><a href="${site(env)}/portal/campaigns/${row.campaign_id}">Open Creator Portal</a></p></div>`,metadata:{dueDate:row.due_date,runDate:day}});
}

async function clientReviewReminders(env){
  const rows=(await env.VIRA_DB.prepare(`SELECT d.id,d.title,d.campaign_id,camp.name campaign_name,c.id client_id,c.company,c.contact_name,c.email FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id JOIN campaign_clients cc ON cc.campaign_id=camp.id JOIN clients c ON c.id=cc.client_id WHERE d.client_approval_status='awaiting_client' AND d.client_submission_version_id IS NOT NULL AND datetime(d.updated_at)<=datetime('now','-2 days') AND c.status='active'`).all()).results||[];
  const day=today();
  for(const row of rows)await sendOnce(env,{key:`client_review_overdue:${row.id}:${row.client_id}:${day}`,recipientType:"client",recipientId:row.client_id,to:row.email,campaignId:row.campaign_id,deliverableId:row.id,kind:"client_review_overdue",subject:`Review reminder — ${row.campaign_name}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Content is waiting for your review</h2><p>Hi ${esc(row.contact_name)}, <strong>${esc(row.title)}</strong> for <strong>${esc(row.campaign_name)}</strong> is still awaiting your decision.</p><p><a href="${site(env)}/client/campaigns/${row.campaign_id}">Review content</a></p></div>`,metadata:{runDate:day}});
}

async function adminPaymentAlerts(env){
  const inbox=env.VIRA_INBOX||"hello@viramedia.co.ke";
  const rows=(await env.VIRA_DB.prepare(`SELECT d.id,d.title,d.creator_fee,d.payment_status,camp.id campaign_id,camp.name campaign_name,c.full_name creator_name FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id LEFT JOIN creators c ON c.id=d.creator_id WHERE d.status='done' AND d.creator_fee>0 AND d.payment_status!='paid'`).all()).results||[];
  for(const row of rows)await sendOnce(env,{key:`admin_creator_payment_due:${row.id}`,recipientType:"admin",recipientId:null,to:inbox,campaignId:row.campaign_id,deliverableId:row.id,kind:"admin_creator_payment_due",subject:`Creator payment due — ${row.campaign_name}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Creator payment needs attention</h2><p><strong>${esc(row.creator_name||"Creator")}</strong> completed <strong>${esc(row.title)}</strong> for <strong>${esc(row.campaign_name)}</strong>.</p><p>Creator fee: <strong>KES ${Number(row.creator_fee||0).toLocaleString("en-KE")}</strong></p><p><a href="${site(env)}/admin/campaigns/${row.campaign_id}">Open campaign finance</a></p></div>`,metadata:{creatorFee:row.creator_fee,paymentStatus:row.payment_status}});
}

async function adminCampaignStartAlerts(env){
  const inbox=env.VIRA_INBOX||"hello@viramedia.co.ke";
  const rows=(await env.VIRA_DB.prepare(`SELECT id,name,start_date,status FROM campaigns WHERE status IN ('planning','active') AND start_date IS NOT NULL AND date(start_date)=date('now','+1 day')`).all()).results||[];
  for(const row of rows)await sendOnce(env,{key:`admin_campaign_starts_tomorrow:${row.id}:${row.start_date}`,recipientType:"admin",recipientId:null,to:inbox,campaignId:row.id,kind:"admin_campaign_starts_tomorrow",subject:`Campaign starts tomorrow — ${row.name}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Campaign starts tomorrow</h2><p><strong>${esc(row.name)}</strong> is scheduled to start on <strong>${esc(row.start_date)}</strong>.</p><p><a href="${site(env)}/admin/campaigns/${row.id}">Open campaign workspace</a></p></div>`,metadata:{startDate:row.start_date,status:row.status}});
}

async function runWorkflowAutomation(env){
  if(!env.VIRA_DB)return;
  await creatorDeadlineReminders(env);
  await creatorOverdueReminders(env);
  await clientReviewReminders(env);
  await adminPaymentAlerts(env);
  await adminCampaignStartAlerts(env);
}

const worker={
  fetch(request,env,ctx){return openNextWorker.fetch(request,env,ctx)},
  scheduled(controller,env,ctx){ctx.waitUntil(runWorkflowAutomation(env))}
};

export default worker;
