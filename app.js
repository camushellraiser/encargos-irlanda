'use strict';
// Encargos de Irlanda — interfaz independiente. Los permisos viven en SQL/RLS.
const $=id=>document.getElementById(id);
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const CFG=window.IRLANDA_SUPABASE||{};
const READY=/^https:\/\/.+\.supabase\.co\/?$/.test(CFG.url||'')&&!!CFG.key;
const BUCKET='travelspend-files';
const uuid=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`};
const app={client:null,session:null,role:null,views:'home',wishlist:[],purchases:[],payments:[],attachments:[],editor:null,photoQueue:[],photoUrls:new Map(),channel:null,rate:null,loading:false,reloadTimer:null};
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(n)||0)/100);
const mxn=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
const sum=rows=>rows.reduce((a,b)=>a+Number(b.amount_cents||0),0);
const nowDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const fmtDate=s=>{if(!s)return '';const d=new Date(s+'T12:00:00');return Number.isNaN(d.getTime())?s:new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(d)};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const validURL=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
const showError=e=>(e?.message||'Ocurrió un error. Revisa tu conexión.').slice(0,220);
let toastTimer;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4000)}
function status(msg,type=''){const el=$('connection');el.className='connection '+type;$('connection-text').textContent=msg}
function view(name){app.views=name;qa('.view').forEach(x=>x.hidden=x.id!=='view-'+name);qa('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));window.scrollTo({top:0,behavior:'instant'});render()}
function owner(){return app.role==='owner'}
function active(){return app.role==='owner'||app.role==='irlanda'}
function hasBought(item){return app.purchases.some(p=>p.wishlist_id===item.id&&p.amount_cents>0)}
function limit(input,max){return String(input??'').trim().slice(0,max)}
function amountCents(input){const s=String(input).trim().replace(',','.');if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(s))return null;const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0&&n<=100000000?n:null}
function empty(icon,msg){return `<div class="empty"><strong>${icon}</strong>${escapeHTML(msg)}</div>`}
function mediaFor(scope,id){return app.attachments.filter(p=>p.scope===scope&&p.record_id===id)}
function photoFrame(scope,id,fallback){const a=mediaFor(scope,id)[0];return `<span class="item-visual">${a?`<img data-photo="${escapeHTML(a.storage_path)}" alt="Fotografía adjunta">`:fallback}</span>`}
function wishlistCard(item,compact=false){const done=hasBought(item);const details=[item.size&&'Talla: '+item.size,item.color&&'Color: '+item.color,item.details].filter(Boolean).join(' · ');
 return `<article class="item-card">${photoFrame('wishlist',item.id,done?'✓':'♡')}<div class="card-main"><div class="card-title">${escapeHTML(item.title)}</div><div class="card-desc">${escapeHTML(details||'Sin detalles adicionales')}</div>${!compact?`<div class="card-tools"><button class="mini-btn" data-action="edit-wish" data-id="${item.id}">Editar</button>${owner()?`<button class="mini-btn buy" data-action="purchase-for" data-id="${item.id}">＋ Registrar compra</button>`:''}${validURL(item.reference_url)?`<a class="mini-btn" href="${escapeHTML(validURL(item.reference_url))}" target="_blank" rel="noopener noreferrer">Ver referencia ↗</a>`:''}</div>`:''}</div><span class="badge ${done?'done':''}">${done?'Comprado':'Pendiente'}</span></article>`}
function purchaseCard(p,compact=false){const photos=mediaFor('irlanda',p.id);const date=fmtDate(p.purchased_on);const text=p.notes?` · ${p.notes}`:'';
 return `<article class="purchase-card">${photoFrame('irlanda',p.id,p.amount_cents>0?'🛍️':'↶')}<div class="card-main"><div class="card-title">${escapeHTML(p.label)}</div><div class="card-desc">${escapeHTML(p.merchant)} · ${date}${escapeHTML(text)}</div>${!compact?`<div class="card-tools">${photos.length?`<button class="mini-btn" data-action="photos" data-id="${p.id}">📷 ${photos.length} foto(s)</button>`:''}${owner()?`<button class="mini-btn" data-action="edit-purchase" data-id="${p.id}">Editar</button>`:''}</div>`:''}</div><div class="price">${p.amount_cents<0?'−':''}${money(Math.abs(p.amount_cents))}</div></article>`}
function paymentCard(p){return `<article class="payment-card"><span class="item-visual">↙</span><div class="card-main"><div class="card-title">${escapeHTML(({transfer:'Transferencia',cash:'Efectivo',other:'Otro'})[p.method]||'Abono')}</div><div class="card-desc">${fmtDate(p.paid_on)}${p.note?' · '+escapeHTML(p.note):''}</div>${owner()?`<div class="card-tools"><button class="mini-btn" data-action="edit-payment" data-id="${p.id}">Editar</button></div>`:''}</div><span class="payment-amount">${money(p.amount_cents)}</span></article>`}
function render(){
 const total=sum(app.purchases),paid=sum(app.payments),balance=total-paid;
 $('hero-total').innerHTML=`${escapeHTML(money(total))} <small>USD</small>`;
 $('stat-pending').textContent=app.wishlist.filter(x=>!hasBought(x)).length;
 $('stat-bought').textContent=app.wishlist.filter(hasBought).length;
 $('summary-purchases').textContent=money(total);$('summary-paid').textContent=money(paid);$('summary-balance').textContent=money(Math.abs(balance));
 $('summary-note').textContent=balance>0?'Pendiente de pago':balance<0?'Saldo a favor / anticipo':'Todo liquidado';
 $('home-wishes').innerHTML=app.wishlist.slice(0,4).map(x=>wishlistCard(x,true)).join('')||empty('♡','Aquí aparecerán los próximos encargos.');
 $('home-purchases').innerHTML=app.purchases.slice(0,3).map(x=>purchaseCard(x,true)).join('')||empty('🛍','Todavía no hay compras registradas.');
 const search=$('wishlist-search').value.trim().toLowerCase(),filter=$('wishlist-filter').value;
 const visible=app.wishlist.filter(x=>(!search||`${x.title} ${x.details} ${x.size} ${x.color}`.toLowerCase().includes(search))&&(filter==='all'||(filter==='bought'?hasBought(x):!hasBought(x))));
 $('wishlist-list').innerHTML=visible.map(x=>wishlistCard(x)).join('')||empty('☷','No se encontraron encargos. Toca + para agregar uno.');
 $('purchase-count').textContent=`${app.purchases.length} movimientos`;
 $('purchases-list').innerHTML=app.purchases.map(p=>purchaseCard(p)).join('')||empty('🛍','Aún no hay compras. Al registrarlas se mostrarán aquí.');
 $('payments-list').innerHTML=app.payments.map(p=>paymentCard(p)).join('')||empty('↙','Todavía no hay abonos registrados.');
 $('add-payment').hidden=!owner();$('account-button').title=app.session?.user?.email||'Cuenta';
 const rate=app.rate;
 if(rate){$('hero-mxn').textContent=`≈ ${mxn(total/100*rate.value)} · Cotización ${rate.date}`;$('fx-details').textContent=`1 USD ≈ ${rate.value.toFixed(4)} MXN · Cotización ${fmtDate(rate.date)}${Date.now()-rate.fetchedAt>24*3600000?' · guardada (puede estar desactualizada)':''}`;}
 else{$('hero-mxn').textContent='Equivalente en MXN pendiente';$('fx-details').textContent='Aún sin cotización. Se consulta automáticamente.'}
 hydrateImages();
}
async function hydrateImages(){for(const img of qa('[data-photo]')){const path=img.getAttribute('data-photo');if(app.photoUrls.has(path)){img.src=app.photoUrls.get(path);continue}if(!app.client||!app.session)continue;try{const {data,error}=await app.client.storage.from(BUCKET).download(path);if(error)continue;const url=URL.createObjectURL(data);if(!app.photoUrls.has(path))app.photoUrls.set(path,url);else URL.revokeObjectURL(url);if(img.isConnected)img.src=app.photoUrls.get(path)}catch{}}}
function revokeImages(){for(const url of app.photoUrls.values())URL.revokeObjectURL(url);app.photoUrls.clear()}
async function loadAll(){if(!active()||!app.client)return;status('Actualizando cambios…');const c=app.client;const tables=['irlanda_wishlist','irlanda_purchases','irlanda_payments','trip_attachments'];const res=await Promise.all(tables.map(t=>c.from(t).select('*')));for(let i=0;i<res.length;i++)if(res[i].error)throw new Error(`${tables[i]}: ${res[i].error.message}`);
 app.wishlist=(res[0].data||[]).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 app.purchases=(res[1].data||[]).sort((a,b)=>b.purchased_on.localeCompare(a.purchased_on)||b.created_at.localeCompare(a.created_at));
 app.payments=(res[2].data||[]).sort((a,b)=>b.paid_on.localeCompare(a.paid_on));
 app.attachments=res[3].data||[];render();status('Datos privados · Actualizados en tiempo real','ready')}
function scheduleReload(){clearTimeout(app.reloadTimer);app.reloadTimer=setTimeout(()=>loadAll().catch(e=>status(showError(e),'error')),250)}
async function beginSession(session){if(app.channel){await app.client.removeChannel(app.channel);app.channel=null}app.session=session;app.role=null;revokeImages();app.wishlist=[];app.purchases=[];app.payments=[];app.attachments=[];
 if(!session){$('auth-overlay').hidden=false;status('Inicia sesión para acceder');render();return}
 const {data,error}=await app.client.from('app_access').select('role').eq('user_id',session.user.id).maybeSingle();
 if(error||!['owner','irlanda'].includes(data?.role)){$('auth-overlay').hidden=false;$('login-error').textContent='La cuenta aún no tiene acceso. Revisa la asignación de usuarios en Supabase.';status('Cuenta pendiente de autorización','error');return}
 app.role=data.role;$('login-error').textContent='';$('auth-overlay').hidden=true;await loadAll();
 app.channel=app.client.channel('irlanda-updates');
 for(const table of ['irlanda_wishlist','irlanda_purchases','irlanda_payments','trip_attachments'])app.channel.on('postgres_changes',{event:'*',schema:'public',table},scheduleReload);
 app.channel.subscribe();refreshFX();
}
async function initialize(){if(!READY||!window.supabase){$('auth-overlay').hidden=false;$('setup-message').hidden=false;$('login-form').hidden=true;status('Falta conectar la base de datos','error');render();return}
 try{app.client=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'encargos-irlanda-session'}});
 let generation=0;app.client.auth.onAuthStateChange((_event,session)=>{const thisGen=++generation;setTimeout(async()=>{if(thisGen!==generation)return;try{await beginSession(session)}catch(e){status(showError(e),'error');toast(showError(e))}},0)});
 const {data,error}=await app.client.auth.getSession();if(error)throw error;if(!data.session)$('auth-overlay').hidden=false;refreshFX();
 }catch(e){status(showError(e),'error');$('auth-overlay').hidden=false;toast('No se pudo conectar a Supabase.')}}
const field=(id,label,value='',opts={})=>`<label class="field-label" for="f-${id}">${escapeHTML(label)}</label>${opts.type==='textarea'?`<textarea class="field" id="f-${id}" maxlength="${opts.max||500}" rows="3">${escapeHTML(value)}</textarea>`:`<input class="field" id="f-${id}" type="${opts.type||'text'}" ${opts.required?'required':''} ${opts.max?`maxlength="${opts.max}"`:''} ${opts.placeholder?`placeholder="${escapeHTML(opts.placeholder)}"`:''} ${opts.inputmode?`inputmode="${opts.inputmode}"`:''} value="${escapeHTML(value)}">`}`;
const val=id=>String($('f-'+id)?.value||'').trim();
function openEditor(type,id=null,fromWish=null){if(!active())return;if(type!=='wishlist'&&!owner())return;const table=type==='wishlist'?app.wishlist:type==='purchase'?app.purchases:app.payments;const obj=table.find(r=>r.id===id)||null;
 app.editor={type,id:obj?.id||null,fromWish};app.photoQueue=[];const wishes=app.wishlist.map(w=>`<option value="${w.id}" ${w.id===(obj?.wishlist_id||fromWish)?'selected':''}>${escapeHTML(w.title)}</option>`).join('');
 const labels={wishlist:'encargo',purchase:'compra',payment:'abono'};$('editor-eyebrow').textContent=obj?'ACTUALIZAR REGISTRO':'NUEVO REGISTRO';$('editor-title').textContent=obj?'Editar '+labels[type]:'Nuevo '+labels[type];$('editor-delete').hidden=!obj;
 let fields='';
 if(type==='wishlist')fields=field('title','¿Qué necesitas?',obj?.title||'',{required:true,max:120,placeholder:'Ej. Tenis Nike blancos'})+`<div class="fields-grid"><div>${field('size','Talla o medida',obj?.size||'',{max:60})}</div><div>${field('color','Color',obj?.color||'',{max:60})}</div></div>`+field('details','Detalles, modelo o instrucciones',obj?.details||'',{type:'textarea',max:500})+field('reference_url','Enlace del producto (opcional)',obj?.reference_url||'',{max:600});
 if(type==='purchase')fields=field('label','Artículo comprado',obj?.label||app.wishlist.find(w=>w.id===fromWish)?.title||'',{required:true,max:150})+field('merchant','Tienda / comercio',obj?.merchant||'',{required:true,max:100,placeholder:'Ej. Ross, Nike, Target'})+`<div class="fields-grid"><div>${field('amount','Precio en USD',obj?Math.abs(obj.amount_cents/100).toFixed(2):'',{required:true,inputmode:'decimal',placeholder:'0.00'})}</div><div>${field('purchased_on','Fecha',obj?.purchased_on||nowDate(),{type:'date',required:true})}</div></div><label class="field-label" for="f-kind">Tipo de movimiento</label><select class="field" id="f-kind"><option value="expense" ${obj?.amount_cents<0?'':'selected'}>Compra</option><option value="refund" ${obj?.amount_cents<0?'selected':''}>Devolución</option></select><label class="field-label" for="f-wishlist_id">Vincular con un encargo (opcional)</label><select class="field" id="f-wishlist_id"><option value="">Sin vincular</option>${wishes}</select>`+field('notes','Nota',obj?.notes||'',{type:'textarea',max:500});
 if(type==='payment')fields=field('amount','Cantidad recibida (USD)',obj?(obj.amount_cents/100).toFixed(2):'',{required:true,inputmode:'decimal',placeholder:'0.00'})+field('paid_on','Fecha del abono',obj?.paid_on||nowDate(),{type:'date',required:true})+`<label class="field-label" for="f-method">Método</label><select class="field" id="f-method"><option value="transfer" ${obj?.method==='transfer'?'selected':''}>Transferencia</option><option value="cash" ${obj?.method==='cash'?'selected':''}>Efectivo</option><option value="other" ${obj?.method==='other'?'selected':''}>Otro</option></select>`+field('note','Comentario',obj?.note||'',{max:300});
 $('editor-fields').innerHTML=fields;$('editor-overlay').hidden=false;document.body.style.overflow='hidden';renderPhotoEditor();}
function closeEditor(){app.editor=null;app.photoQueue=[];$('editor-overlay').hidden=true;document.body.style.overflow=''}
// OCR opcional: lee el ticket en el dispositivo y propone el total sin guardar automáticamente.
function receiptEstimate(raw){
 const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const merchant=lines.slice(0,12).find(x=>/[A-Za-z]{3,}/.test(x)&&!/(welcome|thank|receipt|transaction|cashier|store\s*#|www\.|http|phone|date|time|sale\s+id)/i.test(x)&&x.length<70)||'';
 const cents=line=>[...line.matchAll(/(?:\$\s*)?((?:\d{1,3}(?:,\d{3})+|\d{1,8})\.\d{2})\b/g)].map(m=>amountCents(m[1].replace(/,/g,''))).filter(x=>x!=null);
 const found=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(/sub\s*total|subtotal|tax|change|cash\s?back|discount|saving|total\s+items|tip\s+amount/i.test(line))continue;
  const priority=/grand\s*total|amount\s*(due|charged|paid)|balance\s*due|total\s*(due|paid)/i.test(line)?3:/\btotal\b/i.test(line)?2:-1;
  if(priority<0)continue;const v=cents(line).at(-1)??cents(lines[i+1]||'').at(-1);if(v)found.push({v,priority,i})
 }
 found.sort((a,b)=>b.priority-a.priority||b.i-a.i);
 return {merchant:merchant.slice(0,100),amount:found[0]?.v??null};
}
async function runTicketOCR(file){
 if(!app.editor||app.editor.type!=='purchase')return;
 try{
  toast('Leyendo ticket… El resultado deberá confirmarse.');
  if(!window.Tesseract){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo descargar el lector OCR.'));document.head.append(script)})}
  const worker=await window.Tesseract.createWorker('eng');let extracted;
  try{const scan=await worker.recognize(file);extracted=receiptEstimate(scan.data.text||'')}finally{await worker.terminate()}
  if(extracted.amount!=null&&!val('amount'))$('f-amount').value=(extracted.amount/100).toFixed(2);
  if(extracted.merchant&&!val('merchant'))$('f-merchant').value=extracted.merchant;
  toast(extracted.amount!=null?'Ticket leído. Confirma el total y comercio antes de guardar.':'No encontré un total claro. Captúralo manualmente.');
 }catch(err){toast('No pude leer el texto. La foto sí quedó pendiente de adjuntarse.')} 
}
async function renderPhotoEditor(){const e=app.editor,root=$('editor-photos');root.replaceChildren();if(!e||e.type==='payment')return;const scope=e.type==='wishlist'?'wishlist':'irlanda';
 const controls=document.createElement('div');controls.className='photo-controls';const makeButton=(text,kind,capture)=>{const b=document.createElement('button');b.type='button';b.textContent=text;const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=true;input.hidden=true;if(capture)input.setAttribute('capture','environment');b.onclick=()=>input.click();input.onchange=async()=>{for(const file of input.files){if(!file.type.startsWith('image/')||file.size>20_000_000){toast('La imagen debe pesar menos de 20 MB.');continue}app.photoQueue.push({file,kind});if(kind==='receipt'&&app.editor?.type==='purchase')await runTicketOCR(file)}await renderPhotoEditor()};controls.append(b,input)};
 if(scope==='wishlist'){makeButton('📷 Tomar foto de referencia','reference',true);makeButton('🖼 Elegir foto','reference',false)}else{makeButton('📷 Fotografiar ticket','receipt',true);makeButton('🧾 Elegir ticket','receipt',false);makeButton('🛍 Foto de producto','product',false)}
 root.append(controls);const list=document.createElement('div');list.className='photo-items';root.append(list);
 for(const a of mediaFor(scope,e.id)){const chip=document.createElement('div');chip.className='photo-chip';const img=document.createElement('img');img.alt=a.kind;const url=await getPhotoURL(a.storage_path);if(url)img.src=url;const name=document.createElement('div');name.textContent=a.kind==='receipt'?'Ticket':a.kind==='product'?'Producto':'Referencia';const del=document.createElement('button');del.type='button';del.textContent='Eliminar';del.onclick=async()=>{if(!confirm('¿Eliminar la fotografía?'))return;try{await deleteAttachment(a);app.attachments=app.attachments.filter(x=>x.id!==a.id);renderPhotoEditor();toast('Fotografía eliminada')}catch(err){toast(showError(err))}};chip.append(img,name,del);list.append(chip)}
 for(const p of app.photoQueue){const chip=document.createElement('div');chip.className='photo-chip';const name=document.createElement('div');name.textContent='⏳ '+p.file.name.slice(0,22);const del=document.createElement('button');del.type='button';del.textContent='Quitar';del.onclick=()=>{app.photoQueue=app.photoQueue.filter(x=>x!==p);renderPhotoEditor()};chip.append(name,del);list.append(chip)}
}
async function getPhotoURL(path){if(app.photoUrls.has(path))return app.photoUrls.get(path);if(!app.session)return null;const {data,error}=await app.client.storage.from(BUCKET).download(path);if(error)return null;const u=URL.createObjectURL(data);app.photoUrls.set(path,u);return u}
async function imageJPEG(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1700/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b&&b.size<=6291456?resolve(b):reject(Error('La fotografía pesa demasiado.')),'image/jpeg',0.8)}catch(e){reject(e)}finally{URL.revokeObjectURL(u)}};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('No se pudo leer esta imagen. Prueba con JPG.'))};img.src=u})}
async function uploadPhoto(scope,recordId,p){const blob=await imageJPEG(p.file),id=uuid(),path=`${scope}/${recordId}/${id}.jpg`,st=app.client.storage.from(BUCKET);const {error:upErr}=await st.upload(path,blob,{contentType:'image/jpeg',upsert:false});if(upErr)throw upErr;const {error:metaErr}=await app.client.from('trip_attachments').insert({id,scope,record_id:recordId,kind:p.kind,storage_path:path});if(metaErr){await st.remove([path]);throw metaErr}}
async function deleteAttachment(a){const {error:fs}=await app.client.storage.from(BUCKET).remove([a.storage_path]);if(fs)throw fs;const {error:db}=await app.client.from('trip_attachments').delete().eq('id',a.id);if(db)throw db;const url=app.photoUrls.get(a.storage_path);if(url)URL.revokeObjectURL(url);app.photoUrls.delete(a.storage_path)}
async function deletePhotosFor(scope,id){const {data,error}=await app.client.from('trip_attachments').select('*').eq('scope',scope).eq('record_id',id);if(error)throw error;for(const a of data||[])await deleteAttachment(a)}
async function saveEditor(event){event.preventDefault();const e=app.editor;if(!e||!active())return;const button=$('editor-submit');button.disabled=true;
 try{let table,record,id=e.id||uuid();
 if(e.type==='wishlist'){table='irlanda_wishlist';if(!limit(val('title'),120))throw Error('Escribe qué necesitas comprar.');record={id,title:limit(val('title'),120),size:limit(val('size'),60),color:limit(val('color'),60),details:limit(val('details'),500),reference_url:validURL(val('reference_url'))||'',updated_at:new Date().toISOString()};if(val('reference_url')&&!record.reference_url)throw Error('El enlace debe comenzar por https:// o http://');}
 if(e.type==='purchase'){if(!owner())throw Error('Solo el administrador registra compras.');table='irlanda_purchases';const cents=amountCents(val('amount'));if(!cents)throw Error('Introduce un precio válido.');if(!val('label')||!val('merchant'))throw Error('Escribe artículo y tienda.');record={id,label:limit(val('label'),150),merchant:limit(val('merchant'),100),amount_cents:val('kind')==='refund'?-cents:cents,wishlist_id:val('wishlist_id')||null,purchased_on:val('purchased_on')||nowDate(),notes:limit(val('notes'),500),updated_at:new Date().toISOString()};}
 if(e.type==='payment'){if(!owner())throw Error('Solo el administrador registra abonos.');table='irlanda_payments';const cents=amountCents(val('amount'));if(!cents)throw Error('Introduce una cantidad válida.');record={id,amount_cents:cents,paid_on:val('paid_on')||nowDate(),method:val('method')||'transfer',note:limit(val('note'),300)};}
 const {error}=await app.client.from(table).upsert(record,{onConflict:'id'});if(error)throw error;
 const failed=[];for(const photo of app.photoQueue){try{await uploadPhoto(e.type==='wishlist'?'wishlist':'irlanda',id,photo)}catch(err){failed.push(err)}}
 closeEditor();await loadAll();toast(failed.length?`Registro guardado, pero ${failed.length} foto(s) no se cargaron. Reintenta desde Editar.`:'Cambios guardados y compartidos.');
 }catch(err){toast(showError(err))}finally{button.disabled=false}}
async function deleteEditor(){const e=app.editor;if(!e?.id||!active())return;if(e.type!=='wishlist'&&!owner())return;if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.'))return;
 const table={wishlist:'irlanda_wishlist',purchase:'irlanda_purchases',payment:'irlanda_payments'}[e.type];
 try{if(e.type!=='payment')await deletePhotosFor(e.type==='wishlist'?'wishlist':'irlanda',e.id);const {error}=await app.client.from(table).delete().eq('id',e.id);if(error)throw error;closeEditor();await loadAll();toast('Registro eliminado.')}catch(err){toast(showError(err))}}
async function showPurchasePhotos(id){const attachments=mediaFor('irlanda',id);if(!attachments.length){toast('Esta compra todavía no tiene imágenes.');return}const p=app.purchases.find(x=>x.id===id);if(owner()){openEditor('purchase',id);return}
 // La persona invitada puede ver la evidencia, pero no editarla.
 const old=$('editor-photos');app.editor={type:'photos',id};$('editor-eyebrow').textContent='COMPROBANTES';$('editor-title').textContent=p?.label||'Fotos de compra';$('editor-fields').innerHTML='';$('editor-submit').hidden=true;$('editor-delete').hidden=true;$('editor-overlay').hidden=false;document.body.style.overflow='hidden';old.innerHTML='';const box=document.createElement('div');box.className='photo-items';old.append(box);
 for(const a of attachments){const url=await getPhotoURL(a.storage_path);const link=document.createElement('a');if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer';const img=document.createElement('img');img.src=url;img.alt=a.kind;img.style.cssText='width:135px;max-height:200px;object-fit:contain;border-radius:12px';link.append(img)}else link.textContent='Foto no disponible';box.append(link)}
}
function csvEscape(v){let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCSV(){const cols=['Fecha','Artículo','Comercio','USD','Notas','Ticket o fotos'];const lines=app.purchases.map(p=>[p.purchased_on,p.label,p.merchant,(p.amount_cents/100).toFixed(2),p.notes,mediaFor('irlanda',p.id).length].map(csvEscape).join(','));const b=new Blob(['\ufeff'+[cols.join(','),...lines].join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='encargos-irlanda-'+nowDate()+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function refreshFX(force=false){const key='irlanda.fx.quote';let cached;try{cached=JSON.parse(localStorage.getItem(key)||'null')}catch{}if(cached&&Number.isFinite(cached.value)&&cached.value>0){app.rate=cached;render()}if(!force&&cached&&Date.now()-cached.fetchedAt<6*3600000)return;
 try{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);let response;try{response=await fetch('https://api.frankfurter.dev/v2/rate/usd/mxn',{signal:ctrl.signal,cache:'no-store'})}finally{clearTimeout(timer)}if(!response.ok)throw Error('No se pudo consultar la cotización');const quote=await response.json();if(quote.base!=='USD'||quote.quote!=='MXN'||!Number.isFinite(Number(quote.rate))||Number(quote.rate)<1||Number(quote.rate)>1000||!/\d{4}-\d{2}-\d{2}/.test(quote.date||''))throw Error('Cotización no válida');app.rate={value:Number(quote.rate),date:quote.date,fetchedAt:Date.now()};localStorage.setItem(key,JSON.stringify(app.rate));render();}catch{if(!cached) $('fx-details').textContent='No fue posible consultar el cambio ahora mismo. Reintenta al tener conexión.'}}
function attachUI(){qa('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));qa('[data-view-link]').forEach(b=>b.onclick=()=>view(b.dataset.viewLink));$('quick-add').onclick=()=>openEditor('wishlist');$('wishlist-search').oninput=render;$('wishlist-filter').onchange=render;$('add-payment').onclick=()=>openEditor('payment');$('purchase-export').onclick=exportCSV;$('refresh-fx').onclick=()=>refreshFX(true);
 $('account-button').onclick=async()=>{if(!app.session){$('auth-overlay').hidden=false;return}if(confirm(`Sesión: ${app.session.user.email}\n\n¿Cerrar sesión?`)){await app.client.auth.signOut();toast('Sesión cerrada')}};
 $('editor-close').onclick=()=>{closeEditor();$('editor-submit').hidden=false};$('editor-overlay').onclick=e=>{if(e.target===$('editor-overlay')){closeEditor();$('editor-submit').hidden=false}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('editor-overlay').hidden){closeEditor();$('editor-submit').hidden=false}});
 $('editor-form').onsubmit=saveEditor;$('editor-delete').onclick=deleteEditor;
 document.body.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=b.dataset.id;if(action==='edit-wish')openEditor('wishlist',id);else if(action==='purchase-for')openEditor('purchase',null,id);else if(action==='edit-purchase')openEditor('purchase',id);else if(action==='edit-payment')openEditor('payment',id);else if(action==='photos')showPurchasePhotos(id)});
 $('login-form').onsubmit=async e=>{e.preventDefault();if(!app.client)return;$('login-error').textContent='';$('login-submit').disabled=true;try{const {error}=await app.client.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});if(error)throw error;$('login-password').value=''}catch(err){$('login-error').textContent=showError(err)}finally{$('login-submit').disabled=false}};
 window.addEventListener('online',()=>{if(active())scheduleReload();refreshFX()});window.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())scheduleReload()});
}
attachUI();render();initialize();

/* iOS standalone PWAs can restore a magnified visual viewport after input focus.
   Keep the private login dialog inside the visible portion without disabling pinch zoom. */
(function keepLoginInVisibleViewport(){
 const overlay=document.getElementById('auth-overlay');
 const vv=window.visualViewport;
 if(!overlay||!vv)return;
 const keys=['left','top','right','bottom','width','height'];
 function update(){
   if(overlay.hidden||vv.scale<=1.02){
     for(const prop of keys)overlay.style.removeProperty(prop);
     return;
   }
   overlay.style.left=vv.offsetLeft+'px';
   overlay.style.top=vv.offsetTop+'px';
   overlay.style.right='auto';
   overlay.style.bottom='auto';
   overlay.style.width=vv.width+'px';
   overlay.style.height=vv.height+'px';
 }
 vv.addEventListener('resize',update);
 vv.addEventListener('scroll',update);
 window.addEventListener('pageshow',()=>{
   if(!overlay.hidden&&overlay.contains(document.activeElement))document.activeElement.blur();
   requestAnimationFrame(update);
 });
 document.addEventListener('visibilitychange',()=>{
   if(!document.hidden)requestAnimationFrame(update);
 });
 new MutationObserver(update).observe(overlay,{attributes:true,attributeFilter:['hidden']});
 update();
})();
