// worker/handlers/transactions.js
// GET /api/transactions
//   ?address=0x...   ウォレットアドレス（必須）
//   &chain=ethereum  チェーン名（省略時: ethereum）
//   &limit=20        取得件数（最大100）
//   &type=native     native | erc20 | erc721
//   &token=0x...     ERC-20/721 のコントラクトアドレス（type=erc20/721 時）

import { CHAIN_CONFIGS, ok, fail, etherscan, isAddress, isChain } from '../_lib.js';

export async function handleTransactions(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';
  const limit   = url.searchParams.get('limit')   ?? '20';
  const type    = url.searchParams.get('type')    ?? 'native';
  const token   = url.searchParams.get('token')   ?? '';

  // バリデーション
  if (!isAddress(address)) return fail('address が不正です (0x + 40文字の16進数)');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);

  const ACTION = { native: 'txlist', erc20: 'tokentx', erc721: 'tokennfttx' };
  if (!(type in ACTION))   return fail(`未対応タイプ: ${type}`);

  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const cfg = CHAIN_CONFIGS[chain];

  const params = {
    chainid:    cfg.chainId,
    module:     'account',
    action:     ACTION[type],
    address,
    startblock: '0',
    endblock:   '99999999',
    page:       '1',
    offset:     String(limitNum),
    sort:       'desc',
  };
  if ((type === 'erc20' || type === 'erc721') && token) {
    params.contractaddress = token;
  }

  try {
    const data = await etherscan(params, env);
    if (data.status !== '1') return fail(data.message || 'トランザクションなし');
    return ok(data.result);
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
