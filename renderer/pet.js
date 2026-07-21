// ============================================================
//  Pixel Dragon Desktop Pet
//  States: IDLE / FLYING / FIRE / EVOLVING
//  Everything is drawn procedurally as pixel blocks on a grid,
//  so no external art is needed. Swap FORMS palettes / buildCells
//  shapes later, or replace with real sprite sheets.
// ============================================================

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const GW = 40; // grid width  (in pixel-units) — 大网格给翅膀留出张开空间
const GH = 32; // grid height
const OFFX = 6; // 身体在大网格里的偏移(四周留白给翅膀)
const OFFY = 4;
let U = 8;     // size of one pixel-unit, computed on resize

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  U = Math.max(1, Math.floor(Math.min(canvas.width / GW, canvas.height / GH)));
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ---- Dragon forms ----
// accent = 斑纹颜色;pattern = 'spots' | 'stripes' | 'blotch'(变色龙斑纹),留空则纯色。
const FORMS = [
  { name: 'Forest', body: '#5aa02c', dark: '#3c7018', belly: '#b6e05a', horn: '#f2c518', outline: '#14210a', wing: '#7bc23a', accent: '#2f5810' },
  { name: 'Ember',  body: '#d64524', dark: '#8f2413', belly: '#ffb347', horn: '#ffe36b', outline: '#2a0d06', wing: '#f27038', accent: '#ffd23f' },
  { name: 'Frost',  body: '#4aa6d6', dark: '#276a94', belly: '#d6f2ff', horn: '#bfefff', outline: '#0a1c26', wing: '#7fd0f2', accent: '#eafaff' },
  { name: 'Shadow', body: '#7a4bd0', dark: '#472a80', belly: '#c9a6ff', horn: '#e0c2ff', outline: '#160a26', wing: '#a06ff0', accent: '#3a2170' },
  { name: 'Gold',   body: '#e0b021', dark: '#9c7410', belly: '#fff0a6', horn: '#fff7d6', outline: '#2a1f04', wing: '#f2cf4a', accent: '#fff7d6' },
  { name: 'Toxic',  body: '#8fd614', dark: '#5c8f0a', belly: '#e6ff8f', horn: '#c6ff5a', outline: '#1a2604', wing: '#b6f23a', accent: '#5c8f0a' },
  { name: 'Coral',  body: '#f0688e', dark: '#b23a63', belly: '#ffd0dd', horn: '#ffe36b', outline: '#2a0a14', wing: '#ff9ab4', accent: '#fff0f4' },
  { name: 'Ocean',  body: '#1fb6a6', dark: '#0e7168', belly: '#b6fff2', horn: '#ffe36b', outline: '#052220', wing: '#4fe0cf', accent: '#eafffb' },
  { name: 'Dusk',   body: '#e0743a', dark: '#9c4818', belly: '#ffc9a0', horn: '#ffe0b0', outline: '#2a1206', wing: '#f2965a', accent: '#7a2f8f' },
  { name: 'Mint',   body: '#4fd0a0', dark: '#2a8f6a', belly: '#d6ffe8', horn: '#fff7d6', outline: '#082018', wing: '#7fe6c0', accent: '#2a8f6a' },
  // —— 带斑纹的形态(变色龙风,进化时偶尔出现)——
  { name: 'Magma',     body: '#c2371b', dark: '#7a1f0e', belly: '#ffbe4a', horn: '#ffd23f', outline: '#260803', wing: '#e0562a', accent: '#ffd23f', pattern: 'spots' },
  { name: 'Chameleon', body: '#57b24a', dark: '#357a2c', belly: '#d8f5a0', horn: '#ffd23f', outline: '#10240c', wing: '#79d06a', accent: '#2aa6c0', pattern: 'blotch' },
  { name: 'Tiger',     body: '#e08a1f', dark: '#9c5a10', belly: '#ffe0a6', horn: '#fff7d6', outline: '#241503', wing: '#f2a83a', accent: '#3a1f04', pattern: 'stripes' },
  { name: 'Cosmic',    body: '#5340a0', dark: '#2f2470', belly: '#b6a6ff', horn: '#e0c2ff', outline: '#0e0826', wing: '#7a63d0', accent: '#d0c2ff', pattern: 'spots' },
  { name: 'Jade',      body: '#3aa88f', dark: '#1f6a58', belly: '#c6f5e6', horn: '#ffe36b', outline: '#06221c', wing: '#5fc7ad', accent: '#d6a53a', pattern: 'blotch' },
];
const FIRE = ['#fff7d6', '#ffd23f', '#ff8c1a', '#ff3b1a'];

let formIndex = 0;

// —— 颜色工具 + 壁纸融入(层 1+2:读壁纸色板,把龙染成壁纸的颜色)——
function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mixHex(a, b, f) { const A = hexRgb(a), B = hexRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f); }
function darkenHex(h, f) { const A = hexRgb(h); return rgbToHex(A[0] * (1 - f), A[1] * (1 - f), A[2] * (1 - f)); }
function lightenHex(h, f) { const A = hexRgb(h); return rgbToHex(A[0] + (255 - A[0]) * f, A[1] + (255 - A[1]) * f, A[2] + (255 - A[2]) * f); }

let wallForm = null; // 由壁纸色板构造的"融入形态"
function buildWallForm(pal) {
  if (!pal || !pal.length) return null;
  const base = pal[0], c2 = pal[1] || pal[0], c3 = pal[2] || c2;
  return {
    body: base, dark: darkenHex(base, 0.45), belly: lightenHex(base, 0.5),
    horn: lightenHex(c3, 0.3), outline: darkenHex(base, 0.7), wing: c2, accent: lightenHex(c2, 0.3),
  };
}
function blendForms(a, b, f) {
  const keys = ['body', 'dark', 'belly', 'horn', 'outline', 'wing', 'accent'];
  const out = {};
  for (const k of keys) out[k] = mixHex(a[k] || '#888888', b[k] || a[k] || '#888888', f);
  return out;
}
let blend = 0;                 // 0=本色,1=完全融入采到的颜色
let explorePhase = 'goto';     // goto → in → linger → out
let exploreTarget = null;
let absorbPhase = 'in';        // 变色龙:in(吸色)→ hold(保持20s)→ out(飞走褪色)
let absorbMode = false;        // 拖拽吸色模式:只有开启后拖动才吸色
let activity = 'nap';          // 随机自主活动:nap(午睡)/ read(看书)/ workout(健身)
let activityDur = 8000;
let currentApp = null;         // 当前前台软件标签(尾巴上显示对应图标)

// —— 持久"灵魂"存档(跨重启保留)——
let soul = {
  formIndex: 0,
  coins: 3,             // 宝藏堆大小
  plantedAt: Date.now(), // 种花时间(按真实时间生长)
  collected: [],        // 冒险带回的纪念品(后续用)
  affection: 0,         // 亲密度
  lastSeen: Date.now(),
};
let lastCoin = 0;       // 上次攒到金币的时间

// —— 性格向量:每次进化微妙漂移,让每个版本的龙飞法/脾气都略不同 ——
let personality = {
  speed: 1,      // 飞行速度
  restless: 1,   // 好动程度(越高越少停歇)
  bold: 0.5,     // 胆量(越高越爱靠近你、离得越近)
  flap: 1,       // 扇翅频率
  fiery: 1,      // 喷火频率
  wobble: 0.5,   // 飞行/浮动的起伏幅度
  edgy: 0.6,     // 贴边程度(越高越爱沿屏幕边缘飞)
};

function driftPersonality() {
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const d = () => (Math.random() - 0.5) * 0.18; // 每次微调 ±0.09 左右
  personality.speed = cl(personality.speed + d(), 0.7, 1.4);
  personality.restless = cl(personality.restless + d(), 0.5, 1.5);
  personality.bold = cl(personality.bold + d(), 0.1, 1.0);
  personality.flap = cl(personality.flap + d(), 0.8, 1.3);
  personality.fiery = cl(personality.fiery + d(), 0.4, 1.6);
  personality.wobble = cl(personality.wobble + d(), 0.0, 1.0);
  personality.edgy = cl(personality.edgy + d(), 0.2, 1.0);
  soul.personality = personality;
}

// ---- Build the dragon as a map of grid cells -> color key ----
// Faces RIGHT. o = { wingPhase(-1..1), mouthOpen(bool) }
function buildCells(o) {
  const fill = new Map();
  const set = (x, y, k) => {
    x = Math.round(x) + OFFX; y = Math.round(y) + OFFY; // 身体整体偏移到大网格中心
    if (x < 0 || y < 0 || x >= GW || y >= GH) return;
    fill.set(x + ',' + y, k);
  };
  const rect = (x, y, w, h, k) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, k);
  };
  const del = (x, y) => fill.delete((x + OFFX) + ',' + (y + OFFY)); // 按同样偏移删角
  const tri = (ax, ay, bx, by, cx, cy, k) => {
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    const edge = (x1, y1, x2, y2, px, py) => (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = edge(ax, ay, bx, by, px, py);
      const d2 = edge(bx, by, cx, cy, px, py);
      const d3 = edge(cx, cy, ax, ay, px, py);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) set(x, y, k);
    }
  };

  // (翅膀已移到独立的 buildWings 图层,见下方)

  // --- Tail (left side, curling up to a leaf) ---
  rect(5, 14, 3, 4, 'body');
  rect(3, 11, 3, 3, 'body');
  rect(2, 8, 3, 3, 'body');
  rect(1, 4, 6, 5, 'body'); // leaf blob
  del(1, 4); del(6, 4); del(1, 8); del(6, 8);

  // --- Body ---
  rect(8, 13, 13, 7, 'body');
  rect(12, 15, 7, 4, 'belly');

  // --- Legs + feet ---
  rect(10, 19, 3, 4, 'body');
  rect(16, 19, 3, 4, 'body');
  rect(10, 22, 3, 1, 'dark');
  rect(16, 22, 3, 1, 'dark');
  if (o.landed) {
    // 四足着陆:多画一对后腿(偏外、深色),像小狗四条腿站在地上
    rect(7, 20, 2, 3, 'dark');
    rect(19, 20, 2, 3, 'dark');
    rect(7, 22, 2, 1, 'body');
    rect(19, 22, 2, 1, 'body');
  }

  // --- Head ---
  rect(11, 4, 13, 10, 'body');
  del(11, 4); del(23, 4); del(11, 13); del(23, 13);

  // --- Snout (right) ---
  rect(23, 8, 4, 5, 'body');
  del(26, 8); del(26, 12);

  // --- Horns + crown spike ---
  rect(14, 1, 2, 4, 'horn');
  rect(20, 1, 2, 4, 'horn');
  rect(17, 2, 1, 3, 'horn');

  // --- Brow + eyes ---
  rect(15, 6, 3, 1, 'dark');
  rect(20, 6, 3, 1, 'dark');
  if (o.sleeping) {
    // 睡觉:闭眼(一条横线)
    rect(16, 8, 2, 1, 'eye');
    rect(21, 8, 2, 1, 'eye');
  } else {
    // 睁眼 + 高光(眼神朝光标方向)
    rect(16, 7, 2, 2, 'eye');
    rect(21, 7, 2, 2, 'eye');
    const lx = o.look ? o.look.x : 0, ly = o.look ? o.look.y : 0;
    const gx = lx > 0.25 ? 1 : 0;
    const gy = ly > 0.25 ? 1 : 0;
    set(16 + gx, 7 + gy, 'shine');
    set(21 + gx, 7 + gy, 'shine');
  }

  // --- Mouth ---
  if (o.mouthOpen) rect(24, 11, 3, 2, 'eye');
  else rect(24, 11, 2, 1, 'dark');

  return fill;
}

// Big bat-wings as their own layer (drawn behind the body). Flaps with wingPhase.
function buildWings(o) {
  const fill = new Map();
  const set = (x, y, k) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return;
    fill.set(x + ',' + y, k);
  };
  const tri = (ax, ay, bx, by, cx, cy, k) => {
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    const edge = (x1, y1, x2, y2, px, py) => (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = edge(ax, ay, bx, by, px, py);
      const d2 = edge(bx, by, cx, cy, px, py);
      const d3 = edge(cx, cy, ax, ay, px, py);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, k);
    }
  };
  const line = (x0, y0, x1, y1, k) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      set(x0, y0, k);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  };

  // 大网格坐标(40×32)。肩部在 ~x16 / x24, y17。翅膀向两侧上方大幅张开。
  const up = (o.wingPhase + 1) / 2;   // 0(下扇) .. 1(上扬)
  const tipY = 9 - up * 7;            // 翼尖上扬时更高(y 更小)
  const g = o.wingGrow == null ? 1 : o.wingGrow; // 翅膀张开程度:休息时收拢(<1),飞行时长大(>1)

  // 以翼根为中心,按 g 缩放整只翅膀的展开幅度
  function wing(rx, ry, tx, ty, lx, ly, ix, iy) {
    const P = (x, y) => [rx + (x - rx) * g, ry + (y - ry) * g];
    const T = P(tx, ty), L = P(lx, ly), I = P(ix, iy);
    const M = P((tx + lx) / 2, (ty + ly) / 2); // 中间指骨
    tri(rx, ry, T[0], T[1], L[0], L[1], 'wing');
    tri(rx, ry, L[0], L[1], I[0], I[1], 'wing');
    line(rx, ry, T[0], T[1], 'wingbone'); // 前缘骨
    line(rx, ry, M[0], M[1], 'wingbone'); // 指骨
    line(rx, ry, L[0], L[1], 'wingbone'); // 后缘骨
    line(rx, ry, I[0], I[1], 'wingbone');
    line(T[0], T[1], L[0], L[1], 'wingbone'); // 翼尖边
  }
  wing(16, 17, 1, tipY, 2, tipY + 9, 11, 20);   // 左翼
  wing(24, 17, 38, tipY, 37, tipY + 9, 29, 20); // 右翼

  return fill;
}

function colorFor(k, form) {
  switch (k) {
    case 'body': return form.body;
    case 'dark': return form.dark;
    case 'belly': return form.belly;
    case 'horn': return form.horn;
    case 'wing': return form.wing;
    case 'wingbone': return form.dark;
    case 'eye': return form.outline;
    case 'shine': return '#ffffff';
    default: return form.body;
  }
}

const OUTLINE_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// 变色龙式斑纹:根据格子坐标决定该格是否上斑纹色(确定性,静态不闪)
function patternHit(x, y, type) {
  if (type === 'spots') return (x * 5 + y * 3) % 7 === 0 && (x + y) % 2 === 0;
  if (type === 'stripes') return (x + y * 2) % 5 < 2;
  if (type === 'blotch') return (x * 3 + y * 7) % 9 < 2;
  return false;
}

// Draw one pixel layer (silhouette outline + fill) at grid origin ox,oy.
// pattern = {type, accent} 时,在身体/肚皮格子上叠加斑纹色。
function drawLayer(fill, form, ox, oy, pattern) {
  const outline = new Set();
  for (const key of fill.keys()) {
    const c = key.split(',');
    const x = +c[0], y = +c[1];
    for (const d of OUTLINE_DIRS) {
      const nk = (x + d[0]) + ',' + (y + d[1]);
      if (!fill.has(nk)) outline.add(nk);
    }
  }
  ctx.fillStyle = form.outline;
  for (const key of outline) {
    const c = key.split(',');
    const x = +c[0], y = +c[1];
    if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
    ctx.fillRect(ox + x * U, oy + y * U, U, U);
  }
  for (const [key, k] of fill) {
    const c = key.split(',');
    const x = +c[0], y = +c[1];
    let color = colorFor(k, form);
    if (pattern && (k === 'body' || k === 'belly') && patternHit(x, y, pattern.type)) color = pattern.accent;
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * U, oy + y * U, U, U);
  }
}

function drawDragon(form, o, flip) {
  const wings = buildWings(o);
  const body = buildCells(o);

  const ox = Math.floor((canvas.width - GW * U) / 2);
  const oy = Math.floor((canvas.height - GH * U) / 2);
  const pat = form.pattern ? { type: form.pattern, accent: form.accent } : null;

  ctx.save();
  if (flip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }

  drawLayer(wings, form, ox, oy, null); // wings behind
  drawLayer(body, form, ox, oy, pat);   // body in front (带斑纹)

  // fire breath (from snout, extends right in local space)
  if (o.fire > 0) {
    const len = Math.round(o.fire * 9);
    const bx = 27 + OFFX, by = 11 + OFFY;
    for (let d = 0; d < len; d++) {
      const spread = Math.floor(d / 2);
      for (let s = -spread; s <= spread; s++) {
        if (Math.random() < 0.18) continue; // flicker
        const t = d / Math.max(1, len);
        const ci = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.8 ? 2 : 3;
        ctx.fillStyle = FIRE[ci];
        ctx.fillRect(ox + (bx + d) * U, oy + (by + s) * U, U, U);
      }
    }
  }

  ctx.restore();
}

// ============================================================
//  State machine + behaviour
// ============================================================
// 状态:ROAM(随机缓慢漫游=默认) / IDLE(短暂悬停) / FLYLAP(绕屏一圈) /
//       CHASE(飞向光标) / LANDED(四足着陆停住) / FIRE / EVOLVING
let state = 'ROAM';
let tState = 0;
let facingLeft = false;
let ready = false;          // init 完成前不移动窗口
let idlePause = 1500;       // 悬停时长
let roamTarget = null;      // 漫游目标点
let fireReturn = 'ROAM';    // 喷火结束后回到的状态
let evolveReturn = 'ROAM';  // 进化结束后回到的状态

let pos = { x: 0, y: 0 };
let screenSz = { w: 1920, h: 1080 };

let pendingForm = null;
let lastEvolve = performance.now();
const EVOLVE_MS = 5 * 60 * 1000; // ~5 minutes

let cursor = { dx: 0, dy: 0, dist: 99999, ax: 0, ay: 0, idle: 0, active: false };
let cursorSpeed = 0;   // 光标移动速度(平滑),用来判断"打字 vs 用鼠标浏览"
let wingGrow = 0.85;   // 翅膀张开度(平滑过渡:着陆收拢、飞行展开)
let lapPoints = null, lapI = 0, lapOrigin = null; // 绕屏一圈的路径点
let hearts = []; // 爱心粒子(伴侣来访等温馨时刻)

// 伴侣模式:这个窗口是"来访的朋友龙",只负责悬停展示,由主进程驱动位置
const COMPANION = typeof location !== 'undefined' && new URLSearchParams(location.search).has('companion');
const COMPANION_FORM = {
  name: 'Rosa', body: '#f28ab0', dark: '#c25a82', belly: '#ffe0ec',
  horn: '#fff2a0', outline: '#3a1020', wing: '#ffb0cc', accent: '#fff0f6',
};

function spawnHeart(cx) {
  hearts.push({
    x: (cx == null ? canvas.width / 2 : cx) + (Math.random() * 2 - 1) * U * 3,
    y: canvas.height * 0.34,
    vy: -(0.4 + Math.random() * 0.5),
    life: 1,
  });
  if (hearts.length > 24) hearts.shift();
}

function spawnSweat() {
  hearts.push({
    x: canvas.width / 2 + (Math.random() * 2 - 1) * U * 3,
    y: canvas.height * 0.36,
    vy: -(0.8 + Math.random() * 0.6),
    vx: (Math.random() * 2 - 1) * 1.4,
    life: 1, kind: 'sweat',
  });
  if (hearts.length > 30) hearts.shift();
}

// 随机自主活动(不受你控制):午睡/看书/健身/打工/看电视/上厕所
function startActivity() {
  const acts = ['nap', 'read', 'workout', 'work', 'movie', 'toilet'];
  activity = acts[Math.floor(Math.random() * acts.length)];
  state = 'ACTIVITY';
  tState = performance.now();
  const dur = { nap: 30000, read: 28000, workout: 18000, work: 34000, movie: 38000, toilet: 25000 };
  activityDur = (dur[activity] || 24000) + Math.random() * 8000;
  if (activity === 'movie') facingLeft = true;                        // 面向电视(左)
  else if (activity === 'work' || activity === 'toilet' || activity === 'read') facingLeft = false;
}

// —— 感知到的"用户状态"(本地启发式,无需联网)——
let perceived = 'ACTIVE';   // ACTIVE(在用) / FOCUS(工作,落地) / AWAY(离开)
let workMs = 0, activeMs = 0, lastTick = performance.now();
let greetReady = false;     // 你静了一会儿后,准备好迎接下一次"回来"打招呼
let datePhase = 'meet';     // 约会子阶段:meet / gift / hug / cuddle
let landReason = 'manual';  // 'manual'(你双击的) / 'focus'(它因你专注自动降落)
let focusTarget = null;     // 专注时飞去停靠的角落

const hasNative = typeof window.pet !== 'undefined';

function saveSoul() {
  if (!hasNative || !window.pet.saveSoul) return;
  soul.formIndex = formIndex;
  soul.personality = personality;
  soul.lastSeen = Date.now();
  window.pet.saveSoul(soul);
}

async function init() {
  if (COMPANION) return; // 伴侣窗口不需要自主逻辑,只渲染
  if (hasNative) {
    screenSz = await window.pet.screenSize();
    const p = await window.pet.getPos();
    pos = { x: p[0], y: p[1] };
    // 读取灵魂存档
    if (window.pet.loadSoul) {
      const s = await window.pet.loadSoul();
      if (s) {
        soul = Object.assign(soul, s);
        formIndex = soul.formIndex % FORMS.length || 0;
        if (soul.personality) personality = Object.assign(personality, soul.personality);
      }
    }
    setInterval(saveSoul, 15000); // 定期存档
    // 壁纸色板:初次读取 + 换壁纸时更新
    if (window.pet.wallpaperPalette) {
      const wp = await window.pet.wallpaperPalette();
      if (wp) wallForm = buildWallForm(wp.palette);
      window.pet.onWallpaper((d) => { if (d) wallForm = buildWallForm(d.palette); });
    }
    if (window.pet.onAppTag) window.pet.onAppTag((tag) => { currentApp = tag; });
    window.pet.onCmd(handleCmd);
    window.pet.onCursor((c) => {
      if (cursor.active) {
        const inst = Math.hypot(c.ax - cursor.ax, c.ay - cursor.ay);
        cursorSpeed = cursorSpeed * 0.8 + inst * 0.2; // 平滑
      }
      cursor.dx = c.dx; cursor.dy = c.dy; cursor.dist = Math.hypot(c.dx, c.dy);
      cursor.ax = c.ax; cursor.ay = c.ay; cursor.idle = c.idle;
      cursor.active = true;
    });
    ready = true;
  }
}
init();

function handleCmd(c) {
  if (c === 'fire') startFire();
  else if (c === 'evolve') startEvolve();
  else if (c === 'fly') startFlyLap();
  else if (c === 'land') toggleLand();
  else if (c === 'friend-here') { state = 'DATE'; datePhase = 'meet'; facingLeft = true; tState = performance.now(); }
  else if (c === 'date-gift') datePhase = 'gift';
  else if (c === 'date-hug') datePhase = 'hug';
  else if (c === 'date-cuddle') datePhase = 'cuddle';
  else if (c === 'date-dance') datePhase = 'dance';   // 他跳求偶舞
  else if (c === 'date-watch') datePhase = 'watch';   // 他看 Rosa 回应
  else if (c === 'friend-gone') { if (state === 'DATE') { state = 'ROAM'; roamTarget = null; } }
  else if (c === 'absorb-on') absorbMode = true;
  else if (c === 'absorb-off') absorbMode = false;
  else if (c === 'dnd') toggleSleep();
  else if (c === 'talk-on') { state = 'TALK'; facingLeft = false; tState = performance.now(); }
  else if (c === 'talk-off') { if (state === 'TALK') { state = 'ROAM'; roamTarget = null; } }
}

// 隐形勿扰模式:卧倒睡觉,完全不受鼠标影响,也没有 Zzz。再切一次醒来。
function toggleSleep() {
  if (state === 'SLEEP') { state = 'ROAM'; roamTarget = null; }
  else { state = 'SLEEP'; lapPoints = null; blend = 0; tState = performance.now(); }
}

// 变色龙:被拖到某处后,吸取该处屏幕的颜色 → 保持 20s → 慢慢飞走褪回本色
function startAbsorb() {
  if (!hasNative || !wallForm) return;
  absorbPhase = 'in';
  state = 'ABSORB';
  tState = performance.now();
}

// 走进壁纸:飞到桌面某处 → 颜色渐渐融入壁纸 → 停留 → 褪回本色 → 回漫游
function startExplore() {
  if (!hasNative || state === 'EVOLVING' || state === 'DATE' || state === 'EXPLORE') return;
  const m = 100;
  exploreTarget = {
    x: m + Math.random() * Math.max(1, screenSz.w - canvas.width - 2 * m),
    y: m + Math.random() * Math.max(1, screenSz.h - canvas.height - 2 * m),
  };
  explorePhase = 'goto';
  state = 'EXPLORE';
  tState = performance.now();
}

// 漫游目标:偏向屏幕外圈(避开中央工作区),并避开光标附近(你正在操作的地方)
function pickRoam() {
  const m = 60;
  const W = screenSz.w, H = screenSz.h, cw = canvas.width, ch = canvas.height;
  const keepR = Math.min(W, H) * 0.22;               // 光标周围的"禁飞"半径
  const band = 0.30 - personality.edgy * 0.16;       // 越"贴边"外圈带越窄(越靠边缘飞)
  let best = null;
  for (let i = 0; i < 14; i++) {
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = m + Math.random() * (W - cw - 2 * m); y = m + Math.random() * H * band; }
    else if (edge === 1) { x = m + Math.random() * (W - cw - 2 * m); y = H - ch - m - Math.random() * H * band; }
    else if (edge === 2) { x = m + Math.random() * W * band; y = m + Math.random() * (H - ch - 2 * m); }
    else { x = W - cw - m - Math.random() * W * band; y = m + Math.random() * (H - ch - 2 * m); }
    x = Math.max(m, Math.min(W - cw - m, x));
    y = Math.max(m, Math.min(H - ch - m, y));
    const petCx = x + cw / 2, petCy = y + ch / 2;
    const clear = !cursor.active || Math.hypot(petCx - cursor.ax, petCy - cursor.ay) > keepR;
    if (clear) { best = { x, y }; break; }
    if (!best) best = { x, y };
  }
  roamTarget = best;
}

// 专注时:飞到最近的屏幕角落停靠,彻底让开工作区
function startFocusPark() {
  const m = 40;
  const W = screenSz.w, H = screenSz.h, cw = canvas.width, ch = canvas.height;
  const left = pos.x + cw / 2 < W / 2, top = pos.y + ch / 2 < H / 2;
  focusTarget = { x: left ? m : W - cw - m, y: top ? m : H - ch - m };
  state = 'FOCUSFLY';
}

// 根据"感知到的用户状态"驱动桌宠(不打断你手动的操作)
function applyPerceived() {
  if (dragging) return;
  if (state === 'FLYLAP' || state === 'CHASE' || state === 'FIRE' || state === 'EVOLVING' || state === 'DATE' || state === 'ABSORB' || state === 'SLEEP' || state === 'TALK') return;
  if (state === 'LANDED' && landReason === 'manual') return; // 你手动让它停的,不自动起飞

  if (perceived === 'FOCUS') {
    if (state !== 'LANDED' && state !== 'FOCUSFLY') startFocusPark();
  } else { // ACTIVE / AWAY:若之前是因专注而降落,现在起飞回到漫游
    if (state === 'LANDED' && landReason === 'focus') { state = 'ROAM'; roamTarget = null; }
    else if (state === 'FOCUSFLY') { state = 'ROAM'; roamTarget = null; focusTarget = null; }
  }
}

// 飞一圈:绕屏幕椭圆飞一整圈 → 回到原点 → 继续漫游
function startFlyLap() {
  if (state === 'EVOLVING' || state === 'FLYLAP' || !hasNative) return;
  lapOrigin = { x: pos.x, y: pos.y };
  const cx = screenSz.w / 2, cy = screenSz.h / 2;
  const rx = Math.max(140, screenSz.w / 2 - 160);
  const ry = Math.max(110, screenSz.h / 2 - 130);
  const petCx = pos.x + canvas.width / 2, petCy = pos.y + canvas.height / 2;
  const a0 = Math.atan2(petCy - cy, petCx - cx); // 从当前角度开始绕
  const N = 30;
  lapPoints = [];
  for (let i = 1; i <= N; i++) {
    const a = a0 + (i / N) * Math.PI * 2;
    lapPoints.push({
      x: cx + Math.cos(a) * rx - canvas.width / 2,
      y: cy + Math.sin(a) * ry - canvas.height / 2,
    });
  }
  lapPoints.push({ x: lapOrigin.x, y: lapOrigin.y }); // 回到原点
  lapI = 0;
  state = 'FLYLAP';
  tState = performance.now();
}

// 飞向光标("过来找你")
function startChase() {
  if ((state !== 'ROAM' && state !== 'IDLE') || !hasNative || !cursor.active) return;
  state = 'CHASE';
  tState = performance.now();
}

// 双击切换:着陆停住 ↔ 起飞漫游(手动)
function toggleLand() {
  if (state === 'LANDED') { state = 'ROAM'; roamTarget = null; }
  else if (state !== 'EVOLVING') { state = 'LANDED'; landReason = 'manual'; lapPoints = null; tState = performance.now(); }
}

function startFire() {
  if (state === 'EVOLVING' || state === 'FLYLAP') return;
  fireReturn = state === 'LANDED' ? 'LANDED' : 'ROAM';
  state = 'FIRE';
  tState = performance.now();
}

function startEvolve() {
  evolveReturn = state === 'LANDED' ? 'LANDED' : 'ROAM';
  state = 'EVOLVING';
  tState = performance.now();
  pendingForm = (formIndex + 1 + Math.floor(Math.random() * (FORMS.length - 1))) % FORMS.length;
}

// ---- main loop ----
let dragging = false;

function loop(now) {
  if (COMPANION) { renderCompanion(now); requestAnimationFrame(loop); return; }

  const t = now / 1000;
  const dt = Math.min(100, now - lastTick); lastTick = now;

  // —— 感知用户状态 ——
  // 工作信号:有输入但鼠标基本没动 = 打字/点击/滚动 → 及时落地
  const working = cursor.active && cursor.idle < 3 && cursorSpeed < 1.0;
  const moving = cursorSpeed > 3;
  if (working) workMs += dt; else workMs = Math.max(0, workMs - dt * 2);
  if (moving) activeMs += dt; else activeMs = Math.max(0, activeMs - dt * 3); // 连续动才累积
  let np = perceived;
  if (cursor.active && cursor.idle > 45) np = 'AWAY';
  else if (perceived === 'FOCUS') {
    if (activeMs > 7000) np = 'ACTIVE';          // 只有连续动鼠标 >7s 才重新起飞
  } else {
    if (workMs > 450) { np = 'FOCUS'; activeMs = 0; } // 打字/点击/滚动 → 及时落地
    else if (activeMs > 300) np = 'ACTIVE';
  }
  perceived = np;
  applyPerceived();

  // 问候式追随:你静一会儿后第一次动鼠标 → 飞过来打个招呼一次,之后自己玩
  if (cursorSpeed < 0.5 && cursor.idle > 4) greetReady = true;
  if (greetReady && cursorSpeed > 4 && (state === 'ROAM' || state === 'IDLE') && perceived !== 'FOCUS') {
    greetReady = false; startChase();
  }

  const flying = state === 'ROAM' || state === 'FLYLAP' || state === 'CHASE' || state === 'FOCUSFLY' || state === 'EXPLORE' || state === 'ABSORB';
  const inActivity = state === 'ACTIVITY';
  const napping = state === 'SLEEP' || (inActivity && activity === 'nap');
  const sleeping = napping;                                                // 闭眼睡姿
  const grounded = state === 'LANDED' || state === 'SLEEP' || inActivity;  // 落地姿态

  const P = personality;
  const flapSpeed = (flying ? 8 : grounded ? 0 : 5) * P.flap;
  const flapAmp = flying ? 1 : grounded ? 0.12 : 0.4;
  const wingPhase = Math.sin(t * flapSpeed) * flapAmp;
  const bob = (inActivity && activity === 'workout') ? Math.sin(t * 7) * (U * 0.45) // 健身:快速起伏(俯卧撑)
    : napping ? Math.sin(t * 1.2) * (U * 0.08)                                      // 睡觉:轻微呼吸
      : grounded ? 0
        : Math.sin(t * 2) * (U * 0.35) * (0.6 + P.wobble * 0.8);

  // 攒宝藏:着陆时慢慢攒金币(它的"工作",跨重启保留)
  if (grounded && now - lastCoin > 12000 && soul.coins < 42) {
    soul.coins++; lastCoin = now; saveSoul();
  }

  // 自动行为:仅在漫游/短暂悬停时(着陆专注模式完全安静)。频率随性格微调。
  // 追随只在"问候"时触发(见上),这里不再随机追鼠标。
  if (!dragging && (state === 'ROAM' || state === 'IDLE')) {
    if (now - lastEvolve > EVOLVE_MS) startEvolve();
    else if (absorbMode && perceived === 'AWAY' && wallForm && Math.random() < 0.0016) startExplore(); // 仅吸色模式开启时,离开会自己去"走进壁纸"
    else if (Math.random() < 0.0011) startActivity();        // 随机开始午睡/看书/健身
    else if (Math.random() < 0.0006 * P.fiery) startFire();
  }

  // 活动做一会儿就结束,继续溜达
  if (state === 'ACTIVITY') {
    if (activity === 'workout' && Math.random() < 0.08) spawnSweat();
    if (now - tState > activityDur) { state = 'ROAM'; roamTarget = null; }
  }

  let fireVal = 0;

  // 专注:飞去角落停靠
  if (state === 'FOCUSFLY' && hasNative && focusTarget) {
    const dx = focusTarget.x - pos.x, dy = focusTarget.y - pos.y, dist = Math.hypot(dx, dy);
    facingLeft = dx < -0.5;
    if (dist < 5) { state = 'LANDED'; landReason = 'focus'; tState = now; }
    else {
      const sp = Math.max(0.8, Math.min(2.6, dist * 0.06));
      pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
      window.pet.moveTo(pos.x, pos.y);
    }
  }

  // 默认:随机缓慢漫游
  if (state === 'ROAM' && hasNative && ready) {
    if (!roamTarget) pickRoam();
    const dx = roamTarget.x - pos.x, dy = roamTarget.y - pos.y, dist = Math.hypot(dx, dy);
    facingLeft = dx < -0.5;
    if (dist < 4) {
      roamTarget = null;
      // 越好动越少停歇
      if (Math.random() < 0.6 - P.restless * 0.28) { state = 'IDLE'; tState = now; idlePause = 800 + Math.random() * 2600; }
      else pickRoam();
    } else {
      const sp = Math.max(0.4, Math.min(1.3, dist * 0.02)) * P.speed; // 缓慢 + 随性格快慢
      pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
      window.pet.moveTo(pos.x, pos.y);
    }
  }

  // 短暂悬停后继续漫游(悬停时会朝你看)
  if (state === 'IDLE') {
    if (cursor.active) {
      if (cursor.dx < -canvas.width * 0.4) facingLeft = true;
      else if (cursor.dx > canvas.width * 0.1) facingLeft = false;
    }
    if (now - tState > idlePause) state = 'ROAM';
  }

  // 伴侣来访:朝朋友(左侧)悬停;不同子阶段冒不同强度的爱心
  if (state === 'DATE') {
    facingLeft = true;
    const rate = datePhase === 'hug' ? 0.14 : datePhase === 'dance' ? 0.09 : datePhase === 'cuddle' ? 0.05 : datePhase === 'gift' ? 0.03 : 0.02;
    if (Math.random() < rate) spawnHeart(canvas.width * 0.4);
  }

  // 走进壁纸:飞到目标 → 融入壁纸色 → 停留 → 褪回 → 回漫游
  if (state === 'EXPLORE' && hasNative) {
    if (explorePhase === 'goto') {
      if (exploreTarget) {
        const dx = exploreTarget.x - pos.x, dy = exploreTarget.y - pos.y, dist = Math.hypot(dx, dy);
        facingLeft = dx < -0.5;
        if (dist < 5) { explorePhase = 'in'; tState = now; }
        else {
          const sp = Math.max(0.5, Math.min(2, dist * 0.03)) * P.speed;
          pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
          window.pet.moveTo(pos.x, pos.y);
        }
      } else explorePhase = 'in';
    } else if (explorePhase === 'in') {
      blend = Math.min(1, blend + dt / 1300);
      if (blend >= 1) { explorePhase = 'linger'; tState = now; }
    } else if (explorePhase === 'linger') {
      if (now - tState > 4500) explorePhase = 'out';
    } else {
      blend = Math.max(0, blend - dt / 1300);
      if (blend <= 0) { state = 'ROAM'; roamTarget = null; }
    }
  }
  // 变色龙:吸色 → 保持 20s → 慢慢飞走并褪回本色
  if (state === 'ABSORB' && hasNative) {
    if (absorbPhase === 'in') {
      blend = Math.min(1, blend + dt / 900);
      if (blend >= 1) { absorbPhase = 'hold'; tState = now; }
    } else if (absorbPhase === 'hold') {
      if (now - tState > 20000) { absorbPhase = 'out'; roamTarget = null; } // 保持 20 秒
    } else { // out:飞向别处 + 褪色
      if (!roamTarget) pickRoam();
      const dx = roamTarget.x - pos.x, dy = roamTarget.y - pos.y, dist = Math.hypot(dx, dy);
      facingLeft = dx < -0.5;
      if (dist > 4) {
        const sp = Math.max(0.4, Math.min(1.1, dist * 0.02)) * P.speed;
        pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
        window.pet.moveTo(pos.x, pos.y);
      }
      blend = Math.max(0, blend - dt / 1600);
      if (blend <= 0) { state = 'ROAM'; roamTarget = null; }
    }
  }

  // 其它状态下,颜色平滑褪回本色
  if (state !== 'EXPLORE' && state !== 'ABSORB' && blend > 0) blend = Math.max(0, blend - dt / 800);

  // 绕屏一圈,结束回到漫游
  if (state === 'FLYLAP' && hasNative && lapPoints) {
    const tp = lapPoints[lapI];
    const dx = tp.x - pos.x, dy = tp.y - pos.y, dist = Math.hypot(dx, dy);
    facingLeft = dx < -0.5;
    if (dist < 6) {
      lapI++;
      if (lapI >= lapPoints.length) { state = 'ROAM'; lapPoints = null; roamTarget = null; }
    } else {
      const sp = Math.max(1.5, Math.min(3.4, dist * 0.09)) * P.speed;
      pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
      window.pet.moveTo(pos.x, pos.y);
    }
  } else if (state === 'FLYLAP' && !hasNative) {
    if (now - tState > 4000) state = 'ROAM';
  }

  // 飞向光标,结束回到漫游
  if (state === 'CHASE') {
    if (!hasNative || now - tState > 4500) { state = 'ROAM'; roamTarget = null; }
    else {
      const dx = cursor.dx, dy = cursor.dy, dist = cursor.dist;
      facingLeft = dx < -0.5;
      if (dist > 95 - P.bold * 55) { // 越大胆停得离你越近
        const sp = Math.max(0.5, Math.min(1.8, dist * 0.04)) * P.speed;
        pos.x += (dx / dist) * sp; pos.y += (dy / dist) * sp;
        window.pet.moveTo(pos.x, pos.y);
      }
    }
  }

  if (state === 'FIRE') {
    const el = now - tState;
    const ramp = Math.min(1, el / 200);
    const tail = el < 800 ? 1 : Math.max(0, 1 - (el - 800) / 300);
    fireVal = ramp * tail;
    if (el > 1100) state = fireReturn;
  }

  if (state === 'EVOLVING') {
    const el = now - tState;
    if (el > 1600) {
      formIndex = pendingForm; state = evolveReturn; lastEvolve = now;
      if (state === 'ROAM') roamTarget = null;
      driftPersonality(); // 每次进化,性格/飞法微妙改变
      saveSoul();
    }
  }

  // 着陆时仍会朝你看/转身(但睡觉/勿扰时完全不受鼠标影响)
  if (state === 'LANDED' && cursor.active) {
    if (cursor.dx < -canvas.width * 0.4) facingLeft = true;
    else if (cursor.dx > canvas.width * 0.1) facingLeft = false;
  }

  // 翅膀张开度:着陆收拢、飞行长大
  let growTarget = 0.85;
  if (grounded) growTarget = 0.2;
  else if (flying) growTarget = 1.12;
  else if (state === 'DATE' && datePhase === 'dance') growTarget = 1.15; // 求偶舞张开翅膀
  else if (state === 'EVOLVING') growTarget = 1.0;
  wingGrow += (growTarget - wingGrow) * 0.12;

  // 眼神朝向光标(转到本地坐标系,翻转时取反)
  let look = { x: 0, y: 0 };
  if (cursor.active) {
    const m = Math.max(1, cursor.dist);
    look = { x: (facingLeft ? -cursor.dx : cursor.dx) / m, y: cursor.dy / m };
  }
  if (inActivity && (activity === 'read' || activity === 'work' || activity === 'toilet')) look = { x: 0, y: 1 }; // 低头看东西

  // ---- render ----
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const baseForm = FORMS[formIndex];
  // 探索时把本色龙的颜色按 blend 融向壁纸色板
  const form = (blend > 0.001 && wallForm) ? blendForms(baseForm, wallForm, blend) : baseForm;
  const o = {
    wingPhase: wingPhase,
    wingGrow: wingGrow,
    look: look,
    landed: grounded,
    sleeping: sleeping,
    mouthOpen: state === 'FIRE' && fireVal > 0.25,
    fire: fireVal,
  };

  const oy0 = Math.floor((canvas.height - GH * U) / 2);
  const ox0 = Math.floor((canvas.width - GW * U) / 2);
  // 着陆时画一片地面阴影,增强"落地"感
  if (grounded) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, oy0 + (OFFY + 24) * U, GW * U * 0.20, U * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // 着陆时展示它的"爱好":宝藏堆 + 小花(都在脚下方,画在龙身后)
    drawHoard(ox0, oy0, soul.coins);
    drawFlower(ox0, oy0, soul.plantedAt);
  }

  // 身后/身下的道具(先画,龙压在上面)
  if (inActivity && activity === 'toilet') drawToilet(ox0, oy0); // 坐在马桶上
  if (inActivity && activity === 'movie') drawTV(ox0, oy0, t);   // 电视在左边
  // 约会送花:举起一束(它种的)花,递向左边的 Rosa
  if (state === 'DATE' && (datePhase === 'gift' || datePhase === 'meet')) drawBouquet(ox0, oy0);

  // 求偶舞:一上一下地欢快跳动(仙鹤点头)
  const danceHop = (state === 'DATE' && datePhase === 'dance') ? -Math.abs(Math.sin(t * 5)) * (U * 1.3) : 0;
  ctx.save();
  ctx.translate(0, bob + danceHop + (flying ? Math.sin(t * 7) * (U * 0.25) : 0));
  drawDragon(form, o, facingLeft);
  ctx.restore();

  // 身前的道具(后画,盖在龙身上,像捧着/敲着)
  if (inActivity) {
    if (activity === 'read') drawBook(ox0, oy0, t);          // 捧着书
    else if (activity === 'work') drawLaptop(ox0, oy0, t);   // 敲小电脑
    else if (activity === 'workout') drawBarbell(ox0, oy0);  // 举杠铃
    else if (activity === 'toilet') drawNewspaper(ox0, oy0); // 举着报纸
  }

  // 尾巴上显示"你正在用的软件"图标
  if (currentApp && state !== 'EVOLVING' && state !== 'SLEEP') drawTailIcon(ox0, oy0, currentApp, facingLeft);

  // evolve flash — only over the dragon's pixels
  if (state === 'EVOLVING') {
    const el = now - tState;
    const pulse = Math.abs(Math.sin(el / 100));
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + pulse * 0.6) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 打盹冒 "z":午睡活动时,或你离开它自己趴着打盹时(勿扰睡觉模式不冒 z)
  if ((inActivity && activity === 'nap') || (perceived === 'AWAY' && state === 'LANDED')) {
    const zc = form.outline;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i * 0.33) % 1;
      const zx = canvas.width * 0.62 + i * U * 1.2;
      const zy = oy0 + (OFFY + 2) * U - p * U * 4;
      const s = Math.max(1, U * (0.5 + i * 0.18));
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.fillStyle = zc;
      // 画一个像素 "z"
      ctx.fillRect(zx, zy, s * 2, s * 0.5);
      ctx.fillRect(zx + s * 0.75, zy + s * 0.5, s * 0.5, s * 0.5);
      ctx.fillRect(zx, zy + s, s * 2, s * 0.5);
    }
    ctx.globalAlpha = 1;
  }

  drawHearts(t);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 粒子:爱心上浮 / 汗滴飞溅
function drawHearts() {
  if (!hearts.length) return;
  for (const h of hearts) { h.y += h.vy; h.x += (h.vx || 0); h.life -= 0.012; }
  hearts = hearts.filter((h) => h.life > 0);
  for (const h of hearts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, h.life));
    if (h.kind === 'sweat') drawDrop(h.x, h.y, Math.max(1, U * 0.4));
    else drawHeart(h.x, h.y, Math.max(1, U * 0.45));
  }
  ctx.globalAlpha = 1;
}

function drawHeart(cx, cy, s) {
  ctx.fillStyle = '#ff5d8f';
  const px = [[-1, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (const p of px) ctx.fillRect(Math.round(cx + p[0] * s), Math.round(cy + p[1] * s), Math.ceil(s), Math.ceil(s));
}

function drawDrop(cx, cy, s) {
  ctx.fillStyle = '#6bc8ff';
  ctx.fillRect(Math.round(cx), Math.round(cy), Math.ceil(s), Math.ceil(s * 1.4));
  ctx.fillRect(Math.round(cx - s * 0.5), Math.round(cy + s * 0.5), Math.ceil(s * 2), Math.ceil(s * 0.9));
}

// 道具通用画格助手
function gcell(ox0, oy0, gx, gy, w, h, c) { ctx.fillStyle = c; ctx.fillRect(ox0 + gx * U, oy0 + gy * U, w * U, h * U); }

// 📖 看书:捧着一本摊开的书(举在身前,较大好认)
function drawBook(ox0, oy0, t) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(12, 18, 16, 10, '#7a4a1e');           // 书的外框(棕色封面)
  g(13, 19, 7, 8, '#f7f0dd'); g(20, 19, 7, 8, '#f7f0dd'); // 两页
  g(19, 18, 2, 10, '#5a3410');            // 书脊
  for (let i = 0; i < 3; i++) { g(14, 21 + i * 2, 5, 1, '#b8a583'); g(21, 21 + i * 2, 5, 1, '#b8a583'); } // 文字行
  if (Math.sin(t * 1.4) > 0.5) g(20, 18, 4, 9, '#efe6cd'); // 偶尔翻页
}

// 💻 打工:敲一台小电脑(屏幕 + 键盘,亮屏有文字)
function drawLaptop(ox0, oy0, t) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(14, 21, 12, 8, '#3a3f47');            // 屏幕外壳
  g(15, 22, 10, 6, '#2aa0e0');            // 亮屏
  g(16, 23, 7, 1, '#dff6ff'); g(16, 25, 5, 1, '#dff6ff'); g(16, 27, 6, 1, '#dff6ff'); // 屏幕文字
  if (Math.sin(t * 6) > 0) g(22, 26, 2, 1, '#fff');        // 光标闪烁
  g(12, 29, 16, 2, '#aab0b8');            // 键盘底座
  g(12, 28, 16, 1, '#cfd5dd');            // 底座顶边
  for (let i = 0; i < 6; i++) g(14 + i * 2, 29, 1, 1, '#555'); // 按键
}

// 📺 看电视:老式带天线的电视,屏幕放彩色动画(在左边)
function drawTV(ox0, oy0, t) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(5, 15, 1, 4, '#555'); g(3, 14, 2, 1, '#555');   // 左天线
  g(9, 15, 1, 4, '#555'); g(10, 14, 2, 1, '#555');  // 右天线
  g(1, 18, 13, 13, '#7a5230');            // 木质机身
  g(1, 18, 13, 1, '#9a6a40');             // 顶部高光
  g(2, 19, 9, 9, '#181c22');              // 屏幕黑边
  const cols = ['#ff5d5d', '#ffd23f', '#4ad0f0', '#7bd23a', '#f07be0', '#ff9a3a'];
  const c1 = cols[Math.floor(t * 3) % cols.length];
  const c2 = cols[Math.floor(t * 3 + 2) % cols.length];
  g(3, 20, 7, 7, c1);                     // 彩色画面
  g(4, 21, 3, 3, c2); g(7, 24, 2, 2, '#fff'); // 卡通形状
  g(11, 20, 2, 2, '#3a2a18'); g(11, 24, 2, 2, '#3a2a18'); // 旋钮
  g(2, 31, 2, 1, '#3a2a18'); g(11, 31, 2, 1, '#3a2a18');  // 脚
}

// 🏋️ 健身:举一副杠铃
function drawBarbell(ox0, oy0) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(13, 14, 14, 2, '#666');               // 杠
  g(12, 12, 2, 6, '#2a2a2a'); g(26, 12, 2, 6, '#2a2a2a'); // 两端配重(内)
  g(11, 13, 1, 4, '#444'); g(28, 13, 1, 4, '#444');       // 配重(外)
}

// 🚽 上厕所:白马桶(坐在上面)
function drawToilet(ox0, oy0) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(8, 16, 5, 9, '#e8eef2');  g(8, 16, 5, 1, '#c2ccd4');   // 水箱(后)
  g(13, 23, 12, 3, '#eef3f6');            // 座圈
  g(15, 26, 8, 4, '#e2e8ee');            // 碗身
  g(14, 30, 10, 1, '#c2ccd4');           // 底座
}

// 📰 上厕所读报纸:举一张摊开的大报纸(盖住身前)
function drawNewspaper(ox0, oy0) {
  const g = (gx, gy, w, h, c) => gcell(ox0, oy0, gx, gy, w, h, c);
  g(13, 11, 16, 11, '#ece9df');          // 报纸
  g(13, 11, 16, 1, '#c9c6bc'); g(13, 21, 16, 1, '#c9c6bc'); // 上下边
  g(15, 12, 8, 2, '#1a1a1a');            // 大标题
  for (let i = 0; i < 3; i++) { g(15, 15 + i * 2, 5, 1, '#666'); g(23, 15 + i * 2, 5, 1, '#666'); } // 文字栏
  g(20, 11, 1, 11, '#cfccc2');           // 中缝折线
}

// 尾巴上的软件图标(小徽章:品牌色 + 简单白色符号)
const APP_ICON = {
  google: { special: 'google' },
  linkedin: { bg: '#0a66c2', g: 'in' },
  claude: { bg: '#d97757', g: 'star' },
  chatgpt: { bg: '#10a37f', g: 'ring' },
  youtube: { bg: '#ff2b2b', g: 'play' },
  vscode: { bg: '#2172b8', g: 'lt' },
  photoshop: { bg: '#0a2540', g: 'ps' },
  blender: { bg: '#e87d0d', g: 'ring' },
  figma: { bg: '#a259ff', g: 'dots' },
  github: { bg: '#2b2f36', g: 'dot' },
  word: { bg: '#2b579a', g: 'w' },
  spotify: { bg: '#1db954', g: 'ring' },
  discord: { bg: '#5865f2', g: 'dot' },
  browser: { bg: '#4a90d0', g: 'globe' },
};
function drawTailIcon(ox0, oy0, tag, flip) {
  const spec = APP_ICON[tag];
  if (!spec) return;
  const gx = flip ? 28 : 7, gy = 6; // 尾巴叶子附近(翻转时在另一侧)
  const x = ox0 + gx * U, y = oy0 + gy * U;
  const p = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a * U), Math.round(y + b * U), Math.ceil(w * U), Math.ceil(h * U)); };
  p(-0.4, -0.4, 5.8, 5.8, '#14210a'); // 描边
  const W = '#ffffff';
  // 多彩 Google G(白底四色环 + 蓝横杠)
  if (spec.special === 'google') {
    const B = '#4285f4', R = '#ea4335', Y = '#fbbc05', G = '#34a853';
    p(0, 0, 5, 5, W);
    p(1, 0, 3, 1, B);      // 上蓝
    p(0, 1, 1, 3, R);      // 左红
    p(1, 4, 3, 1, Y);      // 下黄
    p(4, 2, 1, 2, G);      // 右下绿
    p(4, 1, 1, 1, B);      // 右上蓝
    p(2.5, 2, 1.5, 1, B);  // 横杠
    return;
  }
  p(0, 0, 5, 5, spec.bg);             // 徽章底(品牌色)
  switch (spec.g) {
    case 'in': // 领英:白色 in
      p(0.7, 0.7, 1.1, 1.1, W); p(0.7, 2.2, 1.1, 2.1, W);                        // i
      p(2.4, 2.2, 1, 2.1, W); p(3.6, 2.2, 1, 2.1, W); p(2.4, 2.2, 2.2, 0.9, W);   // n
      break;
    case 'doc': p(1, 0.5, 3, 4, W); p(1.5, 1.3, 2, 0.5, spec.bg); p(1.5, 2.2, 2, 0.5, spec.bg); p(1.5, 3.1, 1.4, 0.5, spec.bg); break;
    case 'star': p(2, 0, 1, 5, W); p(0, 2, 5, 1, W); p(1, 1, 1, 1, W); p(3, 1, 1, 1, W); p(1, 3, 1, 1, W); p(3, 3, 1, 1, W); break;
    case 'play': p(1.6, 1, 0.7, 3, W); p(2.3, 1.6, 0.7, 1.8, W); p(3, 2.2, 0.7, 0.6, W); break;
    case 'lt': p(1.4, 1, 0.8, 0.8, W); p(0.7, 2, 0.8, 0.9, W); p(1.4, 3.2, 0.8, 0.8, W); p(2.8, 1, 0.8, 0.8, W); p(3.5, 2, 0.8, 0.9, W); p(2.8, 3.2, 0.8, 0.8, W); break;
    case 'globe': p(1, 1, 3, 3, W); p(2, 0.5, 1, 4, spec.bg); p(0.5, 2, 4, 1, spec.bg); break;
    case 'ring': p(1, 1, 3, 3, W); p(2, 2, 1, 1, spec.bg); break;
    case 'dots': p(1, 1, 1.4, 1.4, '#f24e1e'); p(2.7, 1, 1.4, 1.4, '#0acf83'); p(1, 2.7, 1.4, 1.4, '#1abcfe'); p(2.7, 2.7, 1.4, 1.4, '#ff7262'); break;
    case 'ps': p(1.2, 1, 1, 3, '#31a8ff'); p(2.2, 1, 1.4, 1.4, '#31a8ff'); break;
    case 'w': p(1, 1, 0.7, 3, W); p(2.15, 1, 0.7, 3, W); p(3.3, 1, 0.7, 3, W); break;
    default: p(1.4, 1.4, 2.2, 2.2, W);
  }
}

// —— 伴侣龙(来访朋友)的渲染:粉色龙 + 头顶小花,悬停朝右(朝主人的龙)——
function renderCompanion(now) {
  const t = now / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const wingPhase = Math.sin(t * 6);
  const bob = Math.sin(t * 2.2) * (U * 0.35);
  const o = { wingPhase, wingGrow: 1.0, look: { x: 0.4, y: 0 }, mouthOpen: false, fire: 0 };
  ctx.save();
  ctx.translate(0, bob);
  drawDragon(COMPANION_FORM, o, false); // 朝右
  ctx.restore();
  drawHeadFlower();
  if (Math.random() < 0.03) spawnHeart(canvas.width * 0.6);
  drawHearts();
}

// 约会送的花束(举在左侧,递向 Rosa)
function drawBouquet(ox0, oy0) {
  const g = (gx, gy, c) => { ctx.fillStyle = c; ctx.fillRect(ox0 + gx * U, oy0 + gy * U, U, U); };
  g(5, 18, '#3c7018'); g(5, 17, '#3c7018'); g(6, 17, '#3c7018'); // 茎
  g(4, 15, '#ff7fb0'); g(5, 15, '#ffd23f'); g(6, 15, '#ff5d8f'); // 花
  g(4, 14, '#ff9ab4'); g(5, 14, '#ff7fb0'); g(6, 14, '#ffb0cc');
}

// 伴侣头顶的小花(区分"她")
function drawHeadFlower() {
  const ox0 = Math.floor((canvas.width - GW * U) / 2);
  const oy0 = Math.floor((canvas.height - GH * U) / 2);
  const g = (gx, gy, c) => { ctx.fillStyle = c; ctx.fillRect(ox0 + gx * U, oy0 + gy * U, U, U); };
  const fx = 23, fy = 3; // 头顶两角之间
  g(fx - 1, fy, '#ff7fb0'); g(fx + 1, fy, '#ff7fb0'); g(fx, fy - 1, '#ff7fb0'); g(fx, fy + 1, '#ff7fb0');
  g(fx, fy, '#ffd23f'); // 花心
}

// 爱好①:宝藏堆(金币越多堆越高,画在龙脚下)
function drawHoard(ox0, oy0, coins) {
  const gold = '#f2c518', hi = '#fff2a0', ol = '#7a5a08';
  const g = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox0 + gx * U, oy0 + gy * U, w * U, h * U); };
  const rows = Math.max(1, Math.min(4, Math.round(coins / 6)));
  const cxg = 16; // 堆中心(偏左)
  for (let r = 0; r < rows; r++) {
    const w = (rows - r) * 3 + 2;
    const gx = cxg - Math.floor(w / 2);
    const gy = 30 - r;
    g(gx - 1, gy, w + 2, 1, ol);   // 深色底边
    g(gx, gy, w, 1, gold);         // 金币
    g(gx + 1, gy, 1, 1, hi);       // 高光
    if (w > 4) g(gx + w - 2, gy, 1, 1, hi);
  }
}

// 爱好②:小花(按真实时间生长,画在龙的右下方)
function drawFlower(ox0, oy0, plantedAt) {
  const g = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox0 + gx * U, oy0 + gy * U, w * U, h * U); };
  const hours = (Date.now() - plantedAt) / 3600000;
  const stage = Math.max(0, Math.min(4, Math.floor(hours / 5))); // 每 5 小时长一级,~1 天开花
  const bx = 33;
  g(bx, 30, 4, 2, '#8a5a2a');       // 花盆
  g(bx, 29, 4, 1, '#a06a34');
  if (stage >= 1) g(bx + 1, 27, 1, 2, '#3c7018');                 // 嫩芽
  if (stage >= 2) { g(bx + 2, 27, 1, 2, '#3c7018'); g(bx + 1, 26, 2, 1, '#5aa02c'); } // 叶
  if (stage >= 3) g(bx + 1, 25, 2, 1, '#f0688e');                 // 花苞
  if (stage >= 4) {                                               // 盛开
    g(bx, 24, 4, 2, '#f0688e');
    g(bx + 1, 23, 2, 1, '#ff9ab4');
    g(bx + 1, 25, 2, 1, '#ffd23f');
  }
}

// ============================================================
//  Mouse: drag to move, click to breathe fire, right-click menu
// ============================================================
let down = null;
let moved = false;

canvas.addEventListener('mousedown', async (e) => {
  if (COMPANION || e.button !== 0) return;
  if (e.shiftKey) { if (window.pet && window.pet.toggleBubble) window.pet.toggleBubble(); return; } // Shift+点 = 快捷漫画气泡
  moved = false;
  if (hasNative) { const p = await window.pet.getPos(); pos = { x: p[0], y: p[1] }; }
  down = { mx: e.screenX, my: e.screenY, px: pos.x, py: pos.y };
});

window.addEventListener('mousemove', (e) => {
  if (!down) return;
  const dx = e.screenX - down.mx, dy = e.screenY - down.my;
  if (Math.abs(dx) + Math.abs(dy) > 3) {
    moved = true;
    dragging = true;
    lapPoints = null;
    // 拖动时暂停漫游;但着陆/睡觉/聊天状态拖到新位置后仍保持原姿态
    if (state !== 'LANDED' && state !== 'SLEEP' && state !== 'TALK') { state = 'IDLE'; tState = performance.now(); idlePause = 1500; }
    pos.x = down.px + dx;
    pos.y = down.py + dy;
    if (hasNative) window.pet.moveTo(pos.x, pos.y);
  }
});

// 双击 = 着陆停住 / 再次双击 = 起飞
canvas.addEventListener('dblclick', () => { if (!COMPANION) toggleLand(); });

window.addEventListener('mouseup', async () => {
  if (COMPANION) return;
  const wasClick = down && !moved;
  const wasDrag = down && moved;
  down = null;
  dragging = false;
  if (state === 'SLEEP') return; // 勿扰模式:不喷火、不吸色,只能被挪位置
  if (wasClick) { startFire(); return; } // 单击 = 喷火
  if (wasDrag && absorbMode && hasNative && window.pet.sampleHere) {
    // 仅"拖拽吸色模式"开启时:拖到哪就吸取那块屏幕(壁纸/工作窗口)的颜色
    const pal = await window.pet.sampleHere();
    if (pal && pal.palette && pal.palette.length) { wallForm = buildWallForm(pal.palette); startAbsorb(); }
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (COMPANION) return;
  if (hasNative) window.pet.contextMenu();
  else startEvolve(); // preview: right-click evolves
});
