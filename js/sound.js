// 音效積木：用 Web Audio 現場合成音效，瀏覽器不支援就安靜玩
// --- 音效系統 (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
  }
  init() {
    // 瀏覽器不支援或擋住音效時就安靜玩，不要讓遊戲當掉
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  playLand() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.05);
  }
  playHeal() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659, now);
    osc.frequency.setValueAtTime(880, now + 0.05);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }
  playHurt() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.15);
  }
  playSpring() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.18);
  }
  playWoodShatter() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }
  playGameOver() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [392, 349, 311, 261].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + i * 0.12);
      g.gain.setValueAtTime(0.2, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.15);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.15);
    });
  }
}
const sound = new SoundController();
