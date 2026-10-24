(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'badminton-mixer-v1';
  let courts = 2;
  let active = null;
  let rounds = [];
  let usedPairs = new Set();
  let savedSessions = [];
  let allowRepeat = false;

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateLabel = key => new Date(`${key}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getNames = () => [...new Set($('players').value.split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/\s+/g,' ')))].filter((n,i,a)=>a.findIndex(x=>x.toLocaleLowerCase()===n.toLocaleLowerCase())===i);
  const pairKey = pair => pair.map(x=>x.toLocaleLowerCase()).sort().join('::');
  const shuffle = arr => {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      savedSessions = Array.isArray(data.sessions) ? data.sessions : [];
    } catch { savedSessions=[]; }
    renderSaved();
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({sessions:savedSessions})); }
    catch { $('round-message').textContent='Could not save on this device. Check available storage in your browser.'; }
  }
  function updateCount(){const n=getNames().length;$('player-count').textContent=`${n} player${n===1?'':'s'}`;}
  function syncActive(){
    if(!active)return;
    active.rounds=rounds;active.usedPairs=[...usedPairs];active.allowRepeat=allowRepeat;active.courts=courts;
    active.updatedAt=new Date().toISOString();
    const i=savedSessions.findIndex(s=>s.id===active.id);
    if(i>=0)savedSessions[i]=active;else savedSessions.unshift(active);
    persist();renderSaved();
  }
  function startSession(){
    const names=getNames();
    $('setup-message').textContent='';
    if(names.length<4){$('setup-message').textContent='Add at least 4 different player names to start a doubles session.';return;}
    if(names.length< courts*4){$('setup-message').textContent=`You have ${names.length} players. ${courts} courts can use ${courts*4} players per round; extra courts will simply stay empty until enough players are available.`;}
    active={id:`${todayKey()}-${Date.now()}`,date:todayKey(),names,courts,allowRepeat,rounds:[],usedPairs:[],createdAt:new Date().toISOString()};
    rounds=[];usedPairs=new Set();$('session-repeat').checked=allowRepeat;
    $('setup').hidden=true;$('session').hidden=false;
    $('session-date').textContent=dateLabel(active.date).toUpperCase();
    $('session-summary').textContent=`${names.length} players · ${courts} court${courts===1?'':'s'}`;
    $('round-area').innerHTML='';$('round-message').textContent='';
    renderPairHistory();syncActive();
  }
  // Search many randomized player orders. A partnership is the only thing forbidden from repeating.
  function makeRound(names, courtCount, repeatsAllowed, previousPairs) {
    const maxPlayers=Math.min(names.length,courtCount*4);
    const targetPairs=Math.floor(maxPlayers/2);
    let best=null;
    const attempts=250;
    for(let attempt=0;attempt<attempts;attempt++){
      const pool=shuffle(names);
      const pairs=[];
      function build(remaining) {
        if(pairs.length===targetPairs)return true;
        if(remaining.length<2)return false;
        const first=remaining[0];
        const candidates=shuffle(remaining.slice(1));
        for(const other of candidates){
          const key=pairKey([first,other]);
          if(!repeatsAllowed && previousPairs.has(key))continue;
          pairs.push([first,other]);
          const next=remaining.filter(n=>n!==first&&n!==other);
          if(build(next))return true;
          pairs.pop();
        }
        return false;
      }
      if(build(pool)){
        const pairCopy=shuffle(pairs);
        const matches=[];
        for(let i=0;i+1<pairCopy.length && matches.length<courtCount;i+=2) matches.push({court:matches.length+1,teamA:pairCopy[i],teamB:pairCopy[i+1]});
        const playing=new Set(matches.flatMap(m=>[...m.teamA,...m.teamB]));
        const resting=names.filter(n=>!playing.has(n));
        return {matches,resting,pairs:pairCopy};
      }
      if(!best)best={matches:[],resting:names,pairs:[]};
    }
    return null;
  }
  function generateRound(){
    $('round-message').textContent='';
    if(!active)return;
    allowRepeat=$('session-repeat').checked;
    const result=makeRound(active.names,courts,allowRepeat,usedPairs);
    if(!result){
      $('round-message').textContent='No fresh set of partnerships could be found. Tick “Allow repeat partnerships” to continue, or finish the session.';
      return;
    }
    if(result.matches.length===0){$('round-message').textContent='Not enough players for a doubles match. Add at least 4 players to the session.';return;}
    result.pairs.forEach(p=>usedPairs.add(pairKey(p)));
    const round={number:rounds.length+1,createdAt:new Date().toISOString(),matches:result.matches,resting:result.resting,pairs:result.pairs};
    rounds.push(round);
    renderRounds();renderPairHistory();syncActive();
    if(result.matches.length<courts)$('round-message').textContent=`Only ${result.matches.length} court${result.matches.length===1?' was':'s were'} filled this round. Add more players or reduce the court count to use every court.`;
  }
  function renderRounds(){
    $('round-area').innerHTML='';
    if(!rounds.length){$('round-area').innerHTML='<div class="resting">Your first round will appear here. Generate a round when everyone is ready.</div>';return;}
    [...rounds].reverse().forEach(round=>{
      const title=document.createElement('div');title.className='round-title';
      title.innerHTML=`<h3>Round ${round.number}</h3><span>${new Date(round.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>`;
      $('round-area').appendChild(title);
      const grid=document.createElement('div');grid.className='court-grid';
      round.matches.forEach(m=>{
        const card=document.createElement('article');card.className='court-card';
        card.innerHTML=`<div class="court-label"><span>COURT ${m.court}</span><span>DOUBLES · 2V2</span></div><div class="versus"><div class="team">${m.teamA.map(escapeHTML).join('<br>')}</div><span class="vs">VS</span><div class="team right">${m.teamB.map(escapeHTML).join('<br>')}</div></div>`;
        grid.appendChild(card);
      });
      $('round-area').appendChild(grid);
      if(round.resting.length){
        const rest=document.createElement('div');rest.className='resting';
        rest.innerHTML=`<strong>Resting this round:</strong> ${round.resting.map(escapeHTML).join(', ')}`;
        $('round-area').appendChild(rest);
      }
    });
  }
  function renderPairHistory(){
    $('pair-count').textContent=`${usedPairs.size} pair${usedPairs.size===1?'':'s'}`;
    const list=$('pair-history');list.innerHTML='';
    if(!usedPairs.size){list.innerHTML='<span class="muted">No partnerships yet. They will appear after the first round.</span>';return;}
    const labels=new Map();
    rounds.forEach(r=>r.pairs.forEach(p=>labels.set(pairKey(p),p)));
    [...usedPairs].forEach(key=>{
      const p=labels.get(key);
      if(!p)return;
      const chip=document.createElement('span');chip.className='pair-chip';chip.textContent=`${p[0]} + ${p[1]}`;list.appendChild(chip);
    });
  }
  function renderSaved(){
    const host=$('saved-sessions');host.innerHTML='';
    if(!savedSessions.length){host.innerHTML='<p class="muted">No saved sessions yet.</p>';return;}
    savedSessions.slice().sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt)).slice(0,20).forEach(s=>{
      const row=document.createElement('div');row.className='saved-item';
      const info=document.createElement('div');
      info.innerHTML=`<strong>${escapeHTML(dateLabel(s.date))}</strong><small>${s.names.length} players · ${s.rounds.length} round${s.rounds.length===1?'':'s'} · ${s.courts} court${s.courts===1?'':'s'}</small>`;
      const btn=document.createElement('button');btn.textContent='Open';btn.type='button';btn.addEventListener('click',()=>openSaved(s.id));
      row.append(info,btn);host.appendChild(row);
    });
  }
  function openSaved(id){
    const s=savedSessions.find(x=>x.id===id);if(!s)return;
    active=s;rounds=s.rounds||[];usedPairs=new Set(s.usedPairs||[]);courts=s.courts||2;allowRepeat=!!s.allowRepeat;
    $('players').value=s.names.join('\n');$('courts-value').textContent=courts;$('allow-repeat').checked=allowRepeat;$('session-repeat').checked=allowRepeat;updateCount();
    $('setup').hidden=true;$('session').hidden=false;
    $('session-date').textContent=dateLabel(s.date).toUpperCase();$('session-summary').textContent=`${s.names.length} players · ${courts} court${courts===1?'':'s'}`;
    $('round-message').textContent='';renderRounds();renderPairHistory();window.scrollTo({top:0,behavior:'smooth'});
  }
  function resetToSetup(){active=null;rounds=[];usedPairs=new Set();$('session').hidden=true;$('setup').hidden=false;$('round-area').innerHTML='';$('round-message').textContent='';}
  $('players').addEventListener('input',updateCount);
  $('clear-names').addEventListener('click',()=>{$('players').value='';updateCount();$('players').focus();});
  $('courts-minus').addEventListener('click',()=>{courts=Math.max(1,courts-1);$('courts-value').textContent=courts;});
  $('courts-plus').addEventListener('click',()=>{courts=Math.min(20,courts+1);$('courts-value').textContent=courts;});
  $('allow-repeat').addEventListener('change',e=>allowRepeat=e.target.checked);
  $('start-session').addEventListener('click',startSession);
  $('generate-round').addEventListener('click',generateRound);
  $('session-repeat').addEventListener('change',e=>{allowRepeat=e.target.checked;if(active){active.allowRepeat=allowRepeat;syncActive();}});
  $('new-session').addEventListener('click',resetToSetup);
  $('clear-history').addEventListener('click',()=>{
    if(confirm('Delete all saved sessions from this device? This cannot be undone.')){
      savedSessions=[];persist();renderSaved();
      if(active){active=null;rounds=[];usedPairs=new Set();resetToSetup();}
    }
  });
  load();updateCount();
})();