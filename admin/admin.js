(()=>{'use strict';
const groups=[
{label:'OVERVIEW',items:[['overview','▦','Dashboard overview']]},
{label:'CATALOGUE',items:[['products','◈','Product management'],['categories','◇','Categories & brands'],['inventory','▤','Inventory & stock'],['content','▧','Homepage & content']]},
{label:'COMMERCE',items:[['orders','▣','Orders'],['customers','♙','Customers'],['payments','₹','Payments & refunds'],['shipping','↗','Shipping & delivery'],['coupons','%','Discounts & coupons']]},
{label:'CUSTOMER EXPERIENCE',items:[['reviews','☆','Reviews & moderation'],['support','☏','Customer support'],['returns','↩','Returns & warranty']]},
{label:'OPERATIONS',items:[['suppliers','⇄','Suppliers & purchase orders'],['reports','▥','Reports & analytics']]},
{label:'ADMINISTRATION',items:[['settings','⚙','Store settings'],['staff','♧','Staff & permissions'],['logs','≡','Activity logs'],['health','♥','System health & errors']]},
{label:'CREATIVE ENGINEERING',items:[['motion-studio','✦','Motion & Experience Studio']]}
];
const descriptions={
overview:'A health-first overview. Supabase and verified staff login are connected; operational metrics remain restricted until each module has reviewed access policies and server workflows.',
products:'Manage catalogue records, variants, images, publication status, SEO and validated CSV imports.',
categories:'Manage category and brand taxonomy without inventing catalogue classifications.',
inventory:'Review stock levels, movement records, low-stock rules and reason-required adjustments.',
orders:'Inspect orders, permitted status transitions, fulfilment and invoice references from the authoritative order service.',
customers:'Permission-controlled customer profiles, consent, order history and data-access workflows.',
payments:'Inspect verified gateway events, payment attempts, refunds and reconciliation exceptions.',
shipping:'Configure serviceable PIN codes, courier integrations, shipping rules and tracking.',
coupons:'Configure discount rules and eligibility; all coupon validation and totals must be enforced server-side.',
content:'Manage homepage sections, collection order, story, journal, FAQ and policy drafts with preview/publish controls.',
reviews:'Moderate genuine reviews and verified-purchase status from order records.',
support:'Assign tickets, priorities, internal notes, responses and resolution history.',
returns:'Review return eligibility, evidence, warranty claims, assignment and resolution history.',
suppliers:'Manage supplier records, purchase orders, partial receipts and supplier invoices.',
reports:'Export authorized reports with sales, refunds, tax, shipping and cost definitions kept distinct.',
settings:'Manage store identity, tax, shipping, policies, integrations and notification preferences.',
staff:'Manage staff roles and permissions. Owner/admin changes require server authorization and audit trails.',
logs:'Search administrative activity with safe before/after values and redacted sensitive fields.',
health:'Check backend, database, gateway, email, courier, webhooks and backups when those integrations exist.',
'motion-studio':'Admin-only creative workflow preview for cinematic stories, 3D assets, campaign briefs, AI provider readiness, asset approval and performance evidence. Provider calls and publishing are disabled.'
};
const configs={
products:{fields:[['name','Product name','text'],['sku','Unique SKU','text'],['brand','Brand','text'],['category','Category','text'],['audience','Audience','select','Men,Women,Unisex,Other'],['price','Selling price (INR)','number'],['mrp','MRP (INR)','number'],['stock','Initial stock','number'],['status','Publication state','select','Draft,Published,Archived,Scheduled'],['description','Description','textarea']],actions:['Add product','Import CSV','Export CSV']},
categories:{fields:[['name','Category / brand name','text'],['type','Type','select','Category,Brand,Collection'],['slug','URL slug','text'],['status','State','select','Draft,Active,Archived']],actions:['Add entry','Export CSV']},
inventory:{fields:[['sku','Product / variant SKU','text'],['movement','Movement','select','Stock in,Stock out,Adjustment,Receive purchase order'],['quantity','Quantity','number'],['reason','Mandatory reason','text'],['threshold','Low-stock threshold','number']],actions:['Record adjustment','Export movement CSV']},
orders:{fields:[['orderId','Order number','text'],['status','Target status','select','Pending,Confirmed,Processing,Packed,Shipped,Delivered,Cancelled,Payment Failed,Return Requested,Returned,Refund Pending,Refunded'],['reason','Reason / reference','text']],actions:['Find order','Export CSV']},
customers:{fields:[['customerId','Customer ID / verified email','text'],['permission','Access purpose','select','Order support,Privacy request,Account deletion'],['reason','Case reference / reason','text']],actions:['Find customer','Export CSV']},
payments:{fields:[['paymentId','Gateway payment reference','text'],['action','Workflow','select','Inspect payment,Request refund,Reconciliation issue'],['amount','Refund amount (INR)','number'],['reason','Reason','text']],actions:['Find payment','Export report']},
shipping:{fields:[['pin','Serviceable PIN code','text'],['charge','Shipping charge (INR)','number'],['freeThreshold','Free shipping threshold (INR)','number'],['provider','Courier provider','text'],['tracking','Tracking URL template','url']],actions:['Save draft rule','Export CSV']},
coupons:{fields:[['code','Coupon code','text'],['kind','Discount type','select','Percentage,Fixed amount'],['value','Discount value','number'],['minOrder','Minimum order (INR)','number'],['start','Starts at','datetime-local'],['end','Ends at','datetime-local'],['limit','Usage limit','number']],actions:['Create draft coupon','Export CSV']},
content:{fields:[['title','Content title','text'],['type','Content type','select','Homepage hero,Collection,Story,Journal,FAQ,Policy,SEO'],['state','Workflow','select','Draft,Preview,Publish,Unpublish,Schedule'],['body','Content / copy','textarea']],actions:['Save draft preview','Open storefront']},
reviews:{fields:[['reviewId','Review reference','text'],['status','Moderation','select','Pending,Approved,Rejected,Reported'],['reason','Moderation reason','text']],actions:['Find review','Export CSV']},
support:{fields:[['ticketId','Ticket reference','text'],['priority','Priority','select','Low,Normal,High,Urgent'],['status','Status','select','Open,In progress,Waiting,Resolved,Closed'],['assignee','Assigned staff ID','text'],['notes','Internal notes (no sensitive data)','textarea']],actions:['Create draft ticket','Export CSV']},
returns:{fields:[['requestId','Return / warranty reference','text'],['kind','Request type','select','Return,Refund,Warranty'],['status','Status','select','Requested,Under review,Approved,Rejected,Pickup scheduled,Received,Resolved'],['reason','Reason','textarea']],actions:['Review request','Export CSV']},
suppliers:{fields:[['supplier','Supplier legal / business name','text'],['contact','Business contact (verified)','text'],['po','Purchase order number','text'],['status','PO status','select','Draft,Ordered,Partially received,Received,Cancelled'],['cost','Supplier cost (INR)','number']],actions:['Create draft PO','Export CSV']},
reports:{fields:[['from','From date','date'],['to','To date','date'],['report','Report type','select','Orders,Sales and refunds,Inventory movement,Returns,Support']],actions:['Prepare report preview','Export CSV']},
settings:{fields:[['storeName','Store display name','text'],['currency','Currency','select','INR'],['supportEmail','Verified support email','email'],['taxId','Business tax identifier (optional)','text'],['environment','Environment','select','Development,Staging,Production']],actions:['Save settings draft']},
staff:{fields:[['staffEmail','Staff email (not submitted)','email'],['role','Role','select','Owner,Administrator,Inventory manager,Order manager,Support staff'],['permissions','Permission scope','select','Catalogue,Inventory,Orders,Support,Reports,Settings']],actions:['Prepare invitation (backend required)']},
logs:{fields:[['query','Actor / entity / action','search'],['from','From date','date'],['to','To date','date'],['outcome','Outcome','select','Any,Success,Failure,Denied']],actions:['Filter logs','Export authorized CSV']},
health:{fields:[['service','Integration','select','Backend API,Database,Payment gateway,Email,Shipping provider,Webhook receiver,Backups'],['check','Check type','select','Configuration,Connectivity,Recent errors,Last successful backup']],actions:['Run safe configuration checklist']}
};
const allItems=groups.flatMap(g=>g.items),$=id=>document.getElementById(id);
let current='overview', mobileOpen=false, toastTimer;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function activeName(){return allItems.find(x=>x[0]===current)?.[2]||'Not found'}
function syncMobileNav(){const sidebar=$('sidebar'),toggle=$('menuToggle'),backdrop=$('sidebarBackdrop');sidebar.classList.toggle('open',mobileOpen);toggle.setAttribute('aria-expanded',String(mobileOpen));toggle.setAttribute('aria-label',mobileOpen?'Close navigation menu':'Open navigation menu');backdrop.hidden=!mobileOpen;document.body.classList.toggle('nav-open',mobileOpen)}
function renderNav(){ $('nav').innerHTML=groups.map(g=>'<div class="side-label">'+esc(g.label)+'</div>'+g.items.map(i=>'<button class="nav-item '+(current===i[0]?'active':'')+'" data-route="'+i[0]+'" '+(current===i[0]?'aria-current="page"':'')+'><span class="nav-icon">'+i[1]+'</span><span>'+esc(i[2])+'</span></button>').join('')).join('')}
function pageIntro(kicker,title,desc,actions=''){return '<div class="page-intro"><div><p class="eyebrow gold">'+esc(kicker)+'</p><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div><div>'+actions+'</div></div>'}
function empty(title,desc,cta=''){return '<div class="empty-state"><div class="empty-icon">◇</div><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p>'+(cta?'<button class="btn secondary" data-action="'+esc(cta)+'">'+esc(cta)+'</button>':'')+'</div>'}
function panel(title,body,side=''){return '<div class="panel"><div class="panel-head"><h3>'+esc(title)+'</h3>'+side+'</div>'+body+'</div>'}
function metric(label,value,sub='No connected records'){return '<div class="metric"><div class="label">'+esc(label)+'</div><div class="value empty">'+esc(value)+'</div><div class="sub">'+esc(sub)+'</div></div>'}
function formFor(k){const c=configs[k];if(!c)return '';return panel('Action workspace','<p class="muted">Fields below are for interface preview only. Nothing is sent or saved.</p><form data-preview-form="'+k+'"><div class="form-grid">'+c.fields.map(f=>'<div class="field '+(f[2]==='textarea'?'full':'')+'"><label for="f-'+f[0]+'">'+esc(f[1])+'</label>'+(['select'].includes(f[2])?'<select id="f-'+f[0]+'" name="'+f[0]+'"><option value="">Select…</option>'+f[3].split(',').map(v=>'<option>'+esc(v)+'</option>').join('')+'</select>':f[2]==='textarea'?'<textarea id="f-'+f[0]+'" name="'+f[0]+'" placeholder="Preview only — do not enter customer secrets or real payment details"></textarea>':'<input id="f-'+f[0]+'" name="'+f[0]+'" type="'+esc(f[2])+'" '+(['number'].includes(f[2])?'min="0" step="any"':'')+' placeholder="'+(f[0]==='reason'?'Required for audit trail':'Preview only')+'">')+'</div>').join('')+'</div><div class="toolbar" style="margin-top:15px">'+c.actions.map((a,i)=>'<button type="button" class="btn '+(i===0?'primary':'secondary')+'" data-form-action="'+esc(a)+'">'+esc(a)+'</button>').join('')+'</div></form>')}
function tablePanel(k){const headers={products:['Product','SKU','State','Stock'],categories:['Name','Type','Slug','State'],inventory:['SKU','On hand','Threshold','Last movement'],orders:['Order','Date','Customer','Status','Total'],customers:['Customer','Verified contact','Orders','Consent'],payments:['Payment ref','Order','Amount','Status'],shipping:['Rule','PIN scope','Charge','Provider'],coupons:['Code','Discount','Window','State'],content:['Title','Type','Updated','State'],reviews:['Review','Product','Purchase verified','Moderation'],support:['Ticket','Priority','Assignee','Status'],returns:['Request','Type','Requested','Status'],suppliers:['Supplier','Purchase order','Value','State'],reports:['Report','Period','Records','State'],settings:['Setting','Current value','Source','State'],staff:['Staff member','Role','Permissions','State'],logs:['Timestamp','Actor','Action','Outcome'],health:['Service','Status','Last check','Details']};
return panel('Records','<div class="toolbar"><input data-table-search type="search" placeholder="Filter this empty preview table" aria-label="Filter records"><select data-table-filter aria-label="Filter status"><option value="">All states</option><option>Active</option><option>Draft</option><option>Pending</option><option>Failed</option></select><button class="btn secondary" data-action="Refresh records">Refresh</button></div><div class="table-wrap"><table><thead><tr>'+headers[k].map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody><tr><td colspan="'+headers[k].length+'">'+empty('No connected records',descriptions[k]+' Connect and authorize the backend to load real records.')+'</td></tr></tbody></table></div>')}
function setupPanel(){return panel('Production readiness','<div class="setup-list">'+[['01','Supabase backend & database','Connected. The latest authenticated database diagnostics passed all 19 table-access checks (0 failed). This confirms database access, not backup retention or restore testing.','Connected'],['02','Verified authentication','Owner sign-in and active staff-profile verification are working. Status remains partial because MFA, account recovery and session-policy settings have not all been verified.','Partial'],['03','Server-side authorization','RLS and owner-only catalogue workflows are active. Status remains partial because several business modules are still read-only and do not yet have audited write workflows.','Partial'],['04','External integrations','Payment gateway, transactional email and courier providers are separate external services. None is currently connected or verified; this does not mean Supabase database tables are disconnected.','Not connected'],['05','Recovery & monitoring','The 19 database access checks passed. Backup retention, restore testing, alert delivery and webhook/signature monitoring are separate checks and still need verification.','Needs verification']].map(x=>'<div class="setup-row"><span class="check">'+x[0]+'</span><div><b>'+x[1]+'</b><p>'+x[2]+'</p></div><span class="tag">'+x[3]+'</span></div>').join(''))}
function dashboard(){return pageIntro('STORE OPERATIONS','Dashboard overview','A transparent view of system readiness. No sample revenue, fake orders or invented stock metrics are shown.','<button class="btn secondary" data-route="health">Review system health</button>')+'<div class="grid">'+metric('Orders','Live','Owner-only records')+metric('Sales & payments','Read only','Payment events and refunds; no gateway connected')+metric('Inventory','Live','Stock and movement records')+metric('Customer support','Live','Owner-only ticket records')+'</div><div class="two-col" style="margin-top:16px">'+panel('Recent orders',empty('No order records yet','The live Orders workspace is connected. New verified orders will appear here when the storefront begins creating them.'))+panel('Store readiness','<div class="setup-list"><div class="setup-row"><span class="tag">Connected</span><div><b>Authentication</b><p>Supabase Auth is connected. Only active staff profiles can enter this admin shell.</p></div></div><div class="setup-row"><span class="tag">Connected</span><div><b>Database</b><p>Supabase Postgres is active. Business tables remain deny-by-default until their policies are reviewed.</p></div></div><div class="setup-row"><span class="tag">Pending</span><div><b>Payment gateway</b><p>No gateway or webhook verification configured.</p></div></div></div>')+'</div>'+setupPanel()+'<div class="page-intro" style="margin-top:22px"><div><h2>Jump to a workspace</h2><p>Open a dedicated management interface.</p></div></div><div class="quick-links">'+allItems.filter(x=>x[0]!=='overview').slice(0,9).map(x=>'<button class="quick-link" data-route="'+x[0]+'"><span>'+x[1]+'</span><strong>'+esc(x[2])+'</strong><span>Open workspace →</span></button>').join('')+'</div>'}
function money(v){return v===null||v===undefined?'—':'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})}
function stateTag(v){return '<span class="tag">'+esc(String(v||'unknown').replaceAll('_',' '))+'</span>'}
function readTableMarkup(title,headers,rows,emptyText){
return panel(title,'<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+ (rows.length?rows.join(''):'<tr><td colspan="'+headers.length+'"><div class="empty-state"><h3>No records found</h3><p>'+esc(emptyText)+'</p></div></td></tr>')+'</tbody></table></div>');
}
const liveModules={
orders:[['orders','id,order_number,state,currency,payable_total,payment_state,created_at,customer_id'],['order_items','id,order_id,sku_snapshot,product_snapshot,quantity,unit_price,line_total'],['order_status_events','id,order_id,previous_state,new_state,reason,created_at']],
customers:[['customers','id,full_name,email,phone,consent,created_at']],
payments:[['payment_events','id,order_id,gateway,gateway_reference,state,amount,currency,verified_at,created_at'],['refunds','id,order_id,amount,reason,state,gateway_reference,created_at']],
shipping:[['orders','id,order_number,state,delivery_snapshot,created_at']],
coupons:[['coupons','id,code,kind,value,minimum_order,starts_at,ends_at,usage_limit,active,created_at']],
content:[['content_entries','id,content_type,slug,title,state,publish_at,updated_at']],
reviews:[['reviews','id,product_id,rating,verified_purchase,state,created_at']],
support:[['support_tickets','id,subject,priority,state,assigned_to,created_at,updated_at']],
returns:[['return_requests','id,order_id,kind,reason,state,assigned_to,resolution,created_at']],
suppliers:[['suppliers','id,name,active,created_at'],['purchase_orders','id,supplier_id,po_number,state,supplier_invoice_ref,created_at']],
reports:[['orders','id,state,item_total,discount_total,shipping_total,tax_total,payable_total,payment_state,created_at'],['refunds','id,amount,state,created_at']],
settings:[['store_settings','key,updated_at']],
staff:[['staff_profiles','user_id,display_name,role,active,created_at']],
logs:[['activity_logs','id,actor_role,action,entity_type,entity_id,outcome,reason,created_at']],
health:[]
};
function safeCell(value){
 if(value===null||value===undefined||value==='')return '—';
 if(typeof value==='object')return esc(JSON.stringify(value).slice(0,180));
 if(typeof value==='number'&&/total|amount|value|price|cost/i.test(String(value)))return money(value);
 return esc(String(value).slice(0,180));
}
function renderLiveModule(route,sets){
 const target=$('content'),host=target.querySelector('[data-live-module]');
 if(!host)return;
 const headings={
 orders:['Order','State','Payment','Payable','Created'],order_items:['Order','SKU','Product snapshot','Qty','Unit price','Line total'],order_status_events:['Order','Previous state','New state','Reason','Time'],customers:['Customer','Email','Phone','Consent','Created'],
 payments:['Reference','Order','Gateway','State','Amount','Verified'],refunds:['Order','Amount','State','Reason','Created'],
 shipping:['Order','State','Delivery snapshot','Created'],coupons:['Code','Type','Value','Minimum','Active','Created'],
 content:['Title','Type','Slug','State','Publish at'],reviews:['Product','Rating','Verified purchase','State','Created'],
 support:['Subject','Priority','State','Assignee','Updated'],returns:['Order','Type','Reason','State','Resolution'],
 suppliers:['Supplier','Active','Created'],purchase_orders:['PO number','Supplier','State','Invoice ref','Created'],
 reports:['Order state','Items','Discount','Shipping','Tax','Payable','Payment'],
 settings:['Setting key','Value','Updated'],staff:['Staff member','Role','Active','Created'],
 logs:['Actor role','Action','Entity','Outcome','Reason','Time'],integration_events:['Integration','Event','Outcome','Time']
 };
 const renderSet=([table,columns],rows)=>{
  const isShipping=route==='shipping'&&table==='orders';
  const isReport=route==='reports'&&table==='orders';
  const cols=isShipping?['Order','Delivery state','Delivery snapshot','Created']:isReport?['Order state','Items','Discount','Shipping','Tax','Payable','Payment']:headings[table]||columns.split(',');
  const map={
   orders:r=>[r.order_number,r.state,r.payment_state,money(r.payable_total),r.created_at],
   order_items:r=>[r.order_id,r.sku_snapshot,r.product_snapshot,r.quantity,money(r.unit_price),money(r.line_total)],
   order_status_events:r=>[r.order_id,r.previous_state,r.new_state,r.reason,r.created_at],
   customers:r=>[r.full_name,r.email,r.phone,r.consent,r.created_at],
   payment_events:r=>[r.gateway_reference||r.event_id,r.order_id,r.gateway,r.state,money(r.amount),r.verified_at],
   refunds:r=>[r.order_id,money(r.amount),r.state,r.reason,r.created_at],
   shipping:r=>[r.order_number,r.state,r.delivery_snapshot,r.created_at],
   coupons:r=>[r.code,r.kind,r.value,money(r.minimum_order),r.active?'Yes':'No',r.created_at],
   content_entries:r=>[r.title,r.content_type,r.slug,r.state,r.publish_at],
   reviews:r=>[r.product_id,r.rating,r.verified_purchase?'Yes':'No',r.state,r.created_at],
   support_tickets:r=>[r.subject,r.priority,r.state,r.assigned_to,r.updated_at],
   return_requests:r=>[r.order_id,r.kind,r.reason,r.state,r.resolution],
   suppliers:r=>[r.name,r.active?'Yes':'No',r.created_at],
   purchase_orders:r=>[r.po_number,r.supplier_id,r.state,r.supplier_invoice_ref,r.created_at],
   store_settings:r=>[r.key,'Protected setting value',r.updated_at],
   staff_profiles:r=>[r.display_name,r.role,r.active?'Yes':'No',r.created_at],
   activity_logs:r=>[r.actor_role,r.action,r.entity_type,r.outcome,r.reason,r.created_at],
   integration_events:r=>[r.integration,r.event_type,r.outcome,r.created_at]
  };
  const values=rows.map(r=>{
   const cells=isShipping?[r.order_number,r.state,r.delivery_snapshot,r.created_at]:isReport?[r.state,money(r.item_total),money(r.discount_total),money(r.shipping_total),money(r.tax_total),money(r.payable_total),r.payment_state]:map[table](r);
   return '<tr>'+cells.map(v=>'<td>'+safeCell(v)+'</td>').join('')+'</tr>';
  });
  return readTableMarkup(table.replaceAll('_',' ')+' · '+rows.length+' records',cols,values,'No records are stored in this module yet.');
 };
 const sections=sets.map((entry,i)=>renderSet(entry[0],entry[1])).join('');
 host.innerHTML=sections+'<div class="notice" style="margin-top:14px">Live database connection · Owner-only read access · Changes are disabled until this module has its own audited server workflow. No preview data is shown as real.</div>';
}
function loadReadOnlyData(route){
if(route==='health')return; // Health checks run through the authenticated server diagnostics function, not a direct table read.
if(!['products','inventory','categories',...Object.keys(liveModules)].includes(route))return;
const target=$('content');
if(liveModules[route]){
 const host=target.querySelector('[data-live-module]');
 if(host)host.innerHTML='<div class="notice">Loading owner-authorized records…</div>';
 (async()=>{
  try{
   const api=window.IQA_ADMIN_BACKEND;
   if(!api||!api.currentProfile())throw new Error('Staff session is not active. Sign in again.');
   api.requireRole(['owner']);
   const entries=liveModules[route];
   const rows=await Promise.all(entries.map(([table,columns])=>api.readTable(table,columns,{limit:100})));
   if(current!==route)return;
   renderLiveModule(route,entries.map((entry,i)=>[entry,rows[i]]));
  }catch(error){
   if(current!==route)return;
   const host=target.querySelector('[data-live-module]');
   if(host)host.innerHTML='<div class="notice">'+esc(error.message||'Unable to load live records.')+'</div>';
  }
 })();
 return;
}
const placeholder='<tr><td colspan="7">Loading authorized records…</td></tr>';
const tbody=target.querySelector('tbody');
if(tbody)tbody.innerHTML=placeholder;
(async()=>{
try{
const api=window.IQA_ADMIN_BACKEND;
if(!api||!api.currentProfile())throw new Error('Staff session is not active. Sign in again.');
if(route==='categories'){
const [categories,brands]=await Promise.all([api.readTable('categories','id,name,slug,state,created_at',{limit:100}),api.readTable('brands','id,name,slug,state,created_at',{limit:100})]);
if(current!==route)return;
window.IQA_ADMIN_TAXONOMY_CACHE={category:new Map(categories.map(x=>[x.id,x])),brand:new Map(brands.map(x=>[x.id,x]))};
const cr=categories.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.slug)+'</td><td>'+stateTag(x.state)+'</td><td>'+esc(x.id.slice(0,8))+'</td></tr>');
const br=brands.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.slug)+'</td><td>'+stateTag(x.state)+'</td><td>'+esc(x.id.slice(0,8))+'</td></tr>');
const host=target.querySelector('[data-live-taxonomy]');if(host)host.innerHTML=readTableMarkup('Categories · '+categories.length+' records',['Name','Slug','State','ID'],cr,'No categories exist yet.')+readTableMarkup('Brands · '+brands.length+' records',['Name','Slug','State','ID'],br,'No brands exist yet.');
const fillTaxonomySelects=()=>{const kind=target.querySelector('[data-taxonomy-update] [name="kind"]')?.value||'category';const akind=target.querySelector('[data-taxonomy-archive] [name="kind"]')?.value||'category';const opts=k=>'<option value="">Select '+k+'…</option>'+Array.from(window.IQA_ADMIN_TAXONOMY_CACHE[k].values()).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+esc(x.state)+'</option>').join('');target.querySelector('[data-taxonomy-edit-select]').innerHTML=opts(kind);target.querySelector('[data-taxonomy-archive-select]').innerHTML=opts(akind);};
fillTaxonomySelects();
target.querySelectorAll('[data-taxonomy-update] [name="kind"],[data-taxonomy-archive] [name="kind"]').forEach(x=>x.addEventListener('change',fillTaxonomySelects));
}else if(route==='products'){
const results=await Promise.allSettled([api.readTable('products','id,name,sku,brand,category,category_id,brand_id,state,is_sample,verified_sellable,selling_price,mrp',{limit:100}),api.readTable('categories','id,name,slug,state',{limit:100}),api.readTable('brands','id,name,slug,state',{limit:100}),api.readTable('product_media','id,product_id,storage_path,alt_text,sort_order,is_primary',{limit:300}),api.readTable('product_variants','id,product_id,sku,options,selling_price,low_stock_threshold,active',{limit:200})]);
if(current!==route)return;
const labels=['products','categories','brands','product images','product variants'];
const failures=results.map((r,i)=>r.status==='rejected'?labels[i]+': '+(r.reason?.message||'request failed'):null).filter(Boolean);
const rows=results[0].status==='fulfilled'?results[0].value:[];
const categories=results[1].status==='fulfilled'?results[1].value:[];
const brands=results[2].status==='fulfilled'?results[2].value:[];
const media=results[3].status==='fulfilled'?results[3].value:[];
const variants=results[4].status==='fulfilled'?results[4].value:[];
window.IQA_ADMIN_PRODUCT_CACHE=new Map(rows.map(p=>[p.id,p]));
window.IQA_ADMIN_VARIANT_CACHE=new Map(variants.map(v=>[v.id,v]));
const productOptions='<option value="">'+(results[0].status==='fulfilled'?'Select product…':'Products could not be loaded')+'</option>'+rows.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.sku)+'</option>').join('');
target.querySelectorAll('[data-product-select]').forEach(x=>x.innerHTML=productOptions);
const editableProducts=rows.filter(p=>p.sku!=='ANALOGUE');
const editOptions='<option value="">Select product to edit…</option>'+editableProducts.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.sku)+'</option>').join('');
target.querySelectorAll('[data-product-edit-select]').forEach(x=>x.innerHTML=editOptions);
const editableVariants=variants.filter(v=>rows.some(p=>p.id===v.product_id&&p.sku!=='ANALOGUE'));
const variantEditOptions='<option value="">Select variant to edit…</option>'+editableVariants.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.sku)+'</option>').join('');
target.querySelectorAll('[data-variant-edit-select]').forEach(x=>x.innerHTML=variantEditOptions);
const publishedCategories=categories.filter(x=>x.state==='published');
const publishedBrands=brands.filter(x=>x.state==='published');
const categoryOptions='<option value="">'+(results[1].status==='fulfilled'?(publishedCategories.length?'Select category…':'No published categories — create one below'):'Categories could not be loaded')+'</option>'+publishedCategories.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
const brandOptions='<option value="">'+(results[2].status==='fulfilled'?(publishedBrands.length?'Select brand…':'No published brands — create one below'):'Brands could not be loaded')+'</option>'+publishedBrands.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
const createCategoryOptions='<option value="">'+(results[1].status==='fulfilled'?(publishedCategories.length?'Choose a category…':'No published categories — create one in Categories & brands'):'Categories could not be loaded')+'</option>'+publishedCategories.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
const createBrandOptions='<option value="">'+(results[2].status==='fulfilled'?(publishedBrands.length?'Choose a company / brand…':'No published brands — create one in Categories & brands'):'Brands could not be loaded')+'</option>'+publishedBrands.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
target.querySelectorAll('[data-category-select]').forEach(x=>x.innerHTML=categoryOptions);
target.querySelectorAll('[data-brand-select]').forEach(x=>x.innerHTML=brandOptions);
target.querySelectorAll('[data-create-category]').forEach(x=>x.innerHTML=createCategoryOptions);
target.querySelectorAll('[data-create-brand]').forEach(x=>x.innerHTML=createBrandOptions);
const mediaByProduct=new Map();
media.sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)).forEach(m=>{if(!mediaByProduct.has(m.product_id))mediaByProduct.set(m.product_id,[]);mediaByProduct.get(m.product_id).push(m)});
const html=rows.map(p=>{const gallery=mediaByProduct.get(p.id)||[];const thumbnails=gallery.map(m=>{const url=api.getClient().storage.from('product-images').getPublicUrl(m.storage_path).data.publicUrl;return '<img class="product-thumb'+(m.is_primary?' is-primary':'')+'" src="'+esc(url)+'" alt="'+esc(m.alt_text)+'" loading="lazy">'}).join('');return '<tr><td><div class="product-gallery">'+(thumbnails||'<span class="product-thumb-placeholder">No image</span>')+'</div></td><td><strong>'+esc(p.name)+'</strong><div class="muted">'+esc(p.brand||'Unbranded')+'</div></td><td>'+esc(p.sku)+'</td><td>'+esc(p.category||'—')+'</td><td>'+stateTag(p.state)+'</td><td>'+money(p.selling_price)+'</td><td>'+(p.state==='draft'?'<span class="tag">Draft · not published</span>':p.is_sample?'<span class="tag red">Sample</span>':p.verified_sellable?'<span class="tag">Verified</span>':'<span class="tag red">Not verified</span>')+'</td><td>'+esc(p.id.slice(0,8))+'</td></tr>'});
const host=target.querySelector('[data-live-records]');
if(host)host.innerHTML=(failures.length?'<div class="notice">Some product tools could not load: '+esc(failures.join(' | '))+'</div>':'')+readTableMarkup('Live product catalogue · '+rows.length+' records',['Image','Product','SKU','Category','State','Selling price','Sellability','Record ID'],html,'No products are currently visible to this staff role. RLS may be restricting access, or the catalogue is empty.');
}else{
const [variants,movements]=await Promise.all([
api.readTable('product_variants','id,product_id,sku,options,selling_price,stock_on_hand,stock_reserved,low_stock_threshold,active',{limit:100}),
api.readTable('inventory_movements','id,variant_id,movement_type,quantity_delta,reason,reference,created_at',{limit:30})
]);
if(current!==route)return;
const variantSelect=target.querySelector('[data-variant-select]');
if(variantSelect)variantSelect.innerHTML='<option value="">Select variant…</option>'+variants.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.sku)+' · on hand '+Number(v.stock_on_hand||0)+' · reserved '+Number(v.stock_reserved||0)+'</option>').join('');
const available=v=>Number(v.stock_on_hand||0)-Number(v.stock_reserved||0);
const html=variants.map(v=>'<tr><td>'+esc(v.sku)+'</td><td>'+Number(v.stock_on_hand||0)+'</td><td>'+Number(v.stock_reserved||0)+'</td><td><strong>'+available(v)+'</strong></td><td>'+Number(v.low_stock_threshold||0)+'</td><td>'+(available(v)<=Number(v.low_stock_threshold||0)?'<span class="tag red">Low stock</span>':'<span class="tag">In range</span>')+'</td><td>'+stateTag(v.active?'active':'inactive')+'</td></tr>');
const movementRows=movements.map(m=>'<tr><td>'+esc(new Date(m.created_at).toLocaleString())+'</td><td>'+esc(m.movement_type)+'</td><td>'+esc(Number(m.quantity_delta))+'</td><td>'+esc(m.reason)+'</td><td>'+esc(m.reference||'—')+'</td><td>'+esc(m.variant_id.slice(0,8))+'</td></tr>');
const host=target.querySelector('[data-live-records]');
if(host)host.innerHTML=readTableMarkup('Live stock by variant · '+variants.length+' records',['SKU','On hand','Reserved','Available','Low-stock limit','Stock health','State'],html,'No inventory variants are visible to this staff role.');
const history=target.querySelector('[data-live-movements]');
if(history)history.innerHTML=readTableMarkup('Recent inventory movements · '+movements.length+' records',['Time','Movement','Quantity Δ','Reason','Reference','Variant'],movementRows,'No inventory movement history is available.');
}
}catch(error){
if(current!==route)return;
const host=target.querySelector('[data-live-records]');
if(host)host.innerHTML='<div class="notice">'+esc(error.message||'Unable to load records.')+'</div>';
}
})();
}
function categoryBrandWriteForm(){return '<div class="two-col">'+panel('Create category','<form data-category-create><div class="field"><label>Category name</label><input name="name" minlength="2" maxlength="80" required></div><div class="field"><label>URL slug</label><input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="90" placeholder="analog-watches" required></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve adding this category.</label><button class="btn primary" type="submit">Create category</button></form>')+panel('Create brand','<form data-brand-create><div class="field"><label>Brand name</label><input name="name" minlength="2" maxlength="80" required></div><div class="field"><label>URL slug</label><input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="90" placeholder="iqa-watches" required></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve adding this brand.</label><button class="btn primary" type="submit">Create brand</button></form>')+'</div>'}
function taxonomyEditArchiveForm(){return panel('Edit / archive existing taxonomy · Owner-only','<p class="muted">Archive is non-destructive. Existing records are never deleted. The database blocks archiving a category or brand while any product still references it.</p><form data-taxonomy-update><div class="form-grid"><div class="field"><label>Type</label><select name="kind" required><option value="category">Category</option><option value="brand">Brand</option></select></div><div class="field"><label>Existing entry</label><select name="id" data-taxonomy-edit-select required><option value="">Loading…</option></select></div><div class="field"><label>Name</label><input name="name" minlength="2" maxlength="80" required></div><div class="field"><label>Slug</label><input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="90" required></div><div class="field full"><label>Reason for change</label><textarea name="reason" minlength="8" maxlength="500" required></textarea></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve these exact taxonomy changes.</label><button class="btn primary" type="submit">Save taxonomy changes</button></form><hr><form data-taxonomy-archive><div class="form-grid"><div class="field"><label>Type</label><select name="kind" required><option value="category">Category</option><option value="brand">Brand</option></select></div><div class="field"><label>Existing entry</label><select name="id" data-taxonomy-archive-select required><option value="">Loading…</option></select></div><div class="field full"><label>Reason for archive</label><textarea name="reason" minlength="8" maxlength="500" required></textarea></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve archiving this entry (not deletion).</label><button class="btn secondary" type="submit">Archive selected entry</button></form>')}
function productEditForms(){return panel('Edit existing product · Owner-only','<p class="muted">Update verified catalogue text and price fields with a required reason. Fastrack is intentionally excluded from this editor. Publication state and SKU are not changed here. Use the image uploader below to add or replace the primary product photo.</p><form data-product-update><div class="form-grid"><div class="field full"><label>Product</label><select name="product_id" data-product-edit-select required><option value="">Loading products…</option></select></div><div class="field"><label>Product name</label><input name="name" minlength="2" maxlength="160" required></div><div class="field"><label>Audience</label><select name="audience"><option value="">Not specified</option><option>Men</option><option>Women</option><option>Unisex</option><option>Other</option></select></div><div class="field"><label>Selling price (INR)</label><input name="selling_price" type="number" min="0" max="100000000" step="0.01" required></div><div class="field"><label>MRP (INR)</label><input name="mrp" type="number" min="0" max="100000000" step="0.01"></div><div class="field full"><label>Description</label><textarea name="description" maxlength="10000" rows="4" required></textarea></div><div class="field full"><label>Reason for change (audit)</label><textarea name="reason" minlength="8" maxlength="500" required></textarea></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve these exact product field changes.</label><button class="btn primary" type="submit">Save product changes</button></form><hr><form data-product-image><div class="form-grid"><div class="field full"><label>Upload / replace product image (max 5 MB)</label><select name="product_id" data-product-select required><option value="">Loading products…</option></select></div><div class="field"><label>Choose image</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required></div><div class="field"><label>Image alt text</label><input name="alt_text" minlength="3" maxlength="180" placeholder="Describe the product photo" required></div><div class="field"><label><input type="checkbox" name="is_primary" checked> Set as primary image</label></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve uploading this image for the selected product.</label><button class="btn primary" type="submit">Upload product image</button></form><hr><form data-variant-update><div class="form-grid"><div class="field full"><label>Product variant (Fastrack excluded)</label><select name="variant_id" data-variant-edit-select required><option value="">Loading variants…</option></select></div><div class="field"><label>Variant SKU</label><input name="sku" maxlength="100" required></div><div class="field"><label>Variant selling price (INR)</label><input name="selling_price" type="number" min="0" max="100000000" step="0.01"></div><div class="field"><label>Low-stock threshold</label><input name="low_stock_threshold" type="number" min="0" max="1000000" step="1" required></div><div class="field full"><label>Reason for change (audit)</label><textarea name="reason" minlength="8" maxlength="500" required></textarea></div></div><p class="muted">Stock quantities are deliberately not editable in this form; use the audited inventory movement workflow.</p><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve these exact variant changes.</label><button class="btn primary" type="submit">Save variant changes</button></form>')}
function productCatalogueToolsForm(){return panel('Manage existing products','<form data-taxonomy-assign><div class="form-grid"><div class="field"><label>Product</label><select name="product_id" data-product-select required><option value="">Loading…</option></select></div><div class="field"><label>Category</label><select name="category_id" data-category-select required><option value="">Loading…</option></select></div><div class="field"><label>Brand</label><select name="brand_id" data-brand-select required><option value="">Loading…</option></select></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve this classification.</label><button class="btn primary" type="submit">Save product classification</button></form><hr><form data-product-image><div class="form-grid"><div class="field"><label>Product</label><select name="product_id" data-product-select required><option value="">Loading…</option></select></div><div class="field"><label>Product image (max 5 MB)</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required></div><div class="field full"><label>Image alt text</label><input name="alt_text" minlength="3" maxlength="180" required></div><div class="field"><label><input type="checkbox" name="is_primary" checked> Set as primary image</label></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve uploading this product image.</label><button class="btn primary" type="submit">Upload product image</button></form><hr><form data-product-publish><div class="form-grid"><div class="field"><label>Product to publish</label><select name="product_id" data-product-select required><option value="">Loading…</option></select></div><div class="field full"><label>Publication approval reason</label><textarea name="reason" minlength="8" maxlength="500" required></textarea></div></div><label class="approval-check"><input type="checkbox" name="owner_approval" required> I approve publishing this product as verified sellable. I confirm its price, stock, image and classification.</label><button class="btn primary" type="submit">Publish & verify product</button></form>')}
function productWriteForm(){return panel('Create product draft · Not published','<p class="muted">Save a new product as an unpublished draft. This form never publishes products. Use the separate Publish & verify control only after the Owner has checked every detail and explicitly approves publication.</p><form data-product-create><div class="form-grid"><div class="field"><label>Product name</label><input name="name" minlength="2" maxlength="120" required></div><div class="field"><label>Product SKU</label><input name="sku" maxlength="64" pattern="[A-Za-z0-9._-]+" placeholder="e.g. CAS-AE1200WHL-5AV" required><small class="muted">Use a unique brand/model SKU. Letters, numbers, dots, hyphens and underscores only.</small></div><div class="field"><label>Variant SKU</label><input name="variant_sku" maxlength="64" placeholder="e.g. CAS-AE1200WHL-5AV-BLK"><small class="muted">Use a separate SKU only if this variant differs from the main product.</small></div><div class="field"><label>Company / Brand</label><select name="brand" data-create-brand required><option value="">Loading companies…</option></select><input name="new_brand_name" data-new-brand-name list="iqa-brand-suggestions" hidden maxlength="80" placeholder="Type or choose a company (e.g. Titan)"><datalist id="iqa-brand-suggestions"><option value="Casio"><option value="Titan"><option value="Fastrack"><option value="Timex"><option value="Sonata"><option value="Seiko"><option value="Citizen"><option value="Fossil"><option value="HMT"><option value="Daniel Wellington"><option value="Tommy Hilfiger"><option value="Armani Exchange"></datalist><small class="muted">Suggestions load from saved brands. Choose “Add a new company” to type any company manually.</small></div><div class="field"><label>Category</label><select name="category" data-create-category required><option value="">Loading categories…</option></select><input name="new_category_name" data-new-category-name list="iqa-category-suggestions" hidden maxlength="80" placeholder="Type or choose a category"><datalist id="iqa-category-suggestions"><option value="Analog Watches"><option value="Digital Watches"><option value="Chronograph Watches"><option value="Sports Watches"><option value="Casual Watches"><option value="Dress Watches"><option value="Luxury Watches"><option value="Automatic Watches"><option value="Quartz Watches"><option value="Smart Watches"></datalist><small class="muted">Choose an existing category or add your own. New choices are saved for future listings.</small></div><div class="field"><label>Audience</label><select name="audience"><option value="">Not specified</option><option>Men</option><option>Women</option><option>Unisex</option><option>Other</option></select></div><div class="field"><label>Selling price (INR)</label><input name="selling_price" type="number" min="0.01" max="100000000" step="0.01" placeholder="Your actual selling price" required><small class="muted">Customer-facing price in INR.</small></div><div class="field"><label>MRP (INR)</label><input name="mrp" type="number" min="0.01" max="100000000" step="0.01" placeholder="Printed MRP in INR" required><small class="muted">Must be equal to or higher than the selling price.</small></div><div class="field"><label>Available stock</label><input name="initial_stock" type="number" min="1" max="1000000" step="1" value="1" required></div><div class="field"><label>Low-stock threshold</label><input name="low_stock_threshold" type="number" min="0" max="100000" step="1" value="1" required></div><div class="field full"><label>Description</label><textarea name="description" maxlength="4000" rows="3" placeholder="Write only verified model features, materials, dimensions, water resistance and warranty details. Do not guess." required></textarea></div><div class="field full"><label>Real product photos (1–5 images, max 5 MB each)</label><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></div><div class="field full"><label>Photo description for accessibility</label><input name="image_alt_text" minlength="3" maxlength="180" placeholder="Required only when uploading photos"></div></div><label class="approval-check"><input name="owner_approval" type="checkbox" required> I approve saving this product as a draft only. I am not authorizing publication.</label><div class="toolbar"><button class="btn primary" type="submit">Save product draft</button></div></form>')}
function inventoryWriteForm(){return panel('Stock adjustment · Owner approval required','<p class="muted">Updates stock atomically, checks reserved quantity, and records the reason plus an audit event.</p><form data-inventory-adjust><div class="form-grid"><div class="field full"><label>Product variant</label><select name="variant_id" data-variant-select required><option value="">Loading variants…</option></select></div><div class="field"><label>Movement type</label><select name="movement_type" required><option value="adjustment">Adjustment (+ / −)</option><option value="stock_in">Stock in (+)</option><option value="stock_out">Stock out (−)</option></select></div><div class="field"><label>Quantity change</label><input name="quantity_delta" type="number" min="-100000" max="100000" step="1" placeholder="Use + or −" required></div><div class="field"><label>Reference (optional)</label><input name="reference" maxlength="120" placeholder="Invoice / count reference"></div><div class="field full"><label>Mandatory reason</label><textarea name="reason" minlength="4" maxlength="500" rows="2" required></textarea></div></div><label class="approval-check"><input name="owner_approval" type="checkbox" required> I approve this exact stock adjustment.</label><div class="toolbar"><button class="btn primary" type="submit">Apply stock adjustment</button></div></form>')}
function render(){current=location.hash.slice(1).split('/')[0]||'overview';if(!allItems.some(x=>x[0]===current))current='not-found';renderNav();$('pageTitle').textContent=current==='not-found'?'Page not found':activeName();$('crumb').textContent='Workspace / '+activeName();$('globalSearch').value='';let body='';
if(current==='overview')body=dashboard();
else if(current==='not-found')body=pageIntro('404 · ADMIN ROUTE','Page not found','This admin route does not exist. Choose a workspace from the sidebar.','<button class="btn primary" data-route="overview">Back to overview</button>')+empty('Unknown admin destination','No data or protected action was loaded.');
else if(current==='motion-studio')body=window.IQA_MOTION_STUDIO?window.IQA_MOTION_STUDIO.render():empty('Motion studio unavailable','Reload the authenticated admin workspace to try again.');
else{const title=activeName();if(current==='products'||current==='inventory'||current==='categories'){const owner=window.IQA_ADMIN_BACKEND?.currentProfile()?.role==='owner';body=pageIntro('SECURE LIVE WORKSPACE',title,current==='products'?'Create and review product drafts. Publishing is a separate Owner-only action and requires verified product details and explicit approval.':current==='categories'?'Create and review brand and category taxonomy. Existing-record editing and archive controls are not yet available.':'Review live stock and apply reason-required, owner-approved adjustments with a transactional audit trail.','<span class="tag">'+(owner?'Owner access':'Read only')+'</span>')+(owner?(current==='products'?productWriteForm()+productEditForms()+productCatalogueToolsForm():current==='categories'?categoryBrandWriteForm()+taxonomyEditArchiveForm():inventoryWriteForm()):panel('Owner approval required','<p class="muted">Only the active Owner account can change catalogue, taxonomy or stock. The database enforces this restriction.</p>'))+(current==='categories'?'<div data-live-taxonomy>'+panel('Loading taxonomy','<p class="muted">Reading authorized categories and brands…</p>')+'</div>':'<div data-live-records>'+panel('Loading live records','<p class="muted">Checking your active staff permissions…</p>')+'</div>')+(current==='inventory'?'<div data-live-movements></div>':'')}else if(liveModules[current]){body=pageIntro('LIVE OWNER WORKSPACE',title,descriptions[current],'<span class="tag">Connected · Read only</span>')+panel('Connection status','<div class="setup-row"><span class="tag">Connected</span><div><b>Supabase live records</b><p>Owner-only row-level security is active. This module is connected for live reading. Write actions stay disabled until a dedicated audited server workflow and any required external provider are configured.</p></div></div>')+'<div data-live-module>'+panel('Loading live records','<p class="muted">Checking owner authorization…</p>')+'</div>'+(current==='health'?setupPanel()+'<section class="panel"><div class="panel-head"><div><h2>Live system diagnostics</h2><p>Run authenticated checks against the connected Supabase project.</p></div><button class="btn primary" data-action="run-health-check">Run diagnostics</button></div><div id="healthResults"><p class="muted">Diagnostics have not been run in this session.</p></div></section>':'')}else{body=pageIntro('MANAGEMENT WORKSPACE',title,descriptions[current],'<span class="tag">Preview only</span>')+panel('Connection status','<div class="setup-row"><span class="tag red">Not connected</span><div><b>Live data is unavailable</b><p>This workspace does not query a production service. Form submissions are not saved and no real records are exposed.</p></div></div>')+formFor(current)+tablePanel(current);if(current==='health')body+=setupPanel()}}
$('content').innerHTML=body;loadReadOnlyData(current);if(current==='motion-studio'&&window.IQA_MOTION_STUDIO)window.IQA_MOTION_STUDIO.bind($('content'));syncMobileNav();$('globalSearch').placeholder=current==='overview'?'Search workspaces':'Search this preview';}
function toast(msg){const n=$('notice');n.textContent=msg;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,5000)}
function showConfirm(title,text){$('dialogTitle').textContent=title;$('dialogText').textContent=text;const d=$('confirmDialog');if(typeof d.showModal==='function')d.showModal();else toast(text)}
document.addEventListener('click',async e=>{const healthButton=e.target.closest('[data-action="run-health-check"]');if(healthButton){const output=$('healthResults');healthButton.disabled=true;healthButton.textContent='Checking…';output.innerHTML='<p class="muted">Verifying owner session and database access…</p>';try{const api=window.IQA_ADMIN_BACKEND;api.requireRole(['owner']);const {data,error}=await api.getClient().functions.invoke('iqa-admin-health',{body:{}});if(error)throw error;if(!data||data.ok!==true)throw new Error(data?.error||'Diagnostics were not confirmed.');const checks=Array.isArray(data.checks)?data.checks:[];output.innerHTML='<div class="setup-row"><span class="tag '+(data.database==='connected'?'':'red')+'">'+esc(data.database||'unknown')+'</span><div><b>'+esc(String(data.summary?.passed??0))+' passed · '+esc(String(data.summary?.failed??0))+' failed · '+esc(String(data.summary?.total??checks.length))+' total</b><p>Checked '+esc(data.checked_at||'')+' · Role: '+esc(data.actor_role||'')+'</p></div></div><div class="table-wrap"><table><thead><tr><th>Check</th><th>Table</th><th>Status</th><th>Records</th><th>Details</th></tr></thead><tbody>'+checks.map(x=>'<tr><td>'+esc(x.name||'')+'</td><td>'+esc(x.table||'')+'</td><td><span class="tag '+(x.ok?'':'red')+'">'+(x.ok?'Connected':'Failed')+'</span></td><td>'+esc(x.count===null?'—':String(x.count))+'</td><td>'+esc(x.error||'Access verified')+'</td></tr>').join('')+'</tbody></table></div>';toast('System diagnostics completed. Review each check below.');}catch(error){output.innerHTML='<div class="setup-row"><span class="tag red">Failed</span><div><b>Diagnostics could not complete</b><p>'+esc(error?.message||'Check your owner sign-in and Supabase function logs.')+'</p></div></div>';toast('Health check failed. No status was assumed.');}finally{healthButton.disabled=false;healthButton.textContent='Run diagnostics';}return;}const r=e.target.closest('[data-route]');if(r){location.hash=r.dataset.route;mobileOpen=false;syncMobileNav();return}const a=e.target.closest('[data-action]');if(a){if(a.dataset.action==='Open storefront'){location.href='../';return}showConfirm(a.dataset.action,'This is a non-persistent preview. No production record will be created, changed, exported or deleted. Configure backend authentication and server APIs first.');return}const fa=e.target.closest('[data-form-action]');if(fa){const form=fa.closest('form');const reason=form?.querySelector('[name="reason"]');if(reason&&!reason.value.trim()){toast('Validation preview: a reason is required for this action. No data was saved.');reason.focus();return}showConfirm(fa.dataset.formAction,'Preview only: this action is not connected to a backend and will not persist any changes. Never enter real customer or payment secrets here.');return}});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-taxonomy-edit-select]')){
  const form=e.target.closest('[data-taxonomy-update]'),kind=form?.elements.kind.value,item=window.IQA_ADMIN_TAXONOMY_CACHE?.[kind]?.get(e.target.value);if(!form||!item)return;
  form.elements.name.value=item.name||'';form.elements.slug.value=item.slug||'';
 }
 if(e.target.matches('[data-product-edit-select]')){
  const form=e.target.closest('[data-product-update]'),p=window.IQA_ADMIN_PRODUCT_CACHE?.get(e.target.value);if(!form||!p)return;
  form.elements.name.value=p.name||'';form.elements.description.value=p.description||'';form.elements.audience.value=p.audience||'';
  form.elements.selling_price.value=p.selling_price??'';form.elements.mrp.value=p.mrp??'';
 }
 if(e.target.matches('[data-variant-edit-select]')){
  const form=e.target.closest('[data-variant-update]'),v=window.IQA_ADMIN_VARIANT_CACHE?.get(e.target.value);if(!form||!v)return;
  form.elements.sku.value=v.sku||'';form.elements.selling_price.value=v.selling_price??'';form.elements.low_stock_threshold.value=v.low_stock_threshold??0;
 }
});
document.addEventListener('change',e=>{
 const form=e.target.closest('[data-product-create]');
 if(!form)return;
 const pairs=[['[name="brand"]','[data-new-brand-name]'],['[name="category"]','[data-new-category-name]']];
 pairs.forEach(([selectSelector,inputSelector])=>{
  if(e.target.matches(selectSelector)){
   const select=form.querySelector(selectSelector),input=form.querySelector(inputSelector);
   const isNew=select.value==='__new__';
   input.hidden=!isNew;input.required=isNew;
   if(!isNew)input.value='';
   if(isNew)input.focus();
  }
 });
});
document.addEventListener('submit',async e=>{
const form=e.target;
if(form.matches('[data-product-create]')||form.matches('[data-inventory-adjust]')){
e.preventDefault();
const button=form.querySelector('button[type="submit"]');button.disabled=true;
const values=Object.fromEntries(new FormData(form).entries());
try{
const api=window.IQA_ADMIN_BACKEND;api.requireRole(['owner']);
let result;
if(form.matches('[data-product-create]')){
 const files=Array.from(form.querySelector('[name="images"]')?.files||[]);
 const brandSelect=form.querySelector('[name="brand"]'),categorySelect=form.querySelector('[name="category"]');
 const brandId=brandSelect.value,categoryId=categorySelect.value;
 const brandName=brandSelect.selectedOptions[0]?.textContent||'',categoryName=categorySelect.selectedOptions[0]?.textContent||'';
 if(!brandId||!categoryId||brandId==='__new__'||categoryId==='__new__')throw new Error('Choose an existing published brand and category. Create taxonomy separately in Categories & brands.');
 if(files.length>5)throw new Error('Upload no more than 5 product photos.');
 if(files.some(file=>!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size<1||file.size>5*1024*1024))throw new Error('Each photo must be JPG, PNG, WebP or AVIF and no larger than 5 MB.');
 if(files.length&&String(values.image_alt_text||'').trim().length<3)throw new Error('Add image alt text when uploading product photos.');
 if(Number(values.mrp)<Number(values.selling_price))throw new Error('MRP must be equal to or greater than the selling price.');
 const created=await api.mutate('create_product',{request_id:crypto.randomUUID(),name:values.name,sku:values.sku,variant_sku:values.variant_sku,brand:brandName,category:categoryName,audience:values.audience,description:values.description,selling_price:values.selling_price,mrp:values.mrp,initial_stock:values.initial_stock,low_stock_threshold:values.low_stock_threshold});
 const productId=created.product_id;
 if(!productId||created.state!=='draft')throw new Error('The server did not confirm a draft product. Stop and verify before retrying.');
 try{
  await api.mutate('assign_product_taxonomy',{request_id:crypto.randomUUID(),product_id:productId,category_id:categoryId,brand_id:brandId});
  for(let index=0;index<files.length;index++){
   const viewLabel=index===0?'primary view':'additional view '+(index+1);
   const altText=(String(values.image_alt_text||'').trim()+' — '+viewLabel).slice(0,180);
   await api.uploadProductImage(productId,files[index],altText,index===0);
  }
  toast('Draft saved. It is NOT published. Product ID: '+productId);
 }catch(draftError){
  throw new Error('Product draft exists and remains unpublished (ID: '+productId+'). Some follow-up setup may need attention: '+(draftError?.message||'Unknown error.'));
 }
}else{
 result=await api.mutate('adjust_inventory',{request_id:crypto.randomUUID(),variant_id:values.variant_id,movement_type:values.movement_type,quantity_delta:values.quantity_delta,reason:values.reason,reference:values.reference});
 toast('Stock updated live. Available quantity: '+result.available+'. Audit record saved.');
}
render();
}catch(error){toast(error.message||'The operation failed. No success was reported.');}
finally{button.disabled=false;}
return;
}
if(form.matches('[data-category-create]')||form.matches('[data-brand-create]')||form.matches('[data-taxonomy-assign]')||form.matches('[data-product-image]')||form.matches('[data-product-publish]')){
e.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;const values=Object.fromEntries(new FormData(form).entries());
try{const api=window.IQA_ADMIN_BACKEND;api.requireRole(['owner']);
if(form.matches('[data-category-create]')){await api.mutate('create_category',{request_id:crypto.randomUUID(),name:values.name,slug:values.slug});toast('Category created.');}
else if(form.matches('[data-brand-create]')){await api.mutate('create_brand',{request_id:crypto.randomUUID(),name:values.name,slug:values.slug});toast('Brand created.');}
else if(form.matches('[data-taxonomy-assign]')){await api.mutate('assign_product_taxonomy',{request_id:crypto.randomUUID(),product_id:values.product_id,category_id:values.category_id,brand_id:values.brand_id});toast('Product classification saved.');}
else if(form.matches('[data-product-image]')){const file=form.querySelector('[name="image"]').files?.[0];await api.uploadProductImage(values.product_id,file,values.alt_text,form.querySelector('[name="is_primary"]').checked);toast('Product image uploaded and metadata saved.');}
else{await api.mutate('publish_product',{request_id:crypto.randomUUID(),product_id:values.product_id,reason:values.reason});toast('Product published and verified sellable.');}
render();
}catch(error){toast(error.message||'The operation failed. No success was reported.');}
finally{button.disabled=false;}return;
}
if(form.matches('[data-taxonomy-update]')||form.matches('[data-taxonomy-archive]')){
 e.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;const v=Object.fromEntries(new FormData(form).entries());
 try{const api=window.IQA_ADMIN_BACKEND;api.requireRole(['owner']);const prefix=form.matches('[data-taxonomy-update]')?'update_':'archive_';const kind=v.kind;await api.mutate(prefix+kind,{request_id:crypto.randomUUID(),id:v.id,reason:v.reason,...(prefix==='update_'?{name:v.name,slug:v.slug}:{})});toast(prefix==='update_'?'Taxonomy updated.':'Taxonomy archived; record was not deleted.');render();}
 catch(error){toast(error.message||'Taxonomy change failed.');}finally{button.disabled=false;}return;
}
if(form.matches('[data-product-update]')||form.matches('[data-variant-update]')){
e.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;const values=Object.fromEntries(new FormData(form).entries());
try{const api=window.IQA_ADMIN_BACKEND;api.requireRole(['owner']);
if(form.matches('[data-product-update]')){
 const product=window.IQA_ADMIN_PRODUCT_CACHE?.get(values.product_id);if(!product)throw new Error('Choose a loaded product.');
 await api.mutate('update_product',{product_id:values.product_id,name:values.name,description:values.description,audience:values.audience||null,selling_price:values.selling_price,mrp:values.mrp===''?null:values.mrp,reason:values.reason});
 toast('Product fields updated. Publication state was not changed.');
}else{
 const variant=window.IQA_ADMIN_VARIANT_CACHE?.get(values.variant_id);if(!variant)throw new Error('Choose a loaded variant.');
 const product=Array.from(window.IQA_ADMIN_PRODUCT_CACHE?.values()||[]).find(p=>p.id===variant.product_id);
 if(!product||product.sku==='ANALOGUE')throw new Error('This variant is protected from editing.');
 await api.mutate('update_product_variant',{variant_id:values.variant_id,sku:values.sku,selling_price:values.selling_price===''?null:values.selling_price,low_stock_threshold:values.low_stock_threshold,reason:values.reason});
 toast('Variant details updated. Stock quantity was not changed.');
}
render();
}catch(error){toast(error.message||'The update failed. No success was reported.');}
finally{button.disabled=false;}return;
}
if(form.matches('[data-preview-form]')){e.preventDefault();toast('Preview only — form was not submitted and no data was saved.')}
});
$('menuToggle').addEventListener('click',()=>{mobileOpen=!mobileOpen;syncMobileNav()});$('sidebarBackdrop').addEventListener('click',()=>{mobileOpen=false;syncMobileNav();$('menuToggle').focus()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileOpen){mobileOpen=false;syncMobileNav();$('menuToggle').focus()}});
$('setupInfo').addEventListener('click',()=>{location.hash='health'});
$('globalSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();if(!q){renderNav();return}const matches=allItems.filter(i=>i[2].toLowerCase().includes(q)||descriptions[i[0]]?.toLowerCase().includes(q));$('nav').innerHTML=matches.length?'<div class="side-label">SEARCH RESULTS</div>'+matches.map(i=>'<button class="nav-item" data-route="'+i[0]+'"><span class="nav-icon">'+i[1]+'</span><span>'+esc(i[2])+'</span></button>').join(''):'<p class="muted" style="padding:10px">No workspace matches.</p>'});
window.addEventListener('hashchange',()=>{mobileOpen=false;render();window.scrollTo(0,0)});
window.IQA_ADMIN_REFRESH=()=>{mobileOpen=false;render()};
render();
})();