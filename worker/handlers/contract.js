// worker/handlers/contract.js
// GET /api/contract?address=0x...&chain=ethereum
//
// 判定順（元コードの getExchangeName と同じロジック）:
//   1. ハードコードリストで即答
//   2. Etherscan でコントラクト名を取得
//   3. CoinGecko の取引所リストと名前照合

import { CHAIN_CONFIGS, ok, fail, etherscan, coingecko, isAddress, isChain } from '../_lib.js';

// ── ハードコードリスト（元コードの EXCHANGE_NAMES から移植）────
const KNOWN = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0x5a52e96bacdabb82fd05763e25335261b270efcb': 'Binance',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': 'Coinbase',
  '0xeb2629a2734e272bcc07bda959863f316f4bd4cf': 'Coinbase',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken',
  '0xe853c56864a2ebe4576a807d26fdc4a0ada51919': 'Kraken',
  '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0': 'Kraken',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap Router',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V4',
  '0x111111125421ca6dc452d289314280a0f8842a65': '1inch V5',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange',
  '0xd51a44d3fae010294c616388b506acda1bfaae46': 'Curve Finance',
  '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer Vault',
};

// Workers のグローバルスコープでキャッシュ（リクエスト間で共有される）
let cgExchangeCache = null;

async function getCgExchanges(env) {
  if (cgExchangeCache) return cgExchangeCache;
  try {
    cgExchangeCache = await coingecko('/exchanges/list', env);
    return cgExchangeCache;
  } catch {
    return [];
  }
}

export async function handleContract(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';

  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);

  const lower = address.toLowerCase();

  // ステップ1: ハードコードリストで即答
  if (KNOWN[lower]) {
    return ok({ contractName: KNOWN[lower], isCexDex: true, label: KNOWN[lower] });
  }

  try {
    // ステップ2: Etherscan でコントラクト名を取得
    const data = await etherscan({
      chainid: CHAIN_CONFIGS[chain].chainId,
      module: 'contract', action: 'getsourcecode', address,
    }, env);

    const contractName = (data.status === '1' && data.result?.[0]?.ContractName)
      ? data.result[0].ContractName
      : null;

    if (!contractName) {
      return ok({ contractName: null, isCexDex: false, label: null });
    }

    // ステップ3: CoinGecko の取引所リストと名前照合
    const exchanges = await getCgExchanges(env);
    const lc = contractName.toLowerCase();
    const match = exchanges.find(ex => {
      const n = ex.name?.toLowerCase() ?? '';
      return n && (lc.includes(n) || n.includes(lc));
    });

    return ok({
      contractName,
      isCexDex: !!match,
      label:    match ? match.name : contractName,
    });
  } catch (e) {
    return fail(`コントラクト取得エラー: ${e.message}`, 500);
  }
}
