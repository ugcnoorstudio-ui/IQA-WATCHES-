import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev",
]);
const cors={"Access-Control-Allow-Origin":"https://iqa-watches-storefront.pages.dev","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});}
Deno.serve(async(req:Request)=>{
 if (req.method === "OPTIONS") {
    return ALLOWED_ORIGINS.has(req.headers.get("origin") || "")
      ? new Response("ok", { headers: cors })
      : new Response("Forbidden", { status: 403 });
  }
 if(req.method!=="POST")return reply(405,{ok:false,error:"Method not allowed."});
 if(!ALLOWED_ORIGINS.has(req.headers.get("origin") || ""))return reply(403,{ok:false,error:"Origin not allowed."});
 const h=req.headers.get("Authorization")||"",token=h.startsWith("Bearer ")?h.slice(7):"";
 if(!token||token.length>8192)return reply(401,{ok:false,error:"Sign-in required."});
 try{
  const auth=createClient(URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ue}=await auth.auth.getUser(token);
  if(ue||!u.user)return reply(401,{ok:false,error:"Invalid or expired session."});
  const admin=createClient(URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:staff,error:se}=await admin.from("staff_profiles").select("user_id,role,active").eq("user_id",u.user.id).maybeSingle();
  if(se)throw se;
  if(!staff||staff.user_id!==u.user.id||staff.active!==true||staff.role!=="owner")return reply(403,{ok:false,error:"Active IQA WATCHES owner role required."});
  const raw=await req.text();
  if(raw.length>20000)return reply(413,{ok:false,error:"Request is too large."});
  let body:Record<string,unknown>|null=null;
  try{body=JSON.parse(raw);}catch{return reply(400,{ok:false,error:"Invalid JSON body."});}
  if(!body||typeof body!=="object"||Array.isArray(body)||typeof body.action!=="string"||!body.payload||typeof body.payload!=="object"||Array.isArray(body.payload))return reply(400,{ok:false,error:"Invalid request body."});
  const updateActions=["update_product","update_product_variant"];
  const taxonomyActions=["update_category","archive_category","update_brand","archive_brand"];
  const orderAction="update_order_status";
  const contentAction="manage_content";
  const allowed=["create_product","adjust_inventory","create_category","create_brand","assign_product_taxonomy","publish_product",...updateActions,...taxonomyActions,orderAction,contentAction];
  if(!allowed.includes(body.action))return reply(400,{ok:false,error:"This action is not enabled yet."});
  const rpcName=updateActions.includes(body.action)
    ? (body.action==="update_product"?"iqa_update_product":"iqa_update_product_variant")
    : taxonomyActions.includes(body.action)?"iqa_manage_taxonomy"
    : body.action===orderAction?"iqa_admin_update_order_status"
    : body.action===contentAction?"iqa_manage_content"
    : "iqa_admin_mutate";
  const rpcPayload=taxonomyActions.includes(body.action)?{...body.payload,action:body.action.startsWith("update_")?"update":"archive",kind:body.action.endsWith("_category")?"category":"brand"}:body.payload;
  const rpcArgs=body.action===orderAction
    ? {p_actor:u.user.id,p_order_id:body.payload.order_id,p_new_state:body.payload.state,p_reason:body.payload.reason}
    : rpcName==="iqa_admin_mutate"?{p_action:body.action,p_actor:u.user.id,p_payload:rpcPayload}:{p_actor:u.user.id,p_payload:rpcPayload};
  const {data,error}=await admin.rpc(rpcName,rpcArgs);
  if(error)return reply(400,{ok:false,error:String(error.message||"Operation failed.").slice(0,240)});
  return reply(200,data&&data.ok===true?data:{ok:false,error:"Operation was not confirmed."});
 }catch(_e){return reply(500,{ok:false,error:"Administrative operation failed. Check server logs."});}
});