/* Customer creation, editing and deletion */
function customerFullAddress(c){
  const street=c?.address||'';
  const city=[c?.postalCode,c?.city].filter(Boolean).join(' ');
  return [street,city].filter(Boolean).join(', ');
}
function customerCaseCount(customerId){return (state.projects||[]).filter(p=>p.customerId===customerId).length}

function renderCustomers(){
  state.customers=state.customers||[];
  const page=document.getElementById('customers-page');
  if(!page)return;
  page.innerHTML=`<div class="pagehead"><div><h1>Kunder</h1><p>Opret og gem kunder, kontaktoplysninger og adresser til senere sager.</p></div><button class="primary" onclick="openCustomerForm()">+ Ny kunde</button></div>
    ${state.customers.length?`<div class="customer-grid">${state.customers.map(c=>{
      const address=customerFullAddress(c),count=customerCaseCount(c.id);
      return `<article class="customer-card">
        <div class="customer-card-top"><div class="customer-avatar">${h((c.name||'K').slice(0,2).toUpperCase())}</div><div><h3>${h(c.name||'Navnløs kunde')}</h3>${c.contact?`<p>${h(c.contact)}</p>`:''}</div></div>
        <div class="customer-details">
          ${c.phone?`<div><span>Telefon</span><a href="tel:${h(c.phone)}">${h(c.phone)}</a></div>`:''}
          ${c.email?`<div><span>E-mail</span><a href="mailto:${h(c.email)}">${h(c.email)}</a></div>`:''}
          ${address?`<div><span>Adresse</span><b>${h(address)}</b></div>`:''}
          <div><span>Sager</span><b>${count}</b></div>
          ${c.notes?`<div class="customer-note"><span>Noter</span><p>${h(c.notes)}</p></div>`:''}
        </div>
        <div class="customer-actions"><button class="secondary" onclick="openCustomerForm('${c.id}')">Rediger</button><button class="dangerbtn" onclick="deleteCustomer('${c.id}')">Slet kunde</button></div>
      </article>`
    }).join('')}</div>`:`<div class="empty-customer card"><div>♙</div><h2>Ingen kunder endnu</h2><p>Opret din første kunde, så kontaktoplysningerne er samlet ét sted.</p><button class="primary" onclick="openCustomerForm()">+ Opret kunde</button></div>`}`;
}

function openCustomerForm(customerId=''){
  const editing=!!customerId;
  const c=editing?(state.customers||[]).find(x=>x.id===customerId):null;
  const root=document.getElementById('modal-root');
  if(!root)return;
  const v=x=>h(x??'');
  root.innerHTML=`<div class="case-modal" onclick="if(event.target===this)closeCustomerForm()">
    <form class="case-form customer-form" onsubmit="saveCustomerForm(event,'${customerId}')">
      <div class="case-form-head"><div><small>${editing?'REDIGER KUNDE':'NY KUNDE'}</small><h2>${editing?'Kundeoplysninger':'Opret kunde'}</h2><p>Gem kontaktoplysninger, så kunden nemt kan bruges igen.</p></div><button type="button" class="case-close" onclick="closeCustomerForm()">×</button></div>
      <div class="case-form-body">
        <section><h3>Kunde</h3><div class="case-grid two">
          <label>Kunde / virksomhed *<input id="customer-name" required value="${v(c?.name)}" placeholder="Fx Jens Jensen eller Firma ApS"></label>
          <label>Kontaktperson<input id="customer-contact" value="${v(c?.contact)}" placeholder="Navn på kontaktperson"></label>
          <label>Telefon<input id="customer-phone" type="tel" value="${v(c?.phone)}" placeholder="12 34 56 78"></label>
          <label>E-mail<input id="customer-email" type="email" value="${v(c?.email)}" placeholder="kunde@email.dk"></label>
        </div></section>
        <section><h3>Adresse</h3><div class="case-grid address">
          <label class="wide">Adresse<input id="customer-address" value="${v(c?.address)}" placeholder="Gade og husnummer"></label>
          <label>Postnr.<input id="customer-postal" inputmode="numeric" value="${v(c?.postalCode)}" placeholder="7100"></label>
          <label>By<input id="customer-city" value="${v(c?.city)}" placeholder="Vejle"></label>
        </div></section>
        <section><h3>Noter</h3><label class="customer-notes-label">Kommentar / bemærkning<textarea id="customer-notes" placeholder="Fx bedste tidspunkt at ringe, adgangsforhold eller andre bemærkninger">${v(c?.notes)}</textarea></label></section>
      </div>
      <div class="case-form-actions"><button type="button" class="secondary" onclick="closeCustomerForm()">Annuller</button><button type="submit" class="primary">${editing?'Gem ændringer':'Opret kunde'}</button></div>
    </form>
  </div>`;
  setTimeout(()=>document.getElementById('customer-name')?.focus(),50);
}
function closeCustomerForm(){document.getElementById('modal-root').innerHTML=''}
function saveCustomerForm(e,customerId=''){
  e.preventDefault();
  const val=id=>document.getElementById(id)?.value.trim()||'';
  const name=val('customer-name');
  if(!name)return toast('Skriv kundens navn');
  let c=customerId?(state.customers||[]).find(x=>x.id===customerId):null;
  const data={name,contact:val('customer-contact'),phone:val('customer-phone'),email:val('customer-email'),address:val('customer-address'),postalCode:val('customer-postal'),city:val('customer-city'),notes:val('customer-notes')};
  if(c)Object.assign(c,data);else{c={id:uid('c'),...data};state.customers.push(c)}
  saveState();
  closeCustomerForm();
  renderCustomers();
  toast(customerId?'Kunde opdateret':'Kunde oprettet');
}
function deleteCustomer(customerId){
  const c=(state.customers||[]).find(x=>x.id===customerId);if(!c)return;
  const linked=(state.projects||[]).filter(p=>p.customerId===customerId);
  const message=linked.length?`Kunden "${c.name}" er knyttet til ${linked.length} sag${linked.length===1?'':'er'}. Kunden slettes fra kundekartoteket, men sagerne beholdes. Fortsæt?`:`Vil du slette kunden "${c.name}"?`;
  if(!confirm(message))return;
  linked.forEach(p=>{p.customerId='';if(!p.customerName)p.customerName=c.name;if(!p.contactName)p.contactName=c.contact||'';if(!p.phone)p.phone=c.phone||'';if(!p.email)p.email=c.email||''});
  state.customers=state.customers.filter(x=>x.id!==customerId);
  saveState();renderCustomers();toast('Kunde slettet');
}
window.openCustomerForm=openCustomerForm;
window.deleteCustomer=deleteCustomer;
