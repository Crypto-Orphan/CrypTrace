// worker/index.js — Cloudflare Workers エントリーポイント
//
// 全リクエストはここで受け取りルーティングする。
// 静的ファイル (public/) は Cloudflare Pages が配信する。
// このWorkerは /api/* のみを処理する。

import { preflight, fail } from './_lib.js';
import { handleTransactions } from './handlers/transactions.js';
import { handleBalances }     from './handlers/balances.js';
import { handleContract }     from './handlers/contract.js';
import { handleTokenSearch }  from './handlers/token-search.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // プリフライト（CORS）
    if (request.method === 'OPTIONS') return preflight();
    if (request.method !== 'GET')     return fail('Method Not Allowed', 405);

    // /api/* ルーティング
    switch (url.pathname) {
      case '/api/transactions': return handleTransactions(url, env);
      case '/api/balances':     return handleBalances(url, env);
      case '/api/contract':     return handleContract(url, env);
      case '/api/token-search': return handleTokenSearch(url, env);
      default:                  return fail(`Not found: ${url.pathname}`, 404);
    }
  },
};
