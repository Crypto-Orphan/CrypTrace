# CrypTrace — Blockchain Explorer

**構成: Cloudflare Workers（バックエンド）+ バニラJS（フロントエンド）**

---

## 🏗 アーキテクチャ

```
ブラウザ (フロントエンド)            Cloudflare Workers (バックエンド)
────────────────────────────         ─────────────────────────────────
public/index.html                    worker/index.js  ← ルーター
public/css/style.css                 worker/handlers/
public/js/api-client.js  ──fetch──→    transactions.js  → Etherscan API
public/js/app.js                        balances.js      → Etherscan API
  グラフ描画                             contract.js      → Etherscan + CoinGecko
  物理シミュレーション                    token-search.js  → CoinGecko API
  UI・イベント処理                    worker/_lib.js   ← 共通処理
                                     .dev.vars        ← APIキー（gitignore済み）
```

**なぜこの構成か:**
ブラウザが読む JS ファイルは誰にでも見えます。
APIキーを隠す唯一の方法は、サーバー側（Workers）でのみ使うことです。

---

## 📁 ファイル構成

```
cryptrace/
├── .devcontainer/
│   └── devcontainer.json     # GitHub Codespaces 環境
├── worker/                   # ← APIキーはここだけ（サーバー側）
│   ├── _lib.js               #   Etherscan/CoinGecko fetch 共通処理
│   ├── index.js              #   ルーター（エントリーポイント）
│   └── handlers/
│       ├── transactions.js   #   GET /api/transactions
│       ├── balances.js       #   GET /api/balances
│       ├── contract.js       #   GET /api/contract
│       └── token-search.js   #   GET /api/token-search
├── public/                   # ← ブラウザに送る（APIキーなし）
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api-client.js     #   /api/* を呼ぶだけ（キーなし）
│       └── app.js            #   グラフ・UI・イベント全て
├── .dev.vars.example         # APIキー設定テンプレート
├── .dev.vars                 # 実際のキー（gitignore済み・コミット禁止）
├── .gitignore
├── package.json
└── wrangler.toml             # Cloudflare Workers 設定
```

---

## 🚀 GitHub Codespaces での開発手順

### 1. Codespace を起動

GitHubリポジトリ → `Code` → `Codespaces` → `Create codespace on main`

→ `.devcontainer/devcontainer.json` が自動で Node.js 22 環境を構築し `npm install` を実行

### 2. APIキーを設定

```bash
cp .dev.vars.example .dev.vars
# .dev.vars をエディタで開いて実際のキーを入力
```

または Codespaces の Secrets 機能を使う（推奨）:
`GitHub Settings > Codespaces > Secrets` に登録すると自動で注入される

### 3. 開発サーバーを起動

```bash
npm run dev
# = wrangler dev
```

→ ポート **8787** が自動転送されブラウザでプレビュー表示

ファイルを保存すると **自動リロード**

---

## 🌐 デプロイ手順

### 1. Cloudflare アカウントでログイン

```bash
npx wrangler login
```

### 2. APIキーを Secrets として登録

```bash
npx wrangler secret put ETHERSCAN_API_KEY
# → プロンプトに実際のキーを入力

npx wrangler secret put COINGECKO_API_KEY
# → プロンプトに実際のキーを入力
```

### 3. デプロイ

```bash
npm run deploy
# = wrangler deploy
```

→ `https://cryptrace-api.your-name.workers.dev` で公開される

---

## 🔌 APIエンドポイント一覧

| エンドポイント | パラメータ | 説明 |
|---|---|---|
| `GET /api/transactions` | `address`, `chain`, `limit`, `type`, `token` | トランザクション取得 |
| `GET /api/balances` | `address`, `chain` | ERC-20残高一覧 |
| `GET /api/contract` | `address`, `chain` | コントラクト名・CEX/DEX判定 |
| `GET /api/token-search` | `q`, `chain`, `by` | トークン検索 |

**chain の値:** `ethereum` / `bsc` / `polygon` / `arbitrum` / `optimism` / `avalanche` / `base`

### 新しいAPIを追加したいとき

```
1. worker/handlers/new-api.js を作成（env.NEW_API_KEY を使う）
2. worker/index.js にルートを1行追加
3. public/js/api-client.js に呼び出し関数を1行追加
4. wrangler secret put NEW_API_KEY でキーを登録
```

他のファイルは一切触らない。

---

## ⚠️ セキュリティルール

| ルール | 理由 |
|---|---|
| `.dev.vars` を絶対コミットしない | APIキーが漏洩する |
| `public/js/` にAPIキーを書かない | ブラウザから丸見え |
| `worker/` でのみ `env.XXX_KEY` を使う | これがAPIキーを隠す唯一の方法 |
