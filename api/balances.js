// api/balances.js
// GET /api/balances?address=0x...&chain=ethereum
//
// アドレスが保有する ERC-20 トークン一覧と残高を返す

import { CHAIN, ok, fail, allowCors, etherscan } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { allowCors(res); return res.status(204).end(); }

  const { address, chain = 'ethereum' } = req.query;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address))
    return fail(res, '有効なアドレスを指定してください');

  const cfg = CHAIN[chain];
  if (!cfg) return fail(res, `未対応チェーン: ${chain}`);

  try {
    // ── 保有トークン一覧（転送履歴から集計）──────────────
    const txData = await etherscan({
      chainid: cfg.chainId, module: 'account', action: 'tokentx',
      address, page: '1', offset: '200', sort: 'desc',
    });

    if (txData.status !== '1' || !Array.isArray(txData.result)) return ok(res, []);

    const map = new Map();
    txData.result.forEach(tx => {
      const addr = tx.contractAddress?.toLowerCase();
      if (!addr) return;
      if (!map.has(addr)) map.set(addr, {
        contractAddress: addr,
        symbol:   tx.tokenSymbol  || '?',
        name:     tx.tokenName    || '?',
        decimals: parseInt(tx.tokenDecimal) || 18,
        txCount:  0,
      });
      map.get(addr).txCount++;
    });
    const tokens = [...map.values()].sort((a, b) => b.txCount - a.txCount).slice(0, 8);

    // ── 個別残高を並行取得（上位8件）────────────────────
    const withBal = await Promise.all(tokens.map(async t => {
      try {
        const balData = await etherscan({
          chainid: cfg.chainId, module: 'account', action: 'tokenbalance',
          contractaddress: t.contractAddress, address, tag: 'latest',
        });
        const raw = balData.status === '1' ? balData.result : '0';
        const balance = parseFloat(raw) / Math.pow(10, t.decimals);
        return { ...t, balance };
      } catch { return { ...t, balance: 0 }; }
    }));

    return ok(res, withBal.filter(t => t.balance > 0));
  } catch (e) {
    return fail(res, `残高取得エラー: ${e.message}`, 500);
  }
}
