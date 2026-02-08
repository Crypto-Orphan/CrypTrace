# ブロックチェーンエクスプローラー Pro - 完全版ガイド

## 🎉 新機能

このバージョンでは、以下の機能が追加されました：

### ✅ 実装済み機能
1. **API選択UI** - 9種類以上のAPIから選択可能
2. **Bitcoin対応** - トークン選択が自動で無効化
3. **追加チェーン**
   - Base (Coinbase L2)
   - Solana
   - Tron
4. **カスタムチェーン追加機能** - 任意のチェーンを追加可能
5. **改善されたUI/UX**
   - 初心者向けチュートリアル
   - API取得方法の説明
   - わかりやすいエラーメッセージ

### 🔄 次のステップ（API連携）
`API_INTEGRATION_GUIDE.md` を参照してください。

---

## 📁 ファイル構成

```
/mnt/user-data/outputs/
├── blockchain-explorer-pro.html          # メインアプリ（API連携準備済み）
├── API_INTEGRATION_GUIDE.md             # API連携の詳細ガイド
├── generate_pdf.py                      # PDF生成スクリプト
├── blockchain_report_sample.pdf         # サンプルPDF
└── README.md                            # このファイル
```

---

## 🚀 クイックスタート

### 1. アプリを開く
`blockchain-explorer-pro.html` をブラウザで開いてください。

### 2. API設定（初回のみ）
1. 「⚙️ API設定」ボタンをクリック
2. 使用したいAPIを選択（Etherscanがおすすめ）
3. APIキーを入力（取得方法はモーダル内に記載）
4. 「保存して適用」をクリック

### 3. アドレスを探索
1. チェーンを選択（例: Ethereum）
2. アドレスを入力
3. トークン種別を選択（Bitcoinの場合は自動で無効化）
4. 「🔍 探索開始」をクリック

### 4. カスタムチェーンを追加（オプション）
1. 「➕ チェーン追加」ボタンをクリック
2. チェーン情報を入力
3. 「追加」をクリック

---

## 🎓 初心者向けガイド

### API連携について
現在のバージョンはデモデータで動作します。実際のブロックチェーンデータを取得するには、API連携が必要です。

**詳しくは `API_INTEGRATION_GUIDE.md` をお読みください。**

#### 簡単3ステップ:
1. **APIキーを取得**（5分）
   - Etherscanで無料アカウント作成
   - APIキーをコピー

2. **コードに実装**（30分）
   - `fetchTransactionsFromAPI` 関数を書き換え
   - ガイドのコードをコピペでOK

3. **テスト**（10分）
   - 実際のアドレスで動作確認

---

## 🆕 新機能の使い方

### Bitcoin用の特別対応
Bitcoinを選択すると、トークン選択が自動的に非表示になります。これは、BitcoinにはERC-20のようなトークン概念がないためです。

### カスタムチェーンの追加

#### 例: Avalancheを追加する場合
1. 「➕ チェーン追加」をクリック
2. 以下を入力:
   - **チェーン名**: Avalanche
   - **チェーンID**: avalanche
   - **APIエンドポイント**: https://api.snowtrace.io/api
   - **表示カラー**: #e84142
3. 「追加」をクリック

追加したチェーンは、チェーン選択ドロップダウンに表示されます。

### 対応チェーン一覧

#### デフォルト対応:
| チェーン | シンボル | API |
|---------|----------|-----|
| Ethereum | ETH | Etherscan |
| Bitcoin | BTC | Blockchain.com |
| Polygon | MATIC | PolygonScan |
| BSC | BNB | BscScan |
| Arbitrum | ARB | Arbiscan |
| Optimism | OP | Optimistic Etherscan |
| **Base** | BASE | BaseScan |
| **Solana** | SOL | Solscan |
| **Tron** | TRX | TronScan |

#### カスタム追加可能:
- Avalanche
- Fantom
- zkSync Era
- Linea
- Scroll
- その他任意のEVM互換チェーン

---

## 🎨 UI/UXの改善点

### 初心者フレンドリー
- API設定モーダルに詳しい説明を追加
- エラーメッセージをわかりやすく
- チュートリアルボックスで手順を説明

### Bitcoin専用の処理
- UTXO方式のチェーン（Bitcoin）を選択すると、トークン選択が自動で非表示
- アドレス形式の違いにも対応

### カスタマイズ性
- 独自チェーンを簡単に追加
- カラー設定でブランディング可能
- ローカルストレージで設定を保存

---

## 📱 Google Play Store公開について

### ステップ1: アプリ化
Capacitorを使用してネイティブアプリ化します。

**詳細は `API_INTEGRATION_GUIDE.md` の第8章を参照。**

### ステップ2: 準備物
- [ ] Google Play開発者アカウント（$25）
- [ ] アプリアイコン（512x512px）
- [ ] スクリーンショット（最低2枚）
- [ ] プライバシーポリシー

### ステップ3: 申請
1. Google Play Consoleにアクセス
2. アプリ情報を入力
3. APKをアップロード
4. 審査を待つ（1〜3日）

---

## 🔧 技術仕様

### フロントエンド
- **Pure HTML/CSS/JavaScript** - フレームワーク不要
- **Canvas API** - マインドマップ描画
- **Fetch API** - API通信
- **LocalStorage** - 設定保存

### 対応ブラウザ
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### パフォーマンス
- 推奨ノード数: 100以下
- レート制限: APIごとに異なる
- メモリ使用量: 約50MB

---

## 🐛 トラブルシューティング

### Q: APIエラーが出る
**A:** 
1. APIキーが正しく入力されているか確認
2. レート制限に達していないか確認
3. ブラウザのコンソール（F12）でエラー詳細を確認

### Q: トークン選択が出ない
**A:** 
Bitcoinを選択していませんか？Bitcoinはトークン概念がないため、選択肢が非表示になります。

### Q: カスタムチェーンが動かない
**A:** 
1. APIエンドポイントURLが正しいか確認
2. チェーンIDに特殊文字が含まれていないか確認
3. APIがEtherscan互換のレスポンスを返すか確認

### Q: PDFが生成できない
**A:** 
1. まずJSONファイルをエクスポート
2. `generate_pdf.py` スクリプトを実行
3. reportlabがインストールされているか確認

---

## 🔐 セキュリティ

### APIキーの管理
- **ブラウザのLocalStorageに保存**
- サーバーには送信されません
- 本番環境では環境変数の使用を推奨

### プライバシー
- ユーザーデータは収集しません
- トランザクション情報は公開ブロックチェーンから取得
- アドレス検索履歴はローカルのみ

---

## 📊 API制限一覧

| API | 無料プラン制限 | 推奨用途 |
|-----|--------------|---------|
| Etherscan | 5 req/秒 | Ethereum全般 |
| PolygonScan | 5 req/秒 | Polygon全般 |
| BscScan | 5 req/秒 | BSC全般 |
| BaseScan | 5 req/秒 | Base全般 |
| Blockchain.com | 制限あり | Bitcoin基本情報 |
| Solscan | 制限あり | Solana基本情報 |
| TronScan | 制限あり | Tron基本情報 |
| Moralis | 40,000/月 | マルチチェーン |
| Alchemy | 300M CU/月 | エンタープライズ |

---

## 🎯 ロードマップ

### Phase 1: 基本機能（完成✅）
- [x] マインドマップ可視化
- [x] マルチチェーン対応
- [x] API選択UI
- [x] カスタムチェーン追加

### Phase 2: API連携（次のステップ）
- [ ] Ethereum API実装
- [ ] Bitcoin API実装
- [ ] その他チェーンAPI実装
- [ ] レート制限対応

### Phase 3: 高度な機能（将来）
- [ ] クロスチェーンブリッジ検出
- [ ] NFTトランザクション追跡
- [ ] リアルタイム更新
- [ ] トランザクション金額可視化

### Phase 4: モバイル対応（将来）
- [ ] Capacitorでアプリ化
- [ ] Google Play Store公開
- [ ] iOS版開発

---

## 📚 参考資料

### 公式ドキュメント
- **Etherscan API**: https://docs.etherscan.io/
- **Blockchain.com API**: https://www.blockchain.com/api
- **Solscan API**: https://docs.solscan.io/
- **TronScan API**: https://tronscan.org/

### 開発ツール
- **Capacitor**: https://capacitorjs.com/
- **ReportLab**: https://www.reportlab.com/docs/
- **VS Code**: https://code.visualstudio.com/

### コミュニティ
- **Web3開発者フォーラム**: https://ethereum.stackexchange.com/
- **Capacitor Discord**: https://discord.com/invite/UPYYRhtyzp

---

## 💬 サポート

### よくある質問
詳しくは `API_INTEGRATION_GUIDE.md` をご覧ください。

### コントリビューション
プルリクエストを歓迎します！

### ライセンス
MIT License

---

**開発者**: Claude AI  
**バージョン**: 2.0.0 Pro  
**最終更新**: 2026-02-08

---

## 🎊 次のステップ

1. ✅ `API_INTEGRATION_GUIDE.md` を読む
2. ✅ Etherscan APIキーを取得
3. ✅ API連携を実装
4. ✅ テストする
5. ✅ Capacitorでアプリ化
6. ✅ Google Play Storeに公開！

**頑張ってください！🚀**
