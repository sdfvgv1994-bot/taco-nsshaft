// 主迴圈積木：60FPS 固定時間步長、重新開始、暫停，最後開局
// 60FPS 固定時間步長
let lastTime = performance.now();
let lag = 0;
const STEP = 1000 / 60;

function loop(t) {
  const el = t - lastTime; lastTime = t;
  if (gameState === 'PLAY') {
    lag += Math.min(el, 160);
    while (lag >= STEP && gameState === 'PLAY') { updatePhysics(); lag -= STEP; }
  } else {
    lag = 0;
  }
  draw();
  requestAnimationFrame(loop);
}

function restart() {
  gameState = 'PLAY';
  lag = 0;
  initGame();
  document.getElementById('pauseBtn').innerText = '暫停遊戲 [P]';
}

function togglePause() {
  if (gameState === 'PLAY') gameState = 'PAUSED';
  else if (gameState === 'PAUSED') gameState = 'PLAY';
  document.getElementById('pauseBtn').innerText = gameState === 'PAUSED' ? '繼續遊戲 [P]' : '暫停遊戲 [P]';
}

// 版本號：上線時 workflow 會把 dev 換成提交代號，方便確認手機上是不是最新版
document.getElementById('ver').textContent = document.querySelector('meta[name="app-version"]').content;

initGame();
requestAnimationFrame(t => { lastTime = t; loop(t); });
