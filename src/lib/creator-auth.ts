import { cookies } from "next/headers";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const COOKIE="vira_creator";

function bytesHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function digest(value:string){const data=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",data);return bytesHex(new Uint8Array(hash))}
function randomCode(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(a[0]%1000000).padStart(6,"0")}
function randomToken(){const a=new Uint8Array(32);crypto.getRandomValues(a);return bytesHex(a)}

export type PortalCreator={id:number;full_name:string;email:string;phone:string;city:string;tiktok:string;status:string};

export async function requestCreatorCode(email:string){
 const db=getOpsDb();if(!db)return {ok:false,reason:'DB_NOT_CONFIGURED' as const};
 const creator=await db.prepare("SELECT id,full_name,email,phone,city,tiktok,status FROM creators WHERE LOWER(email)=LOWER(?) AND status='approved' LIMIT 1").bind(email.trim()).first<PortalCreator>();
 if(!creator)return {ok:true,sent:false as const};
 const recent=await db.prepare("SELECT created_at FROM creator_login_codes WHERE creator_id=?").bind(creator.id).first<{created_at:string}>();
 if(recent&&Date.now()-new Date(recent.created_at+'Z').getTime()<60000)return {ok:true,sent:false as const};
 const code=randomCode(),hash=await digest(`vira-creator-code:${creator.id}:${code}`);
 await db.prepare("INSERT INTO creator_login_codes (creator_id,code_hash,expires_at,attempts,created_at) VALUES (?,?,datetime('now','+10 minutes'),0,CURRENT_TIMESTAMP) ON CONFLICT(creator_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=CURRENT_TIMESTAMP").bind(creator.id,hash).run();
 const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><p style="font-size:12px;letter-spacing:.12em;color:#fe2c55;font-weight:700">VIRA NETWORK</p><h2>Your creator portal code</h2><p>Hi ${creator.full_name}, use this code to sign in to your Vira creator portal:</p><div style="font-size:34px;font-weight:800;letter-spacing:.18em;padding:18px 0">${code}</div><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`;
 const sent=await sendEmailTo(creator.email,"Your Vira creator portal code",html);
 return {ok:true,sent:sent.ok};
}

export async function verifyCreatorCode(email:string,code:string){
 const db=getOpsDb();if(!db)return {ok:false,reason:'DB_NOT_CONFIGURED' as const};
 const creator=await db.prepare("SELECT id,full_name,email,phone,city,tiktok,status FROM creators WHERE LOWER(email)=LOWER(?) AND status='approved' LIMIT 1").bind(email.trim()).first<PortalCreator>();
 if(!creator)return {ok:false,reason:'INVALID' as const};
 const row=await db.prepare("SELECT code_hash,expires_at,attempts FROM creator_login_codes WHERE creator_id=?").bind(creator.id).first<{code_hash:string;expires_at:string;attempts:number}>();
 if(!row||row.attempts>=5)return {ok:false,reason:'INVALID' as const};
 if(new Date(row.expires_at+'Z').getTime()<Date.now()){await db.prepare("DELETE FROM creator_login_codes WHERE creator_id=?").bind(creator.id).run();return {ok:false,reason:'EXPIRED' as const}}
 const hash=await digest(`vira-creator-code:${creator.id}:${code}`);
 if(hash!==row.code_hash){await db.prepare("UPDATE creator_login_codes SET attempts=attempts+1 WHERE creator_id=?").bind(creator.id).run();return {ok:false,reason:'INVALID' as const}}
 const token=randomToken(),tokenHash=await digest(`vira-creator-session:${token}`);
 await db.prepare("DELETE FROM creator_login_codes WHERE creator_id=?").bind(creator.id).run();
 await db.prepare("DELETE FROM creator_sessions WHERE creator_id=? OR datetime(expires_at) < datetime('now')").bind(creator.id).run();
 await db.prepare("INSERT INTO creator_sessions (token_hash,creator_id,expires_at) VALUES (?,?,datetime('now','+7 days'))").bind(tokenHash,creator.id).run();
 const jar=await cookies();jar.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
 return {ok:true,creator};
}

export async function getCreatorSession(){
 const jar=await cookies();const token=jar.get(COOKIE)?.value;if(!token)return null;
 const db=getOpsDb();if(!db)return null;const hash=await digest(`vira-creator-session:${token}`);
 const creator=await db.prepare(`SELECT c.id,c.full_name,c.email,c.phone,c.city,c.tiktok,c.status FROM creator_sessions s JOIN creators c ON c.id=s.creator_id WHERE s.token_hash=? AND datetime(s.expires_at)>datetime('now') AND c.status='approved'`).bind(hash).first<PortalCreator>();
 return creator||null;
}

export async function clearCreatorSession(){
 const jar=await cookies();const token=jar.get(COOKIE)?.value;const db=getOpsDb();if(token&&db){const hash=await digest(`vira-creator-session:${token}`);await db.prepare("DELETE FROM creator_sessions WHERE token_hash=?").bind(hash).run()}
 jar.set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
}
