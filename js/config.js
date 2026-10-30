// 設定積木：畫面大小、牆壁、尖刺高度、四種速度
const WIDTH = 400, HEIGHT = 480, WALL = 14, SPIKE_H = 20;

const SPEEDS = {
  relaxed: { base: 0.7, gravity: 0.21, maxFall: 4.8 },
  slow:    { base: 0.95, gravity: 0.24, maxFall: 5.4 },
  classic: { base: 1.35, gravity: 0.30, maxFall: 6.8 },
  fast:    { base: 1.8, gravity: 0.36, maxFall: 8.0 }
};
