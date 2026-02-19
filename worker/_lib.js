export const CHAIN_CONFIGS = {
  ethereum:  { chainId: '1',     name: 'Ethereum',  symbol: 'ETH',  decimals: 18 },
  bsc:       { chainId: '56',    name: 'BSC',        symbol: 'BNB',  decimals: 18 },
  polygon:   { chainId: '137',   name: 'Polygon',    symbol: 'MATIC',decimals: 18 },
  arbitrum:  { chainId: '42161', name: 'Arbitrum',   symbol: 'ETH',  decimals: 18 },
  optimism:  { chainId: '10',    name: 'Optimism',   symbol: 'ETH',  decimals: 18 },
  avalanche: { chainId: '43114', name: 'Avalanche',  symbol: 'AVAX', decimals: 18 },
  base:      { chainId: '8453',  name: 'Base',       symbol: 'ETH',  decimals: 18 },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const ok = (data) =>
  new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

export const fail = (message, status = 400) =>
  new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

export const preflight = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export async function etherscan(params, env) {
  const p = new URLSearchParams({ ...params, apikey: env.ETHERSCAN_API_KEY });
  const res = await fetch(`https://api.etherscan.io/v2/api?${p}`);
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}

export async function coingecko(path, env) {
  const res = await fetch(`https://api.coingecko.com/api/v3${path}`, {
    headers: { 'x-cg-demo-api-key': env.COINGECKO_API_KEY },
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

export const isAddress = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);
export const isChain   = (s) => s in CHAIN_CONFIGS;
