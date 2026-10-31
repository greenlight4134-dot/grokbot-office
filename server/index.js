// GrokBot Office — backend: live state, REST API for real bots, SSE stream, simulator.
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const P = require('./presets');
const presets = { demo: P.demo, mine: P.mine };

const PORT = Number(process.env.PORT || 4317);
const USER = process.env.OFFICE_USER || 'grokbot_owner';
const API_KEY = process.env.OFFICE_API_KEY || ''; // optional: require x-api-key for bot writes
let PRESET = process.env.OFFICE_PRESET || 'mine';
const SIM_SPEED = Number(process.env.SIM_SPEED || 1); // >1 = faster simulator
const SCAN_MS = Number(process.env.RADAR_SCAN_SEC || 600) * 1000; // 밈코인 레이더 scan interval (10 min)
// optional password gate for when the office is exposed publicly (e.g. through a tunnel)
const PASS_FILE = process.env.OFFICE_PASSWORD_FILE || path.join(__dirname, '..', '.office-password');
const PASSWORD = process.env.OFFICE_PASSWORD || (fs.existsSync(PASS_FILE) ? fs.readFileSync(PASS_FILE, 'utf8').trim() : '');
const TOKEN = PASSWORD ? crypto.createHmac('sha256', PASSWORD).update('grokbot-office').digest('hex') : '';

const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------- password gate
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cookieOf = (req, k) => (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([n]) => n === k)?.[1];
// requests made on this machine (bots, scripts) skip the gate; anything coming through a proxy/tunnel does not
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers['cf-connecting-ip'] && !req.headers['x-forwarded-for'];
const setAuthCookie = (req, res) => res.setHeader('Set-Cookie', `office_auth=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${req.get('x-forwarded-proto') === 'https' || req.headers['cf-connecting-ip'] ? '; Secure' : ''}`);
const loginPage = (err) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GrokBot Office · 로그인</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 70% 30%,#0d1230,#03040a);font-family:Inter,'Noto Sans KR',system-ui,sans-serif;color:#f4f6fb}
form{background:rgba(20,24,34,.8);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;width:min(320px,86vw);backdrop-filter:blur(10px)}
h1{font-size:18px;margin:0 0 4px}p{color:#8e96a8;font-size:13px;margin:0 0 18px}input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#07080d;color:#fff;font-size:15px}
button{margin-top:12px;width:100%;padding:11px;border:0;border-radius:10px;background:#3ee0ff;color:#04121a;font-weight:800;font-size:14px}.e{color:#ff6b7a;font-size:12px;margin-top:10px}</style></head>
<body><form method="post" action="/login"><h1>🛰️ GrokBot Office</h1><p>관제실 비밀번호를 입력하세요.</p><input type="password" name="password" autofocus autocomplete="current-password"><button>들어가기</button>${err ? '<div class="e">비밀번호가 틀렸어요.</div>' : ''}</form></body></html>`;
app.get('/login', (req, res) => res.type('html').send(loginPage(false)));
app.post('/login', async (req, res) => {
  if (PASSWORD && safeEq(req.body?.password || '', PASSWORD)) { setAuthCookie(req, res); return res.redirect('/'); }
  await new Promise((r) => setTimeout(r, 900)); // slow down guessing
  res.status(401).type('html').send(loginPage(true));
});
app.use((req, res, next) => {
  if (!PASSWORD || isLocal(req)) return next();
  if (cookieOf(req, 'office_auth') && safeEq(cookieOf(req, 'office_auth'), TOKEN)) return next();
  const key = req.get('x-office-key') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.query.key;
  if (key && safeEq(key, PASSWORD)) {
    if (req.query.key && req.method === 'GET' && !req.path.startsWith('/api/')) { setAuthCookie(req, res); return res.redirect(req.path); }
    return next();
  }
  if (req.path.startsWith('/api/') || req.path.startsWith('/vendor/')) return res.status(401).json({ error: 'login required (cookie, x-office-key or Bearer)' });
  res.redirect('/login');
});
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/README.md', (req, res) => res.type('text/plain; charset=utf-8').sendFile(path.join(__dirname, '..', 'README.md')));
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));

// ---------------------------------------------------------------- state
const DESKS = [1, 2, 3, 4, 5, 6, 7, 8];
const NEWCOMER_DESK = 5;
const STATUSES = ['coding', 'browsing', 'idle', 'needs_you', 'resolving', 'stuck'];
const ALIAS = { working: 'coding', thinking: 'browsing', research: 'browsing', web: 'browsing', needs: 'needs_you', 'needs-you': 'needs_you', blocked: 'stuck', error: 'stuck', done: 'idle', waiting: 'idle' };
const LOUNGE = ['sofa', 'charge', 'coffee', 'sofa2', 'charge2', 'charge3'];

const bots = new Map(); // id -> bot
const events = [];      // ticker
const doneTasks = [];
let seq = 1;
const uid = (p) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;
const now = () => Date.now();

function slug(s) {
  const base = String(s || 'bot').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 'bot';
  let id = base, n = 2;
  while (bots.has(id)) id = `${base}-${n++}`;
  return id;
}
function freeDesk(preferNewcomer) {
  const used = new Set([...bots.values()].map((b) => b.desk));
  const order = preferNewcomer ? [NEWCOMER_DESK, ...DESKS.filter((d) => d !== NEWCOMER_DESK)] : DESKS.filter((d) => d !== NEWCOMER_DESK).concat(NEWCOMER_DESK);
  return order.find((d) => !used.has(d)) ?? null;
}
function freeLounge(bot) {
  const used = new Set([...bots.values()].filter((b) => b !== bot && b.status === 'idle').map((b) => b.spot));
  return LOUNGE.find((s) => !used.has(s)) || 'sofa';
}

function createBot({ id, name, role, shape, color, sim = false, desk }) {
  id = id && !bots.has(id) ? id : slug(id || name);
  const bot = {
    id, name: String(name || 'My bot').slice(0, 40), role: String(role || 'Bot').slice(0, 30),
    shape: shape || 'cylinder', color: color || '#36d27a', sim,
    desk: desk ?? freeDesk(!sim), spot: null,
    status: 'idle', action: sim ? '' : 'Connected to the office',
    task: null, queue: [], log: [], pending: null, lastDecision: null,
    arrivedAt: sim ? 0 : now(), updatedAt: now(),
  };
  bots.set(id, bot);
  return bot;
}

function pushEvent(bot, text, status) {
  events.push({ id: uid('ev'), t: now(), botId: bot.id, name: bot.name, status: status || bot.status, text });
  if (events.length > 60) events.splice(0, events.length - 60);
}
function addLog(bot, text, status) {
  bot.log.push({ t: now(), text: String(text).slice(0, 240), status: status || bot.status });
  if (bot.log.length > 80) bot.log.splice(0, bot.log.length - 80);
}
function setStatus(bot, { status, action, task, step, total, location, log = true, queue, taskDone, visit, stay }) {
  if (stay != null) bot.stay = !!stay; // stay: idle at the desk instead of walking to the lounge
  if (visit !== undefined) bot.visit = visit && bots.has(visit) && visit !== bot.id ? visit : null; // walk over to another bot's desk
  if (status) {
    const s = ALIAS[String(status).toLowerCase()] || String(status).toLowerCase();
    if (!STATUSES.includes(s)) throw Object.assign(new Error(`status must be one of ${STATUSES.join(', ')}`), { code: 400 });
    if (s === 'idle' && (bot.status !== 'idle' || (!bot.stay && !bot.spot))) bot.spot = bot.stay ? null : freeLounge(bot);
    bot.status = s;
  }
  if (bot.stay && bot.status === 'idle') bot.spot = null;
  if (typeof task === 'string' && task) {
    if (!bot.task || bot.task.title !== task) bot.task = { id: uid('task'), title: task.slice(0, 120), step: 1, total: Number(total) || 1, startedAt: now() };
  } else if (task && typeof task === 'object' && task.title) {
    return setStatus(bot, { status, action, task: task.title, step: task.step ?? step, total: task.total ?? total, location, log, queue, taskDone, visit, stay });
  }
  if (bot.task && step != null) bot.task.step = Math.max(1, Number(step) || 1);
  if (bot.task && total != null) bot.task.total = Math.max(1, Number(total) || 1);
  if (Array.isArray(queue)) bot.queue = queue.slice(0, 10).map((q) => String(q).slice(0, 120));
  if (location) bot.location = String(location).slice(0, 40);
  if (taskDone && bot.task) finishTask(bot);
  if (action != null && action !== bot.action) {
    bot.action = String(action).slice(0, 200);
    if (log) { addLog(bot, bot.action); pushEvent(bot, bot.action); }
  }
  bot.updatedAt = now();
  broadcast();
}
function finishTask(bot) {
  if (!bot.task) return;
  doneTasks.unshift({ ...bot.task, botId: bot.id, state: 'done', doneAt: now() });
  if (doneTasks.length > 30) doneTasks.length = 30;
  bot.task = null;
}

// ---------------------------------------------------------------- approvals
const waiters = new Map(); // botId -> [resolve]
function requestApproval(bot, { question, approveText, declineText }) {
  const ap = { id: uid('ap'), question: String(question || 'Approve?').slice(0, 200), approveText: approveText || null, declineText: declineText || null, createdAt: now() };
  bot.pending = ap;
  bot.prevStatus = bot.status === 'needs_you' ? bot.prevStatus : bot.status;
  bot.status = 'needs_you';
  bot.action = ap.question;
  bot.lastDecision = { approvalId: ap.id, question: ap.question, state: 'pending', createdAt: ap.createdAt };
  addLog(bot, ap.question, 'needs_you');
  pushEvent(bot, ap.question, 'needs_you');
  bot.updatedAt = now();
  broadcast();
  return ap;
}
function decide(bot, decision, by = 'office') {
  const ap = bot.pending;
  if (!ap) return null;
  const approved = /^(approve|approved|yes|y|ok|true)$/i.test(String(decision));
  bot.pending = null;
  bot.lastDecision = { approvalId: ap.id, question: ap.question, state: approved ? 'approved' : 'declined', decidedAt: now(), by };
  const text = approved ? (ap.approveText || 'Approved, carrying on') : (ap.declineText || 'Declined, standing down');
  bot.status = 'resolving';
  bot.holdUntil = now() + 6000; // let the office see 'Resolving' before the simulator moves on
  bot.action = text;
  addLog(bot, text, 'resolving');
  pushEvent(bot, `${approved ? 'Approved' : 'Declined'} · ${text}`, 'resolving');
  bot.updatedAt = now();
  (waiters.get(bot.id) || []).forEach((r) => r(bot.lastDecision));
  waiters.delete(bot.id);
  broadcast();
  return bot.lastDecision;
}
function waitDecision(botId, ms) {
  return new Promise((resolve) => {
    const list = waiters.get(botId) || [];
    const t = setTimeout(() => resolve(null), ms);
    list.push((d) => { clearTimeout(t); resolve(d); });
    waiters.set(botId, list);
  });
}

// ---------------------------------------------------------------- snapshot + SSE
const clients = new Set();
let pendingBroadcast = null;
function publicBot(b) {
  return {
    id: b.id, name: b.name, role: b.role, shape: b.shape, color: b.color, sim: b.sim,
    desk: b.desk, spot: b.spot, visit: b.visit || null, location: b.location || null, status: b.status, action: b.action,
    task: b.task, log: b.log.slice(-14), pending: b.pending && { id: b.pending.id, question: b.pending.question, createdAt: b.pending.createdAt },
    arrivedAt: b.arrivedAt, updatedAt: b.updatedAt,
  };
}
function taskBoard() {
  const progress = [], queued = [];
  for (const b of bots.values()) {
    if (b.task && b.status !== 'idle') progress.push({ ...b.task, botId: b.id, state: 'progress', note: b.action });
    b.queue.forEach((title, i) => queued.push({ id: `${b.id}-q${i}`, title, botId: b.id, state: 'queued' }));
  }
  return { progress, queued, done: doneTasks.slice(0, 12) };
}
// ---------------------------------------------------------------- team pipeline (group chat '초탄 × 밈코인 레이더')
const kstDay = () => new Date(now() + 9 * 3600e3).toISOString().slice(0, 10);
const team = { title: '초탄 × 밈코인 레이더', chat: [], handoffs: [], inbox: [], day: kstDay(), counts: { found: 0, checked: 0, paper: 0, passed: 0 }, scan: { intervalMs: SCAN_MS, lastAt: null, nextAt: null, state: 'idle' } };
function rollDay() { const d = kstDay(); if (d !== team.day) { team.day = d; team.counts = { found: 0, checked: 0, paper: 0, passed: 0 }; } }
function teamChat(from, text, extra = {}) {
  const b = bots.get(from);
  team.chat.push({ id: uid('msg'), t: now(), from, name: b?.name || from, text: String(text).slice(0, 300), ...extra });
  if (team.chat.length > 40) team.chat.splice(0, team.chat.length - 40);
}
const shortMint = (m) => (m && m.length > 14 ? `${m.slice(0, 6)}…${m.slice(-4)}` : m || '');
function findLine(f) { return [f.name, f.ticker && `$${f.ticker}`, f.mint, f.who && `@${String(f.who).replace(/^@/, '')}`, f.link].filter(Boolean).join(' · ') + (f.example ? ' (예시)' : ''); }
function postFind(f) {
  rollDay();
  const from = f.from && bots.has(f.from) ? f.from : 'radar', to = f.to && bots.has(f.to) ? f.to : (bots.has('chotan') ? 'chotan' : null);
  const find = { id: uid('find'), t: now(), from, to, ticker: String(f.ticker || '').replace(/^\$/, '').slice(0, 20), name: String(f.name || '').slice(0, 60), mint: String(f.mint || '').slice(0, 64), who: String(f.who || '').replace(/^@/, '').slice(0, 40), link: String(f.link || '').slice(0, 200), example: !!f.example };
  team.counts.found++;
  teamChat(from, findLine(find), { kind: 'find', ticker: find.ticker, example: find.example });
  if (to) { team.handoffs.push({ id: find.id, t: now(), from, to, ticker: find.ticker }); if (team.handoffs.length > 10) team.handoffs.shift(); team.inbox.push(find); }
  const fb = bots.get(from);
  if (fb) { addLog(fb, `$${find.ticker} 발견 → ${bots.get(to)?.name || '그룹챗'}`, 'coding'); pushEvent(fb, findLine({ ...find, link: '' }), 'coding'); }
  broadcast();
  return find;
}
function postCheck({ from = 'chotan', ticker, result, reason, example }) {
  rollDay();
  team.counts.checked++;
  const paper = /^(paper|entry|enter|buy|모의)/i.test(String(result));
  if (paper) team.counts.paper++; else team.counts.passed++;
  teamChat(from, paper ? `$${ticker} 모의 매수 진입 (PAPER)${reason ? ' · ' + reason : ''}` : `$${ticker} 패스${reason ? ' · ' + reason : ''}`, { kind: paper ? 'paper' : 'pass', ticker, example: !!example });
  broadcast();
}
function teamSnapshot() {
  if (!presets[PRESET]?.pipeline && !team.chat.length) return null;
  rollDay();
  return { title: team.title, chat: team.chat.slice(-12), handoffs: team.handoffs.slice(-6), counts: team.counts, day: team.day, scan: team.scan };
}

const SYNC_MS = 30000;
const t0 = now();
function snapshot() {
  return {
    user: USER, preset: PRESET, lang: presets[PRESET]?.lang || 'en', serverTime: now(),
    nextSyncAt: t0 + Math.ceil((now() - t0 + 1) / SYNC_MS) * SYNC_MS,
    bots: [...bots.values()].map(publicBot), tasks: taskBoard(), events: events.slice(-20),
    desks: DESKS, newcomerDesk: NEWCOMER_DESK, team: teamSnapshot(),
  };
}
function broadcast() {
  if (pendingBroadcast) return;
  pendingBroadcast = setTimeout(() => {
    pendingBroadcast = null;
    const data = `event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`;
    for (const res of clients) res.write(data);
  }, 60);
}
setInterval(broadcast, 15000); // heartbeat w/ fresh nextSyncAt

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  req.socket.setNoDelay?.(true);
  const ping = setInterval(() => res.write(': ping\n\n'), 10000); // keeps proxies/tunnels from closing the stream
  req.on('close', () => clearInterval(ping));
  res.write(`retry: 2000\nevent: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

// ---------------------------------------------------------------- REST API
const auth = (req, res, next) => {
  if (!API_KEY || req.get('x-api-key') === API_KEY) return next();
  res.status(401).json({ error: 'missing or wrong x-api-key' });
};
const getBot = (req, res, next) => {
  const bot = bots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: `no bot with id "${req.params.id}"` });
  req.bot = bot; next();
};
const wrap = (fn) => (req, res) => { try { fn(req, res); } catch (e) { res.status(e.code || 500).json({ error: e.message }); } };

app.get('/api/state', (req, res) => res.json(snapshot()));
app.get('/api/bots', (req, res) => res.json([...bots.values()].map(publicBot)));
app.get('/api/bots/:id', getBot, (req, res) => res.json({ ...publicBot(req.bot), log: req.bot.log }));

// register a bot (idempotent by id)
app.post('/api/bots', auth, wrap((req, res) => {
  const { id, name, role, shape, color } = req.body || {};
  if (id && bots.has(id)) return res.json({ ok: true, bot: publicBot(bots.get(id)), existed: true });
  if (bots.size >= DESKS.length + 4) return res.status(409).json({ error: 'office is full' });
  const bot = createBot({ id, name, role, shape, color });
  addLog(bot, 'Came aboard through the airlock', 'idle');
  pushEvent(bot, 'Came aboard through the airlock', 'idle');
  broadcast();
  res.status(201).json({ ok: true, bot: publicBot(bot) });
}));
app.delete('/api/bots/:id', auth, getBot, (req, res) => { bots.delete(req.bot.id); broadcast(); res.json({ ok: true }); });

// status: { status, action, task, step, total, location, queue, taskDone }
app.post('/api/bots/:id/status', auth, getBot, wrap((req, res) => {
  if (req.bot.pending && req.body.status && req.body.status !== 'needs_you') {
    // a new status while an approval is open closes that approval as withdrawn
    req.bot.lastDecision = { ...req.bot.lastDecision, state: 'withdrawn', decidedAt: now() };
    req.bot.pending = null;
  }
  setStatus(req.bot, req.body || {});
  res.json({ ok: true, bot: publicBot(req.bot) });
}));
// log line: { text, status? }
app.post('/api/bots/:id/log', auth, getBot, wrap((req, res) => {
  const text = req.body?.text || req.body?.message;
  if (!text) return res.status(400).json({ error: 'text is required' });
  addLog(req.bot, text, req.body.status);
  pushEvent(req.bot, text);
  req.bot.updatedAt = now();
  broadcast();
  res.json({ ok: true });
}));
// ask the human: { question, approveText?, declineText? }
app.post('/api/bots/:id/approval', auth, getBot, wrap((req, res) => {
  const q = req.body?.question;
  if (!q) return res.status(400).json({ error: 'question is required' });
  const ap = requestApproval(req.bot, req.body);
  res.status(201).json({ ok: true, approvalId: ap.id, poll: `/api/bots/${req.bot.id}/decision?wait=25` });
}));
// human decision (used by the office UI, also usable from scripts): { decision: 'approve'|'decline', approvalId? }
app.post('/api/bots/:id/decision', getBot, wrap((req, res) => {
  const { decision, approvalId } = req.body || {};
  if (!req.bot.pending) return res.status(409).json({ error: 'no approval pending', last: req.bot.lastDecision });
  if (approvalId && approvalId !== req.bot.pending.id) return res.status(409).json({ error: 'approvalId does not match the pending approval' });
  res.json({ ok: true, decision: decide(req.bot, decision, 'office') });
}));
// bots poll here; ?wait=N long-polls up to N seconds while pending
app.get('/api/bots/:id/decision', getBot, async (req, res) => {
  const wait = Math.min(Number(req.query.wait) || 0, 55);
  if (wait && req.bot.pending) await waitDecision(req.bot.id, wait * 1000);
  const d = req.bot.lastDecision;
  res.json(d ? { ...d, pending: d.state === 'pending' } : { state: 'none', pending: false });
});

// ---- team pipeline: 레이더 → 초탄 → 모의트레이딩
app.get('/api/team', (req, res) => res.json(teamSnapshot() || {}));
// 레이더 found a coin: { ticker, name, mint, who, link, from?='radar', to?='chotan' }
app.post('/api/team/find', auth, wrap((req, res) => {
  const b = req.body || {};
  if (!b.ticker && !b.mint) return res.status(400).json({ error: 'ticker or mint is required' });
  res.status(201).json({ ok: true, find: postFind(b) });
}));
// 초탄 finished a rug check: { ticker, result: 'paper'|'pass', reason? }
app.post('/api/team/check', auth, wrap((req, res) => {
  const b = req.body || {};
  if (!b.ticker || !b.result) return res.status(400).json({ error: 'ticker and result are required' });
  postCheck(b); res.json({ ok: true, counts: team.counts });
}));
// any one-line message into the group chat panel: { from, text }
app.post('/api/team/chat', auth, wrap((req, res) => {
  const b = req.body || {};
  if (!b.text) return res.status(400).json({ error: 'text is required' });
  teamChat(b.from || 'manneung', b.text); broadcast(); res.json({ ok: true });
}));
// scan schedule for the countdown: { lastAt?, nextAt?, now?: true (simulator scans right away) }
app.post('/api/team/scan', auth, wrap((req, res) => {
  const b = req.body || {};
  if (b.now) { radarKick?.(); return res.json({ ok: true, kicked: true }); }
  team.scan.lastAt = Number(b.lastAt) || now();
  team.scan.nextAt = Number(b.nextAt) || team.scan.lastAt + SCAN_MS;
  broadcast(); res.json({ ok: true, scan: team.scan });
}));

app.post('/api/preset', (req, res) => {
  const p = req.body?.preset;
  if (!presets[p]) return res.status(400).json({ error: `preset must be one of ${Object.keys(presets).join(', ')}` });
  startSim(p);
  res.json({ ok: true, preset: p });
});

// ---------------------------------------------------------------- simulator
let simGen = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SIM_SPEED));
const rnd = (a, b) => a + Math.random() * (b - a);

async function runSimBot(bot, script, gen, offset) {
  const alive = () => gen === simGen && bots.get(bot.id) === bot;
  const waitClear = async () => { while (alive() && (bot.pending || (bot.holdUntil || 0) > now())) await sleep(500); };
  const step = async (s, i, total) => {
    await waitClear();
    if (!alive()) return;
    if (bot.task) bot.task.step = i + 1, bot.task.total = total;
    setStatus(bot, { status: s.s, action: s.a });
    await sleep(rnd(5200, 9500));
  };
  let ti = offset;
  await sleep(rnd(200, 2500));
  while (alive()) {
    const task = script.tasks[ti % script.tasks.length];
    const next = script.tasks[(ti + 1) % script.tasks.length];
    ti++;
    // flatten branch length for "step i of N"
    const total = task.steps.reduce((n, s) => n + (s.ask ? 1 + Math.max(s.yes.length, s.no.length) - 1 : 1), 0);
    await waitClear();
    if (!alive()) return;
    bot.queue = next.title !== task.title ? [next.title] : [];
    setStatus(bot, { task: task.title, step: 1, total, log: false });
    let i = 0;
    for (const s of task.steps) {
      if (!alive()) return;
      if (!s.ask) { await step(s, i++, total); continue; }
      await waitClear();
      // only one simulated bot asks the human at a time (real bots may ask whenever they want)
      while (alive() && [...bots.values()].some((b) => b.sim && b !== bot && b.pending)) await sleep(1500);
      if (!alive()) return;
      if (bot.task) bot.task.step = i + 1;
      requestApproval(bot, { question: s.ask, approveText: s.yes[0]?.a, declineText: s.no[0]?.a });
      i++;
      let d = null;
      while (alive() && bot.pending && !d) d = await waitDecision(bot.id, 5000);
      if (!alive()) return;
      const branch = bot.lastDecision?.state === 'approved' ? s.yes : s.no;
      await sleep(rnd(4500, 7000));
      for (const b of branch.slice(1)) await step(b, i++, total);
    }
    if (!alive()) return;
    finishTask(bot);
    await waitClear();
    setStatus(bot, { status: 'idle', action: script.idle[Math.floor(Math.random() * script.idle.length)] });
    await sleep(rnd(9000, 20000));
  }
}

// ---- pipeline simulator (mine preset). All coins/mints/links are fake 예시 values.
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fakeMint = () => 'Example' + Array.from({ length: 33 }, () => B58[Math.floor(Math.random() * B58.length)]).join('') + 'pump';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let radarKick = null;
async function simRadar(bot, gen) {
  const alive = () => gen === simGen && bots.get(bot.id) === bot;
  let first = true;
  await sleep(4000);
  while (alive()) {
    rollDay();
    team.scan.state = 'scanning'; team.scan.lastAt = now(); team.scan.nextAt = null;
    setStatus(bot, { status: 'browsing', action: 'X 계정 15개 스캔 중', task: { title: 'X 계정 15개 정기 스캔', step: 1, total: 3 }, stay: true, visit: null });
    const order = [...P.RADAR_ACCOUNTS].sort(() => Math.random() - .5);
    for (const acc of order.slice(0, 4)) { await sleep(1700); if (!alive()) return; setStatus(bot, { action: `X 계정 15개 스캔 중 · @${acc}`, log: false }); }
    await sleep(1500); if (!alive()) return;
    if (Math.random() < .4 && !first) {
      setStatus(bot, { status: 'coding', action: `사칭 계정 걸러냄 · @${pick(P.IMPOSTERS)} (예시)`, step: 2 });
      await sleep(4500); if (!alive()) return;
    }
    if (first || Math.random() < .5) {
      const recent = team.chat.slice(-8).map((m) => m.ticker); const c = pick(P.EXAMPLE_COINS.filter((x) => !recent.includes(x.ticker))), who = pick(P.RADAR_ACCOUNTS);
      setStatus(bot, { status: 'coding', action: `$${c.ticker} 언급 발견! (예시)`, step: 2 });
      await sleep(2500); if (!alive()) return;
      // packet flies to 초탄 + one line in the group chat, then the radar glides over to brief 초탄 and comes back
      postFind({ from: bot.id, to: 'chotan', ticker: c.ticker, name: c.name, mint: fakeMint(), who, link: `x.com/${who}/status/예시`, example: true });
      setStatus(bot, { action: `초탄에게 전달 · $${c.ticker}`, step: 3, log: false });
      await sleep(2600); if (!alive()) return;
      setStatus(bot, { visit: 'chotan', log: false });
      await sleep(7000); if (!alive()) return;
    } else {
      addLog(bot, '새 언급 없음 · 조용히 넘어감', 'idle'); // quiet when nothing: no group chat post
    }
    first = false;
    finishTask(bot);
    team.scan.state = 'waiting'; team.scan.nextAt = now() + SCAN_MS / SIM_SPEED;
    setStatus(bot, { status: 'idle', action: '다음 스캔까지 대기', stay: true, visit: null });
    await new Promise((r) => { const t = setTimeout(r, Math.max(0, team.scan.nextAt - now())); radarKick = () => { clearTimeout(t); radarKick = null; r(); }; });
    radarKick = null;
  }
}
async function simChotan(bot, gen) {
  const alive = () => gen === simGen && bots.get(bot.id) === bot;
  setStatus(bot, { status: 'idle', action: '레이더 발견 대기 중', stay: true, log: false });
  while (alive()) {
    const f = team.inbox.find((x) => x.to === bot.id);
    if (!f) { await sleep(1000); continue; }
    team.inbox.splice(team.inbox.indexOf(f), 1);
    await sleep(1800); if (!alive()) return;
    setStatus(bot, { status: 'browsing', action: `러그 체크 중 · $${f.ticker}`, task: { title: `$${f.ticker} 러그 체크${f.example ? ' (예시)' : ''}`, step: 1, total: 3 } });
    await sleep(5500); if (!alive()) return;
    setStatus(bot, { status: 'coding', action: `LP 락 · 상위 홀더 · 개발자 지갑 확인 · $${f.ticker}`, step: 2 });
    await sleep(5500); if (!alive()) return;
    const rug = Math.random() < .4;
    if (rug) {
      const why = pick(['상위 10 지갑 62%', 'LP 락 없음', '개발자 지갑 대량 보유']);
      setStatus(bot, { status: 'resolving', action: `패스 (러그 의심) · $${f.ticker} · ${why}`, step: 3 });
      postCheck({ from: bot.id, ticker: f.ticker, result: 'pass', reason: `러그 의심 (${why})`, example: f.example });
    } else {
      while (alive() && [...bots.values()].some((b) => b.sim && b !== bot && b.pending)) await sleep(1500);
      requestApproval(bot, { question: `$${f.ticker} 모의 매수 넣을까? 승인?`, approveText: `모의 매수 진입 · $${f.ticker} (PAPER)`, declineText: `패스 · $${f.ticker} (거절)` });
      bot.task && (bot.task.step = 3);
      const deadline = now() + 4 * 60e3;
      while (alive() && bot.pending && now() < deadline) await waitDecision(bot.id, 5000);
      if (!alive()) return;
      if (bot.pending) { // nobody answered: drop it, paper or not, nothing real ever happens
        bot.pending = null; bot.lastDecision = { ...bot.lastDecision, state: 'withdrawn', decidedAt: now() };
        setStatus(bot, { status: 'resolving', action: `응답 없음 → 패스 · $${f.ticker}` });
        postCheck({ from: bot.id, ticker: f.ticker, result: 'pass', reason: '승인 응답 없음', example: f.example });
      } else {
        const ok = bot.lastDecision?.state === 'approved';
        postCheck({ from: bot.id, ticker: f.ticker, result: ok ? 'paper' : 'pass', reason: ok ? '' : '사용자 거절', example: f.example });
        while (alive() && (bot.holdUntil || 0) > now()) await sleep(500);
      }
    }
    await sleep(6000); if (!alive()) return;
    finishTask(bot);
    setStatus(bot, { status: 'idle', action: '레이더 발견 대기 중', stay: true });
  }
}

function startSim(name) {
  simGen++;
  PRESET = name;
  for (const [id, b] of bots) if (b.sim) bots.delete(id);
  doneTasks.length = 0;
  events.length = 0;
  team.chat.length = 0; team.handoffs.length = 0; team.inbox.length = 0; radarKick = null;
  team.counts = { found: 0, checked: 0, paper: 0, passed: 0 }; team.scan = { intervalMs: SCAN_MS, lastAt: null, nextAt: null, state: 'idle' };
  const preset = presets[name];
  const fixed = new Set(preset.bots.map((s) => s.desk).filter(Boolean)); // presets may pin desks (radar + 초탄 side by side in front)
  const deskOrder = DESKS.filter((d) => d !== NEWCOMER_DESK && !fixed.has(d));
  let nextFree = 0;
  preset.bots.forEach((s, i) => {
    const bot = createBot({ ...s, sim: true, desk: s.desk || (deskOrder[nextFree++] ?? null) });
    // seed a few history entries so the office feels lived in
    const t = s.tasks[s.tasks.length - 1];
    doneTasks.push({ id: uid('task'), title: t.title, botId: bot.id, state: 'done', step: t.steps.length, total: t.steps.length, doneAt: now() - (i + 1) * 600000 });
    t.steps.filter((x) => !x.ask).slice(-3).forEach((x, k) => bot.log.push({ t: now() - (3 - k) * 45000 - i * 7000, text: x.a, status: x.s }));
    bot.status = 'idle'; bot.spot = LOUNGE[i % LOUNGE.length]; bot.action = s.idle[0];
    bot.updatedAt = now() - i * 90000;
    if (s.custom) { bot.stay = true; bot.spot = null; bot.action = s.idle[0]; }
    if (s.custom === 'radar') simRadar(bot, simGen);
    else if (s.custom === 'chotan') simChotan(bot, simGen);
    else runSimBot(bot, s, simGen, i);
  });
  if (preset.pipeline) {
    // earlier finds today, so the group chat panel isn't empty on first load (all 예시)
    const seed = [['DEMOFROG', 'Demo Frog', 'frankdegods', 'pass', '러그 의심 (LP 락 없음)', 52], ['SAMPLEDOG', 'Sample Dog', 'cz_binance', 'paper', '', 31]];
    for (const [tk, nm, who, res, why, minAgo] of seed) {
      const t = now() - minAgo * 60e3;
      team.chat.push({ id: uid('msg'), t, from: 'radar', name: '밈코인 레이더', kind: 'find', ticker: tk, example: true, text: findLine({ name: nm, ticker: tk, mint: fakeMint(), who, link: `x.com/${who}/status/예시`, example: true }) });
      team.chat.push({ id: uid('msg'), t: t + 90e3, from: 'chotan', name: '초탄', kind: res === 'paper' ? 'paper' : 'pass', ticker: tk, example: true, text: res === 'paper' ? `$${tk} 모의 매수 진입 (PAPER)` : `$${tk} 패스 · ${why}` });
      team.counts.found++; team.counts.checked++; team.counts[res === 'paper' ? 'paper' : 'passed']++;
    }
  }
  broadcast();
}

startSim(presets[PRESET] ? PRESET : 'mine');
app.listen(PORT, () => console.log(`GrokBot Office running on http://localhost:${PORT}  (preset: ${PRESET}, password gate: ${PASSWORD ? 'on' : 'off'})`));
