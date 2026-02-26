import { CHAIN_CONFIGS, ok, fail, etherscan, isAddress, isChain } from '../_lib.js';

export async function handleNativeBalance(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';
  
  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);
  
  const cfg = CHAIN_CONFIGS[chain];
  
  try {
    const data = await etherscan({
      chainid: cfg.chainId,
      module:  'account',
      action:  'balance',
      address: address,
      tag:     'latest',
    }, env);
    
    if (data.status !== '1') {
      return ok({ balance: '0', symbol: cfg.symbol });
    }
    
    return ok({
      balance: data.result,
      symbol: cfg.symbol,
      decimals: cfg.decimals || 18
    });
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
