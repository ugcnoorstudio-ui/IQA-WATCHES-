import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const ORIGIN="https://ugcnoorstudio-ui.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function out(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function key(name:string){const raw=Deno.env.get(name);if(!raw)return;try{const v=JSON.parse(raw);return typeof v?.default==="string"?v.default:undefined}catch{return}}
function headers(service:string,legacy?:string){const h:Record<string,string>={apikey:service,"Cache-Control":"no-store"};if(legacy)h.Authorization="Bearer "+legacy;return h}
function magic(b:Uint8Array,m:string){if(m==="image/jpeg")return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;if(m==="image/png")return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);if(m==="image/webp")return b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP";if(m==="image/avif")return b.length>=12&&String.fromCharCode(...b.slice(4,8))==="ftyp"&&String.fromCharCode(...b.slice(8,12)).includes("avif");return false}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out({error:"Method not allowed."},405);
 if(req.headers.get("origin")!==ORIGIN)return out({error:"Origin not allowed."},403);
 const bearer=(req.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i);if(!bearer)return out({error:"Sign in is required."},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")||key("SUPABASE_PUBLISHABLE_KEYS"),legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),service=legacy||key("SUPABASE_SECRET_KEYS");
 if(!url||!anon||!service)return out({error:"Image upload service is not configured."},503);
 if(Number(req.headers.get("content-length")||"0")>5*1024*1024+32768)return out({error:"Image must be 5 MB or smaller."},413);
 const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+bearer[1]}});if(!auth.ok)return out({error:"Your staff session is invalid or expired. Sign in again."},401);
 const user=await auth.json();if(!user?.id)return out({error:"Unable to verify staff identity."},401);
 const sh=headers(service,legacy);
 const pr=await fetch(url+"/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq."+encodeURIComponent(user.id),{headers:{...sh,Accept:"application/json"}});
 if(!pr.ok)return out({error:"Unable to verify owner permissions."},503);
 const profiles=await pr.json();if(!Array.isArray(profiles)||profiles.length!==1||profiles[0].active!==true||profiles[0].role!=="owner")return out({error:"Active owner permission is required."},403);
 let form:FormData;try{form=await req.formData()}catch{return out({error:"Invalid multipart upload."},400)}
 const productId=String(form.get("product_id")||""),alt=String(form.get("alt_text")||"").trim(),primary=String(form.get("is_primary")||"false")==="true",file=form.get("image");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId))return out({error:"Choose a valid product."},400);
 if(alt.length<3||alt.length>180)return out({error:"Alt text must be 3–180 characters."},400);
 if(!(file instanceof File)||file.size<1||file.size>5*1024*1024)return out({error:"Choose an image up to 5 MB."},400);
 const exts:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"},ext=exts[file.type];if(!ext)return out({error:"Only JPG, PNG, WebP and AVIF images are accepted."},400);
 const bytes=new Uint8Array(await file.arrayBuffer());if(!magic(bytes,file.type))return out({error:"Image contents do not match the declared type."},400);
 const pc=await fetch(url+"/rest/v1/products?select=id&id=eq."+encodeURIComponent(productId),{headers:{...sh,Accept:"application/json"}});
 if(!pc.ok)return out({error:"Unable to verify product."},503);const products=await pc.json();if(!Array.isArray(products)||products.length!==1)return out({error:"Product not found."},404);
 const path=productId+"/"+crypto.randomUUID()+"."+ext,objectUrl=url+"/storage/v1/object/product-images/"+path.split("/").map(encodeURIComponent).join("/");
 const uploaded=await fetch(objectUrl,{method:"POST",headers:{...sh,"Content-Type":file.type,"x-upsert":"false"},body:bytes});
 if(!uploaded.ok)return out({error:"Storage upload failed. No metadata was saved."},uploaded.status===413?413:400);
 const rpc=await fetch(url+"/rest/v1/rpc/iqa_register_product_image",{method:"POST",headers:{...sh,"Content-Type":"application/json"},body:JSON.stringify({p_actor:user.id,p_product_id:productId,p_storage_path:path,p_alt_text:alt,p_is_primary:primary})});
 const raw=await rpc.text();let result:any;try{result=raw?JSON.parse(raw):{}}catch{result={}};
 if(!rpc.ok||result?.ok!==true){await fetch(objectUrl,{method:"DELETE",headers:sh});return out({error:typeof result?.message==="string"?result.message:"Metadata registration failed; uploaded image was rolled back."},400)}
 return out(result);
});