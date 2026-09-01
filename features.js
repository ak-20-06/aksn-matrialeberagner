let ksViewerIndex=0;
let ksViewerPhotoIndex=0;

function showAuthGate(message='Log ind for at åbne H3-projektet og synkronisere dine data mellem browsere og enheder.'){
  const root=document.getElementById('modal-root');
  if(!root||cloudUser)return;
  root.innerHTML=`<div class="auth-gate" id="auth-gate">
    <div class="auth-card">
      <div class="auth-logo">◆</div>
      <span class="auth-kicker">PROJECT · H3 KVIST</span>
      <h1>Log ind for at fortsætte</h1>
      <p>${h(message)}</p>
      <div class="auth-fields">
        <label>E-mail<input id="gate-email" type="email" autocomplete="email" placeholder="din@email.dk"></label>
        <label>Adgangskode<input id="gate-password" type="password" autocomplete="current-password" placeholder="Mindst 6 tegn"></label>
      </div>
      <div class="auth-actions">
        <button class="primary" onclick="gateLogin()">Log ind</button>
        <button class="secondary" onclick="gateRegister()">Opret bruger</button>
      </div>
      <small id="gate-message">Dine ændringer bliver automatisk gemt i Supabase, når du er logget ind.</small>
    </div>
  </div>`;
  document.body.classList.add('auth-locked');
  setTimeout(()=>document.getElementById('gate-email')?.focus(),50);
}
function hideAuthGate(){
  const gate=document.getElementById('auth-gate');
  if(gate)document.getElementById('modal-root').innerHTML='';
  document.body.classList.remove('auth-locked');
}
function gateMessage(text,error=false){
  const e=document.getElementById('gate-message');
  if(e){e.textContent=text;e.className=error?'gate-error':'gate-ok'}
}
async function gateLogin(){
  if(!sb)return gateMessage('Supabase er ikke klar endnu. Prøv igen om et øjeblik.',true);
  const email=document.getElementById('gate-email')?.value.trim();
  const password=document.getElementById('gate-password')?.value||'';
  if(!email||!password)return gateMessage('Skriv både e-mail og adgangskode.',true);
  gateMessage('Logger ind…');
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error)gateMessage(error.message,true);
}
async function gateRegister(){
  if(!sb)return gateMessage('Supabase er ikke klar endnu. Prøv igen om et øjeblik.',true);
  const email=document.getElementById('gate-email')?.value.trim();
  const password=document.getElementById('gate-password')?.value||'';
  if(!email||password.length<6)return gateMessage('Brug en gyldig e-mail og mindst 6 tegn i adgangskoden.',true);
  gateMessage('Opretter bruger…');
  const {data,error}=await sb.auth.signUp({email,password});
  if(error)return gateMessage(error.message,true);
  if(data?.session)gateMessage('Bruger oprettet. Henter projektet…');
  else gateMessage('Bruger oprettet. Tjek din e-mail for bekræftelse, og log derefter ind.');
}

function renderKs(){
  const p=active(),s=ksStats(p);
  $('#ks-page').innerHTML=`<div class="pagehead"><div><h1>KS & dokumentation</h1><p>Modtagekontrol, proceskontrol med fotos og slutkontrol.</p></div></div><div class="ksmetrics"><button><strong>${s.ok}</strong><span>Godkendt</span></button><button><strong>${s.photo}</strong><span>Mangler foto</span></button><button><strong>${s.error}</strong><span>Fejl/mangel</span></button><button><strong>${s.pending}</strong><span>Ikke startet</span></button></div>${['Modtagekontrol','Proceskontrol','Slutkontrol'].map(ph=>`<section class="ks-section"><div class="ks-title"><div><span class="round">✓</span><div><h2>${ph}</h2></div></div></div>${p.ks.map((k,i)=>({k,i})).filter(x=>x.k.phase===ph).map(({k,i})=>`<div class="ks-item ${k.status==='Godkendt'?'complete':k.status==='Mangler foto'?'warning':k.status==='Fejl/mangel'?'danger':'pending'}"><span>${k.status==='Godkendt'?'✓':'!'}</span><div><b>${h(k.title)}</b><small>${h(k.area)} · ${k.photoRequired?'Foto ønskes':'Dokumentkontrol'}</small>${k.photos?.length?`<small class="photo-count">📷 ${k.photos.length} foto${k.photos.length>1?'s':''}</small>`:''}</div><select onchange="ksStatus(${i},this.value)">${['Ikke startet','Godkendt','Mangler foto','Fejl/mangel'].map(x=>`<option ${x===k.status?'selected':''}>${x}</option>`).join('')}</select><div class="ks-photo-actions"><button title="Tilføj foto" onclick="ksPhoto(${i})">📷</button>${k.photos?.length?`<button class="view-photo-btn" onclick="viewKsPhotos(${i},0)">Se foto</button>`:''}</div></div>`).join('')}</section>`).join('')}<input id="ks-file" type="file" accept="image/*" hidden>`;
}

function viewKsPhotos(ksIndex,photoIndex=0){
  const k=active().ks?.[ksIndex];
  if(!k?.photos?.length)return toast('Der er ingen billeder på dette KS-punkt');
  ksViewerIndex=ksIndex;
  ksViewerPhotoIndex=Math.max(0,Math.min(photoIndex,k.photos.length-1));
  renderKsViewer();
}
function renderKsViewer(){
  const k=active().ks?.[ksViewerIndex];
  if(!k?.photos?.length)return closeKsViewer();
  ksViewerPhotoIndex=Math.max(0,Math.min(ksViewerPhotoIndex,k.photos.length-1));
  const img=k.photos[ksViewerPhotoIndex];
  document.getElementById('modal-root').innerHTML=`<div class="photo-viewer" id="ks-photo-viewer" onclick="if(event.target===this)closeKsViewer()">
    <div class="photo-viewer-card">
      <button class="photo-close" onclick="closeKsViewer()">×</button>
      <div class="photo-viewer-head"><div><small>${h(k.phase)} · ${h(k.area)}</small><h3>${h(k.title)}</h3></div><span>${ksViewerPhotoIndex+1} / ${k.photos.length}</span></div>
      <div class="photo-stage"><img src="${img}" alt="KS dokumentationsfoto"></div>
      <div class="photo-controls">
        <button class="secondary" ${ksViewerPhotoIndex===0?'disabled':''} onclick="stepKsPhoto(-1)">← Forrige</button>
        <button class="dangerbtn" onclick="deleteKsPhoto()">Slet billede</button>
        <button class="secondary" ${ksViewerPhotoIndex===k.photos.length-1?'disabled':''} onclick="stepKsPhoto(1)">Næste →</button>
      </div>
    </div>
  </div>`;
}
function stepKsPhoto(dir){ksViewerPhotoIndex+=dir;renderKsViewer()}
function closeKsViewer(){document.getElementById('modal-root').innerHTML=''}
function deleteKsPhoto(){
  const k=active().ks?.[ksViewerIndex];
  if(!k?.photos?.length)return;
  if(!confirm('Vil du slette dette billede?'))return;
  k.photos.splice(ksViewerPhotoIndex,1);
  saveState();
  renderKs();
  if(k.photos.length){ksViewerPhotoIndex=Math.min(ksViewerPhotoIndex,k.photos.length-1);renderKsViewer()}else closeKsViewer();
}

/* Professionel oprettelse og redigering af sager */
const CASE_TYPES=['Tag / kvist','Renovering','Nybyggeri','Tilbygning','Facade','Vinduer / døre','Service / reparation','Forsikringssag','Andet'];
const CASE_STATUSES=['Tilbud','Planlagt','I gang','Afventer','Afsluttet'];
function nextCaseNumber(){return `SAG-${new Date().getFullYear()}-${String(state.projects.length+1).padStart(3,'0')}`}
function projectAddress(p){return [p.address,p.postalCode,p.city].filter(Boolean).join(', ')}

function openProjectForm(projectId=null){
  const editing=!!projectId;
  const p=editing?state.projects.find(x=>x.id===projectId):null;
  const customer=p?.customerId?state.customers.find(c=>c.id===p.customerId):null;
  const v=(x='')=>h(x??'');
  const root=document.getElementById('modal-root');
  root.innerHTML=`<div class="case-modal" onclick="if(event.target===this)closeProjectForm()">
    <form class="case-form" onsubmit="saveProjectForm(event,'${projectId||''}')">
      <div class="case-form-head"><div><small>${editing?'REDIGER SAG':'NY SAG'}</small><h2>${editing?'Sagsoplysninger':'Opret ny sag'}</h2><p>Gem de vigtigste oplysninger om opgaven, kunden og adressen.</p></div><button type="button" class="case-close" onclick="closeProjectForm()">×</button></div>
      <div class="case-form-body">
        <section><h3>Sagen</h3><div class="case-grid two">
          <label>Sagsnavn *<input id="case-name" required value="${v(p?.name)}" placeholder="Fx Kvist – Søndergade 12"></label>
          <label>Sagsnummer<input id="case-number" value="${v(p?.number||nextCaseNumber())}" placeholder="SAG-2026-001"></label>
          <label>Sagstype<select id="case-type">${CASE_TYPES.map(x=>`<option ${x===(p?.caseType||'Tag / kvist')?'selected':''}>${x}</option>`).join('')}</select></label>
          <label>Status<select id="case-status">${CASE_STATUSES.map(x=>`<option ${x===(p?.status||'Tilbud')?'selected':''}>${x}</option>`).join('')}</select></label>
          <label>Startdato<input id="case-start" type="date" value="${v(p?.start||new Date().toISOString().slice(0,10))}"></label>
          <label>Kort beskrivelse<input id="case-description" value="${v(p?.description)}" placeholder="Fx Pladsbygget rytterkvist"></label>
        </div></section>
        <section><h3>Adresse</h3><div class="case-grid address">
          <label class="wide">Adresse<input id="case-address" value="${v(p?.address)}" placeholder="Gade og husnummer"></label>
          <label>Postnr.<input id="case-postal" inputmode="numeric" value="${v(p?.postalCode)}" placeholder="7100"></label>
          <label>By<input id="case-city" value="${v(p?.city)}" placeholder="Vejle"></label>
        </div></section>
        <section><h3>Kunde & kontakt</h3><div class="case-grid two">
          <label>Kunde / virksomhed<input id="case-customer" value="${v(customer?.name||p?.customerName)}" placeholder="Navn eller virksomhed"></label>
          <label>Kontaktperson<input id="case-contact" value="${v(p?.contactName||customer?.contact)}" placeholder="Navn på kontaktperson"></label>
          <label>Telefon<input id="case-phone" type="tel" value="${v(p?.phone||customer?.phone)}" placeholder="12 34 56 78"></label>
          <label>E-mail<input id="case-email" type="email" value="${v(p?.email||customer?.email)}" placeholder="kunde@email.dk"></label>
        </div></section>
      </div>
      <div class="case-form-actions"><button type="button" class="secondary" onclick="closeProjectForm()">Annuller</button><button type="submit" class="primary">${editing?'Gem ændringer':'Opret sag'}</button></div>
    </form>
  </div>`;
  setTimeout(()=>document.getElementById('case-name')?.focus(),50);
}
function closeProjectForm(){document.getElementById('modal-root').innerHTML=''}
function saveProjectForm(e,projectId=''){
  e.preventDefault();
  const val=id=>document.getElementById(id)?.value.trim()||'';
  const name=val('case-name');
  if(!name)return toast('Skriv et sagsnavn');
  const contact={customerName:val('case-customer'),contactName:val('case-contact'),phone:val('case-phone'),email:val('case-email')};
  let p=projectId?state.projects.find(x=>x.id===projectId):null;
  let customer=p?.customerId?state.customers.find(c=>c.id===p.customerId):null;
  if(contact.customerName||contact.contactName||contact.phone||contact.email){
    if(!customer){customer={id:uid('c'),name:contact.customerName||contact.contactName||'Kunde',phone:'',email:'',address:''};state.customers.push(customer)}
    customer.name=contact.customerName||contact.contactName||customer.name;
    customer.contact=contact.contactName;
    customer.phone=contact.phone;
    customer.email=contact.email;
    customer.address=[val('case-address'),val('case-postal'),val('case-city')].filter(Boolean).join(', ');
  }
  const common={
    number:val('case-number')||nextCaseNumber(),name,status:val('case-status')||'Tilbud',caseType:val('case-type'),
    start:val('case-start'),description:val('case-description'),address:val('case-address'),postalCode:val('case-postal'),city:val('case-city'),
    customerName:contact.customerName,contactName:contact.contactName,phone:contact.phone,email:contact.email,customerId:customer?.id||''
  };
  if(p){Object.assign(p,common)}else{
    p={id:uid('p'),...common,calc:{items:[],labor:[],extras:[]},ks:[],hours:[],schedule:{startDate:common.start||new Date().toISOString().slice(0,10),dayHours:7.4,workStart:'07:00',budgetHours:0,tasks:[]},presentationNotes:{},presentationImages:{}};
    state.projects.push(p);state.activeProjectId=p.id;
  }
  saveState();closeProjectForm();renderAll();go('projects');toast(projectId?'Sag opdateret':'Sag oprettet');
}
function newProject(){openProjectForm()}
window.newProject=newProject;
window.editProject=openProjectForm;

function renderProjects(){
  $('#projects-page').innerHTML=`<div class="pagehead"><div><h1>Sager</h1><p>Opret og administrer sager med adresse, sagstype og kontaktoplysninger.</p></div><button class="primary" onclick="newProject()">+ Ny sag</button></div><div class="project-grid">${state.projects.map(p=>{const t=totals(p),cust=p.customerId?state.customers.find(c=>c.id===p.customerId):null,addr=projectAddress(p),contact=p.contactName||cust?.contact||cust?.name||'';return`<article class="project-card project-card-rich"><div class="project-card-top"><span class="status ${statusClass(p.status)}">${h(p.status)}</span><span class="case-type-badge">${h(p.caseType||'Ikke angivet')}</span></div><h3>${h(p.name)}</h3><p class="case-number">${h(p.number)}</p>${addr?`<div class="case-info"><span>⌖</span><div><small>Adresse</small><b>${h(addr)}</b></div></div>`:''}${contact?`<div class="case-info"><span>♙</span><div><small>Kontakt</small><b>${h(contact)}</b>${p.phone||cust?.phone?`<em>${h(p.phone||cust?.phone)}</em>`:''}</div></div>`:''}<div class="cardline"><span>Materialer</span><b>${kr(t.materials)}</b></div><div class="cardline"><span>KS</span><b>${ksStats(p).ok}/${ksStats(p).total}</b></div><div class="project-card-actions"><button class="secondary" onclick="openProjectForm('${p.id}')">Rediger</button><button class="secondary" onclick="state.activeProjectId='${p.id}';saveState(false);renderAll();go('dashboard')">Gør aktiv</button></div></article>`}).join('')}</div>`;
}

window.addEventListener('keydown',e=>{
  if(document.getElementById('ks-photo-viewer')){
    if(e.key==='Escape')closeKsViewer();
    if(e.key==='ArrowLeft')stepKsPhoto(-1);
    if(e.key==='ArrowRight')stepKsPhoto(1);
  }
  if(e.key==='Escape'&&document.querySelector('.case-modal'))closeProjectForm();
});

setTimeout(()=>{
  if(configured()&&!cloudUser)showAuthGate();
},300);
