(function () {
  const S = window.Scoring;
  const DEADLINE = Date.parse('2026-11-28T16:00:00+08:00');
  const KEY = 'office-guess-v1';
  const $ = id => document.getElementById(id);

  let guesses = load();
  let revealed = false;
  let resultText = '';

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
  const pct = p => (Math.abs(p) / 100).toFixed(2) + '％';
  const side = x => (x > 0 ? '贏 ' : x < 0 ? '輸 ' : '平手 ');
  const votesText = v => side(v) + num(Math.abs(v)) + ' 票';
  const pctText = p => side(p) + pct(p);

  async function copy(text, msgEl) {
    try {
      await navigator.clipboard.writeText(text);
      msgEl.textContent = '已複製。';
    } catch (e) {
      window.prompt('無法自動複製，請手動複製下面的文字：', text);
    }
  }

  // 分頁
  for (const name of ['play', 'host']) {
    $('tab-' + name).addEventListener('click', () => {
      for (const other of ['play', 'host']) {
        $(other).hidden = other !== name;
        $('tab-' + other).setAttribute('aria-selected', String(other === name));
      }
    });
  }

  // 我要猜
  function checkDeadline() {
    const closed = Date.now() >= DEADLINE;
    $('p-submit').disabled = closed;
    if (closed) $('deadline-note').textContent = '投票已截止，不能再產生新的代碼。';
    return closed;
  }
  checkDeadline();

  $('play-form').addEventListener('submit', e => {
    e.preventDefault();
    $('p-result').hidden = true;
    if (checkDeadline()) return;
    const name = $('p-name').value.trim();
    const v = S.parseVotes($('p-votes').value);
    const p = S.parsePct($('p-pct').value);
    if (!name) { $('p-msg').textContent = '請填暱稱。'; return; }
    if (v === null) { $('p-msg').textContent = '票數請填整數，例如 12345。'; return; }
    if (p === null) { $('p-msg').textContent = '％請填 0 到 100，最多兩位小數，例如 5.25。'; return; }
    const sign = Number($('p-side').value);
    $('p-code').textContent = S.encode({ n: name, v: sign * v, p: sign * p, t: Date.now() });
    $('p-result').hidden = false;
    $('p-msg').textContent = `你猜：林國漳${votesText(sign * v)}、${pctText(sign * p)}`;
  });
  // 改了內容就把舊代碼收起來，避免傳到舊的
  $('play-form').addEventListener('input', () => { $('p-result').hidden = true; $('p-msg').textContent = ''; });
  $('p-copy').addEventListener('click', () => copy($('p-code').textContent, $('p-msg')));

  // 主辦人
  function fillTable(table, head, rows) {
    table.replaceChildren();
    [head, ...rows.map(r => r.cells)].forEach((cells, i) => {
      const tr = table.insertRow();
      if (i && rows[i - 1].win) tr.className = 'win';
      for (const c of cells) {
        const cell = document.createElement(i ? 'td' : 'th');
        if (c instanceof Node) cell.append(c); else cell.textContent = c;
        tr.append(cell);
      }
    });
  }

  function renderList() {
    $('h-count').textContent = guesses.length;
    $('h-toggle').textContent = revealed ? '隱藏大家的猜測' : '顯示大家的猜測';
    const rows = guesses.map(g => {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'small';
      del.textContent = '刪除';
      del.addEventListener('click', () => {
        if (!confirm(`要刪除「${g.n}」的猜測嗎？`)) return;
        guesses = guesses.filter(x => x.n !== g.n);
        changed();
      });
      const late = g.t >= DEADLINE ? '（截止後）' : '';
      return { cells: [
        g.n + late,
        revealed ? votesText(g.v) : '＊＊＊',
        revealed ? pctText(g.p) : '＊＊＊',
        del
      ] };
    });
    fillTable($('h-list'), ['暱稱', '票數差距', '得票率差距', ''], rows);
  }

  function changed() {
    const ok = save();
    $('score').hidden = true;
    renderList();
    return ok;
  }

  $('h-import').addEventListener('click', () => {
    const { guesses: found, bad } = S.decodeAll($('h-paste').value);
    if (!found.length) {
      $('h-msg').textContent = bad ? '代碼不完整，請對方重新複製整段再傳一次。' : '沒有找到代碼（代碼開頭是 GUESS:）。';
      return;
    }
    guesses = S.merge(guesses, found);
    const ok = changed();
    const names = [...new Set(found.map(g => g.n))];
    let text = `已處理 ${names.join('、')}。同一暱稱只保留最新的一筆。`;
    if (bad) text += `\n另有 ${bad} 段代碼讀不出來，請重傳。`;
    if (!ok) text += '\n這個瀏覽器無法儲存資料，關掉頁面就會消失，請先按「複製備份」。';
    $('h-msg').textContent = text;
    $('h-paste').value = '';
  });

  $('h-backup').addEventListener('click', () => {
    if (!guesses.length) { $('h-msg').textContent = '名單是空的。'; return; }
    copy(guesses.map(S.encode).join('\n'), $('h-msg'));
  });
  $('h-toggle').addEventListener('click', () => { revealed = !revealed; renderList(); });
  $('h-clear').addEventListener('click', () => {
    if (!guesses.length || !confirm(`要清除全部 ${guesses.length} 人的猜測嗎？清掉就救不回來。`)) return;
    guesses = [];
    changed();
  });

  $('result-form').addEventListener('input', () => { $('score').hidden = true; });
  $('result-form').addEventListener('submit', e => {
    e.preventDefault();
    $('score').hidden = true;
    const lv = S.parseVotes($('r-lv').value), wv = S.parseVotes($('r-wv').value);
    const lp = S.parsePct($('r-lp').value), wp = S.parsePct($('r-wp').value);
    const msg = $('r-msg');
    if ([lv, wv, lp, wp].includes(null)) { msg.textContent = '四格都要填：票數填整數，％最多兩位小數。'; return; }
    if (lp + wp > 10000) { msg.textContent = '兩人得票率加起來超過 100％，請檢查。'; return; }
    if (Math.sign(lv - wv) !== Math.sign(lp - wp)) { msg.textContent = '票數和得票率的高低對不起來，請檢查。'; return; }
    if (!guesses.length) { msg.textContent = '名單裡還沒有人。'; return; }
    msg.textContent = '';
    showScore({ v: lv - wv, p: lp - wp });
  });

  function showScore(actual) {
    const { winV, winP, rows } = S.score(guesses, actual);
    const lines = [
      `實際結果：林國漳${votesText(actual.v)}、${pctText(actual.p)}`,
      `票數差距最準：${winV.join('、')}（每人 ${num(S.POT / winV.length)} 分）`,
      `得票率差距最準：${winP.join('、')}（每人 ${num(S.POT / winP.length)} 分）`
    ];
    $('score-summary').replaceChildren(...lines.map(t => {
      const p = document.createElement('p');
      p.className = 'winner';
      p.textContent = t;
      return p;
    }));
    fillTable($('score-table'), ['暱稱', '猜票數', '差', '猜％', '差', '得分'], rows.map(r => ({
      win: r.total > 0,
      cells: [r.n, votesText(r.v), num(r.dv), pctText(r.p), pct(r.dp), num(r.total)]
    })));
    resultText = ['【開票猜猜樂結果】', ...lines, '', ...rows.map(r =>
      `${r.n}：猜${votesText(r.v)}、${pctText(r.p)} → ${num(r.total)} 分`)].join('\n');
    $('score').hidden = false;
  }
  $('score-copy').addEventListener('click', () => copy(resultText, $('r-msg')));

  renderList();
})();
