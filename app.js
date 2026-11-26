(function () {
  const S = window.Scoring;
  const DEADLINE = Date.parse('2026-11-28T16:00:00+08:00');
  const KEY = 'office-guess-v2'; // v2：改猜兩人的得票數與得票率
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
  const pctText = p => (p / 100).toFixed(2) + '％';
  const person = (v, p) => `${num(v)} 票\n${pctText(p)}`;

  function render() {
    const scored = actual && guesses.length ? S.score(guesses, actual) : null;
    const rows = scored ? scored.rows : guesses;
    const table = $('list');
    table.replaceChildren();
    $('empty').hidden = rows.length > 0;
    $('list-box').hidden = $('clear').hidden = rows.length === 0;
    if (!rows.length) return;

    const head = table.insertRow();
    for (const text of ['名字', '林國漳', '吳宗憲', scored ? '得分' : '']) {
      const th = document.createElement('th');
      th.textContent = text;
      head.append(th);
    }
    for (const g of rows) {
      const tr = table.insertRow();
      for (const text of [g.n, person(g.lv, g.lp), person(g.wv, g.wp)]) tr.insertCell().textContent = text;
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

  // 讀四個欄位並檢查，成功回傳數值，失敗回傳錯誤訊息
  function readFour(prefix) {
    const value = id => $(prefix + id).value;
    const r = { lv: S.parseVotes(value('lv')), lp: S.parsePct(value('lp')), wv: S.parseVotes(value('wv')), wp: S.parsePct(value('wp')) };
    if (Object.values(r).includes(null)) return { error: '四格都要填：得票數填整數，得票率填 0 到 100，最多兩位小數。' };
    if (r.lp + r.wp > 10000) return { error: '兩人得票率加起來超過 100％，請檢查。' };
    return { values: r };
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
    const msg = $('msg');
    if (!name) { msg.textContent = '請填名字。'; return; }
    const { values, error } = readFour('');
    if (error) { msg.textContent = error; return; }
    if (guesses.some(g => g.n === name) && !confirm(`「${name}」已經猜過了，要改成這次的嗎？`)) return;
    guesses = [...guesses.filter(g => g.n !== name), { n: name, ...values, t: Date.now() }];
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
    const { values, error } = readFour('r-');
    const msg = $('r-msg');
    actual = null;
    if (error) msg.textContent = error;
    else if (Math.sign(values.lv - values.wv) !== Math.sign(values.lp - values.wp)) msg.textContent = '得票數和得票率的高低對不起來，請檢查。';
    else if (!guesses.length) msg.textContent = '還沒有人猜。';
    else {
      actual = values;
      const lines = S.score(guesses, actual).items.map(item =>
        `${item.label}最準：${item.winners.join('、')}（${item.winners.length > 1 ? '每人 ' : ''}${num(S.POT / item.winners.length)} 分）`);
      msg.textContent = [...lines, '總分列在上面的名單。'].join('\n');
    }
    render();
  });

  checkDeadline();
  render();
})();
