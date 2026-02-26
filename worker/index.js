import { preflight, fail } from './_lib.js';
import { handleTransactions } from './handlers/transactions.js';
import { handleBalances }     from './handlers/balances.js';
import { handleContract }     from './handlers/contract.js';
import { handleTokenSearch }  from './handlers/token-search.js';
import { handleNativeBalance } from './handlers/native-balance.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return preflight();
    if (request.method !== 'GET')     return fail('Method Not Allowed', 405);
    switch (url.pathname) {
      case '/api/transactions':     return handleTransactions(url, env);
      case '/api/balances':         return handleBalances(url, env);
      case '/api/contract':         return handleContract(url, env);
      case '/api/token-search':     return handleTokenSearch(url, env);
      case '/api/native-balance':   return handleNativeBalance(url, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return fail('Not Found', 404);
  },
};
