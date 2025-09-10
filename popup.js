// ---- keep only theme + onboarding keys ----
const STORE = { theme:"ff_theme2", onboard:"ff_onboard_dismissed2" };

const BODY_PARTS = ["glutes","hamstrings","quads","back","chest","shoulders","biceps","triceps","core","calves"];
const EQUIPMENT = ["None","Bodyweight","Dumbbells","Barbell","Kettlebell","Band","Cable","Machine"];
const LEVELS = ["Beginner","Intermediate","Advanced"];
const PREG = ["Safe","Needs Caution","Not Safe"];

const qEl = document.getElementById("q");
const countEl = document.getElementById("count");
const resultsEl = document.getElementById("results");
const clearBtn = document.getElementById("clearBtn");
const themeToggle = document.getElementById("themeToggle");

// ---- removed drawer/plan controls ----
const onboard = document.getElementById("onboard");
const dismissOnboard = document.getElementById("dismissOnboard");
const tryPreset = document.getElementById("tryPreset");

let EX = [];
let filters = { bp:new Set(), eq:new Set(), lv:new Set(), pg:new Set(), q:"" };

init();

async function init(){
  // Theme
  const th = await get(STORE.theme, "warm");
  applyTheme(th);
  themeToggle.addEventListener("click", async ()=>{
    const next = document.documentElement.classList.contains("dark") ? "warm" : "dark";
    applyTheme(next); await set(STORE.theme, next);
  });

  // Onboarding
  const dismissed = await get(STORE.onboard, false);
  if (onboard) {
    onboard.style.display = dismissed ? "none" : "block";
    dismissOnboard?.addEventListener("click", async ()=>{ onboard.style.display = "none"; await set(STORE.onboard, true); });
    tryPreset?.addEventListener("click", ()=>{
      filters.bp.add("back"); filters.eq.add("Band"); filters.lv.add("Beginner");
      syncPillStates(); onboard.style.display="none"; set(STORE.onboard, true); render();
    });
  }

  // Pills
  renderPills("bpPills", BODY_PARTS, filters.bp);
  renderPills("eqPills", EQUIPMENT, filters.eq);
  renderPills("lvPills", LEVELS, filters.lv);
  renderPills("pgPills", PREG, filters.pg);

  // Search
  qEl.addEventListener("input", debounce(()=>{ filters.q = qEl.value.trim().toLowerCase(); render(); }, 250));

  // Clear
  clearBtn.addEventListener("click", ()=>{
    filters = { bp:new Set(), eq:new Set(), lv:new Set(), pg:new Set(), q:"" };
    qEl.value = ""; document.querySelectorAll(".pill").forEach(p=>p.classList.remove("active")); render();
  });

  // Keyboard: focus search
  document.addEventListener("keydown", (e)=>{
    if (e.key === "/" && document.activeElement !== qEl){ e.preventDefault(); qEl.focus(); }
    if (e.key === "Escape"){ qEl.value=""; filters.q=""; render(); }
  });

  // Data
  try{ const res = await fetch(chrome.runtime.getURL("exercises.json")); EX = await res.json(); } catch(e){ EX=[]; }

  render();
}

function applyTheme(mode){
  document.documentElement.classList.toggle("dark", mode==="dark");
}
function syncPillStates(){
  document.querySelectorAll(".pill").forEach(p=>{
    const t = p.dataset.val;
    const on = filters.bp.has(t) || filters.eq.has(t) || filters.lv.has(t) || filters.pg.has(t);
    p.classList.toggle("active", on);
    p.setAttribute("aria-pressed", String(on));
  });
}

function renderPills(rootId, opts, setref){
  const root = document.getElementById(rootId); root.innerHTML="";
  opts.forEach(op=>{
    const b = document.createElement("button");
    b.className="pill"; b.textContent=capitalize(op); b.dataset.val=op;
    b.setAttribute("role","button"); b.setAttribute("aria-pressed","false"); b.setAttribute("tabindex","0");
    b.addEventListener("click", ()=>togglePill(b, setref, op));
    b.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); togglePill(b,setref,op); } });
    root.appendChild(b);
  });
}
function togglePill(btn, setref, val){
  const active = btn.classList.toggle("active");
  btn.setAttribute("aria-pressed", String(active));
  if (active) setref.add(val); else setref.delete(val);
  render();
}

// Filter function
function filterExercises(list, f){
  const q = f.q;
  return list.filter(x=>{
    if (f.bp.size && !f.bp.has(x.bodyPart)) return false;
    if (f.eq.size && !f.eq.has(x.equipment)) return false;
    if (f.lv.size && !f.lv.has(x.level)) return false;
    if (f.pg.size && !f.pg.has(x.pregnancy)) return false;
    if (q && !(x.name.toLowerCase().includes(q) || x.instructions.toLowerCase().includes(q))) return false;
    return true;
  });
}

async function render(){
  const out = filterExercises(EX, filters);
  countEl.textContent = `${out.length} result${out.length===1?"":"s"}`;
  if (!out.length){
    resultsEl.innerHTML = `
      <div class="card">
        <div class="thumb fallback">No results</div>
        <p style="margin:8px 0;color:var(--muted)">Try a band-friendly warm starter:</p>
        <div class="row">
          <button class="small suggest" data-bp="back" data-eq="Band">Band</button>
          <button class="small suggest" data-bp="glutes" data-eq="Band">Glute Band</button>
          <button class="small suggest" data-bp="shoulders" data-eq="Band">Shoulder Band</button>
        </div>
      </div>`;
    resultsEl.querySelectorAll(".suggest").forEach(b=>b.onclick=()=>{
      if (b.dataset.bp) filters.bp.add(b.dataset.bp);
      if (b.dataset.eq) filters.eq.add(b.dataset.eq);
      syncPillStates(); render();
    });
    return;
  }
  resultsEl.innerHTML = out.map(cardHtml).join("");

  // Only keep title "copy to clipboard" outline feedback (optional)
  resultsEl.querySelectorAll(".copyTitle").forEach(h=>h.addEventListener("click", ()=>{
    const t = h.textContent || ""; navigator.clipboard?.writeText(t);
    h.style.outline="2px solid var(--accent)"; setTimeout(()=>h.style.outline="",500);
  }));

  // ---- removed fav/add listeners & any drawer/plan updates ----
}

function cardHtml(x){
  const pregClass =
    x.pregnancy === "Safe" ? "p-safe" :
    x.pregnancy === "Not Safe" ? "p-notsafe" : "p-caution";

  const yUrl =
    `https://www.youtube.com/results?search_query=${encodeURIComponent(x.name + " tutorial")}`;

  const caution =
    x.pregnancy === "Not Safe" ? `<p class="warn" role="note">Not safe during pregnancy.</p>` :
    x.pregnancy === "Needs Caution" ? `<p class="warn" role="note">Needs caution / modifications.</p>` : "";

  return `<article class="card">
    <h3 class="copyTitle" tabindex="0">${esc(x.name)}</h3>
    <div class="meta">
      <span class="badge">${esc(x.bodyPart)}</span>
      <span class="badge">${esc(x.equipment)}</span>
      <span class="badge">${esc(x.level)}</span>
      <span class="badge ${pregClass}">${esc(x.pregnancy)}</span>
    </div>
    <p>${esc(x.instructions)}</p>
    ${caution}
    <div class="row">
      <a class="btn" href="${yUrl}" target="_blank" rel="noopener noreferrer">▶ YouTube</a>
    </div>
  </article>`;
}


// storage helpers
function get(key, def){ return new Promise(res=>chrome.storage.sync.get([key], r=>res(r[key] ?? def))); }
function set(key, val){ return new Promise(res=>chrome.storage.sync.set({[key]:val}, ()=>res())); }

// utils
function esc(s){ return String(s).replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;","&gt;":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }
