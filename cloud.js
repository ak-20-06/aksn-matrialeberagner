let state=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||freshState()}catch{return freshState()}})();
let sb=null,cloudUser=null,cloudTimer=null,cloudBusy=false,cloudDirty=false,cloudRetryTimer=null;
let cloudLoadedUserId=null,lastLocalChangeAt=0;

function saveState(show=true){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  lastLocalChangeAt=Date.now();
  cloudDirty=true;
  queueCloud();
  if(show)toast(cloudUser?'Gemt · autosynkroniserer':'Gemt lokalt');
}
function cfg(){return window.APP_CONFIG||{}}
function configured(){return !!(cfg().SUPABASE_URL&&cfg().SUPABASE_PUBLISHABLE_KEY)}
function setCloud(kind,text){const e=document.getElementById('cloud-status');if(e){e.className='cloud-status '+kind;e.textContent='● '+text}}

async function loadCloudForUser(silent=true){
  if(!cloudUser)return;
  if(cloudLoadedUserId===cloudUser.id){
    if(cloudDirty)queueCloud(100);else setCloud('online','Online · autosynk');
    return;
  }
  cloudLoadedUserId=cloudUser.id;
  await pullCloud(silent,true);
}

async function initCloud(){
  if(!configured()||!window.supabase){setCloud('local','Lokal');window.showAuthGate?.('Supabase-forbindelsen mangler. Kontakt administrator.');return}
  sb=window.supabase.createClient(cfg().SUPABASE_URL,cfg().SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

  sb.auth.onAuthStateChange((event,s)=>{
    const nextUser=s?.user||null;
    cloudUser=nextUser;
    setTimeout(async()=>{
      if(cloudUser){
        window.hideAuthGate?.();
        /* Vigtigt: TOKEN_REFRESHED må aldrig hente en ældre cloud-kopi ned over
           lokale ændringer. Cloud-data hentes kun første gang brugeren/sessionen indlæses. */
        if(event==='SIGNED_IN'||event==='INITIAL_SESSION')await loadCloudForUser(true);
        else if(cloudDirty)queueCloud(100);
        else setCloud('online','Online · autosynk');
      }else{
        cloudLoadedUserId=null;
        setCloud('ready','Login kræves');
        window.showAuthGate?.();
      }
      renderSettings?.();
    },0)
  });

  const {data,error}=await sb.auth.getSession();
  if(error){console.error(error);setCloud('error','Supabase fejl');window.showAuthGate?.('Der opstod en fejl ved forbindelsen til Supabase.');return}
  cloudUser=data?.session?.user||null;
  if(cloudUser){
    window.hideAuthGate?.();
    await loadCloudForUser(true);
  }else{
    setCloud('ready','Login kræves');
    window.showAuthGate?.();
  }

  window.addEventListener('online',()=>{if(cloudUser&&cloudDirty)queueCloud(100)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&cloudUser&&cloudDirty)pushCloud(false)});
  setInterval(()=>{if(cloudUser&&cloudDirty&&!cloudBusy)queueCloud(50)},30000);
}

function queueCloud(delay=450){
  if(!sb||!cloudUser)return;
  clearTimeout(cloudTimer);
  setCloud('sync','Autosynk');
  cloudTimer=setTimeout(()=>pushCloud(false),delay);
}

async function pushCloud(show=true){
  if(!sb||!cloudUser)return;
  if(cloudBusy){cloudDirty=true;return}
  cloudBusy=true;
  clearTimeout(cloudRetryTimer);
  const snapshot=JSON.stringify(state);
  const snapshotData=JSON.parse(snapshot);
  setCloud('sync','Gemmer automatisk');
  try{
    const {error}=await sb.from('app_state').upsert({user_id:cloudUser.id,data:snapshotData,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;
    cloudDirty=JSON.stringify(state)!==snapshot;
    setCloud('online',cloudDirty?'Autosynk venter':'Online · autosynk');
    if(show)toast('Synkroniseret med Supabase');
  }catch(e){
    console.error(e);
    cloudDirty=true;
    setCloud('error','Sync fejl · prøver igen');
    cloudRetryTimer=setTimeout(()=>queueCloud(50),5000);
    if(show)toast('Cloud-gemning fejlede');
  }finally{
    cloudBusy=false;
    if(cloudDirty&&cloudUser)queueCloud(250);
  }
}

async function pullCloud(silent=false,force=false){
  if(!sb||!cloudUser)return;
  if(cloudBusy)return;
  /* Beskyt ændringer, der allerede er lavet i browseren. Et almindeligt/manualt
     cloud-hent må ikke overskrive noget, som endnu ikke er sendt op. */
  if(cloudDirty&&!force){
    queueCloud(50);
    if(!silent)toast('Lokale ændringer gemmes først');
    return;
  }
  cloudBusy=true;
  setCloud('sync','Henter');
  try{
    const {data,error}=await sb.from('app_state').select('data,updated_at').eq('user_id',cloudUser.id).maybeSingle();
    if(error)throw error;
    if(data?.data){
      state=data.data;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      cloudDirty=false;
      lastLocalChangeAt=0;
      renderAll();
      setCloud('online','Online · autosynk');
    }else{
      cloudDirty=true;
    }
    if(!silent)toast('Cloud-data hentet');
  }catch(e){
    console.error(e);
    setCloud('error','Sync fejl');
  }finally{
    cloudBusy=false;
    if(cloudDirty&&cloudUser)queueCloud(100);
  }
}

async function cloudLogin(){
  if(!sb)return toast('Supabase ikke klar');
  const email=document.getElementById('cloud-email')?.value.trim(),password=document.getElementById('cloud-password')?.value||'';
  if(!email||!password)return toast('Skriv e-mail og adgangskode');
  cloudLoadedUserId=null;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error)toast(error.message);else toast('Logget ind · autosynk aktiv');
}
async function cloudRegister(){
  if(!sb)return toast('Supabase ikke klar');
  const email=document.getElementById('cloud-email')?.value.trim(),password=document.getElementById('cloud-password')?.value||'';
  if(!email||password.length<6)return toast('Brug e-mail og mindst 6 tegn');
  cloudLoadedUserId=null;
  const {data,error}=await sb.auth.signUp({email,password});
  if(error)toast(error.message);else toast(data?.session?'Bruger oprettet · autosynk aktiv':'Bruger oprettet · bekræft e-mailen');
}
async function cloudLogout(){
  if(sb)await sb.auth.signOut();
  cloudUser=null;cloudDirty=false;cloudLoadedUserId=null;lastLocalChangeAt=0;
  setCloud('ready','Login kræves');
  window.showAuthGate?.();
  renderSettings();
  toast('Logget ud');
}
