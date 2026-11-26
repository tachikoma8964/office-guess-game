// 計分與輸入處理。百分比一律用「百分之一％」的整數儲存，避免小數誤差造成同分判斷錯誤。
(function (root) {
  const POT = 500;

  // 接受全形數字與千分位逗號
  function clean(text) {
    return String(text).normalize('NFKC').replace(/[,\s%]/g, '');
  }

  function parseVotes(text) {
    const s = clean(text);
    return /^\d{1,7}$/.test(s) ? Number(s) : null;
  }

  function parsePct(text) {
    const s = clean(text);
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
    const v = Math.round(Number(s) * 100);
    return v <= 10000 ? v : null;
  }

  // 四個猜測項目：lv/wv 是得票數，lp/wp 是得票率（百分之一％的整數）
  const ITEMS = [
    { key: 'lv', label: '林國漳得票數' },
    { key: 'lp', label: '林國漳得票率' },
    { key: 'wv', label: '吳宗憲得票數' },
    { key: 'wp', label: '吳宗憲得票率' }
  ];

  const isVotes = v => Number.isInteger(v) && v >= 0 && v <= 9999999;
  const isPct = p => Number.isInteger(p) && p >= 0 && p <= 10000;

  function validGuess(g) {
    return !!g && typeof g.n === 'string' && g.n.trim() !== '' && g.n.length <= 20 &&
      isVotes(g.lv) && isVotes(g.wv) && isPct(g.lp) && isPct(g.wp) && g.lp + g.wp <= 10000 &&
      Number.isFinite(g.t);
  }

  function closest(guesses, key, actual) {
    if (!guesses.length) return [];
    const best = Math.min(...guesses.map(g => Math.abs(g[key] - actual)));
    return guesses.filter(g => Math.abs(g[key] - actual) === best).map(g => g.n);
  }

  function score(guesses, actual) {
    const items = ITEMS.map(item => ({ ...item, winners: closest(guesses, item.key, actual[item.key]) }));
    const rows = guesses.map(g => ({
      ...g,
      total: items.reduce((sum, item) => sum + (item.winners.includes(g.n) ? POT / item.winners.length : 0), 0)
    }));
    rows.sort((a, b) => b.total - a.total);
    return { items, rows };
  }

  const api = { POT, parseVotes, parsePct, validGuess, score };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Scoring = api;
})(this);
