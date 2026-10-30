"""taco 下樓梯的檢查：遊戲程式用 node 跑（假的瀏覽器物件），驗證規則和之前修過的 bug。"""
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
HARNESS = ROOT / "tests" / "harness.js"

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="需要 node")


def run(js):
    """在遊戲程式後面接一段測試程式執行，回傳它 return 的值。"""
    out = subprocess.run(["node", str(HARNESS), str(HTML), js], capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip().splitlines()[-1])


BLOCKS = ["sound", "config", "state", "physics", "draw", "input", "main"]


def script_srcs():
    return re.findall(r'<script src="([^"]+)"></script>', HTML.read_text(encoding="utf-8"))


def test_page_files():
    """網頁本身：有版本號欄位、手機寬度會縮放、部署流程先跑測試。"""
    html = HTML.read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")
    assert '<meta name="app-version" content="dev">' in html
    assert 'id="ver"' in html
    assert '<link rel="stylesheet" href="style.css?v=dev">' in html
    assert re.search(r"canvas\s*\{[^}]*width:\s*min\(400px, 100%", css)  # 依手機寬、高縮放
    for f in [HTML, ROOT / "style.css", *(ROOT / "js").glob("*.js")]:
        assert "NS-SHAFT" not in f.read_text(encoding="utf-8"), f  # 公開版不掛原作名稱
    wf = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
    assert "pytest" in wf and "needs: test" in wf and "app-version" in wf


def test_blocks_load_in_order():
    """積木照固定順序載入、每個都帶 ?v=dev（上線換成版本號，手機才不會新舊檔混用），沒有內嵌程式。"""
    assert script_srcs() == [f"js/{b}.js?v=dev" for b in BLOCKS]
    assert "<script>" not in HTML.read_text(encoding="utf-8")
    # js 資料夾裡沒有被忘記接上的積木
    assert sorted(p.stem for p in (ROOT / "js").glob("*.js")) == sorted(BLOCKS)


def test_deploy_copies_all_blocks():
    """上線流程要把 css、js 一起放上去，並把每個 ?v=dev 換成版本號。"""
    wf = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
    assert re.search(r"cp -r index\.html style\.css js site/", wf)
    assert 's#?v=dev\\"#?v=$v\\"#g' in wf  # 換版本號
    assert '! grep -q "v=dev"' in wf  # 有漏換就讓上線失敗


def test_script_syntax():
    """每個積木語法都正確。"""
    for b in BLOCKS:
        subprocess.run(["node", "--check", str(ROOT / "js" / f"{b}.js")], check=True)


def test_start_state():
    """一開始：在玩、12 滴血、第 1 層，第一塊一定是普通平台。"""
    r = run("return {s: gameState, hp: player.hp, f: floor, first: platforms[0].type};")
    assert r == {"s": "PLAY", "hp": 12, "f": 1, "first": "normal"}


def test_ceiling_spike_kills():
    """被天花板刺到 0 血要 GAME OVER（之前的 bug：0 血還能繼續玩）。"""
    r = run("player.hp = 3; player.invincible = 0; player.y = 5; player.vy = 0; step(1); return {s: gameState, hp: player.hp};")
    assert r == {"s": "GAMEOVER", "hp": 0}


def test_ceiling_spike_hurts_but_not_kills():
    """血夠的時候天花板刺只扣 4 滴，還活著、有無敵時間。"""
    r = run("player.invincible = 0; player.y = 5; player.vy = 0; step(1); return {s: gameState, hp: player.hp, inv: player.invincible > 0};")
    assert r == {"s": "PLAY", "hp": 8, "inv": True}


def test_spike_platform_kills():
    """踩到尖刺平台扣到 0 血也是 GAME OVER。"""
    r = run("""
      platforms = [{x: 100, y: 300, w: 90, h: 14, type: 'spikes', flip: 0, broken: false, stepped: false}];
      player.x = 120; player.y = 300 - player.h - 2; player.vy = 2; player.hp = 2; player.invincible = 0;
      step(1); return {s: gameState, hp: player.hp};
    """)
    assert r == {"s": "GAMEOVER", "hp": 0}


def test_fall_saves_record():
    """掉出畫面：GAME OVER，最高紀錄存起來，面板文字也更新。"""
    r = run("floor = 77; player.y = 600; step(1); return {s: gameState, rec: __store['ns_shaft_offline_rec'], txt: document.getElementById('recordText').innerText};")
    assert r == {"s": "GAMEOVER", "rec": "77", "txt": "地下 0077 階"}


def test_record_not_lowered():
    """之前的紀錄比較高時，不會被這次的低分蓋掉。"""
    r = run("__store['ns_shaft_offline_rec'] = '50'; bestRecord = 50; floor = 10; player.y = 600; step(1); return __store['ns_shaft_offline_rec'];")
    assert r == "50"


def test_game_over_only_once():
    """死掉之後物理就停了，不會重複觸發死亡。"""
    r = run("player.y = 600; step(1); const y = player.y; step(30); return {s: gameState, same: player.y === y};")
    assert r == {"s": "GAMEOVER", "same": True}


def test_pause_does_not_fast_forward():
    """暫停 3 秒再繼續，平台不能一口氣狂跑（之前的 bug：恢復時把暫停的時間補跑）。"""
    r = run("""
      setSpeed('fast');  // 最快速度下差距最明顯：舊 bug 會移動約 18，正常只有 1～2
      frame(16); frame(16);
      const before = platforms[0].y;
      togglePause();
      for (let i = 0; i < 180; i++) frame(16.7);
      togglePause();
      frame(16.7);
      return {moved: Math.abs(platforms[0].y - before), s: gameState};
    """)
    assert r["s"] == "PLAY"
    assert r["moved"] < 5


def test_speed_keys_update_buttons():
    """鍵盤按 1~4 切速度，按鈕高亮要跟著變（之前的 bug：鍵盤切換時高亮不會動）。"""
    r = run("__fire('window', 'keydown', {code: 'Digit3', key: '3'}); return {mode: currentMode, active: __btns.filter(b => b.classList.contains('active')).map(b => b.dataset.mode)};")
    assert r == {"mode": "classic", "active": ["classic"]}


def test_restart_by_space_and_tap():
    """死掉後按空白鍵或點畫面都能重開；重開後血量、樓層歸零。"""
    r = run("""
      floor = 9; player.y = 600; step(1);
      __fire('window', 'keydown', {code: 'Space', key: ' '});
      const a = {s: gameState, f: floor, hp: player.hp};
      player.y = 600; step(1);
      __fire('gameCanvas', 'pointerdown');
      return {a, b: gameState};
    """)
    assert r == {"a": {"s": "PLAY", "f": 1, "hp": 12}, "b": "PLAY"}


def test_touch_button_release_on_leave():
    """手指滑出左右按鈕要放開方向，不會一直往同一邊走。"""
    r = run("""
      __fire('btnLeft', 'pointerdown'); const held = keys.left;
      __fire('btnLeft', 'pointerleave');
      return {held, after: keys.left};
    """)
    assert r == {"held": True, "after": False}


def test_touch_pause_button():
    """手機上的 ⏸ 按鈕要能暫停、再按一次繼續（拆積木時差點壞掉：按鈕綁定時暫停功能還沒載入）。"""
    r = run("""
      __fire('btnPause', 'click'); const a = gameState;
      __fire('btnPause', 'click'); return [a, gameState];
    """)
    assert r == ["PAUSED", "PLAY"]


def test_floor_counts_up_and_platforms_refill():
    """平台捲到頂會消失、樓層 +1，底下補新平台，數量不會變少。"""
    r = run("""
      const n = platforms.length;
      // 每一步都把角色放回畫面中間，確保不會掉下去或撞到天花板，只看樓層計數
      for (let i = 0; i < 600; i++) { player.y = 200; player.vy = 0; step(1); }
      return {f: floor, n0: n, n1: platforms.length};
    """)
    assert r["f"] > 1
    assert r["n1"] == r["n0"]


def test_no_audio_does_not_crash():
    """瀏覽器沒有音效功能（測試環境就是這樣）：受傷、死亡都照常，不會當掉。"""
    r = run("player.invincible = 0; player.y = 5; step(1); player.y = 600; step(1); return gameState;")
    assert r == "GAMEOVER"


def test_broken_storage_does_not_crash():
    """瀏覽器擋住存檔（無痕模式）也能玩，不會整個壞掉。"""
    r = run("""
      localStorage.setItem = () => { throw new Error('blocked'); };
      floor = 30; player.y = 600; step(1);
      return {s: gameState, best: bestRecord};
    """)
    assert r == {"s": "GAMEOVER", "best": 30}


def test_first_platform_under_player():
    """開局第一塊平台一定在角色正下方，不操作也不會馬上掉下去。"""
    r = run("""
      const p = platforms[0], cx = player.x + player.w / 2;
      step(90);  // 1.5 秒不動
      return {under: p.x <= cx && cx <= p.x + p.w, s: gameState, on: player.standingOn === p};
    """)
    assert r == {"under": True, "s": "PLAY", "on": True}


def test_spring_near_ceiling_not_repeated():
    """彈簧靠近天花板：撞到刺一次就從彈簧掉下去，不會被同一個彈簧連續彈上去一直扣血。"""
    r = run("""
      platforms = [{x: 100, y: 100, w: 90, h: 14, type: 'spring', flip: 0, broken: false, stepped: false}];
      player.x = 130; player.y = 100 - player.h - 2; player.vy = 1; player.invincible = 0;
      let bounces = 0, prevVy = 0;
      for (let i = 0; i < 60 && gameState === 'PLAY'; i++) {  // 1 秒內（之後角色會正常掉出畫面）
        step(1);
        if (player.vy < -5 && prevVy >= 0) bounces++;
        prevVy = player.vy;
      }
      return {bounces, hp: player.hp, dropped: player.y > platforms[0].y};
    """)
    assert r["bounces"] <= 1
    assert r["hp"] >= 8
    assert r["dropped"]  # 已經掉到彈簧下面

