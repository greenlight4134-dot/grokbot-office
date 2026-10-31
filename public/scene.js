import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as T from './textures.js';

const STATUS_COLOR = { coding: 0x36d27a, browsing: 0xa77bff, idle: 0xffa53a, needs_you: 0xff4d5e, resolving: 0x4c8dff, stuck: 0x8b90a0 };
const W = 13, D = 10, H = 5.6; // half floor width (x), half depth (z), wall height
const DESK_POS = { 1: [-3, -3.4], 2: [1.5, -3.4], 3: [6, -3.4], 4: [10.5, -3.4], 5: [-3, 2.6], 6: [1.5, 2.6], 7: [6, 2.6], 8: [10.5, 2.6] };
const LOUNGE_POS = { sofa: [-11.3, -4.4, .55], sofa2: [-11.3, -2.4, .55], coffee: [-6.6, -7.7, 0], charge: [-10.6, 3.2, 0], charge2: [-10.6, 5.8, 0], charge3: [-8.2, 4.5, 0] };
const AIRLOCK = { x: 11.2, w: 2.6 };

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .32, clearcoat: .6, clearcoatRoughness: .25, ...o });
const glow = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .4 });

export class Office {
  constructor(el, { onPick, onHover, onDeskClick, onAirlockClick }) {
    this.el = el; this.cb = { onPick, onHover, onDeskClick, onAirlockClick };
    this.bots = new Map(); this.deskOwner = {}; this.night = [];
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    this.scene.environmentIntensity = .55;

    this.view = 27.5; this.zoom = 1; this.zoomTo = 1;
    this.target = new THREE.Vector3(2.2, 0, 2.2); this.targetTo = this.target.clone();
    this.dir = new THREE.Vector3(1, .86, 1).normalize();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400);
    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.pickables = [];
    this.clock = new THREE.Clock();

    this.buildLights(); this.buildStation(); this.buildRoom(); this.buildLounge(); this.buildDesks(); this.buildSpace();
    this.resize(); addEventListener('resize', () => this.resize());
    this.bindInput();
    this.setMode('day');
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ------------------------------------------------------------------ helpers
  add(mesh, x = 0, y = 0, z = 0, parent = this.scene, shadow = true) {
    mesh.position.set(x, y, z);
    if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
    parent.add(mesh); return mesh;
  }
  box(w, h, d, m, x, y, z, parent, r = 0) {
    const geo = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    return this.add(new THREE.Mesh(geo, m), x, y, z, parent);
  }
  plane(w, h, tex, x, y, z, ry = 0, emissive = 0) {
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: .6, emissive: emissive ? 0xffffff : 0, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z); p.rotation.y = ry; this.scene.add(p); return p;
  }

  // ------------------------------------------------------------------ lights
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xe6eeff, 0x4a3324, 1.1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3e2, 2.4);
    this.sun.position.set(14, 26, 18); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    this.sun.shadow.bias = -.0005; this.sun.shadow.normalBias = .02; this.sun.shadow.radius = 4;
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x9fc4ff, .5); this.fill.position.set(-10, 8, 20); this.scene.add(this.fill);
  }

  // ------------------------------------------------------------------ space backdrop
  buildSpace() {
    // satellites with big solar wings behind the station
    const solar = T.solarTex();
    const mkSat = (x, y, z, s, rot) => {
      const g = new THREE.Group();
      const truss = std(0x9aa3b5, { metalness: .6, roughness: .4 });
      this.box(14, .18, .18, truss, 0, 0, 0, g);
      const pm = new THREE.MeshStandardMaterial({ map: solar, roughness: .35, metalness: .4, emissive: 0x0a1a55, emissiveIntensity: .4 });
      [-4.6, 4.6].forEach((px) => { [-1, 1].forEach((side) => { const p = this.box(3.6, .08, 6.6, pm, px + side * 1.9, 0, 0, g); p.castShadow = false; }); });
      this.box(1.2, 1, 1, std(0xd8dce4), 0, 0, 0, g);
      g.position.copy(this.screenPlace(x, y, z)); g.scale.setScalar(s); g.rotation.set(rot[0], rot[1], rot[2]);
      this.scene.add(g); return g;
    };
    this.sats = [mkSat(-21, 9, 60, 0.62, [0.55, 0.75, 0.35]), mkSat(17.5, 11.5, 70, 0.55, [0.25, -0.5, -0.45])];
    // antenna mast
    this.box(.12, 10, .12, std(0x777f8e), -3.5, 13, -11);
    // thrusters under station
    [[-8, 9], [3, 11.5], [12, 4]].forEach(([x, z]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(.6, 1.6, 20), std(0x2a2e38, { metalness: .5 }));
      this.add(c, x, -2.6, z).rotation.x = Math.PI;
      const fl = new THREE.Mesh(new THREE.ConeGeometry(.5, 2.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.position.set(x, -4.4, z); fl.rotation.x = Math.PI; this.scene.add(fl);
      (this.flames ||= []).push(fl);
    });
  }

  // world point that lands at screen offset (sx right, sy up) from the default view centre, `back` units behind the station
  screenPlace(sx, sy, back) {
    const right = new THREE.Vector3(1, 0, -1).normalize();
    const up = new THREE.Vector3(0, 1, 0).sub(this.dir.clone().multiplyScalar(this.dir.y)).normalize();
    return new THREE.Vector3(2.2, 0, 2.2).addScaledVector(right, sx).addScaledVector(up, sy).addScaledVector(this.dir, -back);
  }

  // ------------------------------------------------------------------ station base + floor
  buildStation() {
    const slab = std(0x1c1f27, { roughness: .7, metalness: .3 });
    this.box(2 * W + 3, 1.8, 2 * D + 3, slab, 0, -1.05, 0);
    this.box(2 * W + 1.6, .5, 2 * D + 1.6, std(0x2a2e38, { metalness: .3 }), 0, -2.2, 0);
    const floor = this.box(2 * W, .24, 2 * D, std(0xffffff, { map: T.woodTex(), roughness: .62 }), 0, -.12, 0);
    floor.castShadow = false;
    // rim light dots
    const dotM = glow(0xdff3ff, 3); this.night.push({ m: dotM, day: 1.4, night: 3.5 });
    const dotG = new THREE.SphereGeometry(.09, 10, 10);
    for (let x = -W - 1; x <= W + 1; x += 1.6) this.add(new THREE.Mesh(dotG, dotM), x, -.35, D + 1.52, this.scene, false);
    for (let z = -D - 1; z <= D + 1; z += 1.6) this.add(new THREE.Mesh(dotG, dotM), W + 1.52, -.35, z, this.scene, false);
    // edge text
    const t1 = T.signTex('GROKBOT STATION · DECK 3', { w: 2048, h: 128, bg: '#1c1f27', fg: '#8e96a8', size: 74, weight: 700, spacing: 22 });
    this.plane(16, 1, t1, -4, -1.25, D + 1.51, 0, .25);
    this.userTex = T.signTex('@user', { w: 1024, h: 128, bg: '#1c1f27', fg: '#8e96a8', size: 70, weight: 700, spacing: 10 });
    this.plane(8, 1, this.userTex, W + 1.51, -1.25, 3.5, Math.PI / 2, .25);
    const hz = T.hazardTex(); hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(3, 1);
    this.plane(5, .4, hz, W + 1.51, -1.6, -5, Math.PI / 2);
    this.plane(5, .4, hz, 5, -1.6, D + 1.51, 0);
    // glass rails on open edges
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, transparent: true, opacity: .12, roughness: .05, transmission: 0, depthWrite: false });
    const r1 = this.box(2 * W, 1.1, .06, glass, 0, .55, D); r1.castShadow = false;
    const r2 = this.box(.06, 1.1, 2 * D, glass, W, .55, 0); r2.castShadow = false;
    const rail = std(0xe9edf2, { metalness: .4 });
    this.box(2 * W, .07, .1, rail, 0, 1.12, D); this.box(.1, .07, 2 * D, rail, W, 1.12, 0);
  }

  // ------------------------------------------------------------------ walls and wall features
  buildRoom() {
    const wm = std(0xffffff, { map: T.wallTex(), roughness: .7 });
    const cap = std(0xf6f7f9);
    // left wall (x = -W)
    this.box(.4, H, 2 * D, wm, -W - .2, H / 2, 0);
    this.box(.7, .35, 2 * D + .7, cap, -W - .2, H + .17, -.35);
    // back wall (z = -D), split around airlock
    const a0 = AIRLOCK.x - AIRLOCK.w / 2, a1 = AIRLOCK.x + AIRLOCK.w / 2, dh = 3.4;
    this.box(a0 + W, H, .4, wm, (-W + a0) / 2, H / 2, -D - .2);
    this.box(W - a1, H, .4, wm, (a1 + W) / 2, H / 2, -D - .2);
    this.box(AIRLOCK.w, H - dh, .4, wm, AIRLOCK.x, dh + (H - dh) / 2, -D - .2);
    this.box(2 * W + .7, .35, .7, cap, 0, H + .17, -D - .2);
    // cyan glow strips
    const strip = glow(0x5ff0ff, 2.2); this.night.push({ m: strip, day: 1.2, night: 3.2 });
    this.box(.06, .06, 2 * D, strip, -W + .03, .1, 0).castShadow = false;
    this.box(2 * W, .06, .06, strip, 0, .1, -D + .03).castShadow = false;
    this.box(2 * W, .05, .05, strip, 0, H - .1, -D + .03).castShadow = false;

    // windows on left wall
    const wt = T.windowTex();
    this.windowMat = new THREE.MeshStandardMaterial({ map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: .6 });
    const frame = std(0x2a2d34);
    for (let i = 0; i < 4; i++) {
      const z = -8.6 + i * 1.75;
      this.box(.12, 2.5, 1.6, frame, -W + .06, 3.3, z);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), this.windowMat);
      p.rotation.y = Math.PI / 2; p.position.set(-W + .13, 3.3, z); this.scene.add(p);
    }
    // string lights across windows
    const bulbM = glow(0xffd08a, 2.5); this.night.push({ m: bulbM, day: 1.2, night: 4 });
    const bg = new THREE.SphereGeometry(.06, 8, 8);
    for (let k = 0; k < 4; k++) for (let j = 0; j <= 8; j++) {
      const t = j / 8, z = -9.45 + k * 1.75 + t * 1.75, y = 4.75 - Math.sin(t * Math.PI) * .35;
      this.add(new THREE.Mesh(bg, bulbM), -W + .22, y, z, this.scene, false);
    }
    // wooden bench under windows
    const wood = std(0xb9773e, { roughness: .5 });
    this.box(.7, .12, 7.4, wood, -W + .4, 1.75, -5.8);

    // CHARGE sign + pads
    const charge = T.signTex('CHARGE', { w: 256, h: 512, bg: '#191c22', fg: '#fff', size: 50, spacing: 4, extra: (g) => {
      g.save(); g.translate(0, -150); g.fillText('CHARGE', 128, 256); g.restore();
      g.fillStyle = '#191c22'; g.fillRect(0, 200, 256, 120);
      ['#36d27a', '#36d27a', '#9be86b', '#ffd23a'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.roundRect(48, 180 + i * 70, 160, 46, 10); g.fill(); });
    } });
    this.plane(1.3, 2.6, charge, -W + .02, 2.9, 4.5, Math.PI / 2, .35);
    const padM = new THREE.MeshStandardMaterial({ color: 0xc8ffe8, emissive: 0x9affd6, emissiveIntensity: 1.2, transparent: true, opacity: .85 });
    this.night.push({ m: padM, day: .9, night: 2.4 });
    ['charge', 'charge2', 'charge3'].forEach((k) => {
      const [x, z] = LOUNGE_POS[k];
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .05, 40), padM); this.add(disc, x, .03, z, this.scene, false); disc.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .05, 8, 48), glow(0xffffff, 1)); ring.rotation.x = Math.PI / 2; this.add(ring, x, .06, z, this.scene, false);
    });

    // coffee counter
    const white = std(0xf4f5f7, { roughness: .45 });
    this.box(4.6, 1.5, 1.3, white, -7.4, .75, -D + .65, undefined, .06);
    this.box(4.8, .1, 1.45, std(0xd9dde3), -7.4, 1.55, -D + .72);
    this.box(.9, .9, .7, phys(0xff6a3d), -6.3, 2.05, -D + .55, undefined, .1);
    this.box(3.4, .1, .5, wood, -7.6, 3.5, -D + .25);
    [[0x8fd36a, -8.8], [0xffc531, -8.2], [0xff8a3d, -7.6], [0x5bb6ff, -7.0], [0xf4f5f7, -6.4]].forEach(([c, x]) => this.box(.25, .3, .25, phys(c), x, 3.7, -D + .25, undefined, .05));
    const coffee = T.signTex('COFFEE', { w: 256, h: 80, bg: '#eef0f2', fg: '#666', size: 36, spacing: 6 });
    this.plane(1.6, .5, coffee, -7.5, 4.3, -D + .01);
    [[-8.8, -7.4], [-7.6, -7.1]].forEach(([x, z], i) => {
      this.box(.08, 1.1, .08, std(0x666b75, { metalness: .6 }), x, .55, z);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .14, 24), phys(i ? 0x4fc3a1 : 0xff8a6a)); this.add(seat, x, 1.15, z);
    });

    // server column
    const col = new THREE.Group(); col.position.set(-2.4, 0, -8.2); this.scene.add(col);
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, .5, 40), std(0x1a2238, { metalness: .5 })), 0, .25, 0, col);
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 7.6, 40), std(0x14213d, { metalness: .4, roughness: .35 })), 0, 4.2, 0, col);
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, .5, 40), std(0x1a2238, { metalness: .5 })), 0, 8.1, 0, col);
    this.serverRings = [];
    const rc = [0x41e0ff, 0x5aa8ff, 0x7c7cff, 0xa67bff, 0x41e0ff, 0x5aa8ff];
    rc.forEach((c, i) => {
      const m = glow(c, 3); const r = new THREE.Mesh(new THREE.TorusGeometry(1.3, .07, 10, 60), m);
      r.rotation.x = Math.PI / 2; this.add(r, 0, 1.4 + i * 1.05, 0, col, false); this.serverRings.push(m);
    });
    this.serverLight = new THREE.PointLight(0x5ab8ff, 6, 9, 1.6); this.serverLight.position.set(-1, 3, -6.5); this.scene.add(this.serverLight);
    this.pickables.push(...col.children.map((m) => (m.userData.kind = 'server', m)));

    // CREW SESSION display
    this.sessionTex = T.canvasTex(1024, 440, () => {});
    this.sessionState = { working: 0, needs: 0, idle: 0, free: 0, sync: 30, act: Array.from({ length: 48 }, () => Math.random()) };
    this.box(5.9, 2.75, .12, std(0x0c0e13), 3.4, 3.4, -D + .06);
    const sp = this.plane(5.7, 2.45, this.sessionTex, 3.4, 3.4, -D + .13, 0, .95); sp.material.toneMapped = false;
    this.drawSession();

    // cork board
    this.corkTex = T.corkTex([3, 4, 4]);
    this.corkFrame = this.box(2.9, 2.0, .1, std(0x6b3f1f), 8.0, 3.3, -D + .05);
    this.corkPlane = this.plane(2.8, 1.9, this.corkTex, 8.0, 3.3, -D + .11);

    // GROUP CHAT display (team preset): replaces the cork board with the '초탄 × 밈코인 레이더' feed
    this.chatTex = T.canvasTex(800, 640, () => {});
    this.chatFrame = this.box(3.4, 2.78, .12, std(0x0c0e13), 8.15, 3.38, -D + .06);
    this.chatPlane = this.plane(3.24, 2.6, this.chatTex, 8.15, 3.38, -D + .13, 0, .95); this.chatPlane.material.toneMapped = false;
    this.chatLight = new THREE.PointLight(0x9a7bff, 0, 5, 1.6); this.chatLight.position.set(8.15, 3.3, -D + 1.2); this.scene.add(this.chatLight);
    this.chatLines = []; this.chatFlash = 0;
    this.packets = [];
    this.setTeamMode(false);

    // airlock
    const al = new THREE.Group(); al.position.set(AIRLOCK.x, 0, -D); this.scene.add(al);
    this.add(new THREE.Mesh(new THREE.BoxGeometry(AIRLOCK.w, dh, 1.2), std(0x07090e)), 0, dh / 2, -.85, al, false);
    const frameM = std(0xdfe4ea, { metalness: .3 });
    this.box(.22, dh + .2, .3, frameM, -AIRLOCK.w / 2, dh / 2, .05, al); this.box(.22, dh + .2, .3, frameM, AIRLOCK.w / 2, dh / 2, .05, al);
    this.box(AIRLOCK.w + .4, .25, .3, frameM, 0, dh + .1, .05, al);
    const gl = glow(0x48ff9a, 3); this.airlockLightM = gl; this.night.push({ m: gl, day: 2, night: 4 });
    this.box(.06, dh, .06, gl, -AIRLOCK.w / 2 - .14, dh / 2, .2, al).castShadow = false;
    this.box(.06, dh, .06, gl, AIRLOCK.w / 2 + .14, dh / 2, .2, al).castShadow = false;
    const doorM = phys(0xeef2f6, { roughness: .3 });
    const winM = std(0x26303d, { metalness: .5, roughness: .2 });
    this.doors = [-1, 1].map((s) => {
      const d = new THREE.Group(); d.position.set(s * AIRLOCK.w / 4, 0, -.05); al.add(d);
      this.box(AIRLOCK.w / 2 - .02, dh, .14, doorM, 0, dh / 2, 0, d);
      const w = new THREE.Mesh(new THREE.TorusGeometry(.22, .06, 10, 30), winM); this.add(w, 0, 2.35, .08, d);
      this.add(new THREE.Mesh(new THREE.CircleGeometry(.2, 24), std(0x0b111a, { metalness: .6, roughness: .1 })), 0, 2.35, .08, d, false);
      this.box(AIRLOCK.w / 2 - .25, .06, .03, std(0xc9a83a), 0, 1.4, .08, d); this.box(AIRLOCK.w / 2 - .25, .06, .03, std(0xc9a83a), 0, 1.25, .08, d);
      d.userData.closedX = s * AIRLOCK.w / 4; d.userData.side = s; return d;
    });
    this.doorOpen = 0; this.doorOpenTo = 0;
    const alSign = T.signTex('AIRLOCK', { w: 512, h: 110, bg: '#0f1a1c', fg: '#bffcff', size: 54, spacing: 10 });
    this.plane(2.0, .43, alSign, AIRLOCK.x, dh + .55, -D + .01, 0, .9);
    const hz = T.hazardTex(); hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(2, 1);
    const hzp = new THREE.Mesh(new THREE.PlaneGeometry(AIRLOCK.w + .4, 1.3), new THREE.MeshStandardMaterial({ map: hz, roughness: .7 }));
    hzp.rotation.x = -Math.PI / 2; hzp.position.set(AIRLOCK.x, .01, -D + .9); hzp.receiveShadow = true; this.scene.add(hzp);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(AIRLOCK.w + .6, dh + .8, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(AIRLOCK.x, dh / 2, -D + .3); hit.userData.kind = 'airlock'; this.scene.add(hit); this.pickables.push(hit);
    // ALL CLEAR kiosk
    this.box(.7, 2.0, .45, std(0x1d2129), 9.4, 1.0, -D + .5, undefined, .06);
    const ac = T.signTex('ALL CLEAR', { w: 256, h: 128, bg: '#0d2b1c', fg: '#5dff9d', size: 34, spacing: 3 });
    this.plane(.55, .3, ac, 9.4, 1.55, -D + .74, 0, 1);
    // plants
    this.plant(.1, -8.9, 1.3); this.plant(-11.9, -.6, 1.1, true); this.plant(12.2, -8.6, 1.0); this.plant(12.2, 8.6, .9); this.plant(2.2, 8.7, .9);
    // lockers
    const lc = [0xf4f5f7, 0xb8bec8, 0xd8463f, 0xf4f5f7, 0x5f6b7c, 0xf4f5f7];
    lc.forEach((c, i) => {
      const x = 3.9 + i * 1.02;
      this.box(.98, 2.7, .9, phys(c, { clearcoat: .2 }), x, 1.35, 8.6, undefined, .05);
      const n = T.signTex(String(i + 1).padStart(2, '0'), { w: 128, h: 80, bg: '#22252c', fg: '#fff', size: 44, spacing: 2 });
      this.plane(.36, .22, n, x, 2.1, 9.06);
      this.box(.06, .5, .04, std(0x333740, { metalness: .6 }), x + .32, 1.5, 9.07);
    });
    [[4.2, 0xffc531], [6.0, 0xe9edf2], [8.2, 0x8fd36a]].forEach(([x, c]) => this.add(new THREE.Mesh(new THREE.SphereGeometry(.28, 20, 16), phys(c)), x, 2.98, 8.6));
  }

  plant(x, z, s = 1, tall = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); this.scene.add(g);
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(.45, .35, .8, 24), phys(0xe9e2d4)), 0, .4, 0, g);
    const leaf = std(0x4caf5a, { roughness: .6 });
    if (tall) {
      for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(.12, 2.2, 6), leaf); l.rotation.set(Math.sin(i * 2.1) * .35, 0, Math.cos(i * 2.1) * .35); this.add(l, Math.cos(i) * .1, 1.8, Math.sin(i) * .1, g); }
    } else {
      [[0, 1.2, 0, .6], [.35, 1.0, .1, .42], [-.3, 1.05, -.1, .45], [.05, 1.55, .15, .4]].forEach(([a, b, c, r]) => this.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf), a, b, c, g));
    }
  }

  // ------------------------------------------------------------------ lounge
  buildLounge() {
    const white = phys(0xf5f3ee, { roughness: .8, clearcoat: 0 });
    // sofa against left wall
    const sx = -11.6, sz = -3.4;
    this.box(1.5, .55, 4.6, white, sx, .38, sz, undefined, .18);
    this.box(.45, 1.2, 4.6, white, sx - .55, .8, sz, undefined, .18);
    this.box(1.5, .8, .4, white, sx, .55, sz - 2.3, undefined, .18); this.box(1.5, .8, .4, white, sx, .55, sz + 2.3, undefined, .18);
    [[0x7fc8a9, -1.2], [0xffb27a, 0], [0x9db5ff, 1.2]].forEach(([c, dz]) => { const p = this.box(.28, .62, .9, phys(c, { roughness: .8, clearcoat: 0 }), sx - .2, 1.0, sz + dz, undefined, .12); p.rotation.z = -.2; });
    // fluffy rug
    const rug = this.box(4.6, .08, 3.8, std(0xffffff, { map: T.rugTex(), roughness: 1 }), -8.2, .04, -3.4, undefined, .04); rug.castShadow = false;
    for (let i = 0; i < 70; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), std(0xf7f6f2, { roughness: 1 })); b.scale.y = .4; this.add(b, -8.2 + (Math.random() - .5) * 4.5, .08, -3.4 + (Math.random() - .5) * 3.7, this.scene, false); }
    // coffee table + book
    const wood = std(0xc28a52);
    this.box(1.7, .1, 1.1, wood, -8.4, .62, -3.4, undefined, .04);
    [[-9.1, -3.85], [-7.7, -3.85], [-9.1, -2.95], [-7.7, -2.95]].forEach(([x, z]) => this.box(.08, .58, .08, wood, x, .3, z));
    this.box(.6, .1, .45, phys(0x5fb08a), -8.6, .72, -3.3); this.box(.25, .25, .25, phys(0xff8a3d), -8.0, .8, -3.6, undefined, .05);
    // pouf
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(.48, .5, .7, 30), phys(0xe2b33c, { clearcoat: .1, roughness: .7 })), -8.3, .35, -1.0);
    // floor lamp
    const lx = -11.9, lz = -6.7;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(.35, .4, .08, 24), std(0x30333a, { metalness: .5 })), lx, .04, lz);
    this.box(.06, 3.2, .06, std(0x30333a, { metalness: .6 }), lx, 1.65, lz);
    const shadeM = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd28a, emissiveIntensity: 1.2, side: THREE.DoubleSide });
    this.night.push({ m: shadeM, day: .8, night: 3 });
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, .6, 24, 1, true), shadeM), lx, 3.35, lz, this.scene, false);
    this.lampLight = new THREE.PointLight(0xffc27a, 0, 11, 1.4); this.lampLight.position.set(lx + .4, 3, lz + .4); this.scene.add(this.lampLight);
    this.counterLight = new THREE.PointLight(0xffd8a8, 0, 8, 1.6); this.counterLight.position.set(-7.4, 3.6, -8); this.scene.add(this.counterLight);
    this.deskLights = [];
  }

  // ------------------------------------------------------------------ desks
  buildDesks() {
    const top = std(0xead6b8, { roughness: .45 }), leg = std(0xf2f2f2), mon = phys(0xf4f5f7), dark = std(0x111318);
    this.deskPads = {};
    for (const [id, [x, z]] of Object.entries(DESK_POS)) {
      const g = new THREE.Group(); g.position.set(x, 0, z); this.scene.add(g);
      this.box(3.2, .14, 1.7, top, 0, 1.2, 0, g, .04);
      this.box(.12, 1.15, 1.5, leg, -1.48, .58, 0, g); this.box(.12, 1.15, 1.5, leg, 1.48, .58, 0, g);
      this.box(.55, 1.0, 1.0, leg, 1.0, .55, .1, g, .05); // drawer / tower
      // monitor faces the bot (bot stands on -z side)
      this.box(1.25, .8, .06, mon, -.2, 1.85, .2, g, .03);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.12, .66), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x5ab8ff, emissiveIntensity: .9 }));
      scr.rotation.y = Math.PI; scr.position.set(-.2, 1.85, .165); g.add(scr); g.userData.screen = scr;
      this.box(.1, .3, .1, mon, -.2, 1.38, .25, g); this.box(.45, .04, .3, mon, -.2, 1.29, .25, g);
      this.box(1.0, .04, .35, std(0xdfe2e7), -.25, 1.29, -.35, g); // keyboard
      this.box(.35, .55, .65, mon, -1.1, 1.55, .2, g, .05); // tower
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(.09, .08, .22, 12), phys([0x5bb6ff, 0xff8a3d, 0x8fd36a, 0xffc531][id % 4])), .6, 1.38, -.1, g);
      // chair behind
      const ch = new THREE.Group(); ch.position.set(-.1, 0, -1.75); g.add(ch);
      this.box(.8, .12, .8, dark, 0, .75, 0, ch, .04); this.box(.8, .9, .12, dark, 0, 1.25, -.38, ch, .04); this.box(.08, .7, .08, dark, 0, .38, 0, ch);
      // desk number plate on front
      const n = T.signTex(String(id).padStart(2, '0'), { w: 128, h: 64, bg: '#1b1e25', fg: '#fff', size: 34, spacing: 3 });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(.4, .2), new THREE.MeshBasicMaterial({ map: n })); p.position.set(0, 1.07, .86); g.add(p);
      // status pad (ring) where the bot stands
      const padMat = new THREE.MeshBasicMaterial({ color: 0xffb13d, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
      const pad = new THREE.Mesh(new THREE.RingGeometry(.85, 1.05, 48), padMat); pad.rotation.x = -Math.PI / 2; pad.position.set(-.1, .03, -1.4); g.add(pad);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(.85, 48), new THREE.MeshBasicMaterial({ color: 0xffb13d, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
      inner.rotation.x = -Math.PI / 2; inner.position.set(-.1, .025, -1.4); g.add(inner);
      this.deskPads[id] = { pad, inner, group: g };
      const hit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 1.2, z - .9); hit.userData = { kind: 'desk', desk: Number(id) }; this.scene.add(hit); this.pickables.push(hit);
    }
  }

  // ------------------------------------------------------------------ bots
  makeBotMesh(shape, color) {
    const g = new THREE.Group();
    const c = new THREE.Color(color);
    const dark = c.getHSL({}).l < .2;
    const m = phys(color, { roughness: dark ? .3 : .38 });
    let h = 1.2, r = .6;
    const add = (geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; g.add(mesh); return mesh; };
    switch (shape) {
      case 'cube': add(new RoundedBoxGeometry(1.1, 1.1, 1.1, 4, .16), 0, .6); h = 1.2; r = .6; break;
      case 'sphere': add(new THREE.SphereGeometry(.62, 40, 30), 0, .64); h = 1.26; break;
      case 'cone': add(new THREE.ConeGeometry(.62, 1.35, 40), 0, .68); h = 1.35; r = .45; break;
      case 'egg': add(new THREE.SphereGeometry(.55, 40, 30), 0, .7, 0, 1, 1.28, 1); h = 1.4; break;
      case 'box': add(new RoundedBoxGeometry(1.15, 1.0, 1.0, 4, .24), 0, .55); h = 1.05; r = .6; break;
      case 'blob': add(new THREE.SphereGeometry(.5, 32, 24), 0, .5); add(new THREE.SphereGeometry(.38, 28, 20), -.32, .6, -.1); add(new THREE.SphereGeometry(.38, 28, 20), .3, .62, -.12); add(new THREE.SphereGeometry(.36, 28, 20), 0, .95, -.05); h = 1.3; r = .55; break;
      default: add(new THREE.CapsuleGeometry(.5, .45, 8, 30), 0, .73); h = 1.45; r = .5; // cylinder
    }
    // eyes face the camera (diagonal)
    const eyeM = new THREE.MeshBasicMaterial({ color: dark ? 0xffffff : 0x0d0f14 });
    const eyes = new THREE.Group(); eyes.rotation.y = Math.PI / 4; g.add(eyes);
    const eyeY = shape === 'cone' ? .55 : shape === 'egg' ? .8 : h * .58;
    const eyeZ = shape === 'cone' ? .36 : shape === 'cube' ? .78 : shape === 'box' ? .8 : r + .02;
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.BoxGeometry(.13, .18, .04), eyeM); e.position.set(s * .17, eyeY, eyeZ); eyes.add(e); });
    if (shape === 'box') { const visor = new THREE.Mesh(new THREE.BoxGeometry(.75, .36, .04), std(0x2c2f38, { metalness: .5, roughness: .2 })); visor.position.set(0, eyeY, eyeZ - .015); eyes.add(visor); }
    g.userData.h = h;
    return g;
  }

  upsertBot(b) {
    let o = this.bots.get(b.id);
    if (!o) {
      const root = new THREE.Group(); this.scene.add(root);
      const body = this.makeBotMesh(b.shape, b.color); root.add(body);
      body.traverse((m) => { if (m.isMesh) { m.userData = { kind: 'bot', id: b.id }; this.pickables.push(m); } });
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(.55, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02; root.add(shadow);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.78, .98, 48), new THREE.MeshBasicMaterial({ color: 0x36d27a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .035; root.add(ring);
      const alarm = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: 0xff2840, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
      alarm.rotation.x = -Math.PI / 2; alarm.position.y = .04; root.add(alarm);
      const alarmRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 48), new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      alarmRing.rotation.x = -Math.PI / 2; alarmRing.position.y = .045; root.add(alarmRing);
      o = { root, body, ring, alarm, alarmRing, path: [], phase: Math.random() * 6, data: b, pos: root.position };
      const arriving = b.arrivedAt && Date.now() - b.arrivedAt < 20000;
      if (arriving) {
        root.position.set(AIRLOCK.x, 0, -D - .9);
        o.path.push(new THREE.Vector3(AIRLOCK.x, 0, -D + 2.2));
        o.arriving = true;
        this.openAirlock();
      } else {
        root.position.copy(this.homeFor(b));
      }
      this.bots.set(b.id, o);
    }
    const prev = o.data; o.data = b;
    const home = this.homeFor(b);
    const last = o.path.length ? o.path[o.path.length - 1] : o.root.position;
    if (last.distanceTo(home) > .05) this.route(last, home).forEach((v) => o.path.push(v));
    const col = STATUS_COLOR[b.status] ?? 0x36d27a;
    o.ring.material.color.setHex(col);
    o.needs = b.status === 'needs_you';
    if (prev !== b) this.refreshDesks();
    return o;
  }
  route(from, to) {
    // waypoints over a tiny aisle graph so bots walk around desks instead of through them
    const CX = -5.6;
    const aisle = (z) => (z < -4 ? -5.9 : z < 2.2 ? -0.5 : 5.4);
    const inDesks = (v) => v.x > -5;
    const pts = []; const P = (x, z, y = 0) => pts.push(new THREE.Vector3(x, y, z));
    const a0 = aisle(from.z), a1 = aisle(to.z);
    if (inDesks(from) && inDesks(to) && a0 === a1) { P(from.x, a0); P(to.x, a1); }
    else {
      if (inDesks(from)) P(from.x, a0); else if (from.y > .1) P(from.x + 1.4, from.z);
      if (inDesks(to)) { P(CX, inDesks(from) ? a0 : from.z); P(CX, a1); P(to.x, a1); }
      else { P(CX, inDesks(from) ? a0 : from.z); P(CX, to.z); if (to.y > .1) P(to.x + 1.4, to.z); }
    }
    pts.push(to.clone());
    return pts;
  }
  homeFor(b) {
    if (b.visit && this.bots.get(b.visit)) {
      // walk over to the visited bot's desk and stand beside it (handoffs between bots)
      const vd = this.bots.get(b.visit).data.desk;
      if (vd && DESK_POS[vd]) { const [x, z] = DESK_POS[vd]; return new THREE.Vector3(x + 1.5, 0, z - 1.5); }
    }
    if (b.status === 'idle' && b.spot && LOUNGE_POS[b.spot]) { const [x, z, y] = LOUNGE_POS[b.spot]; return new THREE.Vector3(x, y || 0, z); }
    if (b.desk && DESK_POS[b.desk]) { const [x, z] = DESK_POS[b.desk]; return new THREE.Vector3(x - .1, 0, z - 1.4); }
    return new THREE.Vector3(8, 0, 6);
  }
  removeMissing(ids) {
    for (const [id, o] of this.bots) if (!ids.has(id)) {
      this.scene.remove(o.root);
      this.pickables = this.pickables.filter((m) => m.userData.id !== id);
      this.bots.delete(id);
    }
    this.refreshDesks();
  }
  refreshDesks() {
    this.deskOwner = {};
    for (const o of this.bots.values()) if (o.data.desk) this.deskOwner[o.data.desk] = o.data;
    for (const [id, d] of Object.entries(this.deskPads)) {
      const b = this.deskOwner[id];
      const atDesk = b && b.status !== 'idle';
      const col = !b ? 0xffb13d : atDesk ? (STATUS_COLOR[b.status] ?? 0x36d27a) : 0x4c8dff;
      d.pad.material.color.setHex(col); d.inner.material.color.setHex(col);
      d.free = !b; d.pad.visible = !atDesk; d.inner.visible = !atDesk;
      d.group.userData.screen.material.emissiveIntensity = atDesk ? 1.1 : .25;
    }
  }

  // ------------------------------------------------------------------ crew session wall display
  setSession(s) { Object.assign(this.sessionState, s); }
  drawSession() {
    const { ctx: g, canvas } = this.sessionTex.userData; const w = canvas.width, h = canvas.height; const s = this.sessionState;
    g.fillStyle = '#0a0d12'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8ecf3'; g.font = `800 34px ${T.FONT}`; g.textBaseline = 'top'; g.textAlign = 'left';
    if (g.letterSpacing !== undefined) g.letterSpacing = '4px';
    g.fillText('CREW SESSION', 36, 26);
    const lx = s.scanLabel ? w - 352 : w - 230;
    g.fillStyle = '#123a24'; g.beginPath(); g.roundRect(lx, 22, 92, 40, 20); g.fill();
    g.fillStyle = '#5dff9d'; g.font = `800 22px ${T.FONT}`; g.fillText('● LIVE', lx + 8, 32);
    g.textAlign = 'right';
    if (s.scanLabel) { if (g.letterSpacing !== undefined) g.letterSpacing = '1px'; g.fillStyle = s.scanHot ? '#ffd23a' : '#c9b8ff'; g.font = `800 28px ${T.FONT}`; g.fillText(s.scanLabel, w - 34, 29); }
    else { g.fillStyle = '#ffffff'; g.font = `800 30px ${T.FONT}`; g.fillText(`${s.sync}s`, w - 34, 28); }
    g.textAlign = 'left';
    const boxes = [['WORKING', s.working, '#5dff9d', '#0f2b1c'], ['NEED YOU', s.needs, '#ffb13d', '#2e2210'], ['IDLE', s.idle, '#9cc0ff', '#121c33'], ['FREE DESKS', s.free, '#ffffff', '#1c1f27']];
    boxes.forEach(([label, v, c, bg], i) => {
      const x = 36 + i * 240, y = 88;
      g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, 220, 170, 18); g.fill();
      g.strokeStyle = c; g.lineWidth = 4; g.globalAlpha = .7; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = c; g.font = `800 100px ${T.FONT}`; g.fillText(String(v), x + 22, y + 18);
      g.font = `700 22px ${T.FONT}`; g.fillText(label, x + 22, y + 132);
    });
    g.fillStyle = '#6b7285'; g.font = `700 20px ${T.FONT}`; g.fillText('ACTIVITY · LAST HOUR', 36, 282);
    s.act.forEach((v, i) => { const bh = 20 + v * 100; g.fillStyle = i > 40 ? '#ffd23a' : '#4fd0ff'; g.globalAlpha = .45 + v * .55; g.fillRect(36 + i * 20, 420 - bh, 13, bh); });
    g.globalAlpha = 1;
    this.sessionTex.needsUpdate = true;
  }
  setTeamMode(on) {
    if (this.teamMode === on) return;
    this.teamMode = on;
    this.corkFrame.visible = this.corkPlane.visible = !on;
    this.chatFrame.visible = this.chatPlane.visible = on;
    if (on) this.drawChat(this.chatLines);
  }
  drawChat(lines, title = '초탄 × 밈코인 레이더') {
    this.chatLines = lines || [];
    const { ctx: g, canvas } = this.chatTex.userData; const w = canvas.width, h = canvas.height;
    g.fillStyle = '#0a0b14'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0); grd.addColorStop(0, 'rgba(123,77,255,.35)'); grd.addColorStop(1, 'rgba(255,138,61,.25)');
    g.fillStyle = grd; g.fillRect(0, 0, w, 112);
    g.textBaseline = 'top'; g.textAlign = 'left';
    if (g.letterSpacing !== undefined) g.letterSpacing = '4px';
    g.fillStyle = '#ffffff'; g.font = `800 34px ${T.FONT}`; g.fillText('GROUP CHAT', 30, 20);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    g.fillStyle = '#e4dcff'; g.font = `700 28px ${T.FONT}`; g.fillText(title, 30, 66);
    g.fillStyle = '#5dff9d'; g.font = `800 20px ${T.FONT}`; g.textAlign = 'right'; g.fillText('● LIVE', w - 28, 28); g.textAlign = 'left';
    const COL = { radar: '#a98bff', chotan: '#ff9d5c' };
    const wrap = (text, maxW, maxLines) => {
      const out = []; let cur = '';
      for (const ch of text) { if (g.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; if (out.length === maxLines) break; } else cur += ch; }
      if (out.length < maxLines && cur) out.push(cur);
      else if (out.length === maxLines) out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + '…';
      return out;
    };
    let y = 124; const items = this.chatLines.slice(-4);
    if (!items.length) { g.fillStyle = '#6b7285'; g.font = `600 24px ${T.FONT}`; g.fillText('아직 발견 없음 · 조용히 스캔 중', 30, y + 10); }
    items.forEach((m, i) => {
      const fresh = i === items.length - 1 && this.chatFlash > 0;
      const bg = m.kind === 'find' ? 'rgba(123,77,255,.16)' : m.kind === 'paper' ? 'rgba(54,210,122,.14)' : m.kind === 'pass' ? 'rgba(255,90,110,.12)' : 'rgba(255,255,255,.06)';
      g.font = `600 27px ${T.FONT}`;
      const body = wrap(m.text, w - 72, 2);
      const bh = 50 + body.length * 34;
      g.fillStyle = bg; g.beginPath(); g.roundRect(20, y, w - 40, bh, 14); g.fill();
      if (fresh) { g.strokeStyle = '#ffd23a'; g.lineWidth = 3; g.stroke(); }
      g.fillStyle = COL[m.from] || '#9cc0ff'; g.font = `800 26px ${T.FONT}`; g.fillText(m.name, 34, y + 10);
      const tm = new Date(m.t); g.fillStyle = '#6b7285'; g.font = `600 18px ${T.FONT}`; g.textAlign = 'right';
      g.fillText(`${String(tm.getHours()).padStart(2, '0')}:${String(tm.getMinutes()).padStart(2, '0')}`, w - 36, y + 12); g.textAlign = 'left';
      g.fillStyle = '#e8ecf3'; g.font = `600 27px ${T.FONT}`;
      body.forEach((ln, k) => g.fillText(ln, 34, y + 44 + k * 34));
      y += bh + 8;
    });
    this.chatTex.needsUpdate = true;
  }
  // glowing data packet flying from one bot to another, with a burst where it lands
  sendPacket(fromId, toId) {
    const a = this.bots.get(fromId), b = this.bots.get(toId); if (!a || !b) return;
    const core = new THREE.Mesh(new THREE.SphereGeometry(.3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(.75, 20, 14), new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    core.add(halo);
    const light = new THREE.PointLight(0xb48cff, 8, 6, 1.5); core.add(light);
    this.scene.add(core);
    const trail = [];
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.22 - i * .022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: .55 - i * .07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.scene.add(m); trail.push(m); }
    this.packets.push({ core, halo, light, trail, hist: [], a, b, t: 0, dur: 2.2 });
    this.chatFlash = 6;
  }
  stepPackets(dt, t) {
    for (const k of [...this.packets]) {
      if (k.ring) {
        k.t += dt; const f = k.t / .9;
        k.ring.scale.setScalar(1 + f * 2.6); k.ring.material.opacity = Math.max(0, .9 * (1 - f));
        if (f >= 1) { this.scene.remove(k.ring); this.packets.splice(this.packets.indexOf(k), 1); }
        continue;
      }
      k.t += dt; const f = Math.min(1, k.t / k.dur), e = f * f * (3 - 2 * f);
      const p0 = k.a.root.position.clone().setY(1.7), p1 = k.b.root.position.clone().setY(1.4);
      const p = p0.lerp(p1, e); p.y += Math.sin(Math.PI * e) * 3.6;
      k.core.position.copy(p); k.halo.scale.setScalar(1 + Math.sin(t * 18) * .15);
      k.hist.unshift(p.clone()); k.hist.length = Math.min(k.hist.length, 14);
      k.trail.forEach((m, i) => { const q = k.hist[Math.min(k.hist.length - 1, i * 2)]; if (q) m.position.copy(q); });
      if (f >= 1) {
        this.scene.remove(k.core); k.trail.forEach((m) => this.scene.remove(m));
        const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .75, 48), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.copy(k.b.root.position).setY(.08); this.scene.add(ring);
        this.packets.splice(this.packets.indexOf(k), 1, { ring, t: 0 });
      }
    }
    if (this.teamMode) {
      if (this.chatFlash > 0) { this.chatFlash -= dt; this.chatLight.intensity = 3 + Math.sin(t * 10) * 2; if (this.chatFlash <= 0) this.drawChat(this.chatLines); }
      else this.chatLight.intensity = .8;
    } else this.chatLight.intensity = 0;
  }
  setCork(cols) { T.drawCork(this.corkTex.userData.ctx, 640, 400, cols); this.corkTex.needsUpdate = true; }
  setUser(u) { const g = this.userTex.userData.ctx; g.fillStyle = '#1c1f27'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#8e96a8'; g.font = `700 70px ${T.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(u, 512, 64); this.userTex.needsUpdate = true; }

  // ------------------------------------------------------------------ day / night
  setMode(mode) {
    this.mode = mode; const n = mode === 'night';
    this.hemi.intensity = n ? .32 : 1.1; this.hemi.color.setHex(n ? 0x8fa6ff : 0xe6eeff);
    this.sun.intensity = n ? .55 : 2.4; this.sun.color.setHex(n ? 0x8aa4ff : 0xfff3e2);
    this.fill.intensity = n ? .25 : .5;
    this.scene.environmentIntensity = n ? .18 : .55;
    this.lampLight.intensity = n ? 26 : 2; this.counterLight.intensity = n ? 10 : 0; this.serverLight.intensity = n ? 16 : 5;
    this.windowMat.emissiveIntensity = n ? .25 : .7;
    for (const e of this.night) e.m.emissiveIntensity = n ? e.night : e.day;
  }

  // ------------------------------------------------------------------ camera + input
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h); this.aspect = w / h; this.updateCamera();
  }
  updateCamera() {
    const v = this.view / this.zoom / 2;
    Object.assign(this.camera, { left: -v * this.aspect, right: v * this.aspect, top: v, bottom: -v });
    this.camera.position.copy(this.target).addScaledVector(this.dir, 80);
    this.camera.lookAt(this.target); this.camera.updateProjectionMatrix();
  }
  zoomBy(f) { this.zoomTo = THREE.MathUtils.clamp(this.zoomTo * f, .55, 3); }
  focus(id) {
    const o = this.bots.get(id); if (!o) return;
    this.follow = id; this.zoomTo = Math.max(this.zoomTo, 1.55);
  }
  unfocus() { this.follow = null; this.zoomTo = 1; this.targetTo.set(2.2, 0, 2.2); }
  openAirlock() { this.doorOpenTo = 1; clearTimeout(this.doorT); this.doorT = setTimeout(() => (this.doorOpenTo = 0), 4200); }
  screenOf(v) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, vis: p.z < 1 }; }
  pick(e) {
    this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object.userData : null;
  }
  bindInput() {
    const c = this.renderer.domElement; let drag = null;
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false, t: this.targetTo.clone() }; });
    addEventListener('pointerup', (e) => {
      if (drag && !drag.moved && e.target === c) {
        const u = this.pick(e);
        if (u?.kind === 'bot') this.cb.onPick(u.id);
        else if (u?.kind === 'desk') { const b = this.deskOwner[u.desk]; b ? this.cb.onPick(b.id) : this.cb.onDeskClick(u.desk); }
        else if (u?.kind === 'airlock') this.cb.onAirlockClick();
      }
      drag = null;
    });
    c.addEventListener('pointermove', (e) => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        if (drag.moved) {
          this.follow = null;
          const k = this.view / this.zoom / innerHeight;
          const right = new THREE.Vector3(1, 0, -1).normalize(), fwd = new THREE.Vector3(-1, 0, -1).normalize();
          this.targetTo.copy(drag.t).addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k * 1.35);
        }
        return;
      }
      const u = this.pick(e);
      c.style.cursor = u && u.kind !== 'server' ? 'pointer' : 'default';
      this.hoverId = u?.kind === 'bot' ? u.id : u?.kind === 'desk' && this.deskOwner[u.desk] ? this.deskOwner[u.desk].id : null;
      this.cb.onHover(u, e);
    });
    c.addEventListener('pointerleave', () => { this.hoverId = null; this.cb.onHover(null); });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  }

  // ------------------------------------------------------------------ frame loop
  tick() {
    const dt = Math.min(this.clock.getDelta(), .15), t = this.clock.elapsedTime;
    // bots
    for (const o of this.bots.values()) {
      const p = o.root.position;
      if (o.path.length) {
        const tgt = o.path[0]; const d = tgt.clone().sub(p); const dist = d.length();
        const sp = 3.6 * dt;
        if (dist <= sp) { p.copy(tgt); o.path.shift(); if (!o.path.length) o.arriving = false; }
        else { p.addScaledVector(d.normalize(), sp); }
        o.body.rotation.z = THREE.MathUtils.lerp(o.body.rotation.z, -d.x * .04, .1);
        o.body.rotation.x = THREE.MathUtils.lerp(o.body.rotation.x, d.z * .04, .1);
      } else { o.body.rotation.z *= .9; o.body.rotation.x *= .9; }
      o.body.position.y = .18 + Math.sin(t * 2.2 + o.phase) * .08;
      const s = o.data.status;
      o.ring.material.opacity = s === 'idle' ? .45 : .75 + Math.sin(t * 3 + o.phase) * .2;
      const pulse = (Math.sin(t * 5) + 1) / 2;
      o.alarm.material.opacity = o.needs ? .2 + pulse * .35 : 0;
      o.alarmRing.material.opacity = o.needs ? .6 + pulse * .4 : 0;
      o.alarmRing.scale.setScalar(o.needs ? 1 + pulse * .12 : 1);
      if (s === 'stuck') o.body.rotation.y = Math.sin(t * 8) * .06; else o.body.rotation.y *= .9;
    }
    this.stepPackets(dt, t);
    for (const d of Object.values(this.deskPads)) if (d.free) { d.pad.material.opacity = .55 + Math.sin(t * 2.4) * .35; }
    this.serverRings.forEach((m, i) => (m.emissiveIntensity = (this.mode === 'night' ? 3.5 : 2) + Math.sin(t * 2 + i * .8) * 1.2));
    (this.flames || []).forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 20 + i) * .12));
    this.sats.forEach((s, i) => (s.rotation.y += dt * .02 * (i ? -1 : 1)));
    // airlock doors
    this.doorOpen = THREE.MathUtils.lerp(this.doorOpen, this.doorOpenTo, .08);
    this.doors.forEach((d) => (d.position.x = d.userData.closedX + d.userData.side * this.doorOpen * (AIRLOCK.w / 2 - .1)));
    // camera
    if (this.follow && this.bots.get(this.follow)) {
      const p = this.bots.get(this.follow).root.position;
      // keep the followed bot left of the side panels
      const shift = new THREE.Vector3(1, 0, -1).normalize().multiplyScalar(this.view / this.zoom * this.aspect * .17);
      this.targetTo.copy(p).add(shift);
    }
    this.target.lerp(this.targetTo, .08);
    this.zoom = THREE.MathUtils.lerp(this.zoom, this.zoomTo, .08);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    this.onFrame && this.onFrame(t);
  }
}
export { STATUS_COLOR };
