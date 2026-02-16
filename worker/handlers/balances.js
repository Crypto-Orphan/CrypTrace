// worker/handlers/balances.js
// GET /api/balances?address=0x...&chain=ethereum
//
// 保有 ERC-20 トークン一覧と残高を返す
// 転送履歴から保有トークンを集計し、上位8件の残高を並行取得

import { CHAIN_CONFIGS, ok, fail, etherscan, isAddress, isChain } from '../_lib.js';

export async function handleBalances(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';

  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);

  const { chainId } = CHAIN_CONFIGS[chain];

  try {
    // ① ERC-20 転送履歴からトークン種別を集計
    const txData = await etherscan({
      chainid: chainId, module: 'account', action: 'tokentx',
      address, page: '1', offset: '200', sort: 'desc',
    }, env);

    if (txData.status !== '1' || !Array.isArray(txData.result)) return ok([]);

    const map = new Map();
    for (const tx of txData.result) {
      const addr = tx.contractAddress?.toLowerCase();
      if (!addr) continue;
      if (!map.has(addr)) map.set(addr, {
        contractAddress: addr,
        symbol:   tx.tokenSymbol  || '?',
        name:     tx.tokenName    || '?',
        decimals: parseInt(tx.tokenDecimal) || 18,
        txCount:  0,
      });
      map.get(addr).txCount++;
    }

    const tokens = [...map.values()]
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 8);

    // ② 残高を並行取得
    const withBal = await Promise.all(tokens.map(async t => {
      try {
        const b = await etherscan({
          chainid: chainId, module: 'account', action: 'tokenbalance',
          contractaddress: t.contractAddress, address, tag: 'latest',
        }, env);
        const balance = b.status === '1'
          ? parseFloat(b.result) / Math.pow(10, t.decimals)
          : 0;
        return { ...t, balance };
      } catch {
        return { ...t, balance: 0 };
      }
    }));

    return ok(withBal.filter(t => t.balance > 0));
  } catch (e) {
    return fail(`残高取得エラー: ${e.message}`, 500);
  }
}
