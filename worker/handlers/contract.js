// worker/handlers/contract.js
import { CHAIN_CONFIGS, ok, fail, etherscan, coingecko, isAddress, isChain } from '../_lib.js';
const KNOWN = {
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance', type: 'CEX' },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { label: 'Binance', type: 'CEX' },
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': { label: 'Binance', type: 'CEX' },
  '0xf977814e90da44bfa03b6295a0616a897441acec': { label: 'Binance', type: 'CEX' },
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': { label: 'Coinbase', type: 'CEX' },
  '0x503828976d22510aad0201ac7ec88293211d23da': { label: 'Coinbase', type: 'CEX' },
  '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': { label: 'Coinbase', type: 'CEX' },
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': { label: 'Kraken', type: 'CEX' },
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': { label: 'Kraken', type: 'CEX' },
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': { label: 'OKX', type: 'CEX' },
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': { label: 'Bybit', type: 'CEX' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { label: 'Uniswap V2', type: 'DEX' },
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { label: 'Uniswap V3', type: 'DEX' },
  '0xe592427a0aece92de3edee1f18e0157c05861564': { label: 'Uniswap V3', type: 'DEX' },
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { label: 'Uniswap V4', type: 'DEX' },
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { label: 'SushiSwap', type: 'DEX' },
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': { label: 'PancakeSwap', type: 'DEX' },
  '0x1111111254fb6c44bac0bed2854e76f90643097d': { label: '1inch V4', type: 'DEX' },
  '0x111111125421ca6dc452d289314280a0f8842a65': { label: '1inch V5', type: 'DEX' },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { label: '0x Exchange', type: 'DEX' },
  '0xd51a44d3fae010294c616388b506acda1bfaae46': { label: 'Curve Finance', type: 'DEX' },
  '0xba12222222228d8ba445958a75a0704d566bf2c8': { label: 'Balancer', type: 'DEX' },
};
const CEX_KW = ['binance','coinbase','kraken','okx','bybit','huobi','kucoin','bitfinex','gemini','bitstamp'];
const DEX_KW = ['uniswap','sushiswap','pancakeswap','curve','balancer','1inch','dydx','router','swap','dex'];
const PROXY_PATTERNS = ['proxy','upgradeable','transparent','beacon','eip1967'];
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
