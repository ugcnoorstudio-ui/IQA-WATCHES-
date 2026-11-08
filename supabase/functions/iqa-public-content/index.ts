import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = new Set(["https://ugcnoorstudio-ui.github.io", "https://iqa-watches-storefront.pages.dev"]);
function allowedOrigin(origin:string|null):boolean {
 return !!origin && (ALLOWED_ORIGINS.has(origin) || /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin));
}
function corsHeaders(origin:string|null):Record<string,string>{
 const headers:Record<string,string>={"Access-Control-Allow-Headers":"apikey, authorization, x-client-info","Access-Control-Allow-Methods":"GET, OPTIONS","Vary":"Origin"};
 if(allowedOrigin(origin))headers["Access-Control-Allow-Origin"]=origin;
 return headers;
}
function reply(status:number,body:Record<string,unknown>,origin:string|null){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 const send=(status:number,body:Record<string,unknown>)=>reply(status,body,origin);
 if(req.method==="OPTIONS"){
  if(origin&&!allowedOrigin(origin))return new Response("Origin not allowed.",{status:403});
  return new Response("ok",{headers:corsHeaders(origin)});
 }
 if(req.method!=="GET")return send(405,{ok:false,error:"Method not allowed."});
 if(origin&&!allowedOrigin(origin))return send(403,{ok:false,error:"Origin not allowed."});
 try{
  const now=new Date().toISOString();
  const admin=createClient(URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.from("content_entries")
   .select("content_type,slug,title,body,publish_at,updated_at")
   .in("content_type",["homepage_hero","collection","story"])
   .eq("state","published")
   .or("publish_at.is.null,publish_at.lte."+now)
   .order("updated_at",{ascending:false}).limit(30);
  if(error)throw error;
  const items=(data||[]).map(row=>({content_type:row.content_type,slug:row.slug,title:row.title,text:typeof row.body?.text==="string"?row.body.text:"",publish_at:row.publish_at,updated_at:row.updated_at}));
  return send(200,{ok:true,items,checked_at:now});
 }catch(_error){return send(503,{ok:false,error:"Published content is temporarily unavailable."});}
});
