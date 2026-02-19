import { CHAIN_CONFIGS, ok, fail, etherscan, coingecko, isAddress, isChain } from '../_lib.js';

const KNOWN = {
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance', type: 'CEX' },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { label: 'Binance', type: 'CEX' },
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': { label: 'Coinbase', type: 'CEX' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { label: 'Uniswap V2', type: 'DEX' },
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { label: 'Uniswap V3', type: 'DEX' },
};

const CEX_KW = ['binance','coinbase','kraken','okx','bybit'];
const DEX_KW = ['uniswap','sushiswap','pancakeswap','curve','balancer','1inch','dex'];
const PROXY_PATTERNS = ['proxy','upgradeable','transparent'];

let cgExchangeCache = null;
async function getCgExchanges(env) {
  if (cgExchangeCache) return cgExchangeCache;
  try { cgExchangeCache = await coingecko('/exchanges/list', env); return cgExchangeCache; }
  catch { return []; }
}

async function getContractName(address, chainId, env) {
  const data = await etherscan({ chainid: chainId, module: 'contract', action: 'getsourcecode', address }, env);
  if (data.status !== '1' || !data.result?.[0]) return null;
  const result = data.result[0];
  const name = result.ContractName || null;
  const impl = result.Implementation || null;
  if (name && PROXY_PATTERNS.some(p => name.toLowerCase().includes(p)) && impl && impl !== '0x0000000000000000000000000000000000000000') {
    try {
      const implData = await etherscan({ chainid: chainId, module: 'contract', action: 'getsourcecode', address: impl }, env);
      const implName = implData.result?.[0]?.ContractName;
      if (implName && !PROXY_PATTERNS.some(p => implName.toLowerCase().includes(p))) return implName;
    } catch {}
  }
  return name;
}

export async function handleContract(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';
  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);
  const lower   = address.toLowerCase();
  const chainId = CHAIN_CONFIGS[chain].chainId;
  if (KNOWN[lower]) {
    const k = KNOWN[lower];
    return ok({ contractName: k.label, isCexDex: true, label: k.label, exchangeType: k.type });
  }
  try {
    const contractName = await getContractName(lower, chainId, env);
    if (!contractName) return ok({ contractName: null, isCexDex: false, label: null, exchangeType: null });
    const lc = contractName.toLowerCase();
    for (const kw of CEX_KW) {
      if (lc.includes(kw)) return ok({ contractName, isCexDex: true, label: contractName, exchangeType: 'CEX' });
    }
    for (const kw of DEX_KW) {
      if (lc.includes(kw)) return ok({ contractName, isCexDex: true, label: contractName, exchangeType: 'DEX' });
    }
    const exchanges = await getCgExchanges(env);
    const match = exchanges.find(ex => { const n = ex.name?.toLowerCase() ?? ''; return n.length > 3 && (lc.includes(n) || n.includes(lc)); });
    if (match) return ok({ contractName, isCexDex: true, label: match.name, exchangeType: 'CEX/DEX' });
    return ok({ contractName, isCexDex: false, label: contractName, exchangeType: 'Contract' });
  } catch (e) {
    return fail(`コントラクト取得エラー: ${e.message}`, 500);
  }
}
