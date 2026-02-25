var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-4mS46E/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker/_lib.js
var CHAIN_CONFIGS = {
  ethereum: { chainId: "1", name: "Ethereum", symbol: "ETH", decimals: 18 },
  bsc: { chainId: "56", name: "BSC", symbol: "BNB", decimals: 18 },
  polygon: { chainId: "137", name: "Polygon", symbol: "MATIC", decimals: 18 },
  arbitrum: { chainId: "42161", name: "Arbitrum", symbol: "ETH", decimals: 18 },
  optimism: { chainId: "10", name: "Optimism", symbol: "ETH", decimals: 18 },
  avalanche: { chainId: "43114", name: "Avalanche", symbol: "AVAX", decimals: 18 },
  base: { chainId: "8453", name: "Base", symbol: "ETH", decimals: 18 }
};
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var ok = /* @__PURE__ */ __name((data) => new Response(JSON.stringify({ ok: true, data }), {
  status: 200,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS }
}), "ok");
var fail = /* @__PURE__ */ __name((message, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), {
  status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS }
}), "fail");
var preflight = /* @__PURE__ */ __name(() => new Response(null, { status: 204, headers: CORS_HEADERS }), "preflight");
async function etherscan(params, env) {
  const p = new URLSearchParams({ ...params, apikey: env.ETHERSCAN_API_KEY });
  const res = await fetch(`https://api.etherscan.io/v2/api?${p}`);
  if (!res.ok)
    throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}
__name(etherscan, "etherscan");
async function coingecko(path, env) {
  const res = await fetch(`https://api.coingecko.com/api/v3${path}`, {
    headers: { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
  });
  if (!res.ok)
    throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}
__name(coingecko, "coingecko");
var isAddress = /* @__PURE__ */ __name((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "isAddress");
var isChain = /* @__PURE__ */ __name((s) => s in CHAIN_CONFIGS, "isChain");

// worker/handlers/transactions.js
async function handleTransactions(url, env) {
  const address = url.searchParams.get("address") ?? "";
  const chain = url.searchParams.get("chain") ?? "ethereum";
  const limit = url.searchParams.get("limit") ?? "20";
  const type = url.searchParams.get("type") ?? "native";
  const token = url.searchParams.get("token") ?? "";
  if (!isAddress(address))
    return fail("address \u304C\u4E0D\u6B63\u3067\u3059");
  if (!isChain(chain))
    return fail(`\u672A\u5BFE\u5FDC\u30C1\u30A7\u30FC\u30F3: ${chain}`);
  const ACTION = { native: "txlist", erc20: "tokentx", erc721: "tokennfttx" };
  if (!(type in ACTION))
    return fail(`\u672A\u5BFE\u5FDC\u30BF\u30A4\u30D7: ${type}`);
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const cfg = CHAIN_CONFIGS[chain];
  const params = {
    chainid: cfg.chainId,
    module: "account",
    action: ACTION[type],
    address,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(limitNum),
    sort: "desc"
  };
  if ((type === "erc20" || type === "erc721") && token) {
    params.contractaddress = token;
  }
  try {
    const data = await etherscan(params, env);
    if (data.status !== "1")
      return fail(data.message || "\u30C8\u30E9\u30F3\u30B6\u30AF\u30B7\u30E7\u30F3\u306A\u3057");
    return ok(data.result);
  } catch (e) {
    return fail(`Etherscan \u30A8\u30E9\u30FC: ${e.message}`, 500);
  }
}
__name(handleTransactions, "handleTransactions");

// worker/handlers/balances.js
async function handleBalances(url, env) {
  const address = url.searchParams.get("address") ?? "";
  const chain = url.searchParams.get("chain") ?? "ethereum";
  if (!isAddress(address))
    return fail("address \u304C\u4E0D\u6B63\u3067\u3059");
  if (!isChain(chain))
    return fail(`\u672A\u5BFE\u5FDC\u30C1\u30A7\u30FC\u30F3: ${chain}`);
  const cfg = CHAIN_CONFIGS[chain];
  try {
    const data = await etherscan({
      chainid: cfg.chainId,
      module: "account",
      action: "tokentx",
      address,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: "100",
      sort: "desc"
    }, env);
    if (data.status !== "1")
      return ok([]);
    const seen = /* @__PURE__ */ new Set();
    const unique = [];
    for (const tx of data.result) {
      const addr = tx.contractAddress?.toLowerCase();
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        unique.push({
          symbol: tx.tokenSymbol || "Unknown",
          name: tx.tokenName || "Unknown Token",
          contractAddress: tx.contractAddress,
          decimals: parseInt(tx.tokenDecimal || "18")
        });
      }
    }
    return ok(unique);
  } catch (e) {
    return fail(`Etherscan \u30A8\u30E9\u30FC: ${e.message}`, 500);
  }
}
__name(handleBalances, "handleBalances");

// worker/handlers/contract.js
var KNOWN = {
  "0x28c6c06298d514db089934071355e5743bf21d60": { label: "Binance", type: "CEX" },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { label: "Binance", type: "CEX" },
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { label: "Coinbase", type: "CEX" },
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { label: "Uniswap V2", type: "DEX" },
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { label: "Uniswap V3", type: "DEX" }
};
var CEX_KW = ["binance", "coinbase", "kraken", "okx", "bybit"];
var DEX_KW = ["uniswap", "sushiswap", "pancakeswap", "curve", "balancer", "1inch", "dex"];
var PROXY_PATTERNS = ["proxy", "upgradeable", "transparent"];
var cgExchangeCache = null;
async function getCgExchanges(env) {
  if (cgExchangeCache)
    return cgExchangeCache;
  try {
    cgExchangeCache = await coingecko("/exchanges/list", env);
    return cgExchangeCache;
  } catch {
    return [];
  }
}
__name(getCgExchanges, "getCgExchanges");
async function getContractName(address, chainId, env) {
  const data = await etherscan({ chainid: chainId, module: "contract", action: "getsourcecode", address }, env);
  if (data.status !== "1" || !data.result?.[0])
    return null;
  const result = data.result[0];
  const name = result.ContractName || null;
  const impl = result.Implementation || null;
  if (name && PROXY_PATTERNS.some((p) => name.toLowerCase().includes(p)) && impl && impl !== "0x0000000000000000000000000000000000000000") {
    try {
      const implData = await etherscan({ chainid: chainId, module: "contract", action: "getsourcecode", address: impl }, env);
      const implName = implData.result?.[0]?.ContractName;
      if (implName && !PROXY_PATTERNS.some((p) => implName.toLowerCase().includes(p)))
        return implName;
    } catch {
    }
  }
  return name;
}
__name(getContractName, "getContractName");
async function handleContract(url, env) {
  const address = url.searchParams.get("address") ?? "";
  const chain = url.searchParams.get("chain") ?? "ethereum";
  if (!isAddress(address))
    return fail("address \u304C\u4E0D\u6B63\u3067\u3059");
  if (!isChain(chain))
    return fail(`\u672A\u5BFE\u5FDC\u30C1\u30A7\u30FC\u30F3: ${chain}`);
  const lower = address.toLowerCase();
  const chainId = CHAIN_CONFIGS[chain].chainId;
  if (KNOWN[lower]) {
    const k = KNOWN[lower];
    return ok({ contractName: k.label, isCexDex: true, label: k.label, exchangeType: k.type });
  }
  try {
    const contractName = await getContractName(lower, chainId, env);
    if (!contractName)
      return ok({ contractName: null, isCexDex: false, label: null, exchangeType: null });
    const lc = contractName.toLowerCase();
    for (const kw of CEX_KW) {
      if (lc.includes(kw))
        return ok({ contractName, isCexDex: true, label: contractName, exchangeType: "CEX" });
    }
    for (const kw of DEX_KW) {
      if (lc.includes(kw))
        return ok({ contractName, isCexDex: true, label: contractName, exchangeType: "DEX" });
    }
    const exchanges = await getCgExchanges(env);
    const match = exchanges.find((ex) => {
      const n = ex.name?.toLowerCase() ?? "";
      return n.length > 3 && (lc.includes(n) || n.includes(lc));
    });
    if (match)
      return ok({ contractName, isCexDex: true, label: match.name, exchangeType: "CEX/DEX" });
    return ok({ contractName, isCexDex: false, label: contractName, exchangeType: "Contract" });
  } catch (e) {
    return fail(`\u30B3\u30F3\u30C8\u30E9\u30AF\u30C8\u53D6\u5F97\u30A8\u30E9\u30FC: ${e.message}`, 500);
  }
}
__name(handleContract, "handleContract");

// worker/handlers/token-search.js
var COINGECKO_PLATFORM = {
  ethereum: "ethereum",
  bsc: "binance-smart-chain",
  polygon: "polygon-pos",
  arbitrum: "arbitrum-one",
  optimism: "optimistic-ethereum",
  avalanche: "avalanche",
  base: "base"
};
async function bySymbol(symbol, chain, env) {
  const platform = COINGECKO_PLATFORM[chain];
  if (!platform)
    throw new Error(`${chain} \u306F\u30B7\u30F3\u30DC\u30EB\u691C\u7D22\u306B\u672A\u5BFE\u5FDC`);
  const upper = symbol.toUpperCase();
  const searchData = await coingecko(`/search?query=${encodeURIComponent(symbol)}`, env);
  const matched = (searchData.coins ?? []).filter((c) => c.symbol.toUpperCase() === upper);
  if (!matched.length)
    throw new Error(`"${symbol}" \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F`);
  const results = [];
  for (const coin of matched.slice(0, 3)) {
    try {
      const detail = await coingecko(`/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`, env);
      const addr = detail.platforms?.[platform];
      if (addr)
        results.push({
          symbol: detail.symbol.toUpperCase(),
          name: detail.name,
          address: addr.toLowerCase(),
          decimals: 18,
          source: "CoinGecko"
        });
    } catch {
    }
  }
  if (!results.length)
    throw new Error(`"${symbol}" \u306E ${chain} \u4E0A\u306E\u30A2\u30C9\u30EC\u30B9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F`);
  return results;
}
__name(bySymbol, "bySymbol");
async function byAddress(address, chain, env) {
  const data = await etherscan({
    chainid: CHAIN_CONFIGS[chain].chainId,
    module: "token",
    action: "tokeninfo",
    contractaddress: address
  }, env);
  if (data.status === "1" && data.result?.length) {
    const d = data.result[0];
    return [{
      symbol: d.symbol || "Unknown",
      name: d.tokenName || d.name || "Unknown Token",
      address: address.toLowerCase(),
      decimals: parseInt(d.divisor || d.decimals || "18"),
      source: "Etherscan"
    }];
  }
  throw new Error("\u30C8\u30FC\u30AF\u30F3\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F");
}
__name(byAddress, "byAddress");
async function handleTokenSearch(url, env) {
  const q = url.searchParams.get("q") ?? "";
  const chain = url.searchParams.get("chain") ?? "ethereum";
  const by = url.searchParams.get("by") ?? "symbol";
  if (!q)
    return fail("q \u30D1\u30E9\u30E1\u30FC\u30BF\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044");
  if (!isChain(chain))
    return fail(`\u672A\u5BFE\u5FDC\u30C1\u30A7\u30FC\u30F3: ${chain}`);
  try {
    const results = by === "address" ? await byAddress(q, chain, env) : await bySymbol(q, chain, env);
    return ok(results);
  } catch (e) {
    return fail(e.message);
  }
}
__name(handleTokenSearch, "handleTokenSearch");

// worker/index.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return preflight();
    if (request.method !== "GET")
      return fail("Method Not Allowed", 405);
    switch (url.pathname) {
      case "/api/transactions":
        return handleTransactions(url, env);
      case "/api/balances":
        return handleBalances(url, env);
      case "/api/contract":
        return handleContract(url, env);
      case "/api/token-search":
        return handleTokenSearch(url, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return fail("Not Found", 404);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-4mS46E/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-4mS46E/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
