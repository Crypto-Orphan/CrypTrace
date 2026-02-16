// api/contract.js
// GET /api/contract?address=0x...&chain=ethereum
//
// コントラクト名を取得し、CEX/DEX かどうかを判定して返す
// 判定順: ハードコードリスト → Etherscan → CoinGecko

import { CHAIN, ok, fail, allowCors, etherscan, coingecko } from './_lib.js';

// よく使う取引所のハードコードリスト（API不要で即答）
const KNOWN = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': 'Coinbase',
  '0xeb2629a2734e272bcc07bda959863f316f4bd4cf': 'Coinbase',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken',
  '0xe853c56864a2ebe4576a807d26fdc4a0ada51919': 'Kraken',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap',
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap Router',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V4',
  '0x111111125421ca6dc452d289314280a0f8842a65': '1inch V5',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange',
  '0xd51a44d3fae010294c616388b506acda1bfaae46': 'Curve Finance',
  '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer',
};

// CoinGecko 取引所リスト（サーバー起動中は1回のみ取得）
let cgExchangeCache = null;
async function getCgExchanges() {
  if (cgExchangeCache) return cgExchangeCache;
  try {
    cgExchangeCache = await coingecko('/exchanges/list');
    return cgExchangeCache;
  } catch { return []; }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { allowCors(res); return res.status(204).end(); }

  const { address, chain = 'ethereum' } = req.query;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address))
    return fail(res, '有効なアドレスを指定してください');

  const cfg = CHAIN[chain];
  if (!cfg) return fail(res, `未対応チェーン: ${chain}`);

  const lower = address.toLowerCase();

  // ステップ1: ハードコードリストで即答
  if (KNOWN[lower]) {
    return ok(res, { contractName: KNOWN[lower], isCexDex: true, label: KNOWN[lower] });
  }

  try {
    // ステップ2: Etherscan でコントラクト名を取得
    const data = await etherscan({
      chainid: cfg.chainId, module: 'contract', action: 'getsourcecode', address,
    });
    const contractName = data.status === '1' ? (data.result?.[0]?.ContractName || null) : null;

    if (!contractName) {
      return ok(res, { contractName: null, isCexDex: false, label: null });
    }

    // ステップ3: CoinGecko 取引所リストと名前で照合
    const exchanges = await getCgExchanges();
    const lower2 = contractName.toLowerCase();
    const match = exchanges.find(ex => {
      const n = ex.name?.toLowerCase() || '';
      return n && (lower2.includes(n) || n.includes(lower2));
    });

    return ok(res, {
      contractName,
      isCexDex: !!match,
      label:    match ? match.name : contractName,
    });
  } catch (e) {
    return fail(res, `コントラクト取得エラー: ${e.message}`, 500);
  }
}
