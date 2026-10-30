# taco 下樓梯

小朋友下樓梯玩法的網頁小遊戲：左右移動踩平台往下走，別碰到天花板的尖刺，也別掉下去。

- 電腦：← → 或 A D 移動，1～4 切速度，P 暫停，空白鍵重開
- 手機：用畫面下方的 ◀ ⏸ ▶ 按鈕，死掉點一下畫面重開

main 有更新時，GitHub Actions 會先跑測試（`pytest`，遊戲規則用 node 執行），通過才自動上線到 GitHub Pages。

## 程式積木

程式拆成幾個小積木，每塊只管一件事，要改哪塊就只動那塊：

| 檔案 | 負責 |
|---|---|
| `index.html` | 畫面骨架，照順序載入下面的積木 |
| `style.css` | 樣式 |
| `js/sound.js` | 音效 |
| `js/config.js` | 畫面大小、四種速度 |
| `js/state.js` | 遊戲狀態、樓層、最高紀錄、角色 |
| `js/physics.js` | 平台、物理、碰撞、受傷 |
| `js/draw.js` | 把畫面畫到畫布上 |
| `js/input.js` | 鍵盤和手機按鈕 |
| `js/main.js` | 主迴圈、暫停、重開，最後開局 |

載入順序寫在 `index.html`，後面的積木會用到前面的，不能亂換。新增積木要一起加進 `index.html` 和 `tests/test_game.py` 的 `BLOCKS`。
