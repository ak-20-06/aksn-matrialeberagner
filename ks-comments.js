/* KS-kommentarer – gemmes på det enkelte KS-punkt og synkroniseres via saveState() */
let ksCommentIndex=null;

function renderKs(){
  const p=active(),s=ksStats(p);
  $('#ks-page').innerHTML=`<div class="pagehead"><div><h1>KS & dokumentation</h1><p>Modtagekontrol, proceskontrol med fotos, kommentarer og slutkontrol.</p></div></div>
  <div class="ksmetrics"><button><strong>${s.ok}</strong><span>Godkendt</span></button><button><strong>${s.photo}</strong><span>Mangler foto</span></button><button><strong>${s.error}</strong><span>Fejl/mangel</span></button><button><strong>${s.pending}</strong><span>Ikke startet</span></button></div>
  ${['Modtagekontrol','Proceskontrol','Slutkontrol'].map(ph=>`<section class="ks-section"><div class="ks-title"><div><span class="round">✓</span><div><h2>${ph}</h2></div></div></div>
    ${p.ks.map((k,i)=>({k,i})).filter(x=>x.k.phase===ph).map(({k,i})=>`<div class="ks-item ${k.status==='Godkendt'?'complete':k.status==='Mangler foto'?'warning':k.status==='Fejl/mangel'?'danger':'pending'}">
      <span>${k.status==='Godkendt'?'✓':'!'}</span>
      <div class="ks-main-info"><b>${h(k.title)}</b><small>${h(k.area)} · ${k.photoRequired?'Foto ønskes':'Dokumentkontrol'}</small>
        ${k.photos?.length?`<small class="photo-count">📷 ${k.photos.length} foto${k.photos.length>1?'s':''}</small>`:''}
        ${k.comment?`<div class="ks-comment-preview"><strong>Kommentar:</strong> ${h(k.comment)}</div>`:''}
      </div>
      <select onchange="ksStatus(${i},this.value)">${['Ikke startet','Godkendt','Mangler foto','Fejl/mangel'].map(x=>`<option ${x===k.status?'selected':''}>${x}</option>`).join('')}</select>
      <div class="ks-photo-actions">
        <button title="Tilføj foto" onclick="ksPhoto(${i})">📷</button>
        ${k.photos?.length?`<button class="view-photo-btn" onclick="viewKsPhotos(${i},0)">Se foto</button>`:''}
        <button class="view-photo-btn" onclick="openKsComment(${i})">${k.comment?'Rediger kommentar':'Kommentar'}</button>
      </div>
    </div>`).join('')}
  </section>`).join('')}
  <input id="ks-file" type="file" accept="image/*" hidden>`;
}

function openKsComment(index){
  const k=active().ks?.[index];
  if(!k)return;
  ksCommentIndex=index;
  const root=document.getElementById('modal-root');
  root.innerHTML=`<div class="case-modal" onclick="if(event.target===this)closeKsComment()">
    <form class="case-form ks-comment-form" onsubmit="saveKsComment(event)">
      <div class="case-form-head"><div><small>KS & DOKUMENTATION</small><h2>Kommentar</h2><p>${h(k.title)} · ${h(k.area)}</p></div><button type="button" class="case-close" onclick="closeKsComment()">×</button></div>
      <div class="case-form-body"><section><h3>Kommentar til KS-punktet</h3><label class="ks-comment-label">Skriv kommentar<textarea id="ks-comment-text" rows="7" placeholder="Fx kontrolleret mål, afvigelser, aftaler, bemærkninger eller hvad der er udført.">${h(k.comment||'')}</textarea></label><small class="ks-comment-help">Kommentaren bliver gemt på sagen og synkroniseret til Supabase sammen med resten af KS-dokumentationen.</small></section></div>
      <div class="case-form-actions"><button type="button" class="secondary" onclick="closeKsComment()">Annuller</button>${k.comment?'<button type="button" class="dangerbtn" onclick="clearKsComment()">Slet kommentar</button>':''}<button type="submit" class="primary">Gem kommentar</button></div>
    </form>
  </div>`;
  setTimeout(()=>document.getElementById('ks-comment-text')?.focus(),50);
}

function saveKsComment(e){
  e.preventDefault();
  const k=active().ks?.[ksCommentIndex];
  if(!k)return;
  k.comment=document.getElementById('ks-comment-text')?.value.trim()||'';
  saveState();
  closeKsComment();
  renderKs();
  toast(k.comment?'Kommentar gemt':'Kommentar fjernet');
}

function clearKsComment(){
  const k=active().ks?.[ksCommentIndex];
  if(!k)return;
  if(!confirm('Vil du slette kommentaren?'))return;
  k.comment='';
  saveState();
  closeKsComment();
  renderKs();
  toast('Kommentar slettet');
}

function closeKsComment(){
  const root=document.getElementById('modal-root');
  if(root)root.innerHTML='';
  ksCommentIndex=null;
}

window.openKsComment=openKsComment;
window.saveKsComment=saveKsComment;
window.clearKsComment=clearKsComment;
window.closeKsComment=closeKsComment;
