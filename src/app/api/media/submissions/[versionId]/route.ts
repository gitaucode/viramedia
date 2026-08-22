import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getClientSession } from "@/lib/client-auth";
import { getCreatorSession } from "@/lib/creator-auth";
import { getMediaBucket,parseByteRange } from "@/lib/media-storage";
import { getOpsDb } from "@/lib/ops-db";

type VersionAccess={id:number;deliverable_id:number;creator_id:number;source_type:string;r2_key:string|null;file_name:string|null;mime_type:string|null;file_size:number|null;campaign_id:number};

export async function GET(request:Request,{params}:{params:Promise<{versionId:string}>}){
  const {versionId}=await params,id=Number(versionId);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid submission version'},{status:400});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  const version=await db.prepare(`SELECT sv.id,sv.deliverable_id,sv.creator_id,sv.source_type,sv.r2_key,sv.file_name,sv.mime_type,sv.file_size,d.campaign_id FROM submission_versions sv JOIN deliverables d ON d.id=sv.deliverable_id WHERE sv.id=?`).bind(id).first<VersionAccess>();
  if(!version||version.source_type!=='r2'||!version.r2_key)return NextResponse.json({error:'Media not found'},{status:404});

  let allowed=await isAdminAuthenticated();
  if(!allowed){const creator=await getCreatorSession();allowed=Boolean(creator&&creator.id===version.creator_id)}
  if(!allowed){const client=await getClientSession();if(client){const linked=await db.prepare('SELECT 1 ok FROM campaign_clients WHERE campaign_id=? AND client_id=?').bind(version.campaign_id,client.id).first<{ok:number}>();allowed=Boolean(linked)}}
  if(!allowed)return NextResponse.json({error:'Unauthorized'},{status:401});

  const bucket=getMediaBucket();if(!bucket)return NextResponse.json({error:'Media storage is unavailable'},{status:503});
  const head=await bucket.head(version.r2_key);if(!head)return NextResponse.json({error:'Media not found'},{status:404});
  const size=Number(version.file_size||head.size||0),range=parseByteRange(request.headers.get('range'),size);
  const object=await bucket.get(version.r2_key,range?{range:{offset:range.offset,length:range.length}}:undefined);
  if(!object)return NextResponse.json({error:'Media not found'},{status:404});

  const headers=new Headers();
  headers.set('Content-Type',version.mime_type||'application/octet-stream');
  headers.set('Content-Disposition',`inline; filename="${(version.file_name||'submission').replaceAll('"','')}"`);
  headers.set('Accept-Ranges','bytes');
  headers.set('Cache-Control','private, no-store');
  if(range){headers.set('Content-Range',`bytes ${range.offset}-${range.end}/${size}`);headers.set('Content-Length',String(range.length));return new Response(object.body,{status:206,headers})}
  headers.set('Content-Length',String(size));
  return new Response(object.body,{status:200,headers});
}
