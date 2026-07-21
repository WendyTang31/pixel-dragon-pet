const ta = document.getElementById('ta');
let clearing = false; // 程序性清空/填充时,别触发"删空即关闭"
let busy = false;

const T = {
  en: { ph: 'Ask me… (Enter)', thinking: 'thinking…', error: 'Error: ' },
  zh: { ph: '问我…（Enter 发送）', thinking: '思考中…', error: '出错了:' },
  es: { ph: 'Pregúntame… (Enter)', thinking: 'pensando…', error: 'Error: ' },
};
let L = T.zh;
(async () => {
  const lang = window.pet && window.pet.getLang ? await window.pet.getLang() : 'zh';
  L = T[lang] || T.zh;
  ta.placeholder = L.ph;
})();

function setText(v) { clearing = true; ta.value = v; clearing = false; }

async function ask() {
  const q = ta.value.trim();
  if (!q || busy) return;
  busy = true;
  setText('');
  ta.placeholder = L.thinking;
  ta.setAttribute('readonly', '');
  try {
    const r = await window.pet.chatSend(q);
    ta.removeAttribute('readonly');
    setText(r);           // 我的问题消失,龙的回复直接显示在气泡里(漫画式)
    ta.placeholder = L.ph;
    ta.scrollTop = 0;
  } catch (e) {
    ta.removeAttribute('readonly');
    setText(L.error + (e && e.message ? e.message : e));
  }
  busy = false;
}

ta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
});
// 把气泡里文字全部删掉 = 关闭气泡
ta.addEventListener('input', () => {
  if (clearing) return;
  if (ta.value === '') window.pet.closeBubble();
});

ta.focus();
