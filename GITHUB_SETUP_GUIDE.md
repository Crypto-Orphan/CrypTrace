# 🚀 GitHub リポジトリ 完全再構築ガイド

## 📋 準備するもの

- ✅ GitHub アカウント
- ✅ 修正済みファイル（全てダウンロード済み）
- ✅ Etherscan API キー: `Z8Z96U1CIUE268PWZN4TYIIR76CRG55MQ9`
- ✅ CoinGecko API キー: `CG-nKcC9pYnkpUVpLWy4PgKHRf4`

---

## 🗂️ ステップ1: GitHubで新規リポジトリ作成

### 1-1. GitHub.comにアクセス

https://github.com/new

### 1-2. リポジトリ設定

```
Repository name: CrypTrace
Description: Blockchain Transaction Explorer with Cloudflare Workers
Public / Private: お好みで
✅ Add a README file (チェックを入れる)
✅ Add .gitignore: Node
License: MIT (お好みで)
```

### 1-3. 「Create repository」をクリック

---

## 📂 ステップ2: ローカルフォルダ構造を作成

### 2-1. 作業フォルダ作成

デスクトップまたは任意の場所で：

```bash
mkdir CrypTrace
cd CrypTrace
git init
git remote add origin https://github.com/YOUR_USERNAME/CrypTrace.git
```

### 2-2. フォルダ構造を作成

```bash
mkdir -p public/js
mkdir -p public/css
mkdir -p worker/handlers
mkdir -p .devcontainer
```

---

## 📁 ステップ3: ファイルを配置

### 3-1. フロントエンド（public/）

**ダウンロードしたファイルを配置:**

```
public/
├── index.html          ← index.html
├── css/
│   └── style.css       ← style.css
└── js/
    ├── api-client.js   ← api-client.js
    ├── constants.js    ← constants.js
    ├── exchange.js     ← exchange.js
    ├── particle.js     ← particle.js
    ├── graph.js        ← graph.js
    └── ui.js           ← ui.js (修正版)
```

---

### 3-2. バックエンド（worker/）

**以下の内容でファイルを作成:**

#### `worker/_lib.js`
```javascript
// worker/_lib.js — Cloudflare Workers 共通処理
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
```

#### `worker/index.js`
```javascript
// worker/index.js — ルーター
import { preflight, fail } from './_lib.js';
import { handleTransactions } from './handlers/transactions.js';
import { handleBalances }     from './handlers/balances.js';
import { handleContract }     from './handlers/contract.js';
import { handleTokenSearch }  from './handlers/token-search.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight();
    if (request.method !== 'GET')     return fail('Method Not Allowed', 405);

    switch (url.pathname) {
      case '/api/transactions': return handleTransactions(url, env);
      case '/api/balances':     return handleBalances(url, env);
      case '/api/contract':     return handleContract(url, env);
      case '/api/token-search': return handleTokenSearch(url, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return fail('Not Found', 404);
  },
};
```

#### `worker/handlers/transactions.js`
```javascript
// worker/handlers/transactions.js
import { CHAIN_CONFIGS, ok, fail, etherscan, isAddress, isChain } from '../_lib.js';

export async function handleTransactions(url, env) {
  const address = url.searchParams.get('address') ?? '';
  const chain   = url.searchParams.get('chain')   ?? 'ethereum';
  const limit   = url.searchParams.get('limit')   ?? '20';
  const type    = url.searchParams.get('type')    ?? 'native';
  const token   = url.searchParams.get('token')   ?? '';

  if (!isAddress(address)) return fail('address が不正です');
  if (!isChain(chain))     return fail(`未対応チェーン: ${chain}`);

  const ACTION = { native: 'txlist', erc20: 'tokentx', erc721: 'tokennfttx' };
  if (!(type in ACTION))   return fail(`未対応タイプ: ${type}`);

  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const cfg = CHAIN_CONFIGS[chain];

  const params = {
    chainid:    cfg.chainId,
    module:     'account',
    action:     ACTION[type],
    address,
    startblock: '0',
    endblock:   '99999999',
    page:       '1',
    offset:     String(limitNum),
    sort:       'desc',
  };
  if ((type === 'erc20' || type === 'erc721') && token) {
    params.contractaddress = token;
  }

  try {
    const data = await etherscan(params, env);
    if (data.status !== '1') return fail(data.message || 'トランザクションなし');
    return ok(data.result);
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
```

#### `worker/handlers/balances.js`
```javascript
// worker/handlers/balances.js
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
      offset:  '100',
      sort:    'desc',
    }, env);

    if (data.status !== '1') return ok([]);

    const seen = new Set();
    const unique = [];
    for (const tx of data.result) {
      const addr = tx.contractAddress?.toLowerCase();
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        unique.push({
          symbol:          tx.tokenSymbol || 'Unknown',
          name:            tx.tokenName   || 'Unknown Token',
          contractAddress: tx.contractAddress,
          decimals:        parseInt(tx.tokenDecimal || '18'),
        });
      }
    }
    return ok(unique);
  } catch (e) {
    return fail(`Etherscan エラー: ${e.message}`, 500);
  }
}
```

#### `worker/handlers/contract.js`
```javascript
// worker/handlers/contract.js
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
```

#### `worker/handlers/token-search.js`
```javascript
// worker/handlers/token-search.js
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

async function bySymbol(symbol, chain, env) {
  const platform = COINGECKO_PLATFORM[chain];
  if (!platform) throw new Error(`${chain} はシンボル検索に未対応`);
  const upper = symbol.toUpperCase();
  const searchData = await coingecko(`/search?query=${encodeURIComponent(symbol)}`, env);
  const matched = (searchData.coins ?? []).filter(c => c.symbol.toUpperCase() === upper);
  if (!matched.length) throw new Error(`"${symbol}" が見つかりませんでした`);
  const results = [];
  for (const coin of matched.slice(0, 3)) {
    try {
      const detail = await coingecko(`/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`, env);
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
    const results = (by === 'address') ? await byAddress(q, chain, env) : await bySymbol(q, chain, env);
    return ok(results);
  } catch (e) {
    return fail(e.message);
  }
}
```

---

### 3-3. 設定ファイル

#### `wrangler.toml`
```toml
name               = "cryptrace-api"
main               = "worker/index.js"
compatibility_date = "2024-09-23"

[assets]
directory = "./public"

[vars]
ENVIRONMENT = "production"

[dev]
port           = 8787
local_protocol = "http"
ip             = "0.0.0.0"
```

#### `package.json`
```json
{
  "name": "cryptrace",
  "version": "1.0.0",
  "description": "Blockchain Explorer with Cloudflare Workers",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail"
  },
  "keywords": ["blockchain", "ethereum", "explorer"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "wrangler": "^3.114.0"
  }
}
```

#### `.gitignore`
```
node_modules/
.wrangler/
.dev.vars
dist/
.DS_Store
```

#### `.dev.vars.example`
```
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY_HERE
COINGECKO_API_KEY=YOUR_COINGECKO_API_KEY_HERE
```

#### `.dev.vars` (ローカル専用・コミット禁止)
```
ETHERSCAN_API_KEY=Z8Z96U1CIUE268PWZN4TYIIR76CRG55MQ9
COINGECKO_API_KEY=CG-nKcC9pYnkpUVpLWy4PgKHRf4
```

#### `.devcontainer/devcontainer.json`
```json
{
  "name": "CrypTrace",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:22",
  "postCreateCommand": "npm install",
  "forwardPorts": [8787],
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint"
      ]
    }
  }
}
```

#### `README.md`
```markdown
# CrypTrace — Blockchain Explorer

Cloudflare Workers + Vanilla JS

## 開発

```bash
npm install
npm run dev
```

## デプロイ

```bash
npx wrangler login
npx wrangler secret put ETHERSCAN_API_KEY
npx wrangler secret put COINGECKO_API_KEY
npm run deploy
```

詳細は `/docs/README.md` を参照
```

---

## 🚀 ステップ4: GitHubにプッシュ

```bash
git add .
git commit -m "Initial commit: Cloudflare Workers + Vanilla JS"
git branch -M main
git push -u origin main
```

---

## ✅ ステップ5: GitHub Codespaces で起動

1. GitHubリポジトリページ → `Code` → `Codespaces` → `Create codespace`
2. 自動で環境構築（`.devcontainer/devcontainer.json`）
3. ターミナルで:
```bash
npm run dev
```
4. ポート8787をブラウザで開く

---

## 🎉 完了！

これで完全に新しいリポジトリでCrypTraceが動作します。
