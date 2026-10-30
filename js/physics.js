// 規則積木：產生平台、開新局、木板碎裂、每一步的物理和碰撞
function spawnPlatform(y, type = null, fixedX = null) {
  const minX = WALL + 4;
  const maxX = WIDTH - WALL - 90 - 4;
  const x = fixedX !== null ? fixedX : Math.floor(minX + Math.random() * (maxX - minX));
  const pool = ['normal', 'normal', 'normal', 'spikes', 'flip', 'conveyor_l', 'conveyor_r', 'spring'];
  const pType = type || pool[Math.floor(Math.random() * pool.length)];
  platforms.push({
    x, y, w: 90, h: 14, type: pType,
    flip: 0, broken: false, conveyor: 0, stepped: false
  });
}

function initGame() {
  floor = 1;
  player.reset();
  platforms = [];
  particles = [];
  shards = [];
  screenShake = 0;
  spawnPlatform(190, 'normal', player.x + player.w / 2 - 45);  // 開局站穩，不會一打開就掉下去
  for (let y = 190 + 66; y < HEIGHT + 100; y += 66) spawnPlatform(y);
}

function triggerBreak(p) {
  sound.playWoodShatter();
  screenShake = 4.5;
  const colors = ['#a16207', '#ca8a04', '#d97706', '#78350f'];
  for (let i = 0; i < 16; i++) {
    const isLeft = i < 8;
    shards.push({
      x: p.x + (p.w / 16) * i,
      y: p.y + p.h / 2,
      vx: isLeft ? -(Math.random() * 3.5 + 1.2) : (Math.random() * 3.5 + 1.2),
      vy: -(Math.random() * 3.5 + 0.5),
      w: Math.random() * 8 + 6,
      h: Math.random() * 4 + 3,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1, decay: 0.02, gravity: 0.22
    });
  }
}

function updatePhysics() {
  if (gameState !== 'PLAY') return;

  const scrollSpd = cfg.base + Math.min(0.9, floor * 0.003);

  // 移動
  if (keys.left && !keys.right) {
    player.vx = -player.speed; player.facing = -1; player.walkCycle += 0.25;
  } else if (keys.right && !keys.left) {
    player.vx = player.speed; player.facing = 1; player.walkCycle += 0.25;
  } else {
    player.vx = 0; player.walkCycle = 0;
  }

  if (player.standingOn && !player.standingOn.broken) {
    if (player.standingOn.type === 'conveyor_l') player.vx -= 1.6;
    if (player.standingOn.type === 'conveyor_r') player.vx += 1.6;
  }

  player.x += player.vx;
  if (player.x < WALL + 1) player.x = WALL + 1;
  if (player.x + player.w > WIDTH - WALL - 1) player.x = WIDTH - WALL - player.w - 1;

  player.vy += cfg.gravity;
  if (player.vy > cfg.maxFall) player.vy = cfg.maxFall;
  player.y += player.vy;

  if (player.invincible > 0) player.invincible--;
  if (player.hurtTimer > 0) player.hurtTimer--;

  // 天花板刺
  if (player.y <= SPIKE_H + 2) {
    player.y = SPIKE_H + 2; player.vy = 1.6;
    player.passThrough = player.lastPlatform; player.standingOn = null;
    if (player.invincible <= 0) {
      player.hp = Math.max(0, player.hp - 4);
      player.invincible = 50; player.hurtTimer = 25;
      sound.playHurt(); screenShake = 3.5;
      if (player.hp <= 0) { gameOver(); return; }
    }
  }

  // 掉下深淵
  if (player.y > HEIGHT) {
    player.hp = 0;
    gameOver();
    return;
  }

  // 碰撞
  let standing = false;
  for (let p of platforms) {
    if (p.broken || p === player.passThrough) continue;
    const feet = player.y + player.h;
    const prevFeet = feet - player.vy;
    if (player.x + player.w - 4 >= p.x && player.x + 4 <= p.x + p.w &&
        player.vy >= 0 && prevFeet <= p.y + 6 && feet >= p.y - 1) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.standingOn = p;
      player.lastPlatform = p; player.passThrough = null;
      standing = true;
      if (!p.stepped) { p.stepped = true; sound.playLand(); }

      if (p.type === 'normal') {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 0.04);
          if (++healCooldown > 35) { sound.playHeal(); healCooldown = 0; }
        }
      } else if (p.type === 'spikes') {
        if (player.invincible <= 0) {
          player.hp = Math.max(0, player.hp - 3);
          player.invincible = 50; player.hurtTimer = 25;
          sound.playHurt(); screenShake = 3.5;
          if (player.hp <= 0) { gameOver(); return; }
        }
      } else if (p.type === 'spring') {
        player.vy = -7.8; player.standingOn = null; sound.playSpring();
      } else if (p.type === 'flip' && p.flip === 0) {
        p.flip = 0.05;
      }
      break;
    }
  }
  if (!standing) player.standingOn = null;

  // 平台更新
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    p.y -= scrollSpd;
    if (p.flip > 0 && !p.broken) {
      p.flip += 0.045;
      if (p.flip >= 1.0) {
        triggerBreak(p);
        p.broken = true;
        if (player.standingOn === p) player.standingOn = null;
      }
    }
    if (p.y + p.h < SPIKE_H) {
      platforms.splice(i, 1);
      floor++;
      spawnPlatform(HEIGHT);
      if (floor > bestRecord) saveRecord();
    }
  }

  // 碎片更新
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.x += s.vx; s.y += s.vy; s.vy += s.gravity;
    s.rot += s.vRot; s.alpha -= s.decay;
    if (s.alpha <= 0 || s.y > HEIGHT + 20) shards.splice(i, 1);
  }

  if (screenShake > 0) screenShake = Math.max(0, screenShake * 0.82 - 0.1);
}
