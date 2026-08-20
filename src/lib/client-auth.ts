import { cookies } from "next/headers";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const COOKIE="vira_client";

function bytesHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function digest(value:string){const data=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",data);return bytesHex(new Uint8Array(hash))}
function randomCode(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(a[0]%1000000).padStart(6,"0")}
function randomToken(){const a=new Uint8Array(32);crypto.getRandomValues(a);return bytesHex(a)}

export type PortalClient={id:number;company:string;contact_name:string;email:string;phone:string;status:string};

export async function requestClientCode(email:string){
 const db=getOpsDb();if(!db)return {ok:false,reason:'DB_NOT_CONFIGURED' as const};
 const client=await db.prepare("SELECT id,company,contact_name,email,phone,status FROM clients WHERE LOWER(email)=LOWER(?) AND status='active' LIMIT 1").bind(email.trim()).first<PortalClient>();
 if(!client)return {ok:true,sent:false as const};
 const recent=await db.prepare("SELECT created_at FROM client_login_codes WHERE client_id=?").bind(client.id).first<{created_at:string}>();
 if(recent&&Date.now()-new Date(recent.created_at+'Z').getTime()<60000)return {ok:true,sent:false as const};
 const code=randomCode(),hash=await digest(`vira-client-code:${client.id}:${code}`);
 await db.prepare("INSERT INTO client_login_codes (client_id,code_hash,expires_at,attempts,created_at) VALUES (?,?,datetime('now','+10 minutes'),0,CURRENT_TIMESTAMP) ON CONFLICT(client_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=CURRENT_TIMESTAMP").bind(client.id,hash).run();
 const site=process.env.VIRA_SITE_URL||'https://viramedia.stephen-gitau.workers.dev';
 const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><p style="font-size:12px;letter-spacing:.12em;color:#25f4ee;font-weight:700">VIRA MEDIA</p><h2>Your client portal code</h2><p>Hi ${client.contact_name}, use this code to sign in to the Vira client portal for ${client.company}:</p><div style="font-size:34px;font-weight:800;letter-spacing:.18em;padding:18px 0">${code}</div><p>This code expires in 10 minutes.</p><p><a href="${site}/client/login">Open Client Portal</a></p></div>`;
 const sent=await sendEmailTo(client.email,"Your Vira client portal code",html);
 return {ok:true,sent:sent.ok};
}

export async function verifyClientCode(email:string,code:string){
 const db=getOpsDb();if(!db)return {ok:false,reason:'DB_NOT_CONFIGURED' as const};
 const client=await db.prepare("SELECT id,company,contact_name,email,phone,status FROM clients WHERE LOWER(email)=LOWER(?) AND status='active' LIMIT 1").bind(email.trim()).first<PortalClient>();
 if(!client)return {ok:false,reason:'INVALID' as const};
 const row=await db.prepare("SELECT code_hash,expires_at,attempts FROM client_login_codes WHERE client_id=?").bind(client.id).first<{code_hash:string;expires_at:string;attempts:number}>();
 if(!row||row.attempts>=5)return {ok:false,reason:'INVALID' as const};
 if(new Date(row.expires_at+'Z').getTime()<Date.now()){await db.prepare("DELETE FROM client_login_codes WHERE client_id=?").bind(client.id).run();return {ok:false,reason:'EXPIRED' as const}}
 const hash=await digest(`vira-client-code:${client.id}:${code}`);
 if(hash!==row.code_hash){await db.prepare("UPDATE client_login_codes SET attempts=attempts+1 WHERE client_id=?").bind(client.id).run();return {ok:false,reason:'INVALID' as const}}
 const token=randomToken(),tokenHash=await digest(`vira-client-session:${token}`);
 await db.prepare("DELETE FROM client_login_codes WHERE client_id=?").bind(client.id).run();
 await db.prepare("DELETE FROM client_sessions WHERE client_id=? OR datetime(expires_at) < datetime('now')").bind(client.id).run();
 await db.prepare("INSERT INTO client_sessions (token_hash,client_id,expires_at) VALUES (?,?,datetime('now','+7 days'))").bind(tokenHash,client.id).run();
 const jar=await cookies();jar.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
 return {ok:true,client};
}

export async function getClientSession(){
 const jar=await cookies();const token=jar.get(COOKIE)?.value;if(!token)return null;
 const db=getOpsDb();if(!db)return null;const hash=await digest(`vira-client-session:${token}`);
 return await db.prepare(`SELECT c.id,c.company,c.contact_name,c.email,c.phone,c.status FROM client_sessions s JOIN clients c ON c.id=s.client_id WHERE s.token_hash=? AND datetime(s.expires_at)>datetime('now') AND c.status='active'`).bind(hash).first<PortalClient>();
}

export async function clearClientSession(){
 const jar=await cookies();const token=jar.get(COOKIE)?.value;const db=getOpsDb();if(token&&db){const hash=await digest(`vira-client-session:${token}`);await db.prepare("DELETE FROM client_sessions WHERE token_hash=?").bind(hash).run()}
 jar.set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
}
