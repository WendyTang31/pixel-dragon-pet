const { app, BrowserWindow, ipcMain, Menu, screen, powerMonitor, nativeImage, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

// —— 读当前桌面壁纸,提取主色板(全本地,无需联网/依赖)——
function getWallpaperPath() {
  // Windows 幻灯片/轮换也可靠:Roaming\Microsoft\Windows\Themes\TranscodedWallpaper(JPEG)
  const t = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper');
  try { if (fs.existsSync(t)) return t; } catch (e) { /* ignore */ }
  return null;
}

function rgbHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function paletteFromBitmap(buf) {
  const counts = new Map();
  let br = 0, tot = 0;
  for (let i = 0; i + 3 < buf.length; i += 4) {
    const b = buf[i], g = buf[i + 1], r = buf[i + 2]; // Windows 上 toBitmap 是 BGRA
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5); // 每通道 3 bit 量化
    const e = counts.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n++;
    counts.set(key, e);
    br += r + g + b; tot += 3;
  }
  const arr = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  const palette = arr.map((e) => rgbHex(e.r / e.n, e.g / e.n, e.b / e.n));
  return { palette, brightness: tot ? (br / tot) / 255 : 0.5 };
}

function paletteFromImage(img) {
  try {
    if (!img || img.isEmpty()) return null;
    const s = img.resize({ width: 32 });
    return paletteFromBitmap(s.toBitmap());
  } catch (e) { return null; }
}

function wallpaperPalette() {
  const p = getWallpaperPath();
  if (!p) return null;
  return paletteFromImage(nativeImage.createFromPath(p));
}

// 采样桌宠脚下那块屏幕(壁纸 or 你的工作窗口都行)的颜色
async function sampleUnderPet() {
  if (!win || win.isDestroyed()) return null;
  const b = win.getBounds();
  const disp = screen.getDisplayNearestPoint({ x: b.x + Math.round(b.width / 2), y: b.y + Math.round(b.height / 2) });
  const scale = Math.min(1, 1280 / Math.max(disp.size.width, disp.size.height));
  const tw = Math.round(disp.size.width * scale), th = Math.round(disp.size.height * scale);
  win.setOpacity(0); // 采样瞬间隐身,避免采到龙自己的颜色
  let pal = null;
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: tw, height: th } });
    const src = sources.find((s) => String(s.display_id) === String(disp.id)) || sources[0];
    if (src && src.thumbnail && !src.thumbnail.isEmpty()) {
      const rx = Math.round((b.x - disp.bounds.x) * scale), ry = Math.round((b.y - disp.bounds.y) * scale);
      const cx = Math.max(0, Math.min(tw - 4, rx)), cy = Math.max(0, Math.min(th - 4, ry));
      const rw = Math.min(Math.max(4, Math.round(b.width * scale)), tw - cx);
      const rh = Math.min(Math.max(4, Math.round(b.height * scale)), th - cy);
      pal = paletteFromImage(src.thumbnail.crop({ x: cx, y: cy, width: rw, height: rh }));
    }
  } catch (e) { pal = null; }
  if (win && !win.isDestroyed()) win.setOpacity(1);
  return pal;
}

// ---- 桌宠大小(只改这一个数字)-------------------------------
// SIZE 是窗口宽度,单位 DIP(≈1/96 英寸)。
//   ~40  ≈ 1 cm(很小,像素细节会比较糊)
//   ~64  ≈ 1.6 cm(小巧且清晰,推荐)
//   ~120 ≈ 3 cm,  260 ≈ 原来的大小
const SIZE = 150;
const PET_W = SIZE;
const PET_H = Math.round(SIZE * 0.9);

let win;
let cursorTimer = null;
let appTimer = null;
let lockingSize = false; // 防止 resize 守卫自我触发死循环

// 读前台窗口用(装了 active-win;万一加载失败就降级不显示图标)
let getActiveWindow = null;
try { getActiveWindow = require('active-win'); } catch (e) { getActiveWindow = null; }

// 根据前台窗口标题/进程,判断在用什么软件 → 返回一个图标标签
function detectApp(w) {
  if (!w) return null;
  const title = ((w.title) || '').toLowerCase();
  const owner = ((w.owner && w.owner.name) || '').toLowerCase();
  // Google 全家桶 → 多彩 Google G
  if (title.includes('gmail') || title.includes('google docs') || title.includes('google 文档')
    || title.includes('google sheets') || title.includes('google 表格')
    || title.includes('google slides') || title.includes('google 幻灯片')
    || title.includes('google drive') || title.includes('docs.google') || title.includes('云端硬盘')) return 'google';
  if (title.includes('linkedin') || title.includes('领英')) return 'linkedin';
  if (title.includes('claude')) return 'claude';
  if (title.includes('chatgpt') || title.includes('openai')) return 'chatgpt';
  if (title.includes('youtube')) return 'youtube';
  if (owner.includes('figma') || title.includes('figma')) return 'figma';
  if (title.includes('github')) return 'github';
  if (owner.includes('code') || title.includes('visual studio code')) return 'vscode';
  if (owner.includes('photoshop')) return 'photoshop';
  if (owner.includes('blender')) return 'blender';
  if (owner.includes('illustrator')) return 'illustrator';
  if (owner.includes('winword') || owner.includes('microsoft word')) return 'word';
  if (owner.includes('spotify') || title.includes('spotify')) return 'spotify';
  if (owner.includes('discord')) return 'discord';
  if (owner.includes('chrome') || owner.includes('edge') || owner.includes('firefox') || owner.includes('brave') || owner.includes('opera')) return 'browser';
  return null;
}

// 把窗口尺寸强制锁回 PET_W × PET_H(位置保持不变)
function lockSize() {
  if (!win || lockingSize) return;
  const [x, y] = win.getPosition();
  lockingSize = true;
  win.setBounds({ x, y, width: PET_W, height: PET_H });
  lockingSize = false;
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    x: width - PET_W - 40,
    y: height - PET_H - 40,
    // 尺寸硬锁:最大 = 最小 = 目标尺寸,窗口绝不可能变大
    minWidth: PET_W,
    maxWidth: PET_W,
    minHeight: PET_H,
    maxHeight: PET_H,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 兜底:一旦系统因 DPI 取整把窗口撑大,立刻锁回去
  win.on('resize', lockSize);
  win.on('move', lockSize);

  // Keep it above full-screen apps too.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 追踪全局鼠标:发送"从桌宠中心指向光标"的向量(即使光标在窗口外也有效)
  cursorTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const idle = powerMonitor.getSystemIdleTime(); // 距上次键鼠输入的秒数(判断有没有在打字)
    win.webContents.send('cursor', {
      dx: p.x - (b.x + b.width / 2),
      dy: p.y - (b.y + b.height / 2),
      ax: p.x, ay: p.y, idle,
    });
  }, 40);
  win.on('closed', () => { clearInterval(cursorTimer); clearInterval(appTimer); });

  // 定期检查壁纸是否更换(便宜,纯本地)
  setInterval(pollWallpaper, 5000);

  // 定期看前台是什么软件 → 通知渲染进程在尾巴上显示对应图标
  appTimer = setInterval(async () => {
    if (!getActiveWindow || !win || win.isDestroyed()) return;
    try {
      const w = await getActiveWindow();
      win.webContents.send('app-tag', detectApp(w));
    } catch (e) { /* ignore */ }
  }, 1500);
}

// —— 伴侣来访:开第二个透明窗口当"来访的朋友龙",从屏幕外飞入、停留、再飞走 ——
let companionWin = null;
let companionTimer = null;
let absorbModeOn = false; // 拖拽吸色模式开关

function spawnCompanion() {
  if (companionWin || !win || win.isDestroyed()) return;
  const b = win.getBounds();
  companionWin = new BrowserWindow({
    width: PET_W, height: PET_H,
    x: -PET_W - 20, y: b.y, // 从左边屏幕外飞入
    transparent: true, frame: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, focusable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  companionWin.setAlwaysOnTop(true, 'screen-saver');
  companionWin.setIgnoreMouseEvents(true); // 点击穿透,不挡你操作
  companionWin.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { companion: '1' } });

  const send = (c) => { if (win && !win.isDestroyed()) win.webContents.send('cmd', c); };
  send('friend-here');
  let phase = 'IN', t0 = Date.now();
  companionTimer = setInterval(() => {
    if (!companionWin || companionWin.isDestroyed() || !win || win.isDestroyed()) { clearInterval(companionTimer); return; }
    const pb = win.getBounds();
    const cb = companionWin.getBounds();
    const besideX = pb.x - Math.round(PET_W * 1.05); // 站旁边
    const hugX = pb.x - Math.round(PET_W * 0.55);     // 靠近拥抱(两窗重叠)
    const glide = (tx) => {
      const nx = cb.x + (tx - cb.x) * 0.16;
      companionWin.setBounds({ x: Math.round(nx), y: pb.y, width: PET_W, height: PET_H });
      return Math.abs(nx - tx) < 6;
    };
    const el = Date.now() - t0;
    // 每个阶段都有超时兜底,保证一定推进、一定离开(修 Rosa 卡住不走)
    if (phase === 'IN') { if (glide(besideX) || el > 3000) { phase = 'GIFT'; t0 = Date.now(); send('date-gift'); } }        // 飞入
    else if (phase === 'GIFT') { glide(besideX); if (el > 2400) { phase = 'HUG'; t0 = Date.now(); send('date-hug'); } }     // 送花
    else if (phase === 'HUG') { glide(hugX); if (el > 2400) { phase = 'CUDDLE'; t0 = Date.now(); send('date-cuddle'); } }   // 拥抱
    else if (phase === 'CUDDLE') { glide(hugX); if (el > 3500) { phase = 'DANCE_A'; t0 = Date.now(); send('date-dance'); } } // 依偎
    else if (phase === 'DANCE_A') { glide(besideX); if (el > 2400) { phase = 'DANCE_B'; t0 = Date.now(); send('date-watch'); } } // 他跳求偶舞
    else if (phase === 'DANCE_B') { // Rosa 回应:上下点头起舞(仙鹤)
      const hop = Math.round(Math.abs(Math.sin(Date.now() / 150)) * 18);
      companionWin.setBounds({ x: Math.round(besideX), y: pb.y - hop, width: PET_W, height: PET_H });
      if (el > 2600) { phase = 'OUT'; t0 = Date.now(); }
    }
    else { // 飞走
      const nx = cb.x - 40;
      companionWin.setBounds({ x: Math.round(nx), y: cb.y, width: PET_W, height: PET_H });
      if (nx < -PET_W - 20 || el > 3000) {
        clearInterval(companionTimer);
        if (companionWin && !companionWin.isDestroyed()) companionWin.close();
        companionWin = null;
        send('friend-gone');
      }
    }
  }, 40);
}

// 只允许一个桌宠实例,避免重复启动叠出一堆窗口
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- IPC: window position / screen / control ----
ipcMain.handle('screen-size', () => {
  const d = screen.getPrimaryDisplay().workAreaSize;
  return { w: d.width, h: d.height };
});

ipcMain.handle('get-pos', () => (win ? win.getPosition() : [0, 0]));

ipcMain.on('move-to', (e, x, y) => {
  if (!win) return;
  // 用 setBounds 每次都重申固定宽高,避免透明窗口移动时被 DPI 取整"撑大"
  lockingSize = true;
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: PET_W, height: PET_H });
  lockingSize = false;
});

ipcMain.on('quit', () => app.quit());

// ============================================================
//  龙化身 Claude:聊天窗口 + 调用 Claude API(可联网搜索)
// ============================================================
const configPath = path.join(app.getPath('userData'), 'config.json');
function loadConfig() { try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { return {}; } }
function saveConfig(c) { try { fs.writeFileSync(configPath, JSON.stringify(c)); } catch (e) { /* ignore */ } }

let convo = [];       // 发给 API 的上下文(仅真实问答)
let transcript = [];  // 显示用的完整历史(右键窗口 + 快捷气泡 共享)

let chatWin = null;
// 把一条消息记进历史,并推送给已打开的聊天窗口(实现两种入口共享历史)
function emitChat(role, text) {
  transcript.push({ role, text });
  if (transcript.length > 120) transcript.splice(0, transcript.length - 120);
  if (chatWin && !chatWin.isDestroyed()) chatWin.webContents.send('chat-append', { role, text });
}

async function askClaude(userText) {
  const cfg = loadConfig();
  const text = String(userText || '').trim();
  const botSay = (m) => { emitChat('assistant', m); return m; };
  // 任何时候,只要粘的是 key 就(重新)保存 —— 允许替换掉旧的/坏的 key(不记进历史,避免泄露)
  if (/^sk-ant-/.test(text)) {
    cfg.apiKey = text; saveConfig(cfg); convo = [];
    return botSay('✅ API Key 已更新保存!现在直接问我问题吧 🐉');
  }
  if (!cfg.apiKey) {
    return botSay('我还没连上大脑 🧠。去 console.anthropic.com 拿一个 API Key(sk-ant- 开头)粘进来发一次就行。');
  }
  emitChat('user', text);
  convo.push({ role: 'user', content: text });
  if (convo.length > 12) convo.splice(0, convo.length - 12);

  const headers = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  const langName = { en: 'English', zh: 'Chinese (中文)', es: 'Spanish (Español)' }[cfg.lang] || 'English';
  const system = '你是用户桌面上的一只可爱像素龙助手,回答简洁、友好、口语化,像朋友聊天,需要最新信息时用联网搜索,别啰嗦。 Always reply in ' + langName + '.';
  const base = { model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system, messages: convo };
  const withTools = Object.assign({}, base, { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] });
  const call = (body) => fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    let res = await call(withTools);
    if (res.status === 400) res = await call(base); // 万一联网搜索工具不可用,退回纯聊天
    if (!res.ok) {
      const errtxt = await res.text().catch(() => '');
      convo.pop();
      if (res.status === 401) return botSay('🔑 认证失败(401):key 不对或已被停用。去 console 换一个全新的 key,直接粘进来发一次即可替换。\n' + errtxt.slice(0, 160));
      if (res.status === 400 && /credit|balance|insufficient/i.test(errtxt)) return botSay('💳 账户余额不足。请去 console 的 Billing 里充值(最低 $5),再来问我。');
      return botSay('呃,出错了(' + res.status + ')。' + errtxt.slice(0, 200));
    }
    const data = await res.json();
    const out = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || '(我没想出回答 🐣)';
    convo.push({ role: 'assistant', content: out });
    return botSay(out);
  } catch (e) {
    convo.pop();
    return botSay('连不上网络/服务:' + String(e && e.message ? e.message : e).slice(0, 140));
  }
}

ipcMain.handle('chat-send', (e, text) => askClaude(text));
ipcMain.handle('chat-has-key', () => !!loadConfig().apiKey);
ipcMain.handle('chat-history', () => transcript);
function applyLangEverywhere(code) {
  const c = loadConfig(); c.lang = code; saveConfig(c);
  [chatWin, bubbleWin].forEach((w) => { if (w && !w.isDestroyed()) w.webContents.send('lang-changed', code); });
}
ipcMain.handle('get-lang', () => loadConfig().lang || 'en');
ipcMain.on('set-lang', (e, l) => applyLangEverywhere(l));

function openChat() {
  if (chatWin && !chatWin.isDestroyed()) { chatWin.focus(); return; }
  const b = win ? win.getBounds() : { x: 200, y: 200 };
  chatWin = new BrowserWindow({
    width: 340, height: 480,
    x: Math.max(0, b.x - 360), y: Math.max(0, b.y - 220),
    frame: true, resizable: true, alwaysOnTop: true, skipTaskbar: false, title: '和龙聊天 🐉',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  chatWin.loadFile(path.join(__dirname, 'renderer', 'chat.html'));
  chatWin.on('closed', () => { chatWin = null; });
}

// —— 快捷漫画气泡:Shift+点龙,龙头顶冒出气泡直接对话 ——
let bubbleWin = null;
let bubbleTimer = null;
function positionBubble() {
  if (!bubbleWin || bubbleWin.isDestroyed() || !win || win.isDestroyed()) return;
  const b = win.getBounds();
  const BW = 270, BH = 160;
  bubbleWin.setBounds({ x: Math.round(b.x + b.width / 2 - BW / 2), y: Math.max(0, b.y - BH + 12), width: BW, height: BH });
}
function openBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) return;
  bubbleWin = new BrowserWindow({
    width: 270, height: 160, transparent: true, frame: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  bubbleWin.setAlwaysOnTop(true, 'screen-saver');
  bubbleWin.loadFile(path.join(__dirname, 'renderer', 'bubble.html'));
  positionBubble();
  bubbleTimer = setInterval(positionBubble, 200); // 跟着桌宠头顶
  bubbleWin.on('closed', () => {
    bubbleWin = null; clearInterval(bubbleTimer);
    if (win && !win.isDestroyed()) win.webContents.send('cmd', 'talk-off');
  });
  if (win && !win.isDestroyed()) win.webContents.send('cmd', 'talk-on');
}
function closeBubble() { if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.close(); }
ipcMain.on('toggle-bubble', () => { if (bubbleWin && !bubbleWin.isDestroyed()) closeBubble(); else openBubble(); });
ipcMain.on('close-bubble', () => closeBubble());

// —— 持久"灵魂"存档:心情/宝藏/花/收藏 等,跨重启保留 ——
const soulPath = path.join(app.getPath('userData'), 'soul.json');
ipcMain.handle('load-soul', () => {
  try { return JSON.parse(fs.readFileSync(soulPath, 'utf8')); } catch (e) { return null; }
});
ipcMain.on('save-soul', (e, data) => {
  try { fs.writeFileSync(soulPath, JSON.stringify(data)); } catch (err) { /* ignore */ }
});

// 壁纸色板:渲染进程按需取,换壁纸时主进程主动推送
ipcMain.handle('wallpaper-palette', () => wallpaperPalette());
ipcMain.handle('sample-under-pet', () => sampleUnderPet());

let lastWallMtime = 0;
function pollWallpaper() {
  const p = getWallpaperPath();
  if (!p) return;
  try {
    const m = fs.statSync(p).mtimeMs;
    if (m !== lastWallMtime) {
      lastWallMtime = m;
      const pal = wallpaperPalette();
      if (pal && win && !win.isDestroyed()) win.webContents.send('wallpaper', pal);
    }
  } catch (e) { /* ignore */ }
}

const MENU_T = {
  en: { chat: '💬 Chat with dragon (Claude)', lang: '🌐 Language / 语言', fire: '🔥 Breathe fire', fly: '🌀 Fly a lap', land: '🛬 Land / Take off', friend: '💕 Invite a friend', absorb: '🎨 Drag-to-camouflage', dnd: '😴 Do not disturb / Wake', evolve: '✨ Evolve now', quit: '❌ Quit' },
  zh: { chat: '💬 和龙聊天 (Claude)', lang: '🌐 语言 / Language', fire: '🔥 喷火', fly: '🌀 绕屏飞一圈', land: '🛬 降落 / 起飞', friend: '💕 叫朋友来', absorb: '🎨 拖拽吸色模式(变色龙)', dnd: '😴 勿扰睡觉 / 唤醒', evolve: '✨ 立即进化', quit: '❌ 退出' },
  es: { chat: '💬 Chatear con el dragón (Claude)', lang: '🌐 Idioma / Language', fire: '🔥 Escupir fuego', fly: '🌀 Dar una vuelta', land: '🛬 Aterrizar / Despegar', friend: '💕 Invitar a un amigo', absorb: '🎨 Camuflaje al arrastrar', dnd: '😴 No molestar / Despertar', evolve: '✨ Evolucionar ahora', quit: '❌ Salir' },
};

ipcMain.on('context-menu', () => {
  const curLang = loadConfig().lang || 'en';
  const M = MENU_T[curLang] || MENU_T.en;
  const langItem = (label, code) => ({ label, type: 'radio', checked: curLang === code, click: () => applyLangEverywhere(code) });
  const menu = Menu.buildFromTemplate([
    { label: M.chat, click: () => openChat() },
    { label: M.lang, submenu: [langItem('English', 'en'), langItem('中文', 'zh'), langItem('Español', 'es')] },
    { label: M.fire, click: () => win.webContents.send('cmd', 'fire') },
    { label: M.fly, click: () => win.webContents.send('cmd', 'fly') },
    { label: M.land, click: () => win.webContents.send('cmd', 'land') },
    { label: M.friend, click: () => spawnCompanion() },
    {
      label: M.absorb, type: 'checkbox', checked: absorbModeOn,
      click: (mi) => { absorbModeOn = mi.checked; win.webContents.send('cmd', absorbModeOn ? 'absorb-on' : 'absorb-off'); },
    },
    { label: M.dnd, click: () => win.webContents.send('cmd', 'dnd') },
    { label: M.evolve, click: () => win.webContents.send('cmd', 'evolve') },
    { type: 'separator' },
    { label: M.quit, click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});
