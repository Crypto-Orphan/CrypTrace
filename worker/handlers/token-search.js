// worker/handlers/token-search.js
// GET /api/token-search?q=USDT&chain=ethereum&by=symbol
// GET /api/token-search?q=0x...&chain=ethereum&by=address

import { CHAIN_CONFIGS, ok, fail, etherscan, coingecko, isAddress, isChain } from '../_lib.js';

const COINGECKO_PLATFORM = {
  ethereum:  'ethereum',
  bsc:       'binance-smart-chain',
  polygon:   'polygon-pos',
  arbitrum:  'arbitrum-one',
  optimism:  'optimistic-ethereum',
  avalanche: 'avalanche',
  base:      'base',
};

// シンボルで検索（元コードの searchTokenBySymbol を移植）
async function bySymbol(symbol, chain, env) {
  const platform = COINGECKO_PLATFORM[chain];
  if (!platform) throw new Error(`${chain} はシンボル検索に未対応`);

  const upper = symbol.toUpperCase();

  // CoinGecko で検索
  const searchData = await coingecko(`/search?query=${encodeURIComponent(symbol)}`, env);
  const matched = (searchData.coins ?? []).filter(c => c.symbol.toUpperCase() === upper);
  if (!matched.length) throw new Error(`"${symbol}" が見つかりませんでした`);

  // 上位3件のコントラクトアドレスを取得
  const results = [];
  for (const coin of matched.slice(0, 3)) {
    try {
      const detail = await coingecko(
        `/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`,
        env
      );
      const addr = detail.platforms?.[platform];
      if (addr) results.push({
        symbol:   detail.symbol.toUpperCase(),
        name:     detail.name,
        address:  addr.toLowerCase(),
        decimals: 18,
        source:   'CoinGecko',
      });
    } catch {}
  }

  if (!results.length) throw new Error(`"${symbol}" の ${chain} 上のアドレスが見つかりませんでした`);
  return results;
}

// アドレスで検索（元コードの searchTokenByAddress を移植）
async function byAddress(address, chain, env) {
  const data = await etherscan({
    chainid: CHAIN_CONFIGS[chain].chainId,
    module: 'token', action: 'tokeninfo', contractaddress: address,
  }, env);

  if (data.status === '1' && data.result?.length) {
    const d = data.result[0];
    return [{
      symbol:   d.symbol    || 'Unknown',
      name:     d.tokenName || d.name || 'Unknown Token',
      address:  address.toLowerCase(),
      decimals: parseInt(d.divisor || d.decimals || '18'),
      source:   'Etherscan',
    }];
  }
  throw new Error('トークン情報を取得できませんでした');
}

export async function handleTokenSearch(url, env) {
  const q     = url.searchParams.get('q')     ?? '';
  const chain = url.searchParams.get('chain') ?? 'ethereum';
  const by    = url.searchParams.get('by')    ?? 'symbol';

  if (!q)            return fail('q パラメータを指定してください');
  if (!isChain(chain)) return fail(`未対応チェーン: ${chain}`);

  try {
    const results = (by === 'address')
      ? await byAddress(q, chain, env)
      : await bySymbol(q, chain, env);
    return ok(results);
  } catch (e) {
    return fail(e.message);
  }
}
