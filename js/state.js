// 狀態積木：目前速度、遊戲狀態、樓層、最高紀錄、角色、按鍵
let currentMode = 'slow';
let cfg = SPEEDS[currentMode];

let gameState = 'PLAY';
let floor = 1;
let bestRecord = 1;
try { bestRecord = Number(localStorage.getItem('ns_shaft_offline_rec')) || 1; } catch (e) {}

function saveRecord() {
  if (floor > bestRecord) {
    bestRecord = floor;
    try { localStorage.setItem('ns_shaft_offline_rec', bestRecord); } catch (e) {}
  }
  document.getElementById('recordText').innerText = '地下 ' + String(bestRecord).padStart(4, '0') + ' 階';
}
saveRecord();

// 統一的死亡處理：血量歸零、掉出畫面都走這裡
function gameOver() {
  if (gameState === 'GAMEOVER') return;
  gameState = 'GAMEOVER';
  sound.playGameOver();
  saveRecord();
}

let screenShake = 0;
let platforms = [];
let particles = [];
let shards = [];
let healCooldown = 0;

const keys = { left: false, right: false };
const player = {
  x: 188, y: 80, w: 22, h: 28, vx: 0, vy: 0, speed: 3.4,
  hp: 12, maxHp: 12, facing: 1, standingOn: null,
  invincible: 0, hurtTimer: 0, walkCycle: 0, lastPlatform: null, passThrough: null,
  reset() {
    this.x = 188; this.y = 80; this.vx = 0; this.vy = 0;
    this.hp = 12; this.standingOn = null; this.invincible = 0;
    this.hurtTimer = 0; this.walkCycle = 0; this.lastPlatform = null; this.passThrough = null;
  }
};

function setSpeed(mode) {
  currentMode = mode;
  cfg = SPEEDS[mode];
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}
