import { getCloudflareContext } from "@opennextjs/cloudflare";

type R2StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
};
type R2HeadObject = { size: number };
type R2BucketLike = {
  put: (key:string,value:ArrayBuffer,options?:{httpMetadata?:{contentType?:string;contentDisposition?:string};customMetadata?:Record<string,string>})=>Promise<unknown>;
  get: (key:string,options?:{range?:{offset:number;length?:number}|{suffix:number}})=>Promise<R2StoredObject|null>;
  head: (key:string)=>Promise<R2HeadObject|null>;
  delete: (key:string)=>Promise<void>;
};
type Env = { VIRA_MEDIA?:R2BucketLike };

export function getMediaBucket(){
  try{
    const {env}=getCloudflareContext();
    return (env as unknown as Env).VIRA_MEDIA??null;
  }catch{return null}
}

export function safeMediaFileName(value:string){
  const cleaned=value.trim().replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  return (cleaned||"submission.bin").slice(-180);
}

export function mediaObjectKey(input:{campaignId:number;deliverableId:number;versionNumber:number;fileName:string}){
  const random=crypto.randomUUID();
  return `campaigns/${input.campaignId}/deliverables/${input.deliverableId}/v${input.versionNumber}/${random}-${safeMediaFileName(input.fileName)}`;
}

export function parseByteRange(header:string|null,size:number){
  if(!header||!header.startsWith("bytes="))return null;
  const raw=header.slice(6).split(",")[0]?.trim();
  if(!raw)return null;
  const [startRaw,endRaw]=raw.split("-");
  if(startRaw===""){
    const suffix=Number(endRaw);
    if(!Number.isInteger(suffix)||suffix<=0)return null;
    const length=Math.min(size,suffix);
    return {offset:size-length,length,end:size-1};
  }
  const offset=Number(startRaw);
  if(!Number.isInteger(offset)||offset<0||offset>=size)return null;
  const requestedEnd=endRaw===""?size-1:Number(endRaw);
  if(!Number.isInteger(requestedEnd)||requestedEnd<offset)return null;
  const end=Math.min(size-1,requestedEnd);
  return {offset,length:end-offset+1,end};
}
