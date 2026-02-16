// server-dev.js
// ローカル開発用サーバー
// 使い方: node server-dev.js
//
// - /api/* → api/ ディレクトリのハンドラを実行
// - /*     → public/ ディレクトリの静的ファイルを配信
//
// ⚠️ .env ファイルを自動で読み込む（APIキーをここで設定する）

import 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { parse } from 'node:url';

// .env を手動で読み込む（dotenv なしで動く）
if (existsSync('.env')) {
  const envText = readFileSync('.env', 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
  console.log('✅ .env 読み込み完了');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);
  req.query = query;

  // OPTIONS プリフライト
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.writeHead(204).end();
  }

  // /api/* → ハンドラに委譲
  if (pathname.startsWith('/api/')) {
    const name = pathname.replace('/api/', '').replace(/\/$/, '') || 'index';
    try {
      const mod = await import(`./api/${name}.js?t=${Date.now()}`);
      return mod.default(req, res);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: `API not found: ${name}` }));
    }
  }

  // 静的ファイル配信
  const filePath = join('./public', pathname === '/' ? '/index.html' : pathname);
  try {
    const data = readFileSync(filePath);
    const ext  = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return res.end(data);
  } catch {
    res.writeHead(404);
    return res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 CrypTrace 開発サーバー起動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n📋 APIエンドポイント:`);
  console.log(`   /api/transactions`);
  console.log(`   /api/balances`);
  console.log(`   /api/contract`);
  console.log(`   /api/token-search`);
  console.log(`\n⚙️  環境変数 (.env):`);
  console.log(`   ETHERSCAN_API_KEY : ${process.env.ETHERSCAN_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   COINGECKO_API_KEY : ${process.env.COINGECKO_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
});
