const API = {
  async getTransactions(address, chain, limit, type, token) {
    const params = new URLSearchParams({ address, chain, limit, type });
    if (token) params.set('token', token);
    const res = await fetch(`/api/transactions?${params}`);
    return res.json();
  },

  async getBalances(address, chain) {
    const res = await fetch(`/api/balances?${new URLSearchParams({ address, chain })}`);
    return res.json();
  },

  async getContract(address, chain) {
    const res = await fetch(`/api/contract?${new URLSearchParams({ address, chain })}`);
    return res.json();
  },

  async searchToken(q, chain, by = 'symbol') {
    const res = await fetch(`/api/token-search?${new URLSearchParams({ q, chain, by })}`);
    return res.json();
  }
};
