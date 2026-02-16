// api/transactions.js
// GET /api/transactions?address=0x...&chain=ethereum&limit=20&type=native&token=0x...
//
// ブラウザから Etherscan に直接アクセスさせない。
// APIキーはサーバー側の環境変数にのみ存在する。

import { CHAIN, ok, fail, allowCors, etherscan } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { allowCors(res); return res.status(204).end(); }

  const { address, chain = 'ethereum', limit = '20', type = 'native', token } = req.query;

  // ── バリデーション ───────────────────────────────────────
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address))
    return fail(res, '有効なアドレスを指定してください (0x + 40文字)');

  const cfg = CHAIN[chain];
  if (!cfg) return fail(res, `未対応チェーン: ${chain}`);

  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const action = { native: 'txlist', erc20: 'tokentx', erc721: 'tokennfttx' }[type];
  if (!action) return fail(res, `未対応タイプ: ${type}`);

  // ── Etherscan API v2 呼び出し ────────────────────────────
  const params = {
    chainid: cfg.chainId,
    module:  'account',
    action,
    address,
    startblock: '0',
    endblock:   '99999999',
    page:       '1',
    offset:     String(limitNum),
    sort:       'desc',
  };
  if ((type === 'erc20' || type === 'erc721') && token) params.contractaddress = token;

  try {
    const data = await etherscan(params);
    if (data.status !== '1') return fail(res, data.message || 'トランザクションなし');
    return ok(res, data.result);
  } catch (e) {
    return fail(res, `API エラー: ${e.message}`, 500);
  }
}
