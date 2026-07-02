export function markup(): string {
    return `
<div class="ib-shell">
<header class="ib-hero">
    <div class="ib-title-block"><span class="eyebrow">ServiceNow context</span><h1>Instance Browser</h1><p>Find live records, add dependency metadata, and attach KB-backed guidelines without leaving VS Code.</p></div>
    <div class="ib-hero-actions"><div id="aliasBadge" class="badge idle">Auth alias</div><button id="openConfigBtn">Open config</button></div>
</header>
<section id="errorBanner" class="error-banner" style="display:none" role="alert" aria-live="assertive"></section>
<section id="busyBanner" class="busy-banner" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span id="busyText">Loading instance data...</span></section>
<section class="connection-strip">
    <label>Instance <select id="aliasSelect"></select></label><button id="rescanAliasesBtn" title="Re-scan auth aliases">Rescan</button><span id="hostHint" class="hint"></span>
    <span class="grow"></span><span id="packageField"><label title="Fluent package (now.config.json) that receives dependencies you add">Package <select id="packageSelect"></select></label></span>
</section>
<div class="ib-workbench">
<nav class="mode-tabs" role="tablist" aria-label="Instance Browser modes">
    <button id="mode-tab-browse" role="tab" data-mode="browse" aria-controls="mode-browse" aria-selected="false"><span>Browse</span><small>Find records</small></button><button id="mode-tab-discover" role="tab" data-mode="discover" aria-controls="mode-discover" aria-selected="false"><span>Discover</span><small>Search context</small></button><button id="mode-tab-guidelines" role="tab" data-mode="guidelines" aria-controls="mode-guidelines" aria-selected="false"><span>Guidelines</span><small>Save KB articles</small></button><button id="mode-tab-current" role="tab" data-mode="current" aria-controls="mode-current" aria-selected="false"><span>Current</span><small>Dependencies</small></button>
</nav>
<main class="ib-stage">
  <section id="mode-browse" class="mode-panel" role="tabpanel" aria-labelledby="mode-tab-browse" hidden>
        <div class="panel-heading"><h2>Browse Records</h2><p>Search a source table, select records, and add them to dependency metadata.</p></div>
    <div class="toolbar"><label>Source <select id="browseSource"></select></label><label>Scope <select class="scopeSelect" id="browseScope"><option value="*">All Scopes</option></select></label><label>Search <input id="browseTerm" placeholder="Name, label, or description"></label><button id="browseSearch" class="primary">Search</button></div>
    <div class="actions"><button id="addBrowse" class="primary" disabled>Add selected</button><span id="browseCount" class="hint" aria-live="polite">No items selected</span></div><div id="browseResults" class="results empty" role="region" aria-label="Browse results">Select an auth alias and search to begin.</div>
  </section>
  <section id="mode-discover" class="mode-panel" role="tabpanel" aria-labelledby="mode-tab-discover" hidden>
        <div class="panel-heading"><h2>Discover Context</h2><p>Describe the work and scan related scripts, flows, policies, and KB articles.</p></div>
    <textarea id="taskText" aria-label="Task description for context discovery" placeholder="Describe the feature, issue, or project area to discover relevant scripts, flows, and knowledge articles..."></textarea>
    <div class="toolbar"><label>Keywords <input id="keywords" placeholder="approval, change, manager"></label><label>Scope <select class="scopeSelect" id="discoverScope"><option value="*">All Scopes</option></select></label><label>Limit <select id="discoverLimit"><option>10</option><option selected>30</option><option>50</option></select></label><button id="runDiscover" class="primary">Discover</button></div>
    <div id="discoverSources" class="check-grid" role="group" aria-label="Sources to scan"></div><div id="progress" class="hint" aria-live="polite"></div><div class="actions"><button id="addDiscover" class="primary" disabled>Add selected</button><span id="discoverCount" class="hint" aria-live="polite">No items selected</span></div><div id="discoverResults" class="results empty" role="region" aria-label="Discovery results">Discovery results will appear here.</div>
  </section>
  <section id="mode-guidelines" class="mode-panel" role="tabpanel" aria-labelledby="mode-tab-guidelines" hidden>
        <div class="panel-heading"><h2>KB Guidelines</h2><p>Search Knowledge articles that describe coding standards, review rules, release policies, or team conventions.</p></div>
        <div id="savedGuidelines" class="hint"></div>
    <div class="toolbar"><label>Search KB <input id="guidelineTerm" placeholder="AI guidelines, coding standards, review policy"></label><label>Knowledge Base <select id="guidelineKb"><option value="">All Knowledge Bases</option></select></label><button id="searchGuidelines" class="primary">Search</button></div>
    <div class="actions"><button id="addGuidelines" class="primary" disabled>Save as agent guidelines</button><button id="clearGuidelines">Clear saved guidelines</button><span id="guidelineCount" class="hint" aria-live="polite">No articles selected</span></div><div id="guidelineResults" class="results empty" role="region" aria-label="Knowledge guideline results">Search for KB-backed guidelines.</div>
  </section>
    <section id="mode-current" class="mode-panel" role="tabpanel" aria-labelledby="mode-tab-current" hidden><div class="panel-heading"><h2>Current Dependencies</h2><p>Review and remove dependency entries saved in the selected package configuration.</p></div><div class="actions"><button id="refreshCurrent">Refresh</button><button id="runDeps" class="primary">Download dependency types</button></div><div id="currentDeps" class="results empty" role="region" aria-label="Current dependencies">No package selected.</div></section>
</main>
</div>
</div>`;
}

export function styles(): string {
    return `
body { padding: 0; max-width:none; background:linear-gradient(135deg, color-mix(in srgb, var(--nd-bg) 90%, var(--nd-accent) 10%) 0, var(--nd-bg) 360px); }
.ib-shell { width:min(1320px, calc(100vw - 36px)); margin:0 auto; padding:24px 0 32px; }
.ib-hero { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; margin-bottom:12px; padding:20px 22px; background:linear-gradient(135deg, color-mix(in srgb, var(--nd-bg-card) 82%, var(--nd-accent) 18%), color-mix(in srgb, var(--nd-bg-card) 94%, var(--nd-highlight) 6%)); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-2); }
.ib-title-block { max-width:720px; }
.eyebrow { display:inline-flex; margin-bottom:8px; color:var(--nd-accent-hi); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
h1 { margin:0 0 6px; font-size:28px; line-height:1.1; color:var(--nd-fg-strong); }
h2 { margin:0 0 4px; font-size:16px; color:var(--nd-fg-strong); }
p { margin:0; color:var(--nd-fg-mute); font-size:12px; }
.ib-hero-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
.connection-strip { display:flex; gap:10px; flex-wrap:wrap; align-items:center; padding:10px 12px; margin-bottom:14px; background:color-mix(in srgb, var(--nd-bg-card) 90%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); }
.ib-workbench { display:grid; grid-template-columns:minmax(180px, 220px) minmax(0, 1fr); gap:14px; align-items:start; }
.ib-stage { min-width:0; }
.panel-heading { margin-bottom:12px; padding:0 2px; }
.toolbar,.actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:10px 12px; margin-bottom:12px; background:color-mix(in srgb, var(--nd-bg-card) 92%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); }
.grow { flex:1; }
label { font-size:11px; font-weight:700; color:var(--nd-fg-mute); display:inline-flex; align-items:center; gap:6px; }
select,input,textarea { background:var(--nd-bg-input); color:var(--nd-fg); border:1px solid var(--nd-border); border-radius:var(--nd-r-sm); padding:5px 8px; font:12px var(--nd-font); }
input { min-width:220px; } textarea { box-sizing:border-box; width:100%; min-height:120px; resize:vertical; margin-bottom:12px; border-radius:var(--nd-r-md); padding:12px; }
button { background:var(--nd-bg-soft); color:var(--nd-fg); border:1px solid var(--nd-border); border-radius:var(--nd-r-sm); padding:5px 10px; font:12px var(--nd-font); cursor:pointer; }
button.primary { background:var(--vscode-button-background, var(--nd-accent-lo)); border-color:var(--vscode-button-background, var(--nd-accent-lo)); color:var(--vscode-button-foreground, #fff); } button.primary:hover { background:var(--vscode-button-hoverBackground, var(--nd-accent)); } button:disabled { opacity:.45; cursor:not-allowed; }
button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible { outline:2px solid color-mix(in srgb, var(--nd-accent) 72%, transparent); outline-offset:2px; }
.mode-tabs { position:sticky; top:18px; display:flex; flex-direction:column; gap:6px; padding:8px; background:color-mix(in srgb, var(--nd-bg-card) 88%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-1); }
.mode-tabs button { display:flex; flex-direction:column; align-items:flex-start; gap:2px; width:100%; background:transparent; border:1px solid transparent; border-radius:var(--nd-r-sm); color:var(--nd-fg-mute); font-weight:700; padding:10px 11px; text-align:left; }
.mode-tabs button span { color:inherit; }
.mode-tabs button small { font-size:10px; font-weight:600; color:var(--nd-fg-mute); }
.mode-tabs button.active { color:var(--nd-fg-strong); background:color-mix(in srgb, var(--nd-accent) 18%, transparent); border-color:color-mix(in srgb, var(--nd-accent) 30%, transparent); box-shadow:var(--nd-shadow-glow); }
.mode-panel { display:none; min-height:560px; padding:18px; background:color-mix(in srgb, var(--nd-bg-card) 94%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-1); } .mode-panel.active { display:block; }
.badge { display:inline-flex; padding:3px 9px; border-radius:var(--nd-r-pill); font-size:11px; font-weight:700; } .badge.ok { background:rgba(78,201,139,.15); color:var(--nd-success); } .badge.bad { background:rgba(241,76,76,.15); color:var(--nd-danger); } .badge.idle { background:var(--nd-bg-soft); color:var(--nd-fg-mute); }
.error-banner { color:var(--nd-danger); background:rgba(241,76,76,.1); border:1px solid var(--nd-danger); padding:8px 10px; border-radius:var(--nd-r-sm); margin-bottom:12px; font-size:12px; }
.busy-banner { display:flex; align-items:center; gap:8px; color:var(--nd-fg); background:color-mix(in srgb, var(--nd-bg-card) 82%, var(--nd-accent) 18%); border:1px solid var(--nd-border-strong); padding:8px 10px; border-radius:var(--nd-r-md); margin-bottom:12px; font-size:12px; }
.spinner { width:13px; height:13px; border:2px solid var(--nd-border); border-top-color:var(--nd-accent); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
@keyframes spin { to { transform:rotate(360deg); } }
.hint { color:var(--nd-fg-mute); font-size:11px; }
.check-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:8px; margin-bottom:12px; }
.source-option { display:grid; grid-template-columns:20px minmax(0,1fr); align-items:center; gap:8px; background:var(--nd-bg-card); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-sm); padding:8px 10px; cursor:pointer; }
.source-option:hover { border-color:var(--nd-border-strong); background:var(--nd-bg-soft); }
.source-option input { width:14px; height:14px; min-width:0; accent-color:var(--nd-accent); margin:0; }
.source-option span { color:var(--nd-fg); font-weight:600; white-space:normal; overflow-wrap:anywhere; }
.results { border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); background:color-mix(in srgb, var(--nd-bg-card) 88%, transparent); max-height:560px; overflow:auto; }
.empty { padding:24px; text-align:center; color:var(--nd-fg-mute); font-size:12px; }
.row { display:grid; grid-template-columns:32px minmax(0,1fr) auto; gap:10px; padding:12px; border-bottom:1px solid var(--nd-border-soft); align-items:start; transition:background .15s,border-color .15s; cursor:pointer; }
.row:hover { background:var(--nd-bg-soft); }
.select-cell { display:flex; align-items:flex-start; justify-content:center; padding-top:2px; }
.select-cell input[type="checkbox"] { width:16px; height:16px; min-width:0; margin:0; accent-color:var(--nd-accent); cursor:pointer; }
.row:last-child { border-bottom:none; } .name { font-weight:700; color:var(--nd-fg-strong); } .sub { color:var(--nd-fg-mute); font-size:11px; margin-top:2px; }
.chip { display:inline-block; margin:4px 4px 0 0; padding:1px 6px; border-radius:var(--nd-r-pill); background:var(--nd-bg-soft); color:var(--nd-fg-mute); font-size:10px; }
pre.preview { white-space:pre-wrap; word-break:break-word; max-height:260px; overflow:auto; margin:8px 0 0; padding:9px; background:var(--nd-bg-code); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-sm); font-size:11px; }
@media (max-width: 780px) { .ib-shell { width:calc(100vw - 24px); padding-top:12px; } .ib-hero,.connection-strip { flex-direction:column; align-items:stretch; } .ib-hero-actions { justify-content:flex-start; } .ib-workbench { grid-template-columns:1fr; } .mode-tabs { position:static; flex-direction:row; overflow-x:auto; } .mode-tabs button { min-width:132px; } }
@media (max-width: 560px) { .toolbar,.actions { align-items:flex-start; } .grow { display:none; } input { min-width:150px; } .mode-panel { padding:12px; } .row { grid-template-columns:28px minmax(0,1fr); } .row > div:last-child { grid-column:2; } }
body.vscode-high-contrast .ib-hero,body.vscode-high-contrast .connection-strip,body.vscode-high-contrast .mode-tabs,body.vscode-high-contrast .mode-panel,body.vscode-high-contrast .toolbar,body.vscode-high-contrast .actions,body.vscode-high-contrast .results,body.vscode-high-contrast .row { border-color:var(--vscode-contrastBorder,var(--nd-border)); box-shadow:none; }
@media (forced-colors: active) { button,select,input,textarea,.mode-panel,.results,.row { border-color:ButtonText; } }
`;
}

export function script(): string {
    return `
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
const state = { sources: [], selected: new Map(), mode: 'browse', busy: { init: 'Loading instance data...' } };
function post(msg){ vscode.postMessage(msg); }
function showError(msg){ const el=$('errorBanner'); el.style.display=msg?'block':'none'; el.textContent=msg||''; }
function setBusy(target,message){ if(message) state.busy[target]=message; else delete state.busy[target]; const messages=Object.values(state.busy).filter(Boolean); const banner=$('busyBanner'); const text=$('busyText'); if(!banner||!text) return; banner.style.display=messages.length?'flex':'none'; banner.setAttribute('aria-busy', messages.length?'true':'false'); text.textContent=messages[0]||''; }
function setMode(mode){ state.mode=mode; document.querySelectorAll('.mode-panel').forEach(p=>{ const active=p.id==='mode-'+mode; p.classList.toggle('active', active); p.toggleAttribute('hidden', !active); p.setAttribute('aria-hidden', String(!active)); }); document.querySelectorAll('.mode-tabs button').forEach(b=>{ const active=b.dataset.mode===mode; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active)); b.setAttribute('tabindex', active?'0':'-1'); }); }
function setAliasBadge(alias){ const b=$('aliasBadge'); b.className='badge ok'; b.textContent=alias ? 'Alias: '+alias : 'Auth alias'; }
function selectedFor(prefix){ return [...state.selected.values()].filter(x=>x.bucket===prefix); }
function dependencyScope(selectId){ const value=$(selectId).value; return value === '*' ? 'global' : value; }
function updateButtons(){ const map={browse:['addBrowse','browseCount'],discover:['addDiscover','discoverCount'],guidelines:['addGuidelines','guidelineCount']}; Object.entries(map).forEach(([k,[btn,count]])=>{ const n=selectedFor(k).length; $(btn).disabled=n===0; $(count).textContent=n? n+' selected':'No items selected'; }); }
function renderSavedGuidelines(articles){ const el=$('savedGuidelines'); if(!el) return; if(!articles||!articles.length){ el.textContent='No KB-backed guidelines saved yet.'; return; } el.innerHTML='Saved guidelines: '+articles.map(a=>esc((a.number?a.number+': ':'')+(a.title||a.sysId))).join(' · '); }
function renderOptions(select, items, valueKey='key', labelKey='label'){ select.innerHTML=items.map(x=>'<option value="'+esc(x[valueKey])+'">'+esc(x[labelKey])+'</option>').join(''); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderRows(target, items, bucket){
    if(!items.length){ $(target).className='results empty'; $(target).textContent='No results.'; return; }
    $(target).className='results';
    $(target).innerHTML=items.map((item,i)=>'<div class="row" data-i="'+i+'"><label class="select-cell" title="Select"><input type="checkbox" data-bucket="'+bucket+'" data-i="'+i+'"></label><div><div class="name">'+esc(item.name||item.sysId)+'</div><div class="sub">'+esc(item.subtitle||'')+'</div><span class="chip">'+esc(item.label)+'</span><span class="chip">'+esc(item.scope||'no scope')+'</span>'+(item.score?'<span class="chip">score '+item.score+'</span>':'')+'<div id="preview-'+bucket+'-'+i+'"></div></div><div>'+(item.hasPreview?'<button data-preview="'+bucket+'" data-i="'+i+'">Preview</button>':'')+'</div></div>').join('');
    $(target).querySelectorAll('input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{ const item=items[Number(cb.dataset.i)]; const id=cb.dataset.bucket+':'+item.sysId; if(cb.checked) state.selected.set(id,{...item,bucket:cb.dataset.bucket}); else state.selected.delete(id); updateButtons(); }));
    $(target).querySelectorAll('.row').forEach(row=>row.addEventListener('click',(event)=>{ if(event.target.closest('button')||event.target.closest('input')) return; const cb=row.querySelector('input[type=checkbox]'); if(!cb) return; cb.checked=!cb.checked; cb.dispatchEvent(new Event('change',{bubbles:true})); }));
    $(target).querySelectorAll('button[data-preview]').forEach(btn=>btn.addEventListener('click',()=>{ const item=items[Number(btn.dataset.i)]; post({type:'preview',source:item.source,sysId:item.sysId,previewId:'preview-'+btn.dataset.preview+'-'+btn.dataset.i}); }));
}
function keywordsFromTask(){ const stop=new Set('the a an and or for to of in on with from this that need want create update build service servicenow instance record table field user'.split(' ')); return $('taskText').value.toLowerCase().replace(/[^a-z0-9_\s-]/g,' ').split(/\s+/).filter(x=>x.length>2&&!stop.has(x)).slice(0,10).join(', '); }
document.querySelectorAll('.mode-tabs button').forEach(b=>{ b.addEventListener('click',()=>{ setMode(b.dataset.mode); if(b.dataset.mode==='current') post({type:'refreshCurrent'}); }); b.addEventListener('keydown',ev=>{ const tabs=[...document.querySelectorAll('.mode-tabs button')]; const i=tabs.indexOf(b); let next=i; if(ev.key==='ArrowRight'||ev.key==='ArrowDown') next=(i+1)%tabs.length; else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp') next=(i-1+tabs.length)%tabs.length; else if(ev.key==='Home') next=0; else if(ev.key==='End') next=tabs.length-1; else return; ev.preventDefault(); tabs[next].focus(); setMode(tabs[next].dataset.mode); if(tabs[next].dataset.mode==='current') post({type:'refreshCurrent'}); }); });
$('aliasSelect').addEventListener('change',e=>{ post({type:'selectAlias',alias:e.target.value}); const opt=e.target.selectedOptions[0]; $('hostHint').textContent=opt?.dataset.host||''; setAliasBadge(e.target.value); });
$('packageSelect').addEventListener('change',e=>post({type:'selectPackage',path:e.target.value})); $('openConfigBtn').onclick=()=>post({type:'openConfigFile'}); $('runDeps').onclick=()=>{ setBusy('current','Downloading dependency types...'); post({type:'runDependenciesCmd'}); }; $('refreshCurrent').onclick=()=>post({type:'refreshCurrent'});
$('rescanAliasesBtn').onclick=()=>{ setBusy('aliases','Rescanning auth aliases...'); post({type:'rescanAliases'}); };
function renderAliases(aliases,currentAlias){ renderOptions($('aliasSelect'),aliases.map(a=>({key:a.alias,label:a.alias,host:a.host}))); [...$('aliasSelect').options].forEach((o,i)=>o.dataset.host=aliases[i]?.host||''); if(currentAlias) $('aliasSelect').value=currentAlias; setAliasBadge(currentAlias); $('hostHint').textContent=$('aliasSelect').selectedOptions[0]?.dataset.host||''; }
$('browseSearch').onclick=()=>{ setBusy('browse','Searching records...'); post({type:'search',source:$('browseSource').value,scope:$('browseScope').value,term:$('browseTerm').value}); };
$('taskText').addEventListener('input',()=>{ if(!$('keywords').value) $('keywords').value=keywordsFromTask(); });
$('runDiscover').onclick=()=>{ setBusy('discover','Discovering related context...'); post({type:'discover',sources:[...document.querySelectorAll('#discoverSources input:checked')].map(x=>x.value),scope:$('discoverScope').value,keywords:$('keywords').value.split(',').map(x=>x.trim()).filter(Boolean),limit:Number($('discoverLimit').value)}); };
$('searchGuidelines').onclick=()=>{ setBusy('guidelines','Searching Knowledge articles...'); post({type:'search',source:'knowledge',kb:$('guidelineKb').value,term:$('guidelineTerm').value}); };
$('addBrowse').onclick=()=>{ setBusy('browse','Adding dependencies...'); post({type:'addSelected',scope:dependencyScope('browseScope'),items:selectedFor('browse').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('addDiscover').onclick=()=>{ setBusy('discover','Adding context dependencies...'); post({type:'addSelected',scope:dependencyScope('discoverScope'),items:selectedFor('discover').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('addGuidelines').onclick=()=>{ setBusy('guidelines','Saving selected KB articles as guidelines...'); post({type:'saveGuidelines',items:selectedFor('guidelines').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('clearGuidelines').onclick=()=>{ setBusy('guidelines','Clearing saved guidelines...'); post({type:'clearGuidelines'}); };
window.addEventListener('message',ev=>{ const msg=ev.data; showError(''); if(msg.type==='error'){ setBusy('init',''); setBusy('browse',''); setBusy('discover',''); setBusy('guidelines',''); setBusy('scopes',''); setBusy('aliases',''); setBusy('knowledgeBases',''); showError(msg.message); } if(msg.type==='init'){ setBusy('init',''); state.sources=msg.sources; renderOptions($('browseSource'),msg.sources); const discover=msg.sources.filter(s=>s.discover); $('discoverSources').innerHTML=discover.map(s=>'<label class="source-option"><input type="checkbox" checked value="'+esc(s.key)+'"><span>'+esc(s.label)+'</span></label>').join(''); renderAliases(msg.aliases,msg.currentAlias); $('packageField').style.display=msg.packages.length>1?'':'none'; renderOptions($('packageSelect'),msg.packages.map(p=>({key:p.path,label:p.name+' '+(p.scope?'('+p.scope+')':'')}))); if(msg.currentPackage) $('packageSelect').value=msg.currentPackage; renderSavedGuidelines(msg.savedGuidelines); setMode(msg.mode||'browse'); }
if(msg.type==='setMode') setMode(msg.mode); if(msg.type==='aliasSelected') setAliasBadge(msg.alias); if(msg.type==='aliases'){ setBusy('aliases',''); renderAliases(msg.aliases,msg.currentAlias); } if(msg.type==='busy') setBusy(msg.target,msg.message); if(msg.type==='scopes'){ setBusy('scopes',''); document.querySelectorAll('.scopeSelect').forEach(sel=>renderOptions(sel,msg.scopes,'scope','scope')); } if(msg.type==='knowledgeBases'){ setBusy('knowledgeBases',''); renderOptions($('guidelineKb'),msg.knowledgeBases,'sys_id','title'); }
if(msg.type==='results'){ const bucket=msg.mode==='discover'?'discover':state.mode==='guidelines'?'guidelines':'browse'; setBusy(bucket,''); renderRows(bucket==='browse'?'browseResults':bucket==='discover'?'discoverResults':'guidelineResults',msg.items,bucket); }
if(msg.type==='progress') $('progress').textContent=(msg.label||msg.source)+' '+msg.status+(msg.count!==undefined?' ('+msg.count+')':''); if(msg.type==='previewLoading'){ const target=msg.previewId?$(msg.previewId):null; if(target) target.innerHTML='<pre class="preview"><span class="spinner"></span> Loading preview...</pre>'; } if(msg.type==='preview'){ const target=msg.previewId?$(msg.previewId):null; if(target) target.innerHTML='<pre class="preview">'+esc(msg.body||'No preview content.')+'</pre>'; }
if(msg.type==='currentDependencies'){ setBusy('current',''); renderCurrent(msg.entries); } if(msg.type==='addResult'){ setBusy('browse',''); setBusy('discover',''); state.selected.clear(); updateButtons(); post({type:'refreshCurrent'}); } if(msg.type==='guidelinesSaved'){ setBusy('guidelines',''); state.selected.clear(); updateButtons(); renderSavedGuidelines(msg.articles); $('guidelineResults').insertAdjacentHTML('afterbegin','<div class="empty">Saved '+msg.count+' KB article(s) as agent guidelines.</div>'); } if(msg.type==='guidelinesCleared'){ setBusy('guidelines',''); state.selected.clear(); updateButtons(); renderSavedGuidelines([]); $('guidelineResults').innerHTML='<div class="empty">KB-backed agent guidelines cleared.</div>'; } });
function renderCurrent(entries){ if(!entries.length){ $('currentDeps').className='results empty'; $('currentDeps').textContent='No dependencies in selected package.'; return; } $('currentDeps').className='results'; $('currentDeps').innerHTML=entries.map((e,i)=>'<div class="row"><span></span><div><div class="name">'+esc(e.table)+'</div><div class="sub">'+esc(e.scope)+' · '+(e.wildcard?'*':e.sysIds.join(', '))+'</div></div><button data-rm="'+i+'">Remove</button></div>').join(''); $('currentDeps').querySelectorAll('button[data-rm]').forEach(btn=>btn.addEventListener('click',()=>{ const e=entries[Number(btn.dataset.rm)]; post({type:'removeDependency',scope:e.scope,table:e.table,sysId:e.wildcard?'*':e.sysIds[0]}); })); }
`;
}
