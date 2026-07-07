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

Phase 2Eでは、体験を3ステップへ整理しています。

```text
感覚を書く
↓
おすすめ3案から選ぶ
↓
選択結果を確認して出力
```

おすすめセットを選ぶと、すぐに「無料で design.md をコピー」と「ZIP Export ¥300」へ進めます。
ビジュアルプリセットとカラーパレットの全候補は残しつつ、通常導線からは外し、「もっと細かく選ぶ」の折りたたみ内に移動しています。
詳細を変更した場合も、選択結果、`design.md`、ZIP、`settings.json` に反映され、`isCustomizedFromRecommendation` として保存されます。

Phase 2Fでは、クリックして試す体験を安定させています。
おすすめ、ビジュアル、カラー、翻訳モードを選んでも画面位置を勝手に動かさず、「もっと細かく選ぶ」はユーザーが閉じるまで開いたままになります。
右カラムのコピー / エクスポート導線は撤去し、主CTAをおすすめ選択直後の左カラムに統一しました。
AI Native Structure、`design.md` Preview、settings.jsonの保存 / 読み込みは「AIエージェント向け出力を確認」の折りたたみに移動しています。

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

Stripeが未設定の場合、購入ボタンは `stripe_not_configured` 相当の案内を表示し、公開UIから未決済ZIPを直接生成しません。
本番では決済完了後にサーバー側でZIP出力を生成します。

### Analytics

```text
project_id=borinef_mdmaker
surface=web_tool
tracker_version=1.0.0
```

解析は明示的な同意後にのみ有効化され、Global Privacy Controlが有効な場合はブロックされます。
イベントには自由入力全文、生成結果本文、`settings.json` の本文、Stripe URL、Checkout Session ID、APIキー、Secret、個人情報を送りません。

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
- おすすめセットからカスタムしたかどうか
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

## Phase 3C-D paid export launch notes

Production URL:

```text
https://mdmaker.borinef.com/
```

Cloudflare Pages preview URL:

```text
https://borinef-mdmaker.pages.dev/
```

Required Cloudflare Pages environment variables for paid export:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_JPY`
- `STRIPE_PRICE_ID_USD`
- `PUBLIC_SITE_URL`

`PUBLIC_SITE_URL` should be `https://mdmaker.borinef.com`. Checkout success redirects to `/?checkout=success&session_id={CHECKOUT_SESSION_ID}` and the app removes the query string before analytics initialization.

Stripe Product and Price requirements:

- Product name: `BORINEF md maker Export Pack`
- Product metadata: `app=borinef-mdmaker`, `product_code=design-md-export-v1`
- JPY Price: `jpy`, `unit_amount=300`, one-time, lookup key `borinef_mdmaker_export_jpy_v1`
- USD Price: `usd`, `unit_amount=300`, one-time, lookup key `borinef_mdmaker_export_usd_v1`

Price IDs must be stored only in Cloudflare environment variables. Browser code does not send price IDs, amounts, or currency.

## Paid export API

### `POST /api/create-checkout-session`

Request body:

```json
{
  "locale": "ja",
  "exportSpec": {
    "schemaVersion": 1,
    "language": "ja",
    "visualPresetId": "quiet-editorial",
    "colorPaletteId": "warm-paper",
    "translationMode": "harmonize",
    "normalizedToneTags": ["quiet", "structured"],
    "selectedRecommendationSet": "set-1",
    "isCustomizedFromRecommendation": false
  }
}
```

The server validates `ExportSpecV1`, maps `ja` to `STRIPE_PRICE_ID_JPY`, maps `en` to `STRIPE_PRICE_ID_USD`, and sends only compact structured metadata to Stripe.

### `GET /api/checkout-status?session_id=...`

Verifies the Checkout Session server-side and returns:

```json
{
  "paid": true,
  "currency": "jpy",
  "amount": 300,
  "product": "design-md-export-v1"
}
```

The response never returns the Stripe URL or Checkout Session ID.

### `POST /api/download-export`

Request body:

```json
{
  "session_id": "cs_test_..."
}
```

The server retrieves the Checkout Session, verifies `mode=payment`, `status=complete`, `payment_status=paid`, allowed price ID, quantity `1`, allowed product, and valid `ExportSpecV1` metadata before generating the ZIP.

ZIP response headers:

```text
Content-Type: application/zip
Content-Disposition: attachment; filename="borinef-design-md-export.zip"
Cache-Control: private, no-store
```

The ZIP contains 9 files:

- `design.md`
- `design-summary.txt`
- `tokens.json`
- `tokens.css`
- `tailwind.config.memo.md`
- `codex-prompt.md`
- `claude-code-prompt.md`
- `cursor-prompt.md`
- `settings.json`

## Legal pages

Legal pages are static and marked `noindex,follow`:

- `/legal/terms.html`
- `/legal/privacy.html`
- `/legal/commercial-transactions.html`

They are intentionally omitted from `public/sitemap.xml`.

## Analytics policy

The central market observer tracker uses:

```json
{
  "project_id": "borinef_mdmaker",
  "surface": "web_tool",
  "tracker_version": "1.0.0"
}
```

Analytics is explicit opt-in only. Global Privacy Control blocks analytics. Payment and download work independently of analytics consent.

The client wrapper emits only canonical market-observer events:

- `page_view`
- `use_start`
- `use_complete`
- `copy_result`
- `result_export`
- `stripe_outbound`
- `client_exception`

Analytics must not receive free-form feeling text, generated output, Markdown bodies, prompts, full `settings.json`, ZIP contents, Stripe URLs, Checkout Session IDs, API keys, secrets, or personal information.
