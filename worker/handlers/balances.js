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
      offset:  '1000',
      sort:    'desc',
    }, env);
    
    if (data.status !== '1') return ok([]);
    
    // トークンごとに残高を集計
    const balances = {};
    
    for (const tx of data.result) {
      const token = tx.contractAddress?.toLowerCase();
      if (!token) continue;
      
      if (!balances[token]) {
        balances[token] = {
          symbol: tx.tokenSymbol || 'Unknown',
          name: tx.tokenName || 'Unknown Token',
          contractAddress: tx.contractAddress,
          decimals: parseInt(tx.tokenDecimal || '18'),
          balance: BigInt(0)
        };
      }
      
      const value = BigInt(tx.value || '0');
      const addrLower = address.toLowerCase();
      
      if (tx.to?.toLowerCase() === addrLower) {
        balances[token].balance += value;
      } else if (tx.from?.toLowerCase() === addrLower) {
        balances[token].balance -= value;
      }
    }
    
    // 残高がプラスのトークンのみ返す
    const result = Object.values(balances)
      .filter(t => t.balance > 0)
      .map(t => ({
        symbol: t.symbol,
        name: t.name,
        contractAddress: t.contractAddress,
        decimals: t.decimals,
        balance: t.balance.toString()
      }))
      .sort((a, b) => {
        const aVal = BigInt(a.balance);
        const bVal = BigInt(b.balance);
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      });
    
    return ok(result);
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
