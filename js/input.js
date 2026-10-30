// 操作積木：鍵盤、觸控按鈕、點畫面重開
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' && gameState === 'GAMEOVER') restart();
  if (e.code === 'KeyP') togglePause();
  if (e.key === '1') setSpeed('relaxed');
  if (e.key === '2') setSpeed('slow');
  if (e.key === '3') setSpeed('classic');
  if (e.key === '4') setSpeed('fast');
});
['pointerdown', 'keydown'].forEach(t => window.addEventListener(t, () => sound.init(), { once: true }));
window.addEventListener('blur', () => { keys.left = false; keys.right = false; });
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});

// 觸控按鈕
const btnL = document.getElementById('btnLeft');
const btnR = document.getElementById('btnRight');
const btnP = document.getElementById('btnPause');
btnL.addEventListener('pointerdown', e => { e.preventDefault(); keys.left = true; });
btnL.addEventListener('pointerup', () => keys.left = false);
btnL.addEventListener('pointercancel', () => keys.left = false);
btnL.addEventListener('pointerleave', () => keys.left = false);
btnR.addEventListener('pointerdown', e => { e.preventDefault(); keys.right = true; });
btnR.addEventListener('pointerup', () => keys.right = false);
btnR.addEventListener('pointercancel', () => keys.right = false);
btnR.addEventListener('pointerleave', () => keys.right = false);
canvas.addEventListener('pointerdown', () => { if (gameState === 'GAMEOVER') restart(); });
btnP.addEventListener('click', () => togglePause());  // 用箭頭函式：按下去時才找 togglePause（它在主迴圈積木裡，比這個積木晚載入）

// 面板按鈕（以前寫在 HTML 的 onclick 裡；放在這裡，程式還沒載完時點了只是沒反應，不會報錯）
document.querySelectorAll('.speed-btn').forEach(b => b.addEventListener('click', () => setSpeed(b.dataset.mode)));
document.getElementById('pauseBtn').addEventListener('click', () => togglePause());
document.getElementById('restartBtn').addEventListener('click', () => restart());
