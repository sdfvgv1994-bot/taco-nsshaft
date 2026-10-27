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


def test_page_files():
    """網頁本身：單一檔案、有版本號欄位、手機寬度會縮放、部署流程先跑測試。"""
    html = HTML.read_text(encoding="utf-8")
    assert '<meta name="app-version" content="dev">' in html
    assert 'id="ver"' in html
    assert re.search(r"canvas\s*\{[^}]*max-width:\s*100%", html)
    assert "NS-SHAFT" not in html  # 公開版不掛原作名稱
    wf = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
    assert "pytest" in wf and "needs: test" in wf and "app-version" in wf


def test_script_syntax(tmp_path):
    """遊戲程式語法正確。"""
    script = re.search(r"<script>(.*)</script>", HTML.read_text(encoding="utf-8"), re.S).group(1)
    f = tmp_path / "game.js"
    f.write_text(script, encoding="utf-8")
    subprocess.run(["node", "--check", str(f)], check=True)


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
      frame(16); frame(16);
      const before = platforms[0].y;
      togglePause();
      for (let i = 0; i < 180; i++) frame(16.7);
      togglePause();
      frame(16.7);
      return {moved: Math.abs(platforms[0].y - before), s: gameState};
    """)
    assert r["s"] == "PLAY"
    assert r["moved"] < 10


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


def test_floor_counts_up_and_platforms_refill():
    """平台捲到頂會消失、樓層 +1，底下補新平台，數量不會變少。"""
    r = run("""
      const n = platforms.length;
      player.invincible = 9999;  // 測試期間不受傷
      step(600);
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
