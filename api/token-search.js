// api/token-search.js
// GET /api/token-search?q=USDT&chain=ethereum&by=symbol
// GET /api/token-search?q=0x...&chain=ethereum&by=address
//
// シンボル検索 → CoinGecko でコントラクトアドレスを取得
// アドレス検索 → Etherscan v2 tokeninfo

import { CHAIN, ok, fail, allowCors, etherscan, coingecko } from './_lib.js';

const PLATFORM = {
  ethereum:  'ethereum',
  bsc:       'binance-smart-chain',
  polygon:   'polygon-pos',
  arbitrum:  'arbitrum-one',
  optimism:  'optimistic-ethereum',
  avalanche: 'avalanche',
  base:      'base',
};

async function bySymbol(q, chain) {
  const platform = PLATFORM[chain];
  if (!platform) throw new Error(`${chain} はシンボル検索に未対応`);

  // CoinGecko 検索
  const searchData = await coingecko(`/search?query=${encodeURIComponent(q)}`);
  const upper = q.toUpperCase();
  const matched = (searchData.coins || []).filter(c => c.symbol.toUpperCase() === upper);
  if (!matched.length) throw new Error(`"${q}" が見つかりませんでした`);

  // 上位3件のコントラクトアドレスを取得
  const results = [];
  for (const coin of matched.slice(0, 3)) {
    try {
      const detail = await coingecko(
        `/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`
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
  if (!results.length) throw new Error(`"${q}" の ${chain} 上のアドレスが見つかりませんでした`);
  return results;
}

async function byAddress(q, chain) {
  const cfg = CHAIN[chain];
  const data = await etherscan({
    chainid: cfg.chainId, module: 'token', action: 'tokeninfo', contractaddress: q,
  });
  if (data.status === '1' && data.result?.length) {
    const d = data.result[0];
    return [{
      symbol:   d.symbol || 'Unknown',
      name:     d.tokenName || d.name || 'Unknown Token',
      address:  q.toLowerCase(),
      decimals: parseInt(d.divisor || d.decimals || '18'),
      source:   'Etherscan',
    }];
  }
  throw new Error('トークン情報を取得できませんでした');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { allowCors(res); return res.status(204).end(); }

  const { q, chain = 'ethereum', by = 'symbol' } = req.query;

  if (!q) return fail(res, '検索ワード (q) を指定してください');
  if (!CHAIN[chain]) return fail(res, `未対応チェーン: ${chain}`);

  try {
    const results = by === 'address'
      ? await byAddress(q, chain)
      : await bySymbol(q, chain);
    return ok(res, results);
  } catch (e) {
    return fail(res, e.message);
  }
}
