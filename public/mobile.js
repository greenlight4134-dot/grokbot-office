// GrokBot Office · phone helpers. Everything here is inert unless the screen is a touch screen <= 768px wide,
// so the desktop layout and behaviour stay exactly as before. Live API/SSE is used as-is.
const MQ = '(max-width: 768px) and (pointer: coarse)';
const mq = matchMedia(MQ);
const $ = (s) => document.querySelector(s);

function waitOffice() {
  return new Promise((res) => { const t = () => (window.office ? res(window.office) : setTimeout(t, 50)); t(); });
}

waitOffice().then((office) => {
  const crew = $('#crew'), panel = $('#panel'), body = document.body;

  // ---- crew list -> bottom sheet with a handle (tap or swipe)
  const handle = document.createElement('button');
  handle.className = 'sheet-handle'; handle.setAttribute('aria-label', '크루 목록 펼치기/접기');
  crew.prepend(handle);
  crew.classList.add('collapsed');
  handle.addEventListener('click', () => { crew.classList.toggle('collapsed'); setTimeout(measure, 320); });
  let sy = null;
  crew.addEventListener('touchstart', (e) => { if (e.target.closest('.sheet-handle,.crew-h')) sy = e.touches[0].clientY; }, { passive: true });
  crew.addEventListener('touchend', (e) => {
    if (sy == null) return; const dy = e.changedTouches[0].clientY - sy; sy = null;
    if (dy < -25) crew.classList.remove('collapsed'); else if (dy > 25) crew.classList.add('collapsed');
    setTimeout(measure, 320);
  });
  // picking a bot collapses the list so the bot + its detail sheet are visible
  crew.addEventListener('click', (e) => { if (mq.matches && e.target.closest('.crew-row')) crew.classList.add('collapsed'); });

  // ---- only one sheet at a time: while the detail/task sheet is open, the crew sheet steps aside
  const syncSheets = () => { body.classList.toggle('sheet-panel', mq.matches && !panel.classList.contains('hidden')); measure(); };
  new MutationObserver(syncSheets).observe(panel, { attributes: true, attributeFilter: ['class'] });

  // ---- ticker: newest line only; button cycles  한 줄 -> 펼침 -> 숨김
  const tt = document.createElement('button');
  tt.id = 'tickToggle'; tt.setAttribute('aria-label', '활동 피드 펼치기/숨기기');
  const states = [['', '▾'], ['tick-open', '▴'], ['tick-off', '≡']];
  let ts = 0;
  const applyTick = () => { body.classList.remove('tick-open', 'tick-off'); if (states[ts][0]) body.classList.add(states[ts][0]); tt.textContent = states[ts][1]; };
  tt.addEventListener('click', () => { ts = (ts + 1) % states.length; applyTick(); });
  applyTick();
  $('#ticker').after(tt);

  // ---- how much of the screen the sheets cover -> CSS var (zoom buttons, toast) + camera offset
  let covered = 0;
  function measure() {
    if (!mq.matches) { covered = 0; document.documentElement.style.removeProperty('--sheet-h'); return; }
    const c = getComputedStyle(crew).display === 'none' ? 0 : crew.getBoundingClientRect().height;
    const p = panel.classList.contains('hidden') ? 0 : panel.getBoundingClientRect().height;
    covered = Math.max(c, p);
    document.documentElement.style.setProperty('--sheet-h', Math.round(covered) + 'px');
  }
  new ResizeObserver(measure).observe(crew);
  new ResizeObserver(measure).observe(panel);
  addEventListener('resize', measure);
  mq.addEventListener?.('change', () => { syncSheets(); office.updateCamera(); });
  syncSheets();

  // ---- portrait camera: widen the view so the whole office fits and slide it up above the sheet
  const BASE_VIEW = office.view;
  const origUpdate = office.updateCamera.bind(office);
  let shiftNow = 0;
  office.updateCamera = function () {
    const a = innerWidth / innerHeight;
    this.view = mq.matches && a < 1 ? BASE_VIEW * Math.min(2.1, Math.max(1, .95 / a)) * .78 : BASE_VIEW;
    origUpdate();
    if (!mq.matches) { shiftNow = 0; return; }
    const span = this.camera.top - this.camera.bottom;
    const top = 90; // top bar + ticker line
    const want = ((covered - top) / innerHeight) * span * .5;
    shiftNow += (want - shiftNow) * .12;
    this.camera.top -= shiftNow; this.camera.bottom -= shiftNow;
    this.camera.updateProjectionMatrix();
  };
  office.updateCamera();
  // following a bot: the desktop version shifts it left of the side panels; not wanted on a phone
  const origTick = office.tick.bind(office);
  office.tick = function () {
    const f = this.follow, o = f && this.bots.get(f);
    if (mq.matches && o) { this.follow = null; this.targetTo.copy(o.root.position); origTick(); if (this.follow === null) this.follow = f; return; }
    origTick();
  };

  // ---- two-finger pinch zoom on the 3D canvas
  const cv = $('#stage canvas');
  if (cv) {
    let pinch = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = dist(e.touches); }, { passive: true });
    cv.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2 || !pinch) return;
      const d = dist(e.touches); office.zoomBy(d / pinch); office.zoom = office.zoomTo; pinch = d; e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true });
  }

  // ---- touch-safe redraws: the detail sheet is re-rendered every second (relative times). A re-render between
  // finger-down and finger-up swallows the tap, so on touch we skip identical renders and hold updates while a finger is down.
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  let touching = false, held = null, last = null;
  Object.defineProperty(panel, 'innerHTML', {
    configurable: true,
    get() { return d.get.call(this); },
    set(v) {
      if (!mq.matches) { last = null; return d.set.call(this, v); }
      if (v === last) return; if (touching) { held = v; return; } last = v; d.set.call(this, v);
    },
  });
  panel.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && mq.matches) touching = true; }, true);
  const release = () => { if (!touching) return; setTimeout(() => { touching = false; if (held != null) { const h = held; held = null; panel.innerHTML = h; } }, 400); };
  addEventListener('pointerup', release, true); addEventListener('pointercancel', release, true);
});
