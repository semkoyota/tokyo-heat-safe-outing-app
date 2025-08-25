# 🌡️ Tokyo Heat-Safe Outing App

東京子連れ安全おでかけナビ

A heat stroke prevention app for safe family outings in Tokyo

## 概要

祖父母世代が夏に孫と安全におでかけできるよう、熱中症対策を考慮した施設案内アプリです。
東京都オープンデータを活用して開発されました。

Heat stroke prevention app for safe family outings in Tokyo,  using Tokyo Open Data. Designed for grandparents with grandchildren.

## 機能

- リアルタイム暑さ情報表示
- 施設検索・フィルター機能
- 熱中症リスク評価
- バリアフリー情報
- ルート案内（予定）

## 技術スタック

- フロントエンド: React 18+ / TypeScript
- ビルド: Vite
- 地図: Leaflet
- ルーティング: OSRM public API（fetch ラッパー）
- CI / デプロイ: GitHub Actions（.github/workflows/*） → GitHub Pages

### その他、技術的な補足

- 地図表示（Leaflet）
- 施設一覧と詳細モーダル
- モーダル内でのルート計算（OSRM public API）と地図上描画
- サイドバーに簡易な天気／暑さ情報表示
- GitHub Actions を使ったビルド & GitHub Pages へのデプロイ

## リポジトリ構成（主要）

- `client/` — React + TypeScript アプリ本体
- `src/` — ソースコード（`components/MapView.tsx`, `components/FacilityModal.tsx`, `lib/routing.ts` など）
- `public/` — 静的アセット
- `package.json`, `vite.config.ts` など
- `data/` — 施設データ（`facilities.json`, `facility-types.json`）
- `.github/workflows/` — ビルド／デプロイ用ワークフロー

## ローカル開発（推奨）

前提: Node.js と npm がインストールされていること。推奨 Node バージョンはプロジェクトの `package.json` に合わせてください。

1. 依存関係をインストール

```bash
cd client
npm install
```

1. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) （Vite のデフォルトポート）を開いて動作確認します。

1. 型チェック + ビルド

```bash
npm run build
```

ビルドは `tsc -b`（型チェック）→ `vite build` を実行します。出力は `client/dist/` に生成されます。

1. プレビュー（ビルド成果の簡易確認）

```bash
npm run preview
```

## データ編集

施設データは `data/` 配下の JSON ファイルで管理しています。内容を編集したら client アプリ側でのフォーマット（snake_case ↔ camelCase の正規化）があるため、編集後に動作確認を行ってください。

主なデータファイル:

- `data/facilities.json` — 施設一覧と詳細
- `data/facility-types.json` — 施設カテゴリ定義

注意: フロントエンドはデータをフェッチして内部で正規化しますが、大きな構造変更を行う場合は `client/src/lib/dataManager.ts` を確認してください。

## テスト & 品質ゲート

- `npm run build` がプロジェクトの型チェックとビルドを兼ねます。
- ESLint のセットアップがある場合は `npm run lint` を実行してください（`client/package.json` の script を参照）。

## ライセンス

MIT

## 開発上の注意点 / TODO

- ルート計算は OSRM public API を利用しています。利用制限や CORS の問題があるため、運用環境ではプロキシや自前のルーティングサーバを検討してください。
- 出発地点（ユーザーの起点）をサイドバーから指定できるようにする拡張が未実装のまま残っています。
- `data/` の形式変更や大規模なアップデート時は `client/src/lib/dataManager.ts` の正規化ロジックを更新する必要があります。
