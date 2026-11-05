import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const ORIGIN = "https://ugcnoorstudio-ui.github.io";
const CORS = {"Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin"};
const env = (k: string) => Deno.env.get(k)?.trim() || "";
function out(body: unknown, status = 200) { return new Response(JSON.stringify(body), {status, headers: {...CORS, "Content-Type":"application/json", "Cache-Control":"no-store"}}); }
async function sha1(s: string) { const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2,"0")).join(""); }
function sig(p: Record<string,string>) { return Object.keys(p).sort().map(k => k+"="+p[k]).join("&"); }
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:CORS});
  if (req.method !== "POST") return out({error:"POST required"},405);
  if (req.headers.get("origin") !== ORIGIN) return out({error:"Origin not allowed"},403);
  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return out({error:"Sign in required"},401);
  const url=env("SUPABASE_URL"), anon=env("SUPABASE_ANON_KEY"), service=env("SUPABASE_SERVICE_ROLE_KEY"), cloud=env("CLOUDINARY_CLOUD_NAME"), apiKey=env("CLOUDINARY_API_KEY"), secret=env("CLOUDINARY_API_SECRET");
  const missing=[["SUPABASE_URL",url],["SUPABASE_ANON_KEY",anon],["SUPABASE_SERVICE_ROLE_KEY",service],["CLOUDINARY_CLOUD_NAME",cloud],["CLOUDINARY_API_KEY",apiKey],["CLOUDINARY_API_SECRET",secret]].filter(([,v])=>!v).map(([k])=>k);
  if (missing.length) return out({error:"Missing required function secrets",missing},503);
  const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+bearer[1]}});
  if (!auth.ok) return out({error:"Invalid or expired session"},401);
  const user=await auth.json();
  const h={apikey:service,Authorization:"Bearer "+service};
  const prof=await fetch(url+"/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq."+encodeURIComponent(user.id),{headers:{...h,Accept:"application/json"}});
  if (!prof.ok) return out({error:"Could not verify owner profile"},502);
  const profiles=await prof.json();
  if (!Array.isArray(profiles)||profiles.length!==1||profiles[0].role!=="owner"||profiles[0].active!==true) return out({error:"Active owner required"},403);
  const mr=await fetch(url+"/rest/v1/product_media?select=id,product_id,bucket_id,storage_path,image_url,cloudinary_public_id,alt_text,is_primary&bucket_id=eq.product-images&order=created_at.asc",{headers:{...h,Accept:"application/json"}});
  if (!mr.ok) return out({error:"Could not read product_media: "+await mr.text()},502);
  const rows=await mr.json();
  const results=[];
  for (const row of rows) {
    const path=String(row.storage_path||"");
    // Check Cloudinary registration before requiring the legacy Storage path.
    // Already-migrated rows can legitimately have a null storage_path after
    // their legacy object reference is detached; they must count as complete.
    if (row.image_url && String(row.image_url).includes("res.cloudinary.com") && row.cloudinary_public_id) { results.push({id:row.id,path: path || null,status:"already_migrated"}); continue; }
    if (!path) { results.push({id:row.id,status:"missing_storage_path"}); continue; }
    const download=await fetch(url+"/storage/v1/object/"+encodeURIComponent(row.bucket_id)+"/"+path.split("/").map(encodeURIComponent).join("/"),{headers:h});
    if (!download.ok) { results.push({id:row.id,path,status:"download_failed",error:(await download.text()).slice(0,300)}); continue; }
    const blob=await download.blob();
    const base=(path.split("/").pop()||crypto.randomUUID()).replace(/\.[^.]+$/,"").replace(/[^A-Za-z0-9_-]/g,"_");
    const publicId=base+"_"+(await sha1(path)).slice(0,8);
    const timestamp=String(Math.floor(Date.now()/1000));
    const params={folder:"iqa-watches/products",public_id:publicId,timestamp};
    const signature=await sha1(sig(params)+secret);
    const form=new FormData();
    form.set("file",blob,path.split("/").pop()||"image");
    form.set("folder",params.folder); form.set("public_id",publicId); form.set("timestamp",timestamp); form.set("api_key",apiKey); form.set("signature",signature);
    const up=await fetch("https://api.cloudinary.com/v1_1/"+encodeURIComponent(cloud)+"/image/upload",{method:"POST",body:form});
    const uploaded=await up.json();
    if (!up.ok||!uploaded.secure_url||!uploaded.public_id) { results.push({id:row.id,path,status:"cloudinary_upload_failed",error:uploaded.error?.message||"unknown"}); continue; }
    const patch=await fetch(url+"/rest/v1/product_media?id=eq."+encodeURIComponent(row.id),{method:"PATCH",headers:{...h,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({image_url:uploaded.secure_url,cloudinary_public_id:uploaded.public_id})});
    if (!patch.ok) { results.push({id:row.id,path,status:"uploaded_but_metadata_update_failed",cloudinary_public_id:uploaded.public_id,error:(await patch.text()).slice(0,300)}); continue; }
    results.push({id:row.id,product_id:row.product_id,path,status:"migrated",cloudinary_public_id:uploaded.public_id});
  }
  const migrated=results.filter(x=>x.status==="migrated").length;
  const failed=results.filter(x=>!["migrated","already_migrated"].includes(x.status)).length;
  return out({ok:failed===0,total_linked:rows.length,migrated,already_migrated:results.filter(x=>x.status==="already_migrated").length,failed,results});
});