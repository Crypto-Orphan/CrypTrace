// constants.js — 定数・設定値（APIキーはバックエンド側）

// API_KEY はバックエンド側の .env で管理されます（ここには書かない）
// COINGECKO_API_KEY はバックエンド側の .env で管理されます

// CEX/DEXリストのキャッシュ
let cexDexListCache = [];
let cexDexListLoaded = false;

// 主要トークンのプリセット
const PRESET_TOKENS = {
    '1': [
        { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
        { symbol: 'USDI', name: 'USDI Stablecoin', address: '0x0261018Aa50E28133C1aE7a29ebdf9Bd21b878Cb', decimals: 18 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8 },
        { symbol: 'LINK', name: 'ChainLink', address: '0x514910771af9ca656af840dff83e8264ecf986ca', decimals: 18 },
        { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18 }
    ],
    '137': [
        { symbol: 'USDT', name: 'Tether USD (PoS)', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin (PoS)', address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', decimals: 6 }
    ],
    '56': [
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18 }
    ]
};

const CHAIN_CONFIGS = {
    'ethereum': { name: 'Ethereum', symbol: 'ETH', chainId: '1', decimals: 18, domain: 'api.etherscan.io' },
    'bsc': { name: 'BSC', symbol: 'BNB', chainId: '56', decimals: 18, domain: 'api.bscscan.com' },
    'polygon': { name: 'Polygon', symbol: 'MATIC', chainId: '137', decimals: 18, domain: 'api.polygonscan.com' },
    'arbitrum': { name: 'Arbitrum', symbol: 'ETH', chainId: '42161', decimals: 18, domain: 'api.arbiscan.io' },
    'optimism': { name: 'Optimism', symbol: 'ETH', chainId: '10', decimals: 18, domain: 'api-optimistic.etherscan.io' },
    'avalanche': { name: 'Avalanche', symbol: 'AVAX', chainId: '43114', decimals: 18, domain: 'api.snowtrace.io' },
    'base': { name: 'Base', symbol: 'ETH', chainId: '8453', decimals: 18, domain: 'api.basescan.org' }
};

const canvas = document.getElementById('mindmapCanvas');
const ctx = canvas.getContext('2d');
const particleCanvas = document.getElementById('particles');
const particleCtx = particleCanvas.getContext('2d');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
particleCanvas.width = window.innerWidth;
particleCanvas.height = window.innerHeight;
