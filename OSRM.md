# OSRM（Open Source Routing Machine）について

## 目的と役割

OSRM（Open Source Routing Machine）は、高速な経路検索（ルーティング）を提供するオープンソースのエンジンです。主な役割は次の通りです。

- 与えられた出発点と目的地（および中間点）をもとに、最短または経路の候補を計算する。
- 徒歩、自転車、自動車などのプロファイル（走行ルール）に応じた経路を生成する。
- 各経路について、距離（メートル）・所要時間（秒）・ジオメトリ（経路線）・ナビゲーション用のステップ（分割された案内）などを返す。
- リアルタイム性は低いが、大規模データ（OpenStreetMap）を使ってローカルやサーバー上で独立して運用できる（商用APIに依存しない）。

利用ケースの例：モバイル/ウェブアプリのルート表示、到着予測、徒歩案内の分割ステップ表示、複数経路の比較など。

## APIの基本（エンドポイントとリクエスト例）

代表的なHTTPエンドポイントは次の形式です。

GET /route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}[;{lon3},{lat3}...]?parameters

- profile: `walking`, `driving`, `cycling` など
- 座標は lon,lat の順（経度, 緯度）でセミコロン区切りで複数指定可能
- よく使うクエリパラメータ例:
  - `overview`：`full` / `simplified` / `false`（返されるジオメトリの詳細度）
  - `geometries`：`geojson` / `polyline` / `polyline6`（ジオメトリの形式）
  - `steps`：`true` / `false`（道案内ステップを含めるか）
  - `annotations`：`true` / `distance` / `duration` 等（各セグメントの情報を付与）
  - `alternatives`：代替ルート数

## レスポンス（計算結果）のデータ形式

OSRMの `/route` API はJSON形式で結果を返します。主要フィールドは以下のとおりです。

トップレベル（簡略）:

- `routes`: 配列。計算されたルート候補（通常は最適ルートが先頭）。
- `waypoints`: リクエストで指定した各座標に対応するウェイポイント情報（名前や正規化された座標など）。
- `code`: ステータス（例:`Ok`）。

# OSRM（Open Source Routing Machine）について

## 目的と役割

OSRM（Open Source Routing Machine）は、高速な経路検索（ルーティング）を提供するオープンソースのエンジンです。主な役割は次の通りです。

- 与えられた出発点と目的地（および中間点）をもとに、最短または経路の候補を計算する。
- 徒歩、自転車、自動車などのプロファイル（走行ルール）に応じた経路を生成する。
- 各経路について、距離（メートル）・所要時間（秒）・ジオメトリ（経路線）・ナビゲーション用のステップ（分割された案内）などを返す。
- リアルタイム性は低いが、大規模データ（OpenStreetMap）を使ってローカルやサーバー上で独立して運用できる（商用APIに依存しない）。

利用ケースの例：モバイル/ウェブアプリのルート表示、到着予測、徒歩案内の分割ステップ表示、複数経路の比較など。

## APIの基本（エンドポイントとリクエスト例）

代表的なHTTPエンドポイントは次の形式です。

GET /route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}[;{lon3},{lat3}...]?parameters

- profile: `walking`, `driving`, `cycling` など
- 座標は lon,lat の順（経度, 緯度）でセミコロン区切りで複数指定可能
- よく使うクエリパラメータ例:
  - `overview`：`full` / `simplified` / `false`（返されるジオメトリの詳細度）
  - `geometries`：`geojson` / `polyline` / `polyline6`（ジオメトリの形式）
  - `steps`：`true` / `false`（道案内ステップを含めるか）
  - `annotations`：`true` / `distance` / `duration` 等（各セグメントの情報を付与）
  - `alternatives`：代替ルート数

## レスポンス（計算結果）のデータ形式

OSRMの `/route` API はJSON形式で結果を返します。主要フィールドは以下のとおりです。

トップレベル（簡略）:

- `routes`: 配列。計算されたルート候補（通常は最適ルートが先頭）。
- `waypoints`: リクエストで指定した各座標に対応するウェイポイント情報（名前や正規化された座標など）。
- `code`: ステータス（例:`Ok`）。

各 `route` オブジェクト（代表的なプロパティ）:

- `geometry`：経路のジオメトリ。`geometries=geojson` を使うと GeoJSON 形式（LineString）で返る。`polyline` 形式も選べる。
- `legs`：配列。経路を区間（origin→via→...→destination）ごとに分けた情報。各 `leg` は以下を持つ。
  - `steps`: （`steps=true` の場合）個々の案内ステップの配列。各ステップは `maneuver`（曲がり角や指示）、`geometry`（その区間の線）、`distance`（m）、`duration`（s）、`name`（道路名）などを含む。
  - `distance`: legの総距離（メートル）
  - `duration`: legの総所要時間（秒）
- `distance`: ルート全体の距離（メートル）
- `duration`: ルート全体の所要時間（秒）
- `weight` / `weight_name`: コストやスコア（プロファイルや設定に依存）
- `legs[].annotation`（`annotations` を有効にした場合）：各ポイントやセグメントごとの `speed`, `distance`, `duration`, `congestion` などの配列情報

例（省略形、`geometries=geojson&steps=true` を仮定）:

```json
{
  "code": "Ok",
  "routes": [
    {
      "geometry": { "type": "LineString", "coordinates": [[139.77,35.68],[139.78,35.69], ...] },
      "distance": 1234.5,
      "duration": 900.2,
      "legs": [
        {
          "distance": 1234.5,
          "duration": 900.2,
          "steps": [
            {
              "maneuver": { "type": "turn", "modifier": "left", "location": [139.77,35.68] },
              "geometry": { "type": "LineString", "coordinates": [[139.77,35.68],[139.775,35.685]] },
              "distance": 120.5,
              "duration": 60.3,
              "name": "本郷通り"
            }
          ]
        }
      ]
    }
  ],
  "waypoints": [ { "location": [139.77,35.68], "name": "出発地" }, { "location": [139.78,35.69], "name": "目的地" } ]
}
```

## ジオメトリの形式について

- GeoJSON（`geometries=geojson`）: そのまま地図ライブラリ（Leaflet等）で使いやすいLineString。
- Polyline（`polyline` / `polyline6`）: 座標を圧縮した文字列形式。帯域節約に有利だが復号が必要。

## ステップ（ナビゲーション）について

- `steps=true` を付ければ、各交差点・曲がり角ごとの案内が `legs[].steps` に含まれます。
- 各ステップは `maneuver`（位置・種類・向き）、`name`（道路名）、`distance`、`duration`、`geometry` を持つため、ターンバイターン案内の生成が可能です。

## 注釈（annotations）

`annotations=true` を指定すると、各セグメントごとの追加情報（速度、路面区間の距離・所要時間、道路クラスなど）を受け取れます。これを使うと、経路の混雑推定や細かな可視化が可能です（ただしレスポンスは大きくなる）。

## 実運用上の注意点

- 公開されているデモOSRMサーバー（`router.project-osrm.org`）はレート制限や商用利用の制約があるため、本番では自分でOSRMをビルドしてサーバー化するか、商用のルーティングAPIを利用することを推奨します。
- `geometries=polyline6` や `overview=false` を使って返信サイズを小さくする工夫をすると、モバイル帯域で有利です。
- 緯度経度の順序（OSRMでは座標は lon,lat の順）に注意してください。

## 参考（APIパラメータまとめ）

- endpoint: `/route/v1/{profile}/{coordinates}`
- 主なクエリパラメータ: `overview`, `geometries`, `steps`, `annotations`, `alternatives`, `continue_straight`

## Leafletでの描画

OSRMから返されたルートを地図上（Leaflet）に描画する際の実務的な手順とポイントをまとめます。

### 1) ジオメトリ形式の選択

- `geometries=geojson` を指定すると、レスポンスの `route.geometry` が GeoJSON の LineString になるため、Leaflet (L.geoJSON) でそのまま描画できます。
- `geometries=polyline` / `polyline6` の場合は、受け取った polyline をデコードして座標配列に変換する必要があります（ライブラリ `@mapbox/polyline` などを利用）。

### 2) GeoJSONを使った描画（推奨）

- リクエスト例: `?geometries=geojson&steps=true&overview=full`
- 基本的な描画フロー（擬似コード）:

```js
// OSRMレスポンスを想定
const route = osrmResponse.routes[0];
// GeoJSONのまま描画
const routeLayer = L.geoJSON(route.geometry, {
  style: { color: '#007bff', weight: 5, opacity: 0.8 }
}).addTo(map);

// 表示範囲を合わせる
map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });

// ウェイポイント（OSRMのwaypointsは [lon, lat]）
osrmResponse.waypoints.forEach(wp => {
  const lon = wp.location[0], lat = wp.location[1];
  L.marker([lat, lon]).addTo(map).bindPopup(wp.name || 'Waypoint');
});
```

ポイント: Leaflet は座標を [lat, lon] の順で受け取るため、OSRMの `[lon, lat]` を取り扱う際は順序を入れ替える必要があります。

### 3) polyline を使う場合

- OSRMが `polyline` や `polyline6` を返す時は、それをデコードして緯度経度配列に変換します。Node/ブラウザでは `@mapbox/polyline` を使うのが一般的です。

```js
// polyline 文字列をデコード（polyline ライブラリが必要）
const coords = polyline.decode(route.geometry); // [[lat,lng], [lat,lng], ...]
const latlngs = coords.map(p => [p[0], p[1]]);
L.polyline(latlngs, { color: '#007bff', weight: 5 }).addTo(map);
```

注意: `polyline.decode` の返す配列は [lat, lng] の順（ライブラリに依存）なので、Leafletへ渡す形式と合っているか確認してください。

### 4) ステップ（ターンバイターン）の表示

- `steps=true` を指定した場合、`routes[0].legs[*].steps` に詳細な案内が入ります。各ステップは `maneuver.location`（[lon, lat]）を持つため、交差点マーカーや分割線の描画に利用できます。

```js
route.legs.forEach(leg => {
  leg.steps.forEach(step => {
    const lon = step.maneuver.location[0], lat = step.maneuver.location[1];
    L.circleMarker([lat, lon], { radius: 4, color: '#333' }).addTo(map)
      .bindPopup(`${step.maneuver.type} ${step.name || ''}`);
  });
});
```

ステップ情報はUI上で「次の曲がり角」「右折」等の指示を順に表示するのに使いやすいです。

### 5) スタイルや色をルート特性で変える

- ルートの安全度やスコア（例: `safetyScore`）に応じて色やラインの太さ、点線化などを動的に変えると視認性が上がります。

```js
function routeStyle(safetyScore) {
  return {
    color: safetyScore >= 70 ? '#28a745' : safetyScore >= 50 ? '#ffc107' : '#dc3545',
    weight: 5,
    dashArray: safetyScore < 50 ? '10,6' : null
  };
}

L.geoJSON(route.geometry, { style: () => routeStyle(safetyScore) }).addTo(map);
```

### 6) パフォーマンスと実務上の注意点

- 多数のステップや `annotations` を同時に要求するとレスポンスが大きくなり描画コストが上がります。モバイルでは `overview=simplified` や `steps=false` を活用して必要最小限の情報に絞ると良いです。
- 経路を頻繁に再描画する場合は、既存のレイヤーを削除してから新しいレイヤーを追加する（routeLayer.clearLayers() / map.removeLayer(routeLayer)）ことを忘れないでください。
- GeoJSONを直接使うとLeaflet側で簡単にスタイリングやイベント（click, mouseover）を追加できます。これらを活用してルート選択UIを作ると使いやすくなります。

---

## 公共交通連携：設計メモ

### 目的

目的: OSRM（道路ルーティング）と公共交通（時刻表・乗換）を組み合わせ、アプリ上でシームレスに徒歩・乗車を含む経路を提示するための設計指針。

### 要件（高レベル）

- 出発地→最寄り停留所（徒歩）
- 停留所〜停留所（公共交通、時刻表に基づく乗換）
- 目的地最寄り停留所→目的地（徒歩）
- リアルタイム運行情報（将来的）を利用できる構成

### 推奨アーキテクチャ（概略）

- フロントエンド（このリポジトリ）: ユーザー操作、地図表示（Leaflet）、ルートの描画・選択・表示
- ルーティング層:
  - OSRM サービス: 徒歩/自転車/車の「ファースト/ラストマイル」ルート計算
  - OTP (OpenTripPlanner) / Valhalla（または商用API）: GTFSベースの公共交通ルーティング（乗換・時刻表・到着時刻計算）
- 統合API（中間サービス）: フロントエンドからの単一クエリを受け、OSRMとOTPへ問い合わせ／結果をマージして単一の経路候補（itinerary）として返す。例えば Node/Express で実装。
- データ層: GTFS（静的）、GTFS-RT（リアルタイム、必要時）、OSM地図データ（OSRM用）

### データフロー（簡易）

1. フロントエンドが出発地・目的地・出発時刻（または現在時刻）を統合APIへ送る
2. 統合APIはまず最寄り停留所候補をOSRMで探索（徒歩ルート）またはプリビルド停留所インデックスで検索
3. 停留所候補と時刻を用いてOTPへ乗換ルート（トランジット区間）を問い合わせ
4. OTPの経路結果（複数候補）を受け取り、各候補のファースト/ラストマイルをOSRMで計算し合成
5. 合成したitineraryを正規化してフロントへ返す（JSONフォーマットの統一）

### 想定する統合APIの出力例（簡易）

```json
{
  "itineraries": [
    {
      "legs": [
        { "mode": "WALK", "from": {...}, "to": {...}, "distance": 300, "duration": 240, "geometry": {...} },
        { "mode": "TRANSIT", "route": "○○線", "fromStop": {...}, "toStop": {...}, "departure": "2025-08-22T10:15:00+09:00", "arrival": "2025-08-22T10:40:00+09:00", "geometry": {...} },
        { "mode": "WALK", "from": {...}, "to": {...}, "distance": 150, "duration": 120, "geometry": {...} }
      ],
      "totalDistance": 1500,
      "totalDuration": 3600,
      "score": 85
    }
  ]
}
```

実装ステップ（優先度順）:

1. GTFS データの入手（対象地域の静的GTFS）とOTPのローカル立ち上げ（Docker推奨）
2. 統合APIのプロトタイプを用意：
   - エンドポイント: POST /plan { from, to, departureTime }
   - 内部処理: OTP query → 返されたトランジット区間の停留所に対してOSRMで前後の徒歩ルートを計算 → 合成して返却
3. フロントエンドで受け取ったitineraryを描画：
   - transit部分は停留所マーカーとGTFS路線名で表現
   - 歩行区間はOSRMのジオメトリ（GeoJSON）で描画
4. エッジケース対応: 夜間で運行がない、特定停留所の情報欠落、同時刻検索での複数候補の整理

運用・拡張メモ:

- リアルタイムデータを使う場合はGTFS-RTをOTPへ供給／もしくはOTPが対応していればRTを有効化する。RTは運行遅延や運休を反映するためUX改善に有用。
- スケーリング: OTP/OSRMは両方ともCPUとメモリを使う。小規模環境ならDockerコンテナで単一サーバに収められるが、トラフィックが増えるならサービス分離とキャッシュ（よく使う乗換のプレコンピュート）を検討。
- キャッシュ: 同一路線・時間帯の検索はキャッシュしやすい（キー: from,to,departureWindow）。

テスト項目（初期）:

- 単純経路：徒歩のみ（OSRM）の結果と整合するか
- トランジット経路：OTPから受け取る乗換情報の妥当性
- 合成検証：OSRMで計算したファースト/ラストマイルがOTPの停留所に正しく到達するか
- エラー条件：停留所未登録・時刻表外の検索・OTP/OSRMのタイムアウト時のフェールバック

開発用コマンド例（OTPをDockerで動かす簡易）:

```bash
# OTP Dockerイメージは公式が無い場合があるため、OpenTripPlannerを自分でDockerizeするか、公開イメージを利用
docker run -d -p 8080:8080 -v /path/to/gtfs:/data/gtfs -v /path/to/osm:/data/osm your-otp-image --build /data/gtfs /data/osm
```

最後に

- 本格的な公共交通対応が必要であれば、OTP（OpenTripPlanner）を主要候補として検討してください。OSRMは徒歩・自転車などのファースト/ラストマイルに強く、両者を組み合わせるのが現実的かつ実務的です。
