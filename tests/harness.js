// 在 node 裡跑 index.html 的遊戲程式：用假的瀏覽器物件頂替畫面、按鍵、存檔，
// 然後執行測試要的那段程式，把結果用 JSON 印出來給 pytest 看。
// 用法：node harness.js <index.html 路徑> <測試程式>
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
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
// let/const 宣告的全域變數只在同一段程式裡看得到，所以把測試程式接在遊戲程式後面一起跑
const helpers = `
  const __fire = this.__fire, __store = this.__store, __btns = this.__btns;
  // 跑 n 個物理步（1/60 秒一步），模擬遊戲在進行
  function step(n) { for (let i = 0; i < n; i++) updatePhysics(); }
  // 用時間推動主迴圈（測試暫停後恢復會不會狂跑）
  let __t = 0;
  function frame(ms) { __t += ms; loop(__t); }
`;
sandbox.__fire = fire; sandbox.__store = store; sandbox.__btns = speedBtns;
const out = vm.runInContext(script + helpers + '\n;(function(){' + testCode + '\n})()', sandbox);
console.log(JSON.stringify(out));
