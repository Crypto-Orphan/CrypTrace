// api/_lib.js  ─ バックエンド共通処理

export const CHAIN = {
  ethereum:  { chainId: '1'     },
  bsc:       { chainId: '56'    },
  polygon:   { chainId: '137'   },
  arbitrum:  { chainId: '42161' },
  optimism:  { chainId: '10'    },
  avalanche: { chainId: '43114' },
  base:      { chainId: '8453'  },
};

export function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function ok(res, data) {
  allowCors(res);
  return res.status(200).json({ ok: true, data });
}

export function fail(res, message, code = 400) {
  allowCors(res);
  return res.status(code).json({ ok: false, error: message });
}

// Etherscan API v2 への fetch（APIキーはここでのみ付与）
export async function etherscan(params) {
  const p = new URLSearchParams({ ...params, apikey: process.env.ETHERSCAN_API_KEY });
  const res = await fetch(`https://api.etherscan.io/v2/api?${p}`);
  return res.json();
}

// CoinGecko API への fetch（APIキーはここでのみ付与）
export async function coingecko(path) {
  const res = await fetch(`https://api.coingecko.com/api/v3${path}`, {
    headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}
