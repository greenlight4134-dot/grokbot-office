import * as THREE from 'three';

export function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData = { canvas: c, ctx: g, draw };
  return t;
}
export const FONT = "'Inter','Noto Sans KR','Noto Sans CJK KR',sans-serif";
const rnd = (a, b) => a + Math.random() * (b - a);

export function woodTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const plankH = 64;
    for (let y = 0; y < h; y += plankH) {
      let x = -Math.random() * 300;
      while (x < w) {
        const len = rnd(260, 520);
        const l = rnd(40, 52), s = rnd(52, 62), hue = rnd(14, 22);
        g.fillStyle = `hsl(${hue},${s}%,${l}%)`;
        g.fillRect(x, y, len, plankH);
        for (let i = 0; i < 16; i++) { // grain
          g.strokeStyle = `hsla(${hue},${s}%,${l - rnd(6, 12)}%,${rnd(.15, .35)})`;
          g.lineWidth = rnd(1, 2.5);
          const yy = y + rnd(4, plankH - 4);
          g.beginPath(); g.moveTo(x, yy);
          g.bezierCurveTo(x + len * .3, yy + rnd(-4, 4), x + len * .6, yy + rnd(-4, 4), x + len, yy + rnd(-3, 3)); g.stroke();
        }
        g.fillStyle = 'rgba(40,14,4,.55)'; g.fillRect(x, y, 3, plankH);
        x += len;
      }
      g.fillStyle = 'rgba(40,14,4,.6)'; g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(255,220,190,.12)'; g.fillRect(0, y + 3, w, 2);
    }
  }, { repeat: [2.2, 2.2] });
}
export function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#eef0f2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,130,145,.35)'; g.lineWidth = 3;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 170) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.05)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { repeat: [5, 1] });
}
export function windowTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b1d4a'); gr.addColorStop(.55, '#2d6fd6'); gr.addColorStop(1, '#a8d4ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.3, 1)})`; g.fillRect(rnd(0, w), rnd(0, h * .45), 2, 2); }
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(rnd(0, w), rnd(h * .65, h), rnd(30, 70), rnd(6, 12), 0, 0, Math.PI * 2); g.fill(); }
  });
}
export function signTex(text, { w = 512, h = 160, bg = '#14171f', fg = '#fff', size = 64, weight = 800, spacing = 6, extra } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (g.letterSpacing !== undefined) g.letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2, h / 2);
    extra && extra(g, w, h);
  });
}
export function hazardTex() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5c020';
    for (let x = -h; x < w + h; x += 40) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h); g.lineTo(x + 20 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
}
export function solarTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#0d1c4a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const gr = g.createLinearGradient(x, y, x + 32, y + 32);
      gr.addColorStop(0, '#2c58c9'); gr.addColorStop(1, '#16307e');
      g.fillStyle = gr; g.fillRect(x + 2, y + 2, 28, 28);
    }
  });
}
export function rugTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '190,185,175'},${rnd(.2, .6)})`; g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(1, 3), 0, 6.3); g.fill(); }
  });
}
export function corkTex(cols) {
  return canvasTex(640, 400, (g, w, h) => drawCork(g, w, h, cols));
}
export function drawCork(g, w, h, cols = [3, 4, 4]) {
  g.fillStyle = '#7a4a26'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9a873'; g.fillRect(14, 14, w - 28, h - 28);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,70,30,${Math.random() * .25})`; g.fillRect(14 + Math.random() * (w - 28), 14 + Math.random() * (h - 28), 2, 2); }
  const names = ['TO DO', 'DOING', 'DONE'];
  const colors = [['#fff59a', '#ffd08a', '#c8f0a0'], ['#a8e0ff', '#ffc2d8', '#fff59a'], ['#c8f0a0', '#c8f0a0', '#a8e0ff']];
  const cw = (w - 60) / 3;
  names.forEach((n, ci) => {
    const x0 = 30 + ci * cw;
    g.fillStyle = '#fff'; g.fillRect(x0 + 10, 30, cw - 20, 34);
    g.fillStyle = '#333'; g.font = `800 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x0 + cw / 2, 47);
    const count = Math.min(cols[ci] ?? 0, 8);
    for (let k = 0; k < count; k++) {
      const r = Math.floor(k / 2), c = k % 2;
      const x = x0 + 14 + c * ((cw - 28) / 2), y = 78 + r * 74;
      g.save(); g.translate(x + 40, y + 30); g.rotate((Math.sin(ci * 7 + k * 3) * 4) * Math.PI / 180);
      g.fillStyle = colors[ci][k % 3]; g.fillRect(-38, -30, 76, 62);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let l = 0; l < 3; l++) g.fillRect(-28, -16 + l * 14, 56 - l * 10, 4);
      g.fillStyle = '#e33'; g.beginPath(); g.arc(0, -26, 4, 0, 6.3); g.fill();
      g.restore();
    }
  });
}
