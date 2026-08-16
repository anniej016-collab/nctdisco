/* ---------- helpers ---------- */
function unitClass(u){ return u.replace(/\s+/g,''); }
function sortDate(d){
  if(d.length===4) return d+"-00-00";
  if(d.length===7) return d+"-00";
  return d;
}
function formatDate(row){
  let label = row.d;
  if(row.ap) label = "~" + label;
  return label;
}

let state = { units:[], type:"ALL", lang:"ALL", query:"", memberFilters:[], sortKey:"date", sortDir:"desc", notesOnly:false };
let openRows = new Set();

function updateURL(){
  const p = new URLSearchParams();
  if(state.units.length>0) p.set('unit', state.units.join(','));
  if(state.type!=="ALL") p.set('type', state.type);
  if(state.lang!=="ALL") p.set('lang', state.lang);
  if(state.query) p.set('q', state.query);
  if(state.memberFilters.length>0) p.set('member', state.memberFilters.join(','));
  if(state.sortKey!=="date") p.set('sort', state.sortKey);
  if(state.sortDir!=="desc") p.set('dir', state.sortDir);
  if(state.notesOnly) p.set('notes', '1');
  const qs = p.toString();
  const newUrl = window.location.pathname + (qs ? '?'+qs : '');
  try{
    history.replaceState(null, '', newUrl);
  }catch(e){
    // Some embedded/sandboxed preview contexts don't allow URL updates — safe to ignore.
  }
}

function loadStateFromURL(){
  const p = new URLSearchParams(window.location.search);
  if(p.has('unit')) state.units = p.get('unit').split(',').filter(Boolean);
  if(p.has('type')) state.type = p.get('type');
  if(p.has('lang')) state.lang = p.get('lang');
  if(p.has('q')) state.query = p.get('q');
  if(p.has('member')) state.memberFilters = p.get('member').split(',').filter(Boolean);
  if(p.has('sort')) state.sortKey = p.get('sort');
  if(p.has('dir')) state.sortDir = p.get('dir');
  if(p.has('notes')) state.notesOnly = p.get('notes') === '1';
}

function copyShareLink(){
  const btn = document.getElementById('shareBtn');
  const orig = btn.textContent;
  navigator.clipboard.writeText(window.location.href).then(()=>{
    btn.textContent = '✓ link copied';
    setTimeout(()=>{ btn.textContent = orig; }, 1800);
  }).catch(()=>{
    btn.textContent = "couldn't copy — copy manually";
    setTimeout(()=>{ btn.textContent = orig; }, 2200);
  });
}

function resetFilters(){
  state = { units:[], type:"ALL", lang:"ALL", query:"", memberFilters:[], sortKey:"date", sortDir:"desc", notesOnly:false };
  document.getElementById('searchInput').value = "";
  updateMemberBadge();
  buildGates();
  buildTypeFilter();
  buildLangFilter();
  updateNotesToggleBtn();
  render();
  updateURL();
}

const NCT_ROSTER = new Set([
  "Taeil","Johnny","Taeyong","Yuta","Kun","Doyoung","Ten","Jaehyun","Winwin","Jungwoo","Lucas","Mark",
  "Xiaojun","Hendery","Renjun","Jeno","Haechan","Jaemin","Yangyang","Shotaro","Sungchan","Chenle","Jisung",
  "Sion","Riku","Yushi","Jaehee","Ryo","Sakuya"
]);
const UNITS = ["ALL","NCT","NCT 127","NCT Dream","WayV","NCT Wish","NCT DoJaeJung","NCT JNJM","SuperM","Solo"];

/* ---------- personal notes (localStorage only, never leaves this browser) ---------- */
const NOTES_STORAGE_KEY = 'nct-notes:v1';

function noteKey(row){ return row.u + '::' + row.t + '::' + row.d; }

function loadAllNotes(){
  try{
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || {};
  }catch(e){
    return {};
  }
}
function saveAllNotes(notes){
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}
function getNote(row){
  const notes = loadAllNotes();
  return notes[noteKey(row)] || null;
}
function setNote(row, text){
  const notes = loadAllNotes();
  const key = noteKey(row);
  if(text.trim() === ''){
    delete notes[key];
  } else {
    notes[key] = { text, updatedAt: new Date().toISOString() };
  }
  saveAllNotes(notes);
}
function hasAnyNotes(){
  return Object.keys(loadAllNotes()).length > 0;
}

function exportNotes(){
  const notes = loadAllNotes();
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nct-discography-notes.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importNotesFromFile(file){
  const status = document.getElementById('notesIoStatus');
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const incoming = JSON.parse(reader.result);
      const current = loadAllNotes();
      const merged = { ...current, ...incoming };
      saveAllNotes(merged);
      status.textContent = `imported ${Object.keys(incoming).length} note(s)`;
      render();
    }catch(e){
      status.textContent = "couldn't read that file — expected the JSON exported from here";
    }
    setTimeout(()=>{ status.textContent = ''; }, 3500);
  };
  reader.readAsText(file);
}

function buildGates(){
  const row = document.getElementById('gateRow');
  row.innerHTML = "";
  UNITS.forEach(u=>{
    const b = document.createElement('button');
    const isActive = u === "ALL" ? state.units.length===0 : state.units.includes(u);
    b.className = 'gate' + (isActive ? ' active':'');
    b.textContent = u === "ALL" ? "All units" : u;
    b.dataset.unit = u;
    b.onclick = ()=>{
      if(u==="ALL"){
        state.units = [];
      } else if(state.units.includes(u)){
        state.units = state.units.filter(x=>x!==u);
      } else {
        state.units = [...state.units, u];
      }
      render(); buildGates(); updateURL();
    };
    row.appendChild(b);
  });
}

function buildTypeFilter(){
  const sel = document.getElementById('typeFilter');
  const types = Array.from(new Set(DATA.map(d=>d.ty))).sort();
  sel.innerHTML = '<option value="ALL">All types</option>' + types.map(t=>`<option value="${t}">${t}</option>`).join('');
  sel.value = state.type;
  sel.onchange = ()=>{ state.type = sel.value; render(); updateURL(); };
}
function buildLangFilter(){
  const sel = document.getElementById('langFilter');
  const langs = Array.from(new Set(DATA.map(d=>d.la))).sort();
  sel.innerHTML = '<option value="ALL">All languages</option>' + langs.map(t=>`<option value="${t}">${t}</option>`).join('');
  sel.value = state.lang;
  sel.onchange = ()=>{ state.lang = sel.value; render(); updateURL(); };
}

function matches(row){
  if(state.units.length>0 && !state.units.includes(row.u)) return false;
  if(state.type!=="ALL" && row.ty!==state.type) return false;
  if(state.lang!=="ALL" && row.la!==state.lang) return false;
  if(state.memberFilters.length>0 && !state.memberFilters.every(m=>(row.m||[]).includes(m))) return false;
  if(state.notesOnly && !getNote(row)) return false;
  if(state.query){
    const q = state.query.toLowerCase();
    const hay = (row.t+" "+(row.m||[]).join(" ")+" "+row.u+" "+row.d+" "+row.ty+" "+(row.n||"")).toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function rowKey(r,i){ return r.u+"|"+r.t+"|"+r.d+"|"+i; }

function memberPills(members, credits){
  if(!members || members.length===0) return '<span style="color:var(--muted); font-size:11px;">—</span>';
  return members.map(m=>{
    const isGuest = !NCT_ROSTER.has(m);
    const c = credits && credits[m];
    const badge = c ? `<span class="credit-tag" title="${c.join(' & ')}">${c.map(x=>x==='lyrics'?'✍':x==='composer'?'♪':'🎛').join('')}</span>` : '';
    return `<span class="member-pill${isGuest?' guest-pill':''}" data-member="${m}">${m}${isGuest?'<span class="guest-tag">guest</span>':''}${badge}</span>`;
  }).join('');
}

function tracklistHTML(row){
  if(row.tl && row.tl.length){
    const isRepackage = row.ty === 'Repackage';
    const items = row.tl.map((track,i)=>{
      const raw = typeof track === 'object' ? track.t : track;
      const url = typeof track === 'object' ? track.url : null;
      const isNew = typeof track === 'object' ? track.isNew : false;
      const isStarred = raw.startsWith('★');
      const clean = isStarred ? raw.slice(1) : raw;
      // On repackages, TITLE only applies to new tracks that are starred.
      // On all other releases, TITLE applies to any starred track.
      const showTitle = isStarred && (!isRepackage || isNew);
      const lyricsBtn = url ? `<a class="tl-lyrics-link" href="${url}" target="_blank" rel="noopener" title="View lyrics">♫</a>` : '';
      const tags = `${showTitle?'<span class="tl-title-tag">TITLE</span>':''}${isNew?'<span class="tl-new-tag">NEW</span>':''}${lyricsBtn}`;
      const rightSide = tags ? `<span class="tl-track-right">${tags}</span>` : '';
      return `<li><span class="n">${i+1}.</span><span class="tl-track-name">${clean}</span>${rightSide}</li>`;
    }).join('');
    return `<ul class="tl-list">${items}</ul>`;
  }
  return `<div class="tl-empty">No tracklist recorded for this release yet.</div>`;
}

function myNotesHTML(row){
  const existing = getNote(row);
  const key = noteKey(row);
  return `
    <div class="mynotes-block">
      <div class="mynotes-label">
        <span class="priv">🔒</span> your notes on this release — saved privately in this browser only
        <span class="mynotes-status" data-status-for="${key}"></span>
      </div>
      <textarea class="mynotes-textarea" data-note-key="${key}" placeholder="thoughts, ratings, favorite lines, whatever you want to remember…">${existing ? escapeHTML(existing.text) : ''}</textarea>
      ${existing ? `<button class="mynotes-clear" data-note-key="${key}">clear this note</button>` : ''}
    </div>`;
}

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render(){
  const tbody = document.getElementById('tbody');
  let rows = DATA.filter(matches);

  rows.sort((a,b)=>{
    let av, bv;
    if(state.sortKey==="date"){ av=sortDate(a.d); bv=sortDate(b.d); }
    else if(state.sortKey==="unit"){ av=a.u.toLowerCase(); bv=b.u.toLowerCase(); }
    else if(state.sortKey==="title"){ av=a.t.toLowerCase(); bv=b.t.toLowerCase(); }
    else if(state.sortKey==="type"){ av=a.ty.toLowerCase(); bv=b.ty.toLowerCase(); }
    else if(state.sortKey==="lang"){ av=a.la.toLowerCase(); bv=b.la.toLowerCase(); }
    else { av=(a.m||[]).join(",").toLowerCase(); bv=(b.m||[]).join(",").toLowerCase(); }
    if(av<bv) return state.sortDir==="asc" ? -1:1;
    if(av>bv) return state.sortDir==="asc" ? 1:-1;
    return 0;
  });

  if(rows.length===0){
    const emptyMsg = state.notesOnly
      ? `you haven't left notes on anything that matches the other filters — <button class="reset-link" id="resetFiltersBtn">clear all filters</button>`
      : `no releases match — <button class="reset-link" id="resetFiltersBtn">clear all filters</button>`;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">${emptyMsg}</td></tr>`;
    const rb = document.getElementById('resetFiltersBtn');
    if(rb) rb.addEventListener('click', resetFilters);
  } else {
    tbody.innerHTML = rows.map((r,i)=>{
      const key = rowKey(r,i);
      const hasNote = !!getNote(r);
      const isOpen = openRows.has(key);
      const coverCell = r.cv
        ? `<img class="cover-img" src="${r.cv}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;cover-fallback&quot;>♪</div>'">`
        : `<div class="cover-fallback">♪</div>`;
      let mainRow = `
        <tr class="row" data-key="${key}">
          <td class="col-expand"><button class="expand-btn ${isOpen?'open':''}${hasNote?' has-note':''}" data-key="${key}" title="${hasNote ? 'has a note · click to expand' : 'click to expand — view tracklist & add a note'}">${isOpen?'▾':'▸'}</button></td>
          <td class="col-cover">${coverCell}</td>
          <td class="col-date">${formatDate(r).startsWith('~') ? `<span class="approx">~</span>${r.d}` : r.d}</td>
          <td><span class="chip ${unitClass(r.u)}">${r.u}</span></td>
          <td class="title-cell">${r.t}${r.lyricsUrl && !r.tl ? `<a class="tl-lyrics-link row-lyrics-link" href="${r.lyricsUrl}" target="_blank" rel="noopener" title="View lyrics">♫</a>` : ''}</td>
          <td class="type-tag">${r.ty}</td>
          <td class="lang-tag">${r.la}</td>
          <td><div class="members-cell">${memberPills(r.m, r.credits)}</div></td>
          <td class="notes-cell">${r.n||''}</td>
        </tr>`;
      if(isOpen){
        mainRow += `<tr class="tl-row"><td colspan="9"><div class="tl-inner">${tracklistHTML(r)}${myNotesHTML(r)}</div></td></tr>`;
      }
      return mainRow;
    }).join('');
  }

  document.getElementById('countLine').innerHTML = `showing <b>${rows.length}</b> of <b>${DATA.length}</b> tracked releases`;

  // expand buttons
  tbody.querySelectorAll('.expand-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.key;
      if(openRows.has(key)) openRows.delete(key); else openRows.add(key);
      render();
    });
  });
  // member pills
  tbody.querySelectorAll('.member-pill').forEach(p=>{
    p.addEventListener('click', ()=>{
      const m = p.dataset.member;
      if(state.memberFilters.includes(m)){
        state.memberFilters = state.memberFilters.filter(x=>x!==m);
      } else {
        state.memberFilters = [...state.memberFilters, m];
        state.units = [];
      }
      updateMemberBadge();
      buildGates();
      render();
      updateURL();
    });
  });
  // personal notes textareas
  let noteSaveTimers = {};
  tbody.querySelectorAll('.mynotes-textarea').forEach(ta=>{
    ta.addEventListener('input', ()=>{
      const key = ta.dataset.noteKey;
      clearTimeout(noteSaveTimers[key]);
      noteSaveTimers[key] = setTimeout(()=>{
        const row = DATA.find(r => noteKey(r) === key);
        if(!row) return;
        setNote(row, ta.value);
        const status = tbody.querySelector(`.mynotes-status[data-status-for="${CSS.escape(key)}"]`);
        if(status){
          status.textContent = '✓ saved';
          status.classList.add('show');
          setTimeout(()=>status.classList.remove('show'), 1500);
        }
        updateNotesToggleBtn();
      }, 500);
    });
  });
  tbody.querySelectorAll('.mynotes-clear').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.noteKey;
      const row = DATA.find(r => noteKey(r) === key);
      if(!row) return;
      setNote(row, '');
      render();
      updateNotesToggleBtn();
    });
  });
}

function updateMemberBadge(){
  const badge = document.getElementById('memberBadge');
  const tags = document.getElementById('memberBadgeTags');
  if(state.memberFilters.length>0){
    badge.classList.add('show');
    tags.innerHTML = state.memberFilters.map(m=>
      `<span class="badge-tag">${m}<button class="badge-tag-remove" data-member="${m}">✕</button></span>`
    ).join('');
    tags.querySelectorAll('.badge-tag-remove').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.memberFilters = state.memberFilters.filter(x=>x!==btn.dataset.member);
        updateMemberBadge();
        render();
        updateURL();
      });
    });
  } else {
    badge.classList.remove('show');
    tags.innerHTML = '';
  }
}

function updateNotesToggleBtn(){
  const btn = document.getElementById('notesToggleBtn');
  if(!btn) return;
  btn.classList.toggle('active', state.notesOnly);
  btn.textContent = state.notesOnly ? '📓 showing your notes only' : '📓 my notes only';
  btn.title = hasAnyNotes() ? 'toggle: show only releases you left a note on' : "you haven't left any notes yet";
}

document.getElementById('memberBadgeClear').addEventListener('click', ()=>{
  state.memberFilters = [];
  updateMemberBadge();
  render();
  updateURL();
});

document.getElementById('searchInput').addEventListener('input', (e)=>{ state.query = e.target.value; render(); updateURL(); });

document.querySelectorAll('thead th[data-key]').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if(state.sortKey===key){ state.sortDir = state.sortDir==="asc" ? "desc":"asc"; }
    else { state.sortKey = key; state.sortDir = key==="date" ? "desc":"asc"; }
    render();
    updateURL();
  });
});

document.getElementById('shareBtn').addEventListener('click', copyShareLink);

document.getElementById('notesToggleBtn').addEventListener('click', ()=>{
  state.notesOnly = !state.notesOnly;
  updateNotesToggleBtn();
  render();
  updateURL();
});

document.getElementById('exportNotesBtn').addEventListener('click', exportNotes);
document.getElementById('importNotesInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file) importNotesFromFile(file);
  e.target.value = '';
});

/* split-flap title animation */
(function(){
  const text = "NCT DISCOGRAPHY";
  const el = document.getElementById('flapTitle');
  text.split("").forEach((ch,i)=>{
    const span = document.createElement('span');
    span.textContent = ch === " " ? " " : ch;
    span.style.animationDelay = (i*22)+"ms";
    el.appendChild(span);
  });
})();

function buildStats(){
  const row = document.getElementById('statRow');
  const count = ty => DATA.filter(d=>d.ty===ty).length;
  const totalSongs = DATA.reduce((acc,d)=>{
    if(d.featured) return acc;
    if(d.ty==="Repackage") return acc + (d.tl ? d.tl.filter(t=>typeof t==='object' && t.isNew).length : 0);
    return acc + (d.tl ? d.tl.length : 1);
  }, 0);
  const tiles = [
    ["Songs by NCT & members", totalSongs],
    ["Total releases", DATA.length],
    ["Studio albums", count("Studio Album")],
    ["EPs", count("EP")],
    ["Repackages", count("Repackage")],
    ["Single albums", count("Single Album")],
    ["Singles", count("Single")],
    ["OSTs", count("OST")],
    ["Members covered", NCT_ROSTER.size],
  ];
  row.innerHTML = tiles.map(([l,n])=>`<div class="stat-tile"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');
}

function buildLastUpdated(){
  const el = document.getElementById('lastUpdatedLine');
  if(!el) return;
  const latest = DATA.reduce((max, r) => sortDate(r.d) > sortDate(max.d) ? r : max, DATA[0]);
  el.textContent = `Newest tracked release: ${latest.t} (${latest.d}) · manually curated, checked weekly for staleness — see the repo for how to suggest a correction or addition.`;
}

// Member picker — lets you add members to the filter from a persistent input
const ALL_MEMBERS = [...NCT_ROSTER].sort();
const pickerInput = document.getElementById('memberPickerInput');
const pickerDropdown = document.getElementById('memberPickerDropdown');

function renderPickerDropdown(query){
  const q = query.toLowerCase().trim();
  const matches = ALL_MEMBERS.filter(m => !q || m.toLowerCase().includes(q));
  if(matches.length===0 || !q){
    pickerDropdown.classList.remove('open');
    return;
  }
  pickerDropdown.innerHTML = matches.map(m=>{
    const active = state.memberFilters.includes(m);
    return `<li class="${active?'selected':''}" data-member="${m}">${m}${active?'<span class="tick">✓ added</span>':''}</li>`;
  }).join('');
  pickerDropdown.classList.add('open');
  pickerDropdown.querySelectorAll('li').forEach(li=>{
    li.addEventListener('click', ()=>{
      const m = li.dataset.member;
      if(state.memberFilters.includes(m)){
        state.memberFilters = state.memberFilters.filter(x=>x!==m);
      } else {
        state.memberFilters = [...state.memberFilters, m];
        state.units = [];
        buildGates();
      }
      updateMemberBadge();
      render();
      updateURL();
      pickerInput.value = '';
      pickerDropdown.classList.remove('open');
      pickerInput.focus();
    });
  });
}

pickerInput.addEventListener('input', ()=> renderPickerDropdown(pickerInput.value));
pickerInput.addEventListener('focus', ()=>{ if(pickerInput.value) renderPickerDropdown(pickerInput.value); });
document.addEventListener('click', e=>{ if(!e.target.closest('.member-picker-wrap')) pickerDropdown.classList.remove('open'); });
pickerInput.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ pickerDropdown.classList.remove('open'); pickerInput.blur(); }
});

loadStateFromURL();
document.getElementById('searchInput').value = state.query;
updateMemberBadge();
buildGates();
buildTypeFilter();
buildLangFilter();
buildStats();
buildLastUpdated();
updateNotesToggleBtn();
render();
