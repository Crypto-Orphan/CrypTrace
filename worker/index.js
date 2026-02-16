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

    // /api/* → Workers で処理
    switch (url.pathname) {
      case '/api/transactions': return handleTransactions(url, env);
      case '/api/balances':     return handleBalances(url, env);
      case '/api/contract':     return handleContract(url, env);
      case '/api/token-search': return handleTokenSearch(url, env);
    }

    // それ以外 → 静的ファイルを返す
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const asset = await env.ASSETS.fetch(new Request(new URL(path, url.origin)));
    if (asset.status === 404) return fail('Not Found', 404);
    return asset;
  },
};
