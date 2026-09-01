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

window.addEventListener('keydown',e=>{
  if(document.getElementById('ks-photo-viewer')){
    if(e.key==='Escape')closeKsViewer();
    if(e.key==='ArrowLeft')stepKsPhoto(-1);
    if(e.key==='ArrowRight')stepKsPhoto(1);
  }
});

setTimeout(()=>{
  if(configured()&&!cloudUser)showAuthGate();
},300);
