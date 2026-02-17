// exchange.js — CEX/DEX アドレス辞書（フロント表示用）

const EXCHANGE_ADDRESSES = new Set([
    // Binance
    '0x28c6c06298d514db089934071355e5743bf21d60',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f',
    '0x9696f59e4d72e237be84ffd425dcad154bf96976',
    '0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67',
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
    '0xf977814e90da44bfa03b6295a0616a897441acec',
    // Coinbase
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',
    '0x503828976d22510aad0201ac7ec88293211d23da',
    '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740',
    '0x3cd751e6b0078be393132286c442345e5dc49699',
    '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511',
    '0xeb2629a2734e272bcc07bda959863f316f4bd4cf',
    // Kraken
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2',
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13',
    '0xe853c56864a2ebe4576a807d26fdc4a0ada51919',
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0',
    // Uniswap V2 & V3
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    '0xe592427a0aece92de3edee1f18e0157c05861564',
    '0xb685760ebd368a891f27ae547391f4e2a289895b',
    // SushiSwap
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
    // PancakeSwap
    '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    // 1inch
    '0x1111111254fb6c44bac0bed2854e76f90643097d',
    '0x111111125421ca6dc452d289314280a0f8842a65',
    // 0x Protocol
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    '0xdef189deaef76e379df891899eb5a00a94cbc250',
    // Curve Finance
    '0xd51a44d3fae010294c616388b506acda1bfaae46',
    // Balancer
    '0xba12222222228d8ba445958a75a0704d566bf2c8',
].map(addr => addr.toLowerCase()));

// CEX/DEX名前マッピング（フォールバック用）
const EXCHANGE_NAMES = {
    // Binance
    '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance',
    '0x9696f59e4d72e237be84ffd425dcad154bf96976': 'Binance',
    '0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67': 'Binance',
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance',
    '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
    // Coinbase
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
    '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
    '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740': 'Coinbase',
    '0x3cd751e6b0078be393132286c442345e5dc49699': 'Coinbase',
    '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': 'Coinbase',
    '0xeb2629a2734e272bcc07bda959863f316f4bd4cf': 'Coinbase',
    // Kraken
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken',
    '0xe853c56864a2ebe4576a807d26fdc4a0ada51919': 'Kraken',
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0': 'Kraken',
    // Uniswap
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'Uniswap',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
    '0xb685760ebd368a891f27ae547391f4e2a289895b': 'Uniswap',
    // SushiSwap
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
    // PancakeSwap
    '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap Router',
    // 1inch
    '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V4',
    '0x111111125421ca6dc452d289314280a0f8842a65': '1inch V5',
    // 0x Protocol
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
    '0xdef189deaef76e379df891899eb5a00a94cbc250': '0x Exchange',
    // Curve
    '0xd51a44d3fae010294c616388b506acda1bfaae46': 'Curve Tricrypto2',
    // Balancer
    '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer Vault',
};
