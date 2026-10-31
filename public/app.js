import { Office } from './scene.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const hms = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const hm = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

// ------------------------------------------------------------------ starfield
function drawSpace() {
  const c = $('#space'), g = c.getContext('2d'); const dpr = Math.min(devicePixelRatio, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; g.scale(dpr, dpr);
  const w = innerWidth, h = innerHeight;
  const bg = g.createRadialGradient(w * .7, h * .3, 0, w * .6, h * .4, Math.max(w, h));
  bg.addColorStop(0, '#0d1230'); bg.addColorStop(.5, '#070a1c'); bg.addColorStop(1, '#03040a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  [[.82, .18, '#3a2a6a'], [.15, .25, '#12305a'], [.6, .85, '#1d1a45']].forEach(([x, y, col]) => { const n = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * .35); n.addColorStop(0, col + '88'); n.addColorStop(1, 'transparent'); g.fillStyle = n; g.fillRect(0, 0, w, h); });
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 520; i++) { const x = r() * w, y = r() * h, s = r() < .06 ? 1.8 : r() * 1.1 + .3; g.globalAlpha = .35 + r() * .65; g.fillStyle = r() < .1 ? '#bcd4ff' : r() < .05 ? '#ffe2b8' : '#fff'; g.beginPath(); g.arc(x, y, s, 0, 6.3); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const x = r() * w, y = r() * h; const gl = g.createRadialGradient(x, y, 0, x, y, 6); gl.addColorStop(0, '#fff'); gl.addColorStop(1, 'transparent'); g.fillStyle = gl; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 9, y - .5, 18, 1); g.fillRect(x - .5, y - 9, 1, 18); }
}
drawSpace(); addEventListener('resize', drawSpace);

// ------------------------------------------------------------------ i18n
const I18N = {
  en: {
    day: 'Day', night: 'Night', tasks: 'Tasks', needsYouLower: 'needs you', connected: 'Connected', crew: 'CREW', crewPreset: 'Crew preset', addBot: 'Add a bot', apiDocs: 'API docs (README)', sendTest: 'Send a test status',
    status: { coding: 'Coding', browsing: 'Browsing', idle: 'Idle', needs_you: 'Needs you', resolving: 'Resolving', stuck: 'Stuck' },
    onDeck: (n, w) => `${n} bots on deck · ${w} working`, updated: (r) => `updated ${r}`, justNow: 'just now', ago: (n, u) => `${n}${u} ago`,
    task: 'Task', lastTask: 'Last task', stepOf: (a, b) => `step ${a} of ${b}`, log: 'Log', desk: (n) => `Desk ${pad2(n)}`,
    place: { desk: 'At the desk', sofa: 'On the sofa', sofa2: 'On the sofa', coffee: 'At the coffee bar', charge: 'Charging', charge2: 'Charging', charge3: 'Charging', inbox: 'At the inbox' },
    approve: 'Approve', decline: 'Decline', approved: (n) => `APPROVED · ${n.toUpperCase()} GOT IT`, declined: (n) => `DECLINED · ${n.toUpperCase()} STANDS DOWN`,
    board: 'Task board', boardSub: (n) => `${n} active tasks across the crew. Click a task to jump to its bot.`,
    tabs: { progress: 'in progress', queued: 'queued', done: 'done' }, secs: { progress: 'In progress', queued: 'Queued', done: 'Done' }, stateP: { progress: 'In progress', queued: 'Queued', done: 'Done' },
    noTasks: 'Nothing here yet.', noLog: 'No activity yet.',
    deskTip: (n) => ['DESK ' + pad2(n), 'Available', 'New bots come aboard here. Click to add a bot.'],
    airTip: ['AIRLOCK', 'New bots come aboard here', 'Click to add a bot'],
    serverTip: ['CORE', 'Office server', 'Streaming live bot status'],
    modalLead: (u) => `Your <b>${u}</b> account is connected. To bring another bot aboard, tell the office how to handle its actions and events via API.`,
    steps: ['Register the bot', 'Post its status whenever it changes', 'Add log lines as it works', 'Ask you before risky actions, then poll for your decision'],
  },
  ko: {
    day: '낮', night: '밤', tasks: '작업', needsYouLower: '승인 대기', connected: '연결됨', crew: '크루', crewPreset: '크루 프리셋', addBot: '봇 추가', apiDocs: 'API 문서 (README)', sendTest: '테스트 상태 보내기',
    status: { coding: '작업 중', browsing: '탐색 중', idle: '대기', needs_you: '승인 필요', resolving: '처리 중', stuck: '막힘' },
    onDeck: (n, w) => `봇 ${n}개 탑승 · ${w}개 작업 중`, updated: (r) => `${r} 업데이트`, justNow: '방금', ago: (n, u) => `${n}${{ s: '초', m: '분', h: '시간' }[u]} 전`,
    task: '작업', lastTask: '마지막 작업', stepOf: (a, b) => `${b}단계 중 ${a}`, log: '로그', desk: (n) => `책상 ${pad2(n)}`,
    place: { desk: '책상에서', sofa: '소파에서', sofa2: '소파에서', coffee: '커피바에서', charge: '충전 중', charge2: '충전 중', charge3: '충전 중', inbox: '받은편지함' },
    approve: '승인', decline: '거절', approved: (n) => `승인 완료 · ${n} 진행합니다`, declined: (n) => `거절됨 · ${n} 보류합니다`,
    board: '작업 보드', boardSub: (n) => `크루 전체에서 ${n}개 작업 진행/대기 중. 작업을 누르면 그 봇으로 이동해요.`,
    tabs: { progress: '진행 중', queued: '대기', done: '완료' }, secs: { progress: '진행 중', queued: '대기열', done: '완료' }, stateP: { progress: '진행 중', queued: '대기', done: '완료' },
    noTasks: '아직 없어요.', noLog: '아직 활동이 없어요.',
    deskTip: (n) => ['DESK ' + pad2(n), '빈 자리', '새 봇이 여기 앉아요. 클릭해서 봇 추가.'],
    airTip: ['AIRLOCK', '새 봇은 여기로 들어와요', '클릭해서 봇 추가'],
    serverTip: ['CORE', '오피스 서버', '봇 상태 실시간 스트리밍 중'],
    modalLead: (u) => `<b>${u}</b> 계정이 연결됐어요. 다른 봇을 태우려면 API로 봇의 동작과 이벤트를 오피스에 알려주세요.`,
    steps: ['봇 등록', '상태가 바뀔 때마다 보내기', '작업 로그 남기기', '위험한 행동 전엔 승인 요청 후 결정 확인'],
  },
};
let L = I18N.en;
const SC = { coding: '#36d27a', browsing: '#a77bff', idle: '#ffa53a', needs_you: '#ff4d5e', resolving: '#4c8dff', stuck: '#8b90a0' };

// ------------------------------------------------------------------ bot icons (svg)
function botIcon(b, size = 26) {
  const c = b.color, dark = ['#1b1d22', '#111', '#000'].includes(String(c).toLowerCase());
  const eye = dark ? '#fff' : '#111';
  const shapes = {
    cube: `<rect x="5" y="5" width="22" height="22" rx="5" fill="${c}"/>`,
    sphere: `<circle cx="16" cy="16" r="12" fill="${c}"/>`,
    cone: `<path d="M16 4 L28 27 Q16 31 4 27 Z" fill="${c}"/>`,
    egg: `<ellipse cx="16" cy="16.5" rx="10.5" ry="13" fill="${c}"/>`,
    box: `<rect x="4" y="7" width="24" height="19" rx="7" fill="${c}"/><rect x="8" y="12" width="16" height="8" rx="3" fill="#2c2f38"/>`,
    blob: `<circle cx="16" cy="18" r="10" fill="${c}"/><circle cx="9" cy="14" r="6.5" fill="${c}"/><circle cx="23" cy="14" r="6.5" fill="${c}"/><circle cx="16" cy="9" r="6" fill="${c}"/>`,
    cylinder: `<rect x="7" y="4" width="18" height="25" rx="9" fill="${c}"/>`,
  };
  const ey = b.shape === 'cone' ? 19 : 14;
  return `<span class="bicon" style="background:${c}22"><svg viewBox="0 0 32 32" style="width:${size - 4}px;height:${size - 4}px">${shapes[b.shape] || shapes.cylinder}<rect x="11.5" y="${ey}" width="3" height="4.5" rx=".6" fill="${eye}"/><rect x="17.5" y="${ey}" width="3" height="4.5" rx=".6" fill="${eye}"/></svg></span>`;
}

// ------------------------------------------------------------------ state
const S = { snap: null, bots: new Map(), sel: null, panel: null, tab: null, hover: null, changedAt: new Map(), pendingSelect: null, lastEventId: null };
const office = new Office($('#stage'), {
  onPick: (id) => select(id),
  onHover: (u, e) => hover(u, e),
  onDeskClick: () => openModal(),
  onAirlockClick: () => openModal(),
});
window.office = office;

// ------------------------------------------------------------------ live stream
function connect() {
  const es = new EventSource('/api/stream');
  es.addEventListener('snapshot', (e) => apply(JSON.parse(e.data)));
  es.onerror = () => { document.querySelector('.ustate .live-dot').style.background = '#ff4d5e'; };
  es.onopen = () => { document.querySelector('.ustate .live-dot').style.background = ''; };
}
function apply(snap) {
  const firstSnap = !S.snap;
  if (!S.snap || S.snap.lang !== snap.lang) { L = I18N[snap.lang] || I18N.en; document.documentElement.lang = snap.lang; translateStatic(); }
  if (!S.snap || S.snap.user !== snap.user) { $('#uname').textContent = '@' + snap.user; office.setUser('@' + snap.user); }
  S.snap = snap;
  const ids = new Set();
  for (const b of snap.bots) {
    ids.add(b.id);
    const prev = S.bots.get(b.id);
    if (!firstSnap && (!prev || prev.action !== b.action)) S.changedAt.set(b.id, performance.now());
    S.bots.set(b.id, b);
    office.upsertBot(b);
  }
  for (const id of [...S.bots.keys()]) if (!ids.has(id)) { S.bots.delete(id); labels.get(id)?.el.remove(); labels.delete(id); }
  office.removeMissing(ids);
  if (S.sel && !S.bots.has(S.sel)) closePanel();
  if (S.pendingSelect && S.bots.has(S.pendingSelect)) { const id = S.pendingSelect; S.pendingSelect = null; select(id); }
  applyTeam(snap.team, firstSnap);
  render();
}

// ------------------------------------------------------------------ team pipeline (group chat '초탄 × 밈코인 레이더')
const seenHandoffs = new Set();
function applyTeam(team, firstSnap) {
  office.setTeamMode(!!team);
  if (!team) { office.setSession({ scanLabel: null }); return; }
  const sig = team.chat.map((m) => m.id).join();
  if (sig !== S.chatSig) { S.chatSig = sig; office.drawChat(team.chat, team.title); }
  for (const h of team.handoffs) {
    if (seenHandoffs.has(h.id)) continue;
    seenHandoffs.add(h.id);
    if (!firstSnap && S.snap.serverTime - h.t < 15000) office.sendPacket(h.from, h.to);
  }
}
function scanLeft() {
  const sc = S.snap?.team?.scan; if (!sc?.nextAt) return null;
  return Math.max(0, sc.nextAt - S.snap.serverTime - (Date.now() - (S.snapRecv || Date.now())));
}
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function actionText(b) {
  const a = b.action || L.status[b.status];
  const left = b.id === 'radar' && b.status === 'idle' ? scanLeft() : null;
  return left != null ? `${a} · ${mmss(left)}` : a;
}
function renderPipe() {
  const team = S.snap.team, el = $('#pipe');
  el.classList.toggle('hidden', !team); if (!team) return;
  const c = team.counts, left = scanLeft(), st = team.scan.state;
  el.innerHTML = `<div class="pipe-h"><span>파이프라인 · 오늘</span><span class="pipe-cd">${st === 'scanning' ? '스캔 중…' : left != null ? '다음 스캔 ' + mmss(left) : ''}</span></div>
    <div class="pipe-row">
      <div class="stage s1" data-id="radar"><b>${c.found}</b><span>레이더 발견</span></div><i>→</i>
      <div class="stage s2" data-id="chotan"><b>${c.checked}</b><span>초탄 러그체크</span></div><i>→</i>
      <div class="stage s3"><b>${c.paper}</b><span>모의트레이딩</span></div>
    </div>
    <div class="pipe-f">패스 ${c.passed} · 실제 매수 없음 (PAPER)</div>`;
}
function tickTeam() {
  const team = S.snap?.team; if (!team) return;
  const left = scanLeft();
  office.setSession({ scanLabel: team.scan.state === 'scanning' ? 'SCANNING…' : left != null ? `SCAN ${mmss(left)}` : 'SCAN 10m', scanHot: team.scan.state === 'scanning' });
  const cd = $('#pipe .pipe-cd'); if (cd) cd.textContent = team.scan.state === 'scanning' ? '스캔 중…' : left != null ? '다음 스캔 ' + mmss(left) : '';
  const r = S.bots.get('radar');
  if (r) { const t = actionText(r); const ac = document.querySelector('.crew-row[data-id="radar"] .ac'); if (ac) ac.textContent = t; const sy = labels.get('radar')?.el.querySelector('.say'); if (sy) sy.textContent = t; }
}

// ------------------------------------------------------------------ rendering
function counts() {
  const bots = [...S.bots.values()];
  const by = (s) => bots.filter((b) => b.status === s).length;
  const working = by('coding') + by('browsing') + by('resolving');
  const used = new Set(bots.map((b) => b.desk));
  return { n: bots.length, working, needs: by('needs_you'), idle: by('idle') + by('stuck'), free: S.snap.desks.filter((d) => !used.has(d)).length };
}
function render() {
  const c = counts(), t = S.snap.tasks;
  $('#crewline').textContent = L.onDeck(c.n, c.working);
  $('#taskCount').textContent = t.progress.length + t.queued.length;
  $('#needsBtn').classList.toggle('hidden', !c.needs);
  $('#needsCount').textContent = c.needs;
  $('#crewCount').textContent = c.n;
  office.setSession({ working: c.working, needs: c.needs, idle: c.idle, free: c.free });
  office.setCork([t.queued.length, t.progress.length, Math.min(t.done.length, 8)]);
  renderCrew(); renderPipe(); renderTicker(); renderPanel(); renderLabels(); tickTeam();
  document.querySelectorAll('#userMenu [data-preset]').forEach((b) => b.classList.toggle('cur', b.dataset.preset === S.snap.preset));
}
function renderCrew() {
  $('#crewList').innerHTML = [...S.bots.values()].map((b) => `
    <div class="crew-row ${b.id === S.sel ? 'sel' : ''} ${b.status === 'needs_you' ? 'needs' : ''}" data-id="${esc(b.id)}">
      ${botIcon(b)}
      <div class="meta"><div class="nm">${esc(b.name)}</div><div class="ac">${esc(actionText(b))}</div></div>
      <span class="sdot s-${b.status}" title="${L.status[b.status]}"></span>
    </div>`).join('');
}
function renderTicker() {
  const ev = S.snap.events.slice(-3);
  $('#ticker').innerHTML = ev.map((e) => `<div class="tick" data-id="${esc(e.botId)}"><span class="sdot s-${e.status}"></span><span class="tx"><b>${esc(e.name)}</b> ${esc(e.text)}</span><time>${hm(e.t)}</time></div>`).join('');
}
function rel(t) {
  const s = Math.max(0, (S.snap.serverTime - t) / 1000 + (Date.now() - S.snapRecv || 0) / 1000);
  if (s < 10) return L.justNow;
  if (s < 60) return L.ago(Math.floor(s), 's');
  if (s < 3600) return L.ago(Math.floor(s / 60), 'm');
  return L.ago(Math.floor(s / 3600), 'h');
}
function placeOf(b) {
  if (b.location) return b.location;
  if (b.status === 'idle') return L.place[b.spot] || L.place.sofa;
  if (b.status === 'needs_you' && /inbox|support|이메일/i.test(b.task?.title || '')) return L.place.inbox;
  return L.place.desk;
}
function renderPanel() {
  const p = $('#panel');
  if (!S.panel) { p.classList.add('hidden'); return; }
  p.classList.remove('hidden');
  if (S.panel === 'detail') return renderDetail(p);
  renderBoard(p);
}
function renderDetail(p) {
  const b = S.bots.get(S.sel); if (!b) return;
  const lastDone = S.snap.tasks.done.find((t) => t.botId === b.id);
  const task = b.task || lastDone;
  const step = task ? Math.min(task.step || 1, task.total || 1) : 0, total = task?.total || 1;
  const pct = !task ? 0 : b.task ? Math.round(((step - (b.status === 'needs_you' ? .5 : .35)) / total) * 100) : 100;
  const log = [...b.log].reverse();
  p.innerHTML = `
    <div class="ph">
      <button class="back" data-act="back" title="Back">←</button>
      ${botIcon(b, 36)}
      <div><h3>${esc(b.name)}</h3><div class="sub">${esc(b.role)} · ${L.updated(rel(b.updatedAt))}</div></div>
      <button class="x" data-act="close">×</button>
    </div>
    <div class="pills">
      <span class="pill st-${b.status}"><span class="sdot s-${b.status}"></span>${L.status[b.status]}</span>
      ${b.desk ? `<span class="pill mono">${L.desk(b.desk)}</span>` : ''}
      <span class="pill mono">${esc(placeOf(b))}</span>
    </div>
    <div class="sec">${b.task ? L.task : L.lastTask}</div>
    ${task ? `<div class="task-title">${esc(task.title)}</div>
      <div class="prog"><div class="bar"><i style="width:${Math.max(4, Math.min(100, pct))}%"></i></div><span>${L.stepOf(b.task ? step : total, total)}</span></div>` : `<div class="empty">—</div>`}
    <ul class="timeline">${log.length ? log.map((l) => `<li><time>${hms(l.t)}</time><span class="sdot s-${l.status}"></span><span class="tx">${esc(l.text)}</span></li>`).join('') : `<li class="empty">${L.noLog}</li>`}</ul>
    ${b.pending ? `<div class="ask"><div class="q">${esc(b.pending.question)}</div><div class="row"><button class="btn approve" data-act="approve">${L.approve}</button><button class="btn decline" data-act="decline">${L.decline}</button></div></div>` : ''}`;
}
function renderBoard(p) {
  const t = S.snap.tasks;
  const active = t.progress.length + t.queued.length;
  const sections = ['progress', 'queued', 'done'].filter((k) => !S.tab || S.tab === k);
  const card = (k, x) => {
    const b = S.bots.get(x.botId) || { name: x.botId, color: '#888', shape: 'cylinder' };
    const pct = k === 'progress' ? Math.round((Math.max(1, x.step - .35) / (x.total || 1)) * 100) : 0;
    return `<div class="tcard" data-id="${esc(x.botId)}">${botIcon(b)}<div style="flex:1;min-width:0">
      <div class="tt">${esc(x.title)}</div>
      <div class="tm"><span class="pill ${k === 'progress' ? 'st-coding' : k === 'done' ? 'st-resolving' : ''}">${L.stateP[k]}</span>${esc(b.name)}</div>
      ${k === 'progress' && x.note ? `<div class="note">${esc(x.note)}</div><div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><span>${Math.min(x.step, x.total)}/${x.total}</span></div>` : ''}
    </div></div>`;
  };
  p.innerHTML = `
    <div class="ph"><h3>${L.board}</h3><button class="x" data-act="close">×</button></div>
    <div class="tb-sub">${L.boardSub(active)}</div>
    <div class="tabs">${['progress', 'queued', 'done'].map((k) => `<button class="tab t-${k} ${!S.tab || S.tab === k ? 'on' : ''}" data-tab="${k}">${t[k].length} ${L.tabs[k]}</button>`).join('')}</div>
    ${sections.map((k) => `<div class="sec sech"><span>${L.secs[k]}</span><span>${t[k].length}</span></div>${t[k].length ? t[k].map((x) => card(k, x)).join('') : `<div class="empty">${L.noTasks}</div>`}`).join('')}`;
}

// ------------------------------------------------------------------ floating labels (nameplate + speech bubble)
const labels = new Map();
function renderLabels() {
  for (const b of S.bots.values()) {
    let l = labels.get(b.id);
    if (!l) {
      const el = document.createElement('div'); el.className = 'lbl';
      el.innerHTML = `<div class="bubble"><div class="who"></div><div class="say"></div></div><div class="plate"><span class="sdot"></span><span class="pn"></span><span class="bang">!</span></div>`;
      el.querySelector('.plate').addEventListener('click', () => select(b.id));
      $('#labels').appendChild(el); l = { el }; labels.set(b.id, l);
    }
    const needs = b.status === 'needs_you';
    l.el.querySelector('.sdot').className = `sdot s-${b.status}`;
    l.el.querySelector('.pn').textContent = b.name;
    l.el.querySelector('.bang').style.display = needs ? '' : 'none';
    l.el.querySelector('.who').textContent = needs ? `${b.name} · ${L.status.needs_you}` : b.name;
    l.el.querySelector('.say').textContent = actionText(b);
    l.el.querySelector('.bubble').classList.toggle('needs', needs);
  }
}
office.onFrame = () => {
  const now = performance.now();
  for (const [id, l] of labels) {
    const o = office.bots.get(id); const b = S.bots.get(id); if (!o || !b) continue;
    const p = o.root.position.clone(); p.y += (o.body.userData.h || 1.2) + .55;
    const s = office.screenOf(p);
    l.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
    const show = id === S.sel || b.status === 'needs_you' || id === office.hoverId || now - (S.changedAt.get(id) || -1e9) < 5000;
    l.el.querySelector('.bubble').classList.toggle('show', show);
    l.el.style.zIndex = show ? 5 : 1;
  }
};
setInterval(() => { if (S.panel === 'detail') renderPanel(); const ss = S.snap ? Math.max(0, Math.round((S.snap.nextSyncAt - S.snap.serverTime - (Date.now() - S.snapRecv)) / 1000)) : 30; office.setSession({ sync: ss }); tickTeam(); office.drawSession(); }, 1000);
const _apply = apply; window.__apply = _apply;

// ------------------------------------------------------------------ interactions
function select(id) {
  S.sel = id; S.panel = 'detail'; office.focus(id); render();
}
function closePanel() { S.sel = null; S.panel = null; office.unfocus(); render(); }
function openTasks() { S.panel = S.panel === 'tasks' ? null : 'tasks'; S.sel = null; if (!S.panel) office.unfocus(); render(); }
async function decide(decision) {
  const b = S.bots.get(S.sel); if (!b?.pending) return;
  const r = await fetch(`/api/bots/${encodeURIComponent(b.id)}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, approvalId: b.pending.id }) });
  if (r.ok) toast(decision === 'approve' ? L.approved(b.name) : L.declined(b.name), decision !== 'approve');
}
let toastT;
function toast(text, decl) {
  const t = $('#toast');
  t.className = decl ? 'decl' : '';
  t.innerHTML = `<span class="ok"><svg viewBox="0 0 24 24">${decl ? '<path d="M6 6l12 12M18 6L6 18"/>' : '<path d="M5 12l5 5L20 7"/>'}</svg></span>${esc(text)}`;
  t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600);
}
function hover(u, e) {
  const tip = $('#tooltip');
  if (!u || !e) return tip.classList.add('hidden');
  let lines = null;
  if (u.kind === 'bot' || (u.kind === 'desk' && office.deskOwner[u.desk])) {
    const b = S.bots.get(u.kind === 'bot' ? u.id : office.deskOwner[u.desk].id); if (!b) return;
    lines = [b.status === 'idle' ? placeOf(b).toUpperCase() : b.desk ? `DESK ${pad2(b.desk)}` : b.role, `${b.name} · ${L.status[b.status]}`, b.task?.title || b.action];
  } else if (u.kind === 'desk') lines = L.deskTip(u.desk);
  else if (u.kind === 'airlock') lines = L.airTip;
  else if (u.kind === 'server') lines = L.serverTip;
  if (!lines) return tip.classList.add('hidden');
  tip.innerHTML = `<div class="k">${esc(lines[0])}</div><div class="h">${esc(lines[1])}</div><div class="d">${esc(lines[2] || '')}</div>`;
  tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.classList.remove('hidden');
}

$('#pipe').addEventListener('click', (e) => { const r = e.target.closest('.stage[data-id]'); if (r && S.bots.has(r.dataset.id)) select(r.dataset.id); });
$('#crewList').addEventListener('click', (e) => { const r = e.target.closest('.crew-row'); if (r) select(r.dataset.id); });
$('#ticker').addEventListener('click', (e) => { const r = e.target.closest('.tick'); if (r) select(r.dataset.id); });
$('#panel').addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'close') return closePanel();
  if (a === 'back') { S.sel = null; S.panel = null; office.unfocus(); return render(); }
  if (a === 'approve' || a === 'decline') return decide(a);
  const tab = e.target.closest('[data-tab]')?.dataset.tab; if (tab) { S.tab = S.tab === tab ? null : tab; return render(); }
  const c = e.target.closest('.tcard'); if (c && S.bots.has(c.dataset.id)) select(c.dataset.id);
});
$('#tasksBtn').onclick = openTasks;
$('#needsBtn').onclick = () => { const b = [...S.bots.values()].find((x) => x.status === 'needs_you'); if (b) select(b.id); };
$('#daynight').addEventListener('click', (e) => { const m = e.target.closest('[data-mode]')?.dataset.mode; if (!m) return; setMode(m); });
function setMode(m) { office.setMode(m); document.body.className = m; document.querySelectorAll('#daynight button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m)); localStorage.setItem('gbo-mode', m); }
$('#userBtn').addEventListener('click', (e) => { if (!e.target.closest('#userMenu')) $('#userMenu').classList.toggle('hidden'); });
$('#userMenu').addEventListener('click', async (e) => {
  const p = e.target.closest('[data-preset]')?.dataset.preset;
  if (p) { closePanel(); await fetch('/api/preset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preset: p }) }); }
  if (e.target.closest('#menuAdd')) openModal();
  $('#userMenu').classList.add('hidden');
});
document.addEventListener('click', (e) => { if (!e.target.closest('#userBtn')) $('#userMenu').classList.add('hidden'); });
$('#zin').onclick = () => office.zoomBy(1.2); $('#zout').onclick = () => office.zoomBy(1 / 1.2);
$('#zfull').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#modalWrap').classList.contains('hidden')) closeModal(); else closePanel(); } });

// ------------------------------------------------------------------ add-a-bot modal
function snippets() {
  const o = location.origin, id = 'my-bot';
  const k = '';
  return [
    `curl -X POST ${o}/api/bots ${k}\\\n  -H 'Content-Type: application/json' \\\n  -d '{"id":"${id}","name":"My bot","role":"Test","shape":"cylinder","color":"#36d27a"}'`,
    `curl -X POST ${o}/api/bots/${id}/status \\\n  -H 'Content-Type: application/json' \\\n  -d '{"status":"coding","action":"Connected to the office","task":"Getting to know the office","step":1,"total":4}'`,
    `curl -X POST ${o}/api/bots/${id}/log \\\n  -H 'Content-Type: application/json' \\\n  -d '{"text":"Read 14 new emails"}'`,
    `curl -X POST ${o}/api/bots/${id}/approval \\\n  -H 'Content-Type: application/json' \\\n  -d '{"question":"2 refund requests. Approve them?","approveText":"Sending the replies"}'\n<span class="c"># then wait for your click (long-poll up to 25 s)</span>\ncurl '${o}/api/bots/${id}/decision?wait=25'`,
  ];
}
function openModal() {
  $('#modalLead').innerHTML = L.modalLead('@' + S.snap.user);
  $('#modalSteps').innerHTML = snippets().map((s, i) => `<li><div><div class="st">${L.steps[i]}</div><pre><button class="copy" data-i="${i}">Copy</button>${s.replace(/('[^']*')/g, '<span class="s">$1</span>')}</pre></div></li>`).join('');
  $('#modalWrap').classList.remove('hidden'); $('#tooltip').classList.add('hidden');
}
function closeModal() { $('#modalWrap').classList.add('hidden'); }
$('#modalClose').onclick = closeModal;
$('#modalWrap').addEventListener('click', (e) => { if (e.target.id === 'modalWrap') closeModal(); });
$('#modalSteps').addEventListener('click', (e) => {
  const b = e.target.closest('.copy'); if (!b) return;
  const txt = snippets()[b.dataset.i].replace(/<[^>]+>/g, '');
  navigator.clipboard?.writeText(txt); b.textContent = 'Copied';
});
$('#sendTest').onclick = async () => {
  const name = $('#newBotName').value.trim() || 'My bot';
  const btn = $('#sendTest'); btn.disabled = true;
  try {
    const r = await fetch('/api/bots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, role: 'Test', shape: 'cylinder', color: '#36d27a' }) }).then((r) => r.json());
    if (!r.ok) throw new Error(r.error);
    const id = r.bot.id;
    await fetch(`/api/bots/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'coding', action: S.snap.lang === 'ko' ? '오피스에 연결됨' : 'Connected to the office', task: S.snap.lang === 'ko' ? '오피스 둘러보기' : 'Getting to know the office', step: 1, total: 4 }) });
    closeModal(); office.openAirlock();
    S.pendingSelect = id; if (S.bots.has(id)) { S.pendingSelect = null; select(id); }
  } catch (err) { alert(err.message); } finally { btn.disabled = false; }
};

function translateStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { const v = L[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
}

// keep relative-time math honest
const origApply = apply;
const es0 = EventSource.prototype.addEventListener;
EventSource.prototype.addEventListener = function (type, fn, o) { return es0.call(this, type, type === 'snapshot' ? (e) => { S.snapRecv = Date.now(); fn(e); } : fn, o); };
setMode(new URLSearchParams(location.search).get('mode') || localStorage.getItem('gbo-mode') || 'day');
connect();
