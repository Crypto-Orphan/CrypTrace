// public/js/api-client.js
// ============================================================
// ⚠️ このファイルに APIキーは一切書かない
//    全ての外部API通信は Cloudflare Workers 経由で行う
//
// 開発時 (wrangler dev): http://localhost:3000
// 本番   (Cloudflare):   Workers のURL or 同一ドメイン
// ============================================================

const WORKER_BASE = (() => {
  const h = window.location.hostname;
  // wrangler dev はデフォルト localhost:8787
  // devcontainer では 3000 にポートフォワードする
  return (h === 'localhost' || h === '127.0.0.1') ? '' : '';
  // 本番でWorkerが別ドメインの場合はここを変更:
  // return 'https://cryptrace-api.your-name.workers.dev';
})();

async function call(path) {
  const res = await fetch(`${WORKER_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Worker エラー');
  return json.data;
}

// グローバルオブジェクトとして公開（app.js から API.xxx() で呼べる）
const API = {

  // トランザクション取得
  // type: 'native' | 'erc20' | 'erc721'
  getTransactions(address, chain, limit, type, token) {
    const p = new URLSearchParams({ address, chain, limit, type });
    if (token) p.set('token', token);
    return call(`/api/transactions?${p}`);
  },

  // ERC-20 残高一覧
  getBalances(address, chain) {
    return call(`/api/balances?${new URLSearchParams({ address, chain })}`);
  },

  // コントラクト名・CEX/DEX判定
  // 返値: { contractName, isCexDex, label }
  getContract(address, chain) {
    return call(`/api/contract?${new URLSearchParams({ address, chain })}`);
  },

  // トークン検索
  // by: 'symbol' | 'address'
  searchToken(q, chain, by = 'symbol') {
    return call(`/api/token-search?${new URLSearchParams({ q, chain, by })}`);
  },

};
