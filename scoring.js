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

  function validGuess(g) {
    return !!g && typeof g.n === 'string' && g.n.trim() !== '' && g.n.length <= 20 &&
      Number.isInteger(g.v) && Math.abs(g.v) <= 9999999 &&
      Number.isInteger(g.p) && Math.abs(g.p) <= 10000 &&
      Number.isFinite(g.t);
  }

  function closest(guesses, key, actual) {
    if (!guesses.length) return [];
    const best = Math.min(...guesses.map(g => Math.abs(g[key] - actual)));
    return guesses.filter(g => Math.abs(g[key] - actual) === best).map(g => g.n);
  }

  function score(guesses, actual) {
    const winV = closest(guesses, 'v', actual.v);
    const winP = closest(guesses, 'p', actual.p);
    const rows = guesses.map(g => {
      const sv = winV.includes(g.n) ? POT / winV.length : 0;
      const sp = winP.includes(g.n) ? POT / winP.length : 0;
      return { ...g, dv: Math.abs(g.v - actual.v), dp: Math.abs(g.p - actual.p), sv, sp, total: sv + sp };
    });
    rows.sort((a, b) => b.total - a.total || a.dp - b.dp || a.dv - b.dv);
    return { winV, winP, rows };
  }

  const api = { POT, parseVotes, parsePct, validGuess, score };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Scoring = api;
})(this);
