// 在 node 裡跑遊戲程式：用假的瀏覽器物件頂替畫面、按鍵、存檔，
// 然後執行測試要的那段程式，把結果用 JSON 印出來給 pytest 看。
// 用法：node harness.js <index.html 路徑> <測試程式>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 照 index.html 裡 <script src> 的順序讀進每個積木
const htmlPath = process.argv[2];
const html = fs.readFileSync(htmlPath, 'utf8');
const srcs = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);
if (!srcs.length) throw new Error('index.html 裡找不到 <script src>');
const blocks = srcs.map(s => ({ name: s, code: fs.readFileSync(path.join(path.dirname(htmlPath), s), 'utf8') }));
const testCode = process.argv[3];

const listeners = {};
const on = (target) => (type, fn) => { (listeners[target + ':' + type] ||= []).push(fn); };
const fire = (target, type, ev = {}) => (listeners[target + ':' + type] || []).forEach(fn => fn({ preventDefault() {}, ...ev }));

// 畫布：什麼都不畫，任何方法呼叫都吞掉
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });

const els = {};
function el(id) {
  if (!els[id]) {
    els[id] = {
      id, innerText: '', textContent: '', dataset: {},
      classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
      getContext: () => ctx2d,
      addEventListener: on(id),
    };
  }
  return els[id];
}
// 四顆速度按鈕
const speedBtns = ['relaxed', 'slow', 'classic', 'fast'].map(m => { const b = el('speed-' + m); b.dataset.mode = m; return b; });
speedBtns[1].classList.add('active');

const store = {};
let rafCb = null;
const sandbox = {
  console, Math, Number, String, JSON, Proxy, Set,
  document: {
    getElementById: el,
    querySelectorAll: (sel) => (sel === '.speed-btn' ? speedBtns : []),
    querySelector: () => ({ content: 'dev' }),
  },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  performance: { now: () => 0 },
  requestAnimationFrame: cb => { rafCb = cb; },
  AudioContext: undefined,
};
sandbox.window = { addEventListener: on('window'), AudioContext: undefined };
vm.createContext(sandbox);
// 每個積木分開跑，跟瀏覽器一個一個 <script> 載入一樣：
// 前面積木的 let/const 後面看得到，但後面才寫的函式，前面載入時還不存在（載入順序寫錯就會在這裡報錯）
for (const b of blocks) vm.runInContext(b.code, sandbox, { filename: b.name });
const helpers = `
  const __fire = this.__fire, __store = this.__store, __btns = this.__btns;
  // 跑 n 個物理步（1/60 秒一步），模擬遊戲在進行
  function step(n) { for (let i = 0; i < n; i++) updatePhysics(); }
  // 用時間推動主迴圈（測試暫停後恢復會不會狂跑）
  let __t = 0;
  function frame(ms) { __t += ms; loop(__t); }
`;
sandbox.__fire = fire; sandbox.__store = store; sandbox.__btns = speedBtns;
const out = vm.runInContext(helpers + '\n;(function(){' + testCode + '\n})()', sandbox);
console.log(JSON.stringify(out));
