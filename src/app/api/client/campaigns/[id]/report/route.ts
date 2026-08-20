import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getClientSession } from "@/lib/client-auth";
import { getOpsDb } from "@/lib/ops-db";

const n=(v:unknown)=>Number(v||0);
const fmt=(v:number)=>new Intl.NumberFormat('en-KE').format(Math.round(v));

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const client=await getClientSession();if(!client)return new Response('Unauthorized',{status:401});
 const db=getOpsDb();if(!db)return new Response('Database unavailable',{status:503});
 const {id}=await params,campaignId=Number(id);if(!Number.isInteger(campaignId)||campaignId<1)return new Response('Invalid campaign',{status:400});
 const campaign=await db.prepare(`SELECT s.id,s.name,s.client,s.client_objective,s.report_summary,s.report_insights,s.report_recommendations,s.status,s.start_date,s.end_date FROM campaign_clients cc JOIN shortlists s ON s.id=cc.campaign_id WHERE cc.client_id=? AND s.id=?`).bind(client.id,campaignId).first<Record<string,unknown>>();
 if(!campaign)return new Response('Not found',{status:404});
 const r=await db.prepare(`SELECT d.title,d.submission_url,d.client_approval_status,c.full_name creator_name,COALESCE(pm.views,0) views,COALESCE(pm.reach,0) reach,COALESCE(pm.impressions,0) impressions,COALESCE(pm.likes,0) likes,COALESCE(pm.comments,0) comments,COALESCE(pm.shares,0) shares,COALESCE(pm.saves,0) saves,COALESCE(pm.clicks,0) clicks,COALESCE(pm.conversions,0) conversions,COALESCE(pm.spend,0) spend FROM deliverables d LEFT JOIN creators c ON c.id=d.creator_id LEFT JOIN performance_metrics pm ON pm.deliverable_id=d.id WHERE d.campaign_id=? AND d.status IN ('approved','done') AND d.client_approval_status!='not_ready' ORDER BY d.id`).bind(campaignId).all<Record<string,unknown>>();
 const rows=r.results||[];
 const totals=rows.reduce((a,x)=>({views:a.views+n(x.views),reach:a.reach+n(x.reach),impressions:a.impressions+n(x.impressions),likes:a.likes+n(x.likes),comments:a.comments+n(x.comments),shares:a.shares+n(x.shares),saves:a.saves+n(x.saves),clicks:a.clicks+n(x.clicks),conversions:a.conversions+n(x.conversions),spend:a.spend+n(x.spend)}),{views:0,reach:0,impressions:0,likes:0,comments:0,shares:0,saves:0,clicks:0,conversions:0,spend:0});
 const engagements=totals.likes+totals.comments+totals.shares+totals.saves,engagementRate=totals.reach?engagements/totals.reach*100:0;
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage([595.28,841.89]),y=792;
 const dark=rgb(.06,.06,.06),muted=rgb(.42,.42,.42),cyan=rgb(.145,.957,.933),pink=rgb(.996,.173,.333);
 const newPage=()=>{page=pdf.addPage([595.28,841.89]);y=792};
 const ensure=(h:number)=>{if(y-h<54)newPage()};
 const wrap=(text:string,max=82)=>{const words=String(text||'').replace(/\s+/g,' ').trim().split(' '),lines:string[]=[];let line='';for(const word of words){const test=(line+' '+word).trim();if(test.length>max&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);return lines};
 const text=(value:string,size=10,opts:{bold?:boolean;color?:ReturnType<typeof rgb>;gap?:number;max?:number}={})=>{const lines=wrap(value,opts.max||88);ensure(lines.length*(size+4)+8);for(const line of lines){page.drawText(line,{x:52,y,size,font:opts.bold?bold:font,color:opts.color||dark});y-=size+4}y-=opts.gap??6};
 const label=(value:string)=>{ensure(24);page.drawText(value.toUpperCase(),{x:52,y,size:8,font:bold,color:pink});y-=20};
 page.drawText('VIRA MEDIA',{x:52,y,size:18,font:bold,color:dark});page.drawText('CAMPAIGN REPORT',{x:424,y,size:8,font:bold,color:cyan});y-=55;
 text(String(campaign.name||'Campaign'),27,{bold:true,max:36,gap:4});text(String(campaign.client||client.company),12,{color:muted,gap:18});
 label('Campaign overview');text(String(campaign.client_objective||'Campaign objective not yet added.'),11,{max:86,gap:12});text(`${String(campaign.start_date||'Start TBD')} - ${String(campaign.end_date||'End TBD')}`,9,{color:muted,gap:20});
 label('Performance summary');
 const cards=[['Views',fmt(totals.views)],['Reach',fmt(totals.reach)],['Engagements',fmt(engagements)],['Eng. rate',`${engagementRate.toFixed(1)}%`],['Clicks',fmt(totals.clicks)],['Conversions',fmt(totals.conversions)]];let x=52;ensure(76);for(const [k,v] of cards){page.drawRectangle({x,y:y-42,width:78,height:52,borderColor:rgb(.82,.82,.82),borderWidth:.7});page.drawText(k,{x:x+8,y:y-6,size:7,font:bold,color:muted});page.drawText(v,{x:x+8,y:y-27,size:13,font:bold,color:dark});x+=84}y-=70;
 if(String(campaign.report_summary||'').trim()){label('Executive summary');text(String(campaign.report_summary),10,{max:90,gap:18})}
 label('Content performance');
 if(!rows.length)text('No approved campaign content has been added to this report yet.',10,{color:muted,gap:12});
 for(const row of rows){ensure(104);page.drawLine({start:{x:52,y},end:{x:543,y},thickness:.6,color:rgb(.82,.82,.82)});y-=18;text(String(row.title||'Deliverable'),12,{bold:true,gap:1,max:55});text(String(row.creator_name||'Creator'),9,{color:muted,gap:5});text(`Views ${fmt(n(row.views))}   Reach ${fmt(n(row.reach))}   Likes ${fmt(n(row.likes))}   Comments ${fmt(n(row.comments))}   Shares ${fmt(n(row.shares))}   Clicks ${fmt(n(row.clicks))}`,8,{color:muted,max:105,gap:10})}
 if(String(campaign.report_insights||'').trim()){label('Key insights');text(String(campaign.report_insights),10,{max:90,gap:18})}
 if(String(campaign.report_recommendations||'').trim()){label('Recommendations');text(String(campaign.report_recommendations),10,{max:90,gap:18})}
 ensure(50);page.drawLine({start:{x:52,y},end:{x:543,y},thickness:.6,color:rgb(.82,.82,.82)});y-=20;page.drawText('Prepared by Vira Media',{x:52,y,size:8,font:bold,color:muted});page.drawText('Creator-led campaigns. Short-form content. Kenya.',{x:310,y,size:8,font,color:muted});
 const bytes=await pdf.save(),safe=String(campaign.name||'campaign').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${safe||'campaign'}-report.pdf"`,'Cache-Control':'private, no-store'}});
}
