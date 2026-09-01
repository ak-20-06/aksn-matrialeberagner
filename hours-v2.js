/* Timer v2 – formular + gemte opgaver */
function hourTaskLibrary(){
  state.settings=state.settings||{};
  const saved=Array.isArray(state.settings.hourTasks)?state.settings.hourTasks:[];
  const used=(state.projects||[]).flatMap(p=>(p.hours||[]).map(x=>x.task)).filter(Boolean);
  return [...new Set([...saved,...used].map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'da'));
}
function rememberHourTask(task){
  const t=String(task||'').trim();
  if(!t)return;
  state.settings=state.settings||{};
  const list=hourTaskLibrary();
  if(!list.includes(t))list.push(t);
  state.settings.hourTasks=[...new Set(list)].sort((a,b)=>a.localeCompare(b,'da'));
}
function openHourForm(){
  const tasks=hourTaskLibrary();
  const root=document.getElementById('modal-root');
  root.innerHTML=`<div class="hour-modal" onclick="if(event.target===this)closeHourForm()">
    <form class="hour-form" onsubmit="saveHourForm(event)">
      <div class="hour-form-head">
        <div><small>REGISTRER TID</small><h2>Tilføj timer</h2><p>${h(active().number)} · ${h(active().name)}</p></div>
        <button type="button" class="case-close" onclick="closeHourForm()">×</button>
      </div>
      <div class="hour-form-body">
        <div class="hour-grid two">
          <label>Dato<input id="hour-date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
          <label>Timer brugt<input id="hour-hours" type="number" min="0.25" step="0.25" required placeholder="Fx 7,5"></label>
          <label>Person<input id="hour-person" value="Asger" placeholder="Navn"></label>
          <label>Opgave
            <select id="hour-task" onchange="toggleNewHourTask()">
              ${tasks.length?tasks.map(t=>`<option value="${h(t)}">${h(t)}</option>`).join(''):''}
              <option value="__new__" ${tasks.length?'':'selected'}>+ Skriv ny opgave</option>
            </select>
          </label>
        </div>
        <label id="new-hour-task-wrap" class="hour-new-task ${tasks.length?'hidden':''}">Ny opgave<input id="hour-new-task" placeholder="Fx Opbygning af kvist, undertag eller oprydning"></label>
        <label class="hour-note">Note <span>(valgfri)</span><textarea id="hour-note" rows="3" placeholder="Fx hvad der blev lavet eller hvor langt du nåede"></textarea></label>
      </div>
      <div class="hour-form-actions"><button type="button" class="secondary" onclick="closeHourForm()">Annuller</button><button type="submit" class="primary">Gem timer</button></div>
    </form>
  </div>`;
  setTimeout(()=>document.getElementById('hour-hours')?.focus(),50);
}
function toggleNewHourTask(){
  const isNew=document.getElementById('hour-task')?.value==='__new__';
  document.getElementById('new-hour-task-wrap')?.classList.toggle('hidden',!isNew);
  if(isNew)setTimeout(()=>document.getElementById('hour-new-task')?.focus(),20);
}
function closeHourForm(){document.getElementById('modal-root').innerHTML=''}
function saveHourForm(e){
  e.preventDefault();
  const hours=Number(document.getElementById('hour-hours')?.value||0);
  const selected=document.getElementById('hour-task')?.value||'';
  const newTask=document.getElementById('hour-new-task')?.value.trim()||'';
  const task=selected==='__new__'?newTask:selected;
  if(!hours||hours<=0)return toast('Skriv hvor mange timer du har brugt');
  if(!task)return toast('Vælg eller skriv en opgave');
  rememberHourTask(task);
  active().hours=active().hours||[];
  active().hours.push({
    id:uid('h'),
    date:document.getElementById('hour-date')?.value||new Date().toISOString().slice(0,10),
    person:document.getElementById('hour-person')?.value.trim()||'Asger',
    task,
    hours,
    note:document.getElementById('hour-note')?.value.trim()||''
  });
  saveState();
  closeHourForm();
  renderHours();
  toast('Timer gemt · opgaven kan vælges igen');
}
function deleteHour(i){
  const row=active().hours?.[i];
  if(!row)return;
  if(!confirm(`Vil du slette ${row.hours} time${Number(row.hours)===1?'':'r'} på “${row.task}”?`))return;
  active().hours.splice(i,1);
  saveState();renderHours();
}
function renderHours(){
  const p=active();
  p.hours=p.hours||[];
  const sum=p.hours.reduce((a,x)=>a+Number(x.hours||0),0);
  const tasks=hourTaskLibrary();
  const byTask={};
  p.hours.forEach(x=>{byTask[x.task]=(byTask[x.task]||0)+Number(x.hours||0)});
  const taskRows=Object.entries(byTask).sort((a,b)=>b[1]-a[1]);
  $('#hours-page').innerHTML=`<div class="pagehead"><div><h1>Timer</h1><p>Registrer arbejdstid på den aktive sag. Opgaver du bruger bliver gemt, så du hurtigt kan vælge dem igen.</p></div><button class="primary" onclick="openHourForm()">+ Registrer timer</button></div>
    <div class="metrics hour-metrics">
      <article class="card metric"><span>Timer på sagen</span><strong>${num(sum,2)} t.</strong><small>${p.hours.length} registrering${p.hours.length===1?'':'er'}</small></article>
      <article class="card metric"><span>Gemte opgaver</span><strong>${tasks.length}</strong><small>kan genbruges ved næste registrering</small></article>
    </div>
    ${taskRows.length?`<section class="card hour-task-summary"><div class="panelhead"><div><h2>Timer pr. opgave</h2><p>Fordeling på den aktive sag.</p></div></div><div class="hour-task-chips">${taskRows.map(([task,hours])=>`<span><b>${h(task)}</b><em>${num(hours,2)} t.</em></span>`).join('')}</div></section>`:''}
    <div class="tablewrap"><table><thead><tr><th>Dato</th><th>Person</th><th>Opgave</th><th>Note</th><th>Timer</th><th></th></tr></thead><tbody>${p.hours.length?p.hours.map((x,i)=>`<tr><td>${h(x.date)}</td><td>${h(x.person)}</td><td><b>${h(x.task)}</b></td><td>${x.note?h(x.note):'<span class="muted">—</span>'}</td><td><b>${num(x.hours,2)}</b></td><td><button class="mini-btn danger-text" onclick="deleteHour(${i})">Slet</button></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-hours"><b>Ingen timer registreret endnu</b><span>Tryk på “Registrer timer” for at tilføje den første.</span></div></td></tr>`}</tbody></table></div>`;
}
function addHour(){openHourForm()}
window.openHourForm=openHourForm;
window.addHour=addHour;
window.renderHours=renderHours;
window.toggleNewHourTask=toggleNewHourTask;
window.saveHourForm=saveHourForm;
window.closeHourForm=closeHourForm;
window.deleteHour=deleteHour;

const hourStyle=document.createElement('style');
hourStyle.textContent=`
.hour-modal{position:fixed;inset:0;z-index:10500;background:rgba(15,23,42,.72);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}
.hour-form{width:min(700px,96vw);max-height:94vh;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.26);overflow:auto}
.hour-form-head{display:flex;justify-content:space-between;gap:20px;padding:22px 24px 17px;border-bottom:1px solid #e5e7eb}.hour-form-head small{font-size:10px;font-weight:900;letter-spacing:1px;color:#397858}.hour-form-head h2{margin:4px 0 3px;font-size:21px}.hour-form-head p{margin:0;color:#64748b;font-size:12px}
.hour-form-body{padding:20px 24px;display:grid;gap:16px}.hour-grid{display:grid;gap:13px}.hour-grid.two{grid-template-columns:1fr 1fr}.hour-form label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#475569}.hour-form input,.hour-form select,.hour-form textarea{width:100%;border:1px solid #d8dee7;border-radius:9px;padding:11px 12px;background:#fff;font:inherit;color:#17202a}.hour-form textarea{resize:vertical}.hour-note span{font-weight:500;color:#94a3b8}.hour-new-task.hidden{display:none}
.hour-form-actions{display:flex;justify-content:flex-end;gap:9px;padding:15px 24px;border-top:1px solid #e5e7eb;background:#fafbfc}
.hour-task-summary{margin-bottom:16px}.hour-task-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 18px}.hour-task-chips span{display:flex;gap:10px;align-items:center;border:1px solid #e1e7e3;background:#f7faf8;border-radius:999px;padding:8px 11px}.hour-task-chips b{font-size:11px}.hour-task-chips em{font-style:normal;font-size:10px;font-weight:800;color:#397858}
.empty-hours{padding:28px;text-align:center;display:grid;gap:5px;color:#64748b}.empty-hours b{color:#17202a}.muted{color:#94a3b8}.danger-text{color:#a33b3b!important}
@media(max-width:650px){.hour-modal{padding:0}.hour-form{width:100vw;max-height:100vh;height:100vh;border-radius:0}.hour-grid.two{grid-template-columns:1fr}.hour-form-actions{position:sticky;bottom:0}.hour-form-body{padding:17px}.hour-form-head{padding:18px 17px}}
`;
document.head.appendChild(hourStyle);
