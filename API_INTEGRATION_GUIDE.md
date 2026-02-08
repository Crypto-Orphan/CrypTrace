# 🚀 API連携ステップバイステップガイド

このガイドでは、ブロックチェーンエクスプローラーに実際のAPI連携を追加する方法を、初心者の方にも分かりやすく説明します。

---

## 📚 目次

1. [APIとは何か？](#1-apiとは何か)
2. [必要な準備](#2-必要な準備)
3. [ステップ1: APIキーの取得](#3-ステップ1-apiキーの取得)
4. [ステップ2: APIの動作確認](#4-ステップ2-apiの動作確認)
5. [ステップ3: コードへの実装](#5-ステップ3-コードへの実装)
6. [ステップ4: エラーハンドリング](#6-ステップ4-エラーハンドリング)
7. [ステップ5: レート制限対応](#7-ステップ5-レート制限対応)
8. [Google Play Store公開準備](#8-google-play-store公開準備)

---

## 1. APIとは何か？

**API (Application Programming Interface)** は、簡単に言うと「データを取得するための窓口」です。

### 例え話で理解する
- レストランに例えると、APIは「注文カウンター」のようなもの
- あなた（アプリ）が「メニュー（データ）をください」と注文すると
- 店員（API）が「はい、こちらがデータです」とJSON形式で返してくれます

### 実際のAPI URL例
```
https://api.etherscan.io/api?module=account&action=balance&address=0x123...&apikey=YOUR_KEY
```

これをブラウザで開くと、以下のようなJSON（データ）が返ってきます：
```json
{
  "status": "1",
  "message": "OK",
  "result": "1234567890000000000"
}
```

---

## 2. 必要な準備

### 必要なもの
1. ✅ テキストエディタ（VS Code推奨）
2. ✅ Webブラウザ（Chrome推奨）
3. ✅ APIキー（無料で取得可能）
4. ✅ 基本的なJavaScriptの知識（コピペでもOK！）

### 推奨する開発環境
- **VS Code**: https://code.visualstudio.com/
- **Chrome DevTools**: F12キーで開く

---

## 3. ステップ1: APIキーの取得

### 3-1. Etherscan APIキーの取得（おすすめ）

#### 手順：
1. **https://etherscan.io/** にアクセス
2. 右上の「**Sign In**」をクリック
3. 「**Sign Up**」でアカウント作成
   - メールアドレスとパスワードを入力
   - メール認証を完了
4. ログイン後、「**API Keys**」タブへ移動
5. 「**+ Add**」ボタンでAPIキーを作成
6. **キーが表示される** → コピーして安全な場所に保存

#### 無料プランの制限
- **5リクエスト/秒**
- 個人プロジェクトには十分です！

### 3-2. その他のAPIキー取得

#### Blockchain.com (Bitcoin用)
- **認証不要！** すぐに使えます
- URL: https://blockchain.info

#### PolygonScan (Polygon用)
- Etherscanと全く同じ手順
- URL: https://polygonscan.com/

#### Solscan (Solana用)
- 基本機能は認証不要
- URL: https://solscan.io/

---

## 4. ステップ2: APIの動作確認

### 4-1. ブラウザでテストする

実際のAPIを呼び出してみましょう！

#### Ethereum残高を取得する例
```
https://api.etherscan.io/api?module=account&action=balance&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&tag=latest&apikey=YOUR_API_KEY
```

**手順:**
1. 上記URLの `YOUR_API_KEY` を実際のキーに置き換え
2. ブラウザのアドレスバーに貼り付け
3. Enterキーを押す

**結果:**
```json
{
  "status":"1",
  "message":"OK",
  "result":"45342100000000000000"
}
```

この `result` の値が残高です（Wei単位 = 1 ETH = 10^18 Wei）

### 4-2. トランザクション履歴を取得する例

```
https://api.etherscan.io/api?module=account&action=txlist&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&startblock=0&endblock=99999999&sort=desc&apikey=YOUR_API_KEY
```

**結果:**
```json
{
  "status":"1",
  "message":"OK",
  "result":[
    {
      "from":"0xabc...",
      "to":"0xdef...",
      "value":"1000000000000000000",
      "hash":"0x123..."
    }
  ]
}
```

---

## 5. ステップ3: コードへの実装

### 5-1. 基本的なAPI呼び出し関数

`blockchain-explorer-pro.html` の `fetchTransactionsFromAPI` 関数を以下のように書き換えます。

```javascript
async function fetchTransactionsFromAPI(address, chain, tokenType) {
    // Ethereumの場合
    if (chain === 'ethereum' && currentApiConfig.provider === 'etherscan') {
        const apiKey = currentApiConfig.key;
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === '1') {
                // トランザクションデータを処理
                processTransactions(data.result, address, chain, tokenType);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    // Bitcoinの場合
    else if (chain === 'bitcoin' && currentApiConfig.provider === 'blockchain') {
        const url = `https://blockchain.info/rawaddr/${address}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // Bitcoinデータを処理
            processBitcoinTransactions(data.txs, address, chain);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    // その他のチェーン（デモデータ）
    else {
        generateDemoData(address, chain, tokenType);
    }
}
```

### 5-2. トランザクションデータの処理

```javascript
function processTransactions(transactions, centerAddress, chain, tokenType) {
    nodes = [];
    edges = [];
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 中心ノード
    const centerNode = new Node(centerAddress, centerX, centerY, chain, tokenType, 0);
    nodes.push(centerNode);
    
    // 重複を除外するためのSet
    const uniqueAddresses = new Set();
    
    // トランザクションから送金先を抽出
    transactions.slice(0, 50).forEach((tx, index) => {
        const targetAddress = tx.to;
        
        // 重複チェック
        if (targetAddress && targetAddress !== centerAddress && !uniqueAddresses.has(targetAddress)) {
            uniqueAddresses.add(targetAddress);
            
            // ノード配置を計算
            const angle = (Math.PI * 2 / 50) * index;
            const radius = 200;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // ノード作成
            const node = new Node(
                targetAddress,
                x,
                y,
                chain,
                tokenType,
                1,
                parseFloat(tx.value) / 1e18 // WeiからETHに変換
            );
            nodes.push(node);
            
            // エッジ作成
            edges.push(new Edge(centerNode, node));
        }
    });
    
    drawMindmap();
}
```

### 5-3. Bitcoin用の処理

```javascript
function processBitcoinTransactions(transactions, centerAddress, chain) {
    nodes = [];
    edges = [];
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 中心ノード
    const centerNode = new Node(centerAddress, centerX, centerY, chain, 'native', 0);
    nodes.push(centerNode);
    
    const uniqueAddresses = new Set();
    
    // Bitcoinのトランザクション構造を処理
    transactions.slice(0, 30).forEach((tx, index) => {
        tx.out.forEach(output => {
            const targetAddress = output.addr;
            
            if (targetAddress && targetAddress !== centerAddress && !uniqueAddresses.has(targetAddress)) {
                uniqueAddresses.add(targetAddress);
                
                const angle = (Math.PI * 2 / 30) * index;
                const radius = 200;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                const node = new Node(
                    targetAddress,
                    x,
                    y,
                    chain,
                    'native',
                    1,
                    output.value / 1e8 // SatoshiからBTCに変換
                );
                nodes.push(node);
                edges.push(new Edge(centerNode, node));
            }
        });
    });
    
    drawMindmap();
}
```

---

## 6. ステップ4: エラーハンドリング

### エラーを適切に処理する

```javascript
async function fetchTransactionsFromAPI(address, chain, tokenType) {
    try {
        // API呼び出し前のバリデーション
        if (!address || address.length < 20) {
            throw new Error('無効なアドレス形式です');
        }
        
        if (!currentApiConfig.key && apiConfigs[currentApiConfig.provider].needsKey) {
            throw new Error('APIキーが設定されていません');
        }
        
        // API呼び出し
        const url = buildApiUrl(address, chain, tokenType);
        const response = await fetch(url);
        
        // HTTPエラーチェック
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // APIレスポンスのエラーチェック
        if (data.status === '0') {
            throw new Error(data.message || 'APIエラーが発生しました');
        }
        
        // データ処理
        processTransactions(data.result, address, chain, tokenType);
        
    } catch (error) {
        console.error('エラー詳細:', error);
        
        // ユーザーフレンドリーなエラーメッセージ
        let userMessage = 'エラーが発生しました: ';
        
        if (error.message.includes('API')) {
            userMessage += 'APIキーが無効か、制限に達しています';
        } else if (error.message.includes('Network')) {
            userMessage += 'ネットワークエラー。インターネット接続を確認してください';
        } else {
            userMessage += error.message;
        }
        
        alert(userMessage);
        
        // フォールバック: デモデータを表示
        generateDemoData(address, chain, tokenType);
    }
}
```

---

## 7. ステップ5: レート制限対応

### APIの呼び出し回数を制限する

```javascript
// レート制限管理クラス
class RateLimiter {
    constructor(maxRequests, interval) {
        this.maxRequests = maxRequests; // 例: 5
        this.interval = interval;       // 例: 1000 (1秒)
        this.requests = [];
    }
    
    async wait() {
        const now = Date.now();
        
        // 古いリクエストを削除
        this.requests = this.requests.filter(time => now - time < this.interval);
        
        // 制限に達している場合は待機
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.interval - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.wait(); // 再帰的に確認
        }
        
        this.requests.push(now);
    }
}

// Etherscan用のレート制限（5リクエスト/秒）
const etherscanLimiter = new RateLimiter(5, 1000);

// 使用例
async function fetchTransactionsFromAPI(address, chain, tokenType) {
    // レート制限を適用
    await etherscanLimiter.wait();
    
    // API呼び出し...
}
```

---

## 8. Google Play Store公開準備

### 8-1. アプリ化の方法

#### オプション1: PWA (Progressive Web App) として公開
- **メリット**: コード変更ほぼ不要
- **デメリット**: ネイティブアプリほどの機能はない

#### オプション2: WebViewアプリとして公開
- **メリット**: 完全なAndroidアプリ
- **デメリット**: Android開発環境が必要

#### オプション3: Capacitor/Cordova を使用
- **メリット**: Web技術でネイティブアプリ化
- **推奨**: Capacitor (モダンで簡単)

### 8-2. Capacitorでのアプリ化手順

#### 前提条件:
- Node.js インストール済み
- Android Studio インストール済み

#### 手順:

1. **Capacitorプロジェクト作成**
```bash
npm install -g @capacitor/cli @capacitor/core
npx cap init "Blockchain Explorer" "com.yourname.blockexplorer"
```

2. **Androidプラットフォーム追加**
```bash
npm install @capacitor/android
npx cap add android
```

3. **HTMLファイルを配置**
```bash
# blockchain-explorer-pro.html を index.html にリネームして
# プロジェクトのルートに配置
```

4. **ビルド**
```bash
npx cap sync
npx cap open android
```

5. **Android Studioでビルド**
- Android Studioが開く
- 「Build」→「Build Bundle(s) / APK(s)」→「Build APK」

### 8-3. Google Play Storeへの申請

#### 必要なもの:
1. ✅ Google Play開発者アカウント（$25の登録料）
2. ✅ APKまたはAABファイル
3. ✅ アプリアイコン（512x512px）
4. ✅ スクリーンショット（最低2枚）
5. ✅ プライバシーポリシー

#### 手順:
1. **Google Play Console** にアクセス: https://play.google.com/console
2. 「アプリを作成」をクリック
3. アプリ情報を入力
4. APK/AABをアップロード
5. ストアの掲載情報を入力
6. 審査を申請

#### 審査期間:
- 通常 **1〜3日**

---

## 📝 チェックリスト

### API連携実装
- [ ] APIキーを取得した
- [ ] ブラウザでAPI動作確認した
- [ ] fetchTransactionsFromAPI関数を実装した
- [ ] エラーハンドリングを追加した
- [ ] レート制限対応を追加した

### アプリ化
- [ ] Capacitorをインストールした
- [ ] Androidプロジェクトを作成した
- [ ] APKをビルドした
- [ ] 実機でテストした

### ストア公開
- [ ] Google Play開発者アカウントを作成した
- [ ] アプリアイコンを作成した
- [ ] スクリーンショットを撮影した
- [ ] プライバシーポリシーを作成した
- [ ] ストア掲載情報を入力した

---

## 🆘 よくある質問

### Q1: APIキーが無効と表示される
**A:** 
- キーをコピーする際に余分なスペースが入っていないか確認
- Etherscanでキーのステータスを確認（Enabled になっているか）

### Q2: レート制限に引っかかる
**A:** 
- 5リクエスト/秒を超えないようRateLimiterを使用
- 同時に複数のAPIを呼ばないように注意

### Q3: CORSエラーが出る
**A:** 
- ブラウザの制限です。開発時は以下で回避:
  - Chrome拡張機能「CORS Unblock」を使用
  - または、簡易プロキシサーバーを立てる

---

## 🎓 次のステップ

1. ✅ **まずはEthereum APIから実装**してみましょう
2. ✅ 動作確認できたら**他のチェーンに拡張**
3. ✅ エラーハンドリングとレート制限を追加
4. ✅ Capacitorでアプリ化
5. ✅ Google Play Storeに公開！

---

## 📚 参考リンク

- **Etherscan API**: https://docs.etherscan.io/
- **Blockchain.com API**: https://www.blockchain.com/api
- **Capacitor公式**: https://capacitorjs.com/
- **Google Play Console**: https://play.google.com/console

---

**頑張ってください！🚀**
質問があれば、いつでも聞いてください😊
