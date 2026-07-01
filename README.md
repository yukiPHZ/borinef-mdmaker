# BORINEF Labs md maker

`mdmaker.borinef.com` 用のMVPです。

BORINEF Labs の思想である「人間の感覚を AI Native な構造へ翻訳する」を、最初の実用品として `design.md maker` に落とし込んでいます。

## サービス概要

人間は「好き」「違う」「しっくりくる」といった感覚で選びます。
AIエージェントは、構造化された情報で動きます。

このサービスは、フィーリング入力、ビジュアルプリセット、カラーパレットをもとに、以下のファイルを生成します。

- `design.md`
- `design-summary.txt`
- `tokens.json`
- `tokens.css`
- `tailwind.config.memo.md`
- `codex-prompt.md`
- `claude-code-prompt.md`
- `cursor-prompt.md`
- `settings.json`

無料版では `design.md` のプレビューとコピーができます。
有料版ではZIP出力を想定しています。

Phase 2Aでは、入力した感覚と選んだ見た目・色の矛盾を検出し、以下の翻訳モードを選べるようにしています。

- 感覚を優先
- 見た目を優先
- 調和させる

Phase 2Cでは、Step 1 の感覚タグから Step 2 / Step 3 の候補へ「おすすめ」を表示し、Step 2 の選択が余白・角丸・影・タイポグラフィ・密度として Step 4 の選択結果プレビューへ反映されるようにしています。
ZIP内の Codex / Claude Code / Cursor 向けPromptも、各エージェントの使い方に合わせて本文レベルで分けています。

Phase 2Dでは、Step 4を仕様値ではなく見た目中心のプレビューへ変更し、10種類のビジュアルプリセット、32種類のcuratedカラーパレット、フィーリング入力からの「おすすめセット3案」を追加しています。
おすすめセットを選ぶと、ビジュアルとカラーが同時に反映され、ZIP内の `design.md` / prompt / `settings.json` にも選択内容が残ります。

## 開発思想

単なるプロンプト集やデザインテンプレートではなく、次の流れを作るための道具です。

```text
人間の感覚
↓
BORINEF Translation Engine
↓
AI Native Structure
↓
design.md / tokens.json / prompts
↓
AI Agent
↓
実装
```

UIは日本語を初期表示とし、English UIへ切り替えできます。
出力ファイルは、AIエージェントへ渡しやすいように英語・英数字ベースにしています。

## 技術構成

- Vite
- TypeScript
- Vanilla JavaScript / DOM
- CSS
- JSZip
- Cloudflare Pages
- Cloudflare Pages Functions
- OpenAI API
- Stripe Checkout

Reactなどの大きなフレームワークは初期MVPでは使っていません。

## セットアップ

```bash
cd C:\Users\yukiz\devlop\borinef-mdmaker
npm install
```

## 開発サーバー

```bash
npm run dev
```

標準では `http://127.0.0.1:5173/` で確認できます。

Vite開発サーバーだけで表示する場合、Cloudflare Pages Functions は動きません。
その場合もフロント側の静的フォールバックで `design.md` とZIP生成は動作します。

## ビルド

```bash
npm run build
```

ビルド結果は `dist/` に出力されます。

## Cloudflare Pages想定

Cloudflare Pagesでは、以下を想定しています。

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`

デプロイ用スクリプトも用意しています。

```bash
npm run deploy
```

## 環境変数

秘密値はコードへ直書きしません。

### OpenAI

```text
OPENAI_API_KEY
OPENAI_MODEL
```

`OPENAI_API_KEY` が未設定の場合、`/api/translate-design` は静的フォールバック構造を返します。
`OPENAI_MODEL` は任意です。

### Stripe

```text
STRIPE_SECRET_KEY
STRIPE_PRICE_ID_JPY
STRIPE_PRICE_ID_USD
```

Stripeが未設定の場合、フロント側は開発用フォールバックとしてZIPを直接生成します。
本番では決済完了後にZIP出力を解放する設計を想定しています。

### GA4

```text
VITE_GA_MEASUREMENT_ID
```

未設定の場合は何もしません。
イベントには自由入力全文、`settings.json` の本文、APIキー、Secretを送りません。

送信対象は、選択プリセット、選択パレット、翻訳モード、矛盾レベル、UI言語などの市場観測用メタ情報だけです。

## API

### `POST /api/translate-design`

フィーリング入力、選択プリセット、カラーパレットから AI Native Structure を返します。
OpenAI APIキーがない場合も静的ロジックでフォールバックします。
フォールバック時も、フィーリング解析タグ、矛盾検出、翻訳モードごとの出力差分は維持されます。

### `POST /api/create-checkout-session`

Stripe Checkout Session を作成します。
Stripe未設定時は `stripe_not_configured` を返し、アプリ全体は停止しません。

### `GET /api/health`

サービス状態と、OpenAI / Stripe の設定有無だけを返します。
APIキーの値は返しません。

## settings.json による再編集

エクスポートZIPに含まれる `settings.json` を読み込むと、以下を復元できます。

- UI言語
- maker種別
- フィーリング入力
- 選択したビジュアルプリセット
- 選択したカラーパレット
- 選択したおすすめセット
- フィーリング解析タグ
- 翻訳モード
- 矛盾検出結果
- AI Native Structure

入力内容はDB保存しません。

## セキュリティ方針

- APIキーをフロントへ出さない
- `.env` と `.dev.vars` をGit管理しない
- OpenAI APIキーをコードへ直書きしない
- Stripe APIキーをコードへ直書きしない
- 個人情報を保存しない
- 入力内容をDB保存しない
- 長文入力をログへ大量出力しない

## 今後の拡張予定

初期MVPでは `design.md maker` のみ有効です。
将来的には以下を追加できる構造にしています。

- `brand.md maker`
- `writing.md maker`
- `project.md maker`
- `workflow.md maker`
- `company.md maker`
- `service.md maker`
