import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev"
]);
function allowedOrigin(origin:string|null):string|null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Only the documented PR preview hostname pattern is accepted.
  return /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin) ? origin : null;
}
function headers(origin:string|null):Record<string,string> {
  const result:Record<string,string> = {
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json",
    "Cache-Control":"no-store"
  };
  if (origin) result["Access-Control-Allow-Origin"]=origin;
  return result;
}
function reply(status:number,body:Record<string,unknown>,origin:string|null) {
  return new Response(JSON.stringify(body),{status,headers:headers(origin)});
}
Deno.serve(async(req:Request)=>{
 const origin=allowedOrigin(req.headers.get("origin"));
 if(req.method==="OPTIONS") {
  if(!origin) return new Response("Origin not allowed.",{status:403});
  return new Response("ok",{headers:headers(origin)});
 }
 if(req.method!=="POST")return reply(405,{ok:false,error:"Method not allowed."},origin);
 if(!origin)return reply(403,{ok:false,error:"Origin not allowed."},null);
 const h=req.headers.get("Authorization")||"",token=h.startsWith("Bearer ")?h.slice(7):"";
 if(!token||token.length>8192)return reply(401,{ok:false,error:"Sign-in required."},origin);
 try{
  const auth=createClient(URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ue}=await auth.auth.getUser(token);
  if(ue||!u.user)return reply(401,{ok:false,error:"Invalid or expired session."},origin);
  const admin=createClient(URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:staff,error:se}=await admin.from("staff_profiles").select("user_id,role,active").eq("user_id",u.user.id).maybeSingle();
  if(se)throw se;
  if(!staff||staff.user_id!==u.user.id||staff.active!==true||staff.role!=="owner")return reply(403,{ok:false,error:"Active IQA WATCHES owner role required."},origin);
  const raw=await req.text();
  if(raw.length>20000)return reply(413,{ok:false,error:"Request is too large."},origin);
  let body:Record<string,unknown>|null=null;
  try{body=JSON.parse(raw);}catch{return reply(400,{ok:false,error:"Invalid JSON body."},origin);}
  if(!body||typeof body!=="object"||Array.isArray(body)||typeof body.action!=="string"||!body.payload||typeof body.payload!=="object"||Array.isArray(body.payload))return reply(400,{ok:false,error:"Invalid request body."},origin);

  const updateActions=["update_product","update_product_variant"];
  const taxonomyActions=["update_category","archive_category","update_brand","archive_brand"];
  const allowed=["create_product","adjust_inventory","create_category","create_brand","assign_product_taxonomy","publish_product",...updateActions,...taxonomyActions,"manage_content","update_order_status"];
  if(!allowed.includes(body.action))return reply(400,{ok:false,error:"This action is not enabled yet."},origin);

  const action=body.action;
  const payload=body.payload as Record<string,unknown>;
  let rpcName:string;
  let rpcArgs:Record<string,unknown>;
  if(action==="manage_content") {
    rpcName="iqa_manage_content";
    rpcArgs={p_actor:u.user.id,p_payload:payload};
  } else if(action==="update_order_status") {
    if(typeof payload.order_id!=="string"||typeof payload.state!=="string"||typeof payload.reason!=="string")
      return reply(400,{ok:false,error:"Order ID, target state and reason are required."},origin);
    rpcName="iqa_admin_update_order_status";
    rpcArgs={p_actor:u.user.id,p_order_id:payload.order_id,p_new_state:payload.state,p_reason:payload.reason};
  } else {
    rpcName=updateActions.includes(action)?(action==="update_product"?"iqa_update_product":"iqa_update_product_variant"):taxonomyActions.includes(action)?"iqa_manage_taxonomy":"iqa_admin_mutate";
    const rpcPayload=taxonomyActions.includes(action)?{...payload,action:action.startsWith("update_")?"update":"archive",kind:action.endsWith("_category")?"category":"brand"}:payload;
    rpcArgs=rpcName==="iqa_admin_mutate"?{p_action:action,p_actor:u.user.id,p_payload:rpcPayload}:{p_actor:u.user.id,p_payload:rpcPayload};
  }
  const {data,error}=await admin.rpc(rpcName,rpcArgs);
  if(error)return reply(400,{ok:false,error:String(error.message||"Operation failed.").slice(0,240)},origin);
  return reply(200,data&&data.ok===true?data:{ok:false,error:"Operation was not confirmed."},origin);
 }catch(_e){return reply(500,{ok:false,error:"Administrative operation failed. Check server logs."},origin);}
});
