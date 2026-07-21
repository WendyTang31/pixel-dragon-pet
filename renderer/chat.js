const msgs = document.getElementById('msgs');
const inp = document.getElementById('inp');
const send = document.getElementById('send');
const titleEl = document.getElementById('title');
const langsEl = document.getElementById('langs');
let typingEl = null;
let lang = 'en';

const I18N = {
  en: {
    title: '🐉 Your pixel dragon · Claude',
    ph: 'Ask me anything… (Enter to send)',
    greet: "Hi! I'm your pixel dragon 🐉 Ask me anything — I can search the web too!",
    greetKey: "Hi! I'm your pixel dragon 🐉\nFirst give me a \"brain\": get an API key at console.anthropic.com (starts with sk-ant-) and paste it here once.",
    thinking: 'thinking…',
    error: 'Something went wrong: ',
  },
  zh: {
    title: '🐉 你的像素龙 · Claude',
    ph: '问我点什么…（Enter 发送）',
    greet: '嗨!我是你的像素龙 🐉 有什么想问的?（我能联网帮你查~）',
    greetKey: '嗨!我是你的像素龙 🐉\n第一次用要先给我"大脑":去 console.anthropic.com 拿一个 API Key（sk-ant- 开头），整段粘进来发一次就行(只需一次)。',
    thinking: '思考中…',
    error: '出错了:',
  },
  es: {
    title: '🐉 Tu dragón pixelado · Claude',
    ph: 'Pregúntame algo… (Enter para enviar)',
    greet: '¡Hola! Soy tu dragón pixelado 🐉 Pregúntame lo que quieras — ¡también puedo buscar en la web!',
    greetKey: '¡Hola! Soy tu dragón pixelado 🐉\nPrimero dame un "cerebro": consigue una API key en console.anthropic.com (empieza con sk-ant-) y pégala aquí una vez.',
    thinking: 'pensando…',
    error: 'Algo salió mal: ',
  },
};
function t() { return I18N[lang] || I18N.en; }

function applyLang() {
  titleEl.textContent = t().title;
  inp.placeholder = t().ph;
  [...langsEl.children].forEach((b) => b.classList.toggle('active', b.dataset.l === lang));
}

function add(who, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = text;
  if (typingEl) msgs.insertBefore(d, typingEl); else msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function setTyping(on) {
  if (on && !typingEl) {
    typingEl = document.createElement('div');
    typingEl.className = 'msg bot typing';
    typingEl.textContent = t().thinking;
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  } else if (!on && typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

async function load() {
  lang = window.pet && window.pet.getLang ? await window.pet.getLang() : 'en';
  applyLang();
  const h = window.pet && window.pet.chatHistory ? await window.pet.chatHistory() : [];
  if (!h || !h.length) {
    const hasKey = window.pet && window.pet.chatHasKey ? await window.pet.chatHasKey() : false;
    add('bot', hasKey ? t().greet : t().greetKey);
  } else {
    for (const m of h) add(m.role === 'user' ? 'user' : 'bot', m.text);
  }
}

// 两种入口(右键窗口 + 快捷气泡)共享历史
if (window.pet && window.pet.onChatAppend) {
  window.pet.onChatAppend((m) => {
    if (m.role === 'assistant') setTyping(false);
    add(m.role === 'user' ? 'user' : 'bot', m.text);
  });
}

// 从右键菜单改语言时,窗口实时同步
if (window.pet && window.pet.onLangChanged) {
  window.pet.onLangChanged((code) => { lang = code; applyLang(); });
}

// 语言切换
langsEl.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  lang = b.dataset.l;
  if (window.pet && window.pet.setLang) window.pet.setLang(lang);
  applyLang();
  inp.focus();
});

async function go() {
  const tx = inp.value.trim();
  if (!tx) return;
  inp.value = '';
  setTyping(true);
  try { await window.pet.chatSend(tx); }
  catch (e) { setTyping(false); add('bot', t().error + (e && e.message ? e.message : e)); }
}

send.onclick = go;
inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
inp.focus();
load();
