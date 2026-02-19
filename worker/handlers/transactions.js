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
