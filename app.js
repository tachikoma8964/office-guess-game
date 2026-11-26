(function () {
  const S = window.Scoring;
  const DEADLINE = Date.parse('2026-11-28T16:00:00+08:00');
  const KEY = 'office-guess-v1';
  const $ = id => document.getElementById(id);

  let guesses = load();
  let actual = null; // 開票結果，填了才顯示分數

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data.filter(S.validGuess) : [];
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(guesses)); return true; }
    catch (e) { return false; }
  }

  const num = n => n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  const side = x => (x > 0 ? '贏 ' : x < 0 ? '輸 ' : '平手 ');
  const votesText = v => side(v) + num(Math.abs(v)) + ' 票';
  const pctText = p => side(p) + (Math.abs(p) / 100).toFixed(2) + '％';

  function render() {
    const scored = actual && guesses.length ? S.score(guesses, actual) : null;
    const rows = scored ? scored.rows : guesses;
    const table = $('list');
    table.replaceChildren();
    $('empty').hidden = rows.length > 0;
    $('list-box').hidden = $('clear').hidden = rows.length === 0;
    if (!rows.length) return;

    const head = table.insertRow();
    for (const text of ['名字', '票數', '％', scored ? '得分' : '']) {
      const th = document.createElement('th');
      th.textContent = text;
      head.append(th);
    }
    for (const g of rows) {
      const tr = table.insertRow();
      for (const text of [g.n, votesText(g.v), pctText(g.p)]) tr.insertCell().textContent = text;
      const last = tr.insertCell();
      if (scored) {
        last.textContent = num(g.total);
        if (g.total > 0) tr.className = 'win';
        continue;
      }
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'link';
      del.textContent = '刪除';
      del.addEventListener('click', () => {
        if (!confirm(`要刪除「${g.n}」嗎？`)) return;
        guesses = guesses.filter(x => x.n !== g.n);
        save();
        render();
      });
      last.append(del);
    }
  }

  function checkDeadline() {
    const closed = Date.now() >= DEADLINE;
    $('submit').disabled = closed;
    if (closed) $('msg').textContent = '投票已截止，不能再猜了。';
    return closed;
  }

  $('guess-form').addEventListener('submit', e => {
    e.preventDefault();
    if (checkDeadline()) return;
    const name = $('name').value.trim();
    const v = S.parseVotes($('votes').value);
    const p = S.parsePct($('pct').value);
    const msg = $('msg');
    if (!name) { msg.textContent = '請填名字。'; return; }
    if (v === null) { msg.textContent = '票數請填整數，例如 12345。'; return; }
    if (p === null) { msg.textContent = '％請填 0 到 100，最多兩位小數。'; return; }
    if (guesses.some(g => g.n === name) && !confirm(`「${name}」已經猜過了，要改成這次的嗎？`)) return;
    const sign = Number(document.querySelector('input[name="side"]:checked').value);
    guesses = [...guesses.filter(g => g.n !== name), { n: name, v: sign * v, p: sign * p, t: Date.now() }];
    const ok = save();
    e.target.reset();
    msg.textContent = ok ? `${name} 送出了。` : '送出了，但這個瀏覽器無法儲存，關掉頁面就會消失。';
    render();
  });

  $('clear').addEventListener('click', () => {
    if (!confirm(`要清除全部 ${guesses.length} 人嗎？清掉就救不回來。`)) return;
    guesses = [];
    save();
    render();
  });

  $('result-form').addEventListener('input', () => { actual = null; $('r-msg').textContent = ''; render(); });
  $('result-form').addEventListener('submit', e => {
    e.preventDefault();
    const lv = S.parseVotes($('r-lv').value), wv = S.parseVotes($('r-wv').value);
    const lp = S.parsePct($('r-lp').value), wp = S.parsePct($('r-wp').value);
    const msg = $('r-msg');
    actual = null;
    if ([lv, wv, lp, wp].includes(null)) msg.textContent = '四格都要填：票數填整數，％最多兩位小數。';
    else if (lp + wp > 10000) msg.textContent = '兩人得票率加起來超過 100％，請檢查。';
    else if (Math.sign(lv - wv) !== Math.sign(lp - wp)) msg.textContent = '票數和得票率的高低對不起來，請檢查。';
    else if (!guesses.length) msg.textContent = '還沒有人猜。';
    else {
      actual = { v: lv - wv, p: lp - wp };
      msg.textContent = `結果：林國漳${votesText(actual.v)}、${pctText(actual.p)}。分數已列在上面的名單。`;
    }
    render();
  });

  checkDeadline();
  render();
})();
