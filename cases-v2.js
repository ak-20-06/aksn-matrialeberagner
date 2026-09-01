/* Sager v2: robust formular, slet sag og standardforslag pr. sagstype */
(function(){
  function val(id){return document.getElementById(id)?.value.trim()||''}
  function cloneKs(rows){return rows.map((x,i)=>({id:uid('k'),phase:x[0],area:x[1],title:x[2],status:'Ikke startet',photoRequired:true,photos:[],note:'',deviation:''}))}
  function genericKs(type){
    const rows=[
      ['Modtagekontrol','Materialer',`Kontroller materialer til ${type.toLowerCase()} mod bestilling og for skader`],
      ['Proceskontrol','Opmåling','Kontroller mål, niveauer og eksisterende forhold før opstart'],
      ['Proceskontrol','Udførelse','Kontroller fastgørelser, samlinger og kritiske detaljer under arbejdet'],
      ['Proceskontrol','Fotodokumentation','Tag fotos af kritiske detaljer før de bygges inde'],
      ['Slutkontrol','Udført arbejde','Gennemgå det færdige arbejde for fejl og mangler'],
      ['Slutkontrol','Dokumentation','Kontroller at KS og fotodokumentation er komplet']
    ];
    return cloneKs(rows);
  }
  function genericTasks(type){
    const names=['Opmåling og planlægning','Materialer og bestilling','Klargøring / afdækning',`${type} – udførelse`,'KS og fotodokumentation','Oprydning og slutkontrol'];
    return names.map((name,i)=>({id:uid('t'),name,weight:[10,5,10,55,10,10][i],crew:2,hours:0,mode:'after'}));
  }
  function templateFor(type){
    if(type==='Tag / kvist'){
      const ks=(typeof KSDATA!=='undefined'?KSDATA:[]).map((x,i)=>({id:uid('k'),phase:x[0],area:x[1],title:x[2],status:'Ikke startet',photoRequired:i!==4&&i!==5&&i!==6&&i!==7&&i!==8&&i!==23,photos:[],note:'',deviation:''}));
      const tasks=(typeof TASKS!=='undefined'?TASKS:[]).map(x=>({id:uid('t'),name:x[0],weight:x[1],crew:x[2],hours:x[1]===0&&x[0].startsWith('Byggemøde')?1:x[0]==='Fremlæggelse'?.25:0,mode:'after'}));
      return {ks:ks.length?ks:genericKs(type),tasks:tasks.length?tasks:genericTasks(type)};
    }
    return {ks:genericKs(type),tasks:genericTasks(type)};
  }

  window.saveProjectForm=function(e,projectId=''){
    e.preventDefault();
    const name=val('case-name');
    if(!name)return toast('Skriv et sagsnavn');
    const type=val('case-type')||'Andet';
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
      number:val('case-number')||nextCaseNumber(),name,status:val('case-status')||'Tilbud',caseType:type,
      start:val('case-start'),description:val('case-description'),address:val('case-address'),postalCode:val('case-postal'),city:val('case-city'),
      customerName:contact.customerName,contactName:contact.contactName,phone:contact.phone,email:contact.email,customerId:customer?.id||''
    };
    if(p){
      Object.assign(p,common);
    }else{
      const tpl=templateFor(type);
      p={id:uid('p'),...common,calc:{items:[],labor:[],extras:[]},ks:tpl.ks,hours:[],schedule:{startDate:common.start||new Date().toISOString().slice(0,10),dayHours:7.4,workStart:'07:00',budgetHours:0,tasks:tpl.tasks},presentationNotes:{},presentationImages:{}};
      state.projects.push(p);state.activeProjectId=p.id;
    }
    saveState();closeProjectForm();renderAll();go('projects');toast(projectId?'Sag opdateret':'Sag oprettet med standard KS og tidsplan');
  };

  window.deleteProject=function(projectId){
    const p=state.projects.find(x=>x.id===projectId);
    if(!p)return;
    if(state.projects.length<=1)return toast('Du skal have mindst én sag i systemet');
    if(!confirm(`Vil du slette sagen “${p.name}”?\n\nKalkulation, KS, billeder, timer og tidsplan på sagen bliver også slettet.`))return;
    state.projects=state.projects.filter(x=>x.id!==projectId);
    if(state.activeProjectId===projectId)state.activeProjectId=state.projects[0]?.id||'';
    saveState();renderAll();go('projects');toast('Sag slettet');
  };

  window.renderProjects=function(){
    const page=document.getElementById('projects-page');if(!page)return;
    page.innerHTML=`<div class="pagehead"><div><h1>Sager</h1><p>Opret og administrer sager med adresse, sagstype, kontaktoplysninger, KS og tidsplan.</p></div><button class="primary" onclick="openProjectForm()">+ Ny sag</button></div><div class="project-grid">${state.projects.map(p=>{const t=totals(p),cust=p.customerId?state.customers.find(c=>c.id===p.customerId):null,addr=projectAddress(p),contact=p.contactName||cust?.contact||cust?.name||'';return`<article class="project-card project-card-rich"><div class="project-card-top"><span class="status ${statusClass(p.status)}">${h(p.status)}</span><span class="case-type-badge">${h(p.caseType||'Ikke angivet')}</span></div><h3>${h(p.name)}</h3><p class="case-number">${h(p.number)}</p>${addr?`<div class="case-info"><span>⌖</span><div><small>Adresse</small><b>${h(addr)}</b></div></div>`:''}${contact?`<div class="case-info"><span>♙</span><div><small>Kontakt</small><b>${h(contact)}</b>${p.phone||cust?.phone?`<em>${h(p.phone||cust?.phone)}</em>`:''}</div></div>`:''}<div class="cardline"><span>Materialer</span><b>${kr(t.materials)}</b></div><div class="cardline"><span>KS</span><b>${ksStats(p).ok}/${ksStats(p).total}</b></div><div class="project-card-actions"><button class="secondary" onclick="openProjectForm('${p.id}')">Rediger</button><button class="secondary" onclick="state.activeProjectId='${p.id}';saveState(false);renderAll();go('dashboard')">Gør aktiv</button><button class="dangerbtn" onclick="deleteProject('${p.id}')">Slet sag</button></div></article>`}).join('')}</div>`;
  };

  /* Tving den nye formular til at blive brugt, også hvis en ældre app.js ligger i browser-cache. */
  window.newProject=function(){window.openProjectForm()};
})();
