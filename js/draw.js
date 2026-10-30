// 畫面積木：把背景、平台、碎片、角色、血條、暫停／結束畫面畫到畫布上
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function draw() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }

  // 背景
  ctx.fillStyle = '#030816'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, WALL, HEIGHT); ctx.fillRect(WIDTH - WALL, 0, WALL, HEIGHT);

  // 尖刺天花板
  ctx.fillStyle = '#f8fafc';
  for (let x = WALL; x < WIDTH - WALL; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 8, SPIKE_H); ctx.lineTo(x + 16, 0); ctx.fill();
  }

  // 平台
  for (let p of platforms) {
    if (p.broken) continue;
    ctx.save();
    if (p.flip > 0) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.scale(1, Math.cos(p.flip * Math.PI));
      ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
    }
    if (p.type === 'normal') {
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(p.x, p.y, p.w, 2);
    } else if (p.type === 'spikes') {
      ctx.fillStyle = '#64748b'; ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
      ctx.fillStyle = '#f1f5f9';
      for (let sx = 2; sx < p.w - 5; sx += 9) {
        ctx.beginPath(); ctx.moveTo(p.x + sx, p.y + 6); ctx.lineTo(p.x + sx + 4.5, p.y - 2); ctx.lineTo(p.x + sx + 9, p.y + 6); ctx.fill();
      }
    } else if (p.type === 'flip') {
      ctx.fillStyle = '#a16207'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = p.flip > 0.4 ? '#ef4444' : '#451a03';
      ctx.beginPath(); ctx.moveTo(p.x + 25, p.y + 2); ctx.lineTo(p.x + 40, p.y + 8); ctx.stroke();
    } else if (p.type === 'spring') {
      ctx.fillStyle = '#b45309'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#fde047'; ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, p.h - 4);
    } else if (p.type.startsWith('conveyor')) {
      ctx.fillStyle = '#166534'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#86efac'; ctx.font = '10px monospace';
      const d = p.type === 'conveyor_l' ? '<' : '>';
      for (let ax = p.x + 8; ax < p.x + p.w - 8; ax += 18) ctx.fillText(d, ax, p.y + 11);
    }
    ctx.restore();
  }

  // 碎片
  for (let s of shards) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.alpha);
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.fillStyle = s.color; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }

  // 主角
  if (!(player.invincible > 0 && player.invincible % 6 > 2)) {
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.fillStyle = '#facc15'; ctx.fillRect(4, 2, 14, 8);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(player.facing === 1 ? 11 : 1, 8, 10, 3);
    ctx.fillStyle = '#fed7aa'; ctx.fillRect(5, 9, 12, 8);
    ctx.fillStyle = '#000'; ctx.fillRect(player.facing === 1 ? 13 : 7, 11, 2, 4);
    ctx.fillStyle = '#eab308'; ctx.fillRect(4, 17, 14, 6);
    ctx.fillStyle = '#1d4ed8'; ctx.fillRect(5, 23, 12, 4);
    ctx.fillStyle = '#78350f'; ctx.fillRect(4, 27, 5, 2); ctx.fillRect(13, 27, 5, 2);
    ctx.restore();
  }

  // HUD（深色底，字不會跟尖刺混在一起）
  ctx.fillStyle = 'rgba(3,8,22,0.75)'; ctx.fillRect(22, 10, 104, 28); ctx.fillRect(184, 10, 116, 26);
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ec4899'; ctx.fillText('LIFE', 26, 22);
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillStyle = (i < Math.floor(player.hp)) ? (player.hp <= 3 ? '#ef4444' : '#facc15') : '#450a0a';
    ctx.fillRect(26 + i * 8, 26, 6, 8);
  }
  const fStr = '地下' + String(floor).padStart(4, '0') + '階';
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#000'; ctx.fillText(fStr, 191, 30);
  ctx.fillStyle = '#fde047'; ctx.fillText(fStr, 190, 29);

  if (gameState === 'PAUSED') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('遊戲暫停', WIDTH / 2, HEIGHT / 2); ctx.textAlign = 'start';
  } else if (gameState === 'GAMEOVER') {
    ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', WIDTH / 2, HEIGHT / 2 - 20);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
    ctx.fillText('抵達：地下 ' + floor + ' 階', WIDTH / 2, HEIGHT / 2 + 15);
    ctx.fillStyle = '#facc15'; ctx.font = '14px sans-serif';
    ctx.fillText('按下 [空白鍵] 或點擊重新開始', WIDTH / 2, HEIGHT / 2 + 50); ctx.textAlign = 'start';
  }

  ctx.restore();
}
