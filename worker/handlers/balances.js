import { CHAIN_CONFIGS, ok, fail, etherscan, isAddress, isChain } from '../_lib.js';

export async function handleBalances(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';

  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);

  const cfg = CHAIN_CONFIGS[chain];

  try {
    const data = await etherscan({
      chainid: cfg.chainId,
      module:  'account',
      action:  'tokentx',
      address,
      startblock: '0',
      endblock:   '99999999',
      page:    '1',
      offset:  '100',
      sort:    'desc',
    }, env);

    if (data.status !== '1') return ok([]);

    const seen = new Set();
    const unique = [];
    for (const tx of data.result) {
      const addr = tx.contractAddress?.toLowerCase();
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        unique.push({
          symbol:          tx.tokenSymbol || 'Unknown',
          name:            tx.tokenName   || 'Unknown Token',
          contractAddress: tx.contractAddress,
          decimals:        parseInt(tx.tokenDecimal || '18'),
        });
      }
    }
    return ok(unique);
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
