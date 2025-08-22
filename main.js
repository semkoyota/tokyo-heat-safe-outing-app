// JavaScript for 東京子連れ安全おでかけナビ
// index.htmlから分離

// グローバル変数
let map = null;
let locationService = null;
let routeDisplayService = null;

// --- 地図初期化 ---
function initMap() {
  // 東京駅を中心に表示
  map = L.map("map").setView([35.681236, 139.767125], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // サービス初期化
  locationService = new LocationService();
  routingService = new RoutingService();
  routeDisplayService = new RouteDisplayService(map);
}

class StaticDataManager {
  constructor() {
    this.facilities = [];
    this.facilityTypes = {};
    this.isLoaded = false;
  }

  async loadData() {
    if (this.isLoaded) return;

    try {
      // 施設データの読み込み
      const facilitiesResponse = await fetch("./data/facilities.json");
      const facilitiesData = await facilitiesResponse.json();

      // 施設タイプ定義の読み込み
      const typesResponse = await fetch("./data/facility-types.json");
      const typesData = await typesResponse.json();

      this.facilities = facilitiesData.facilities.map((facility) => ({
        name: facility.name,
        type: facility.type,
        address: facility.address,
        walkTime: facility.nearestStation ? facility.nearestStation.walkTime : null,
        indoorRatio: facility.indoorRatio,
        facilities: this.convertFacilities(facility.facilities),
        riskLevel: facility.heatRisk.level,
        description: facility.description,
        admission: facility.admission,
        highlights: facility.highlights,
        crowdLevel: facility.crowdLevel,
        coordinates: facility.coordinates,
        nearestStation: facility.nearestStation || null,
        operatingHours: facility.operatingHours || null,
        price: facility.price || null,
        exertion: facility.exertion || null
      }));

      this.facilityTypes = typesData.facilityTypes;
      this.riskLevels = typesData.riskLevels;
      this.isLoaded = true;

      console.log(`${this.facilities.length}件の施設データを読み込みました`);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
      // フォールバック用の最小データ
      this.facilities = this.getFallbackData();
      this.isLoaded = true;
    }
  }

  convertFacilities(facilityObj) {
    const converted = [];
    if (facilityObj.wheelchair) converted.push("wheelchair");
    if (facilityObj.diaper) converted.push("diaper");
    if (facilityObj.elevator) converted.push("elevator");
    if (facilityObj.restArea) converted.push("rest_area");
    return converted;
  }

  getFallbackData() {
    return [
      {
        name: "国立科学博物館",
        type: "museum",
        address: "台東区上野公園7-20",
        walkTime: 8,
        indoorRatio: 95,
        facilities: ["wheelchair", "diaper", "elevator", "rest_area"],
        riskLevel: "low",
        description: "完全空調完備で夏でも快適。恐竜展示が人気",
        admission: { adult: 630, senior: 0, child: 0 },
        highlights: ["恐竜展示", "プラネタリウム"],
      },
    ];
  }

  getFacilities() {
    return this.facilities;
  }

  getFacilityTypes() {
    return this.facilityTypes;
  }
}

const dataManager = new StaticDataManager();
let currentFacilities = [];
let userLocation = null;
let routingService = null;

// 現在地取得機能
class LocationService {
  constructor() {
    this.watchId = null;
  }

  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("位置情報がサポートされていません"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp),
          };
          resolve(location);
        },
        (error) => {
          let message = "現在地を取得できませんでした: ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message += "位置情報の利用が拒否されました";
              break;
            case error.POSITION_UNAVAILABLE:
              message += "位置情報を利用できません";
              break;
            case error.TIMEOUT:
              message += "タイムアウトしました";
              break;
            default:
              message += "不明なエラーが発生しました";
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5分間キャッシュ
        }
      );
    });
  }

  watchPosition(callback) {
    if (!navigator.geolocation) {
      throw new Error("位置情報がサポートされていません");
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        };
        callback(location);
      },
      (error) => {
        console.error("位置情報の監視エラー:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

// 新規: 駅名などをNominatimでジオコーディングして座標を取得するヘルパー
async function geocodePlace(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'ja' } });
    if (!res.ok) throw new Error('Geocoding HTTP error: ' + res.status);
    const results = await res.json();
    if (results && results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), display_name: results[0].display_name };
    }
  } catch (e) {
    console.warn('geocodePlace failed:', e);
  }
  return null;
}

// OSRM APIを使用したルート計算機能
class RoutingService {
  constructor() {
    this.baseUrl = "https://router.project-osrm.org/route/v1/walking";
    this.currentRoute = null;
  }

  async calculateRoute(startCoords, destCoords) {
    try {
      const url = `${this.baseUrl}/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;

      console.log("ルート計算中...", { start: startCoords, dest: destCoords });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error("ルートが見つかりませんでした");
      }

      const route = data.routes[0];
      console.log("ルート計算成功:", route);

      return {
        geometry: route.geometry,
        distance: route.distance, // メートル
        duration: route.duration, // 秒
        steps: route.legs[0].steps || [],
        coordinates: route.geometry.coordinates,
      };
    } catch (error) {
      console.error("ルート計算エラー:", error);
      throw error;
    }
  }

  async calculateMultipleRoutes(startCoords, destCoords, alternatives = 2) {
    try {
      const url = `${this.baseUrl}/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error("ルートが見つかりませんでした");
      }

      return data.routes.map((route) => ({
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        steps: route.legs[0].steps || [],
        coordinates: route.geometry.coordinates,
      }));
    } catch (error) {
      console.error("複数ルート計算エラー:", error);
      throw error;
    }
  }

  parseRouteSteps(steps) {
    return steps.map((step) => ({
      instruction: step.maneuver.type,
      name: step.name || "道路",
      distance: step.distance,
      duration: step.duration,
      coordinates: step.geometry ? step.geometry.coordinates : [],
    }));
  }
}

// 熱中症対策スコア計算ロジック
class HeatSafetyCalculator {
  constructor() {
    this.riskFactors = {
      distance: { weight: 0.3 },
      time: { weight: 0.4 },
      weather: { weight: 0.3 },
    };
  }

  calculateHeatSafetyScore(route, destinationFacility = null) {
    let score = 100; // ベーススコア

    // 距離ファクター (1km以上でペナルティ)
    const distanceKm = route.distance / 1000;
    const distancePenalty = Math.min(distanceKm * 15, 50);
    score -= distancePenalty;

    // 時間ファクター (日中の暑い時間帯でペナルティ)
    const timeScore = this.calculateTimeScore();
    score += timeScore;

    // 所要時間ファクター (15分以上でペナルティ)
    const durationMinutes = route.duration / 60;
    const durationPenalty = Math.max(0, (durationMinutes - 15) * 2);
    score -= durationPenalty;

    // 目的地の屋内率ボーナス
    if (destinationFacility) {
      const indoorBonus = destinationFacility.indoorRatio * 0.2;
      score += indoorBonus;

      // 熱中症リスクによる調整
      switch (destinationFacility.riskLevel) {
        case "low":
          score += 10;
          break;
        case "medium":
          score += 0;
          break;
        case "high":
          score -= 20;
          break;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  calculateTimeScore() {
    const hour = new Date().getHours();

    // 危険な時間帯 (10-16時)
    if (hour >= 10 && hour <= 16) {
      const peakHours = [12, 13, 14]; // 最も危険
      if (peakHours.includes(hour)) {
        return -30; // 最大ペナルティ
      }
      return -20; // 中程度のペナルティ
    }

    // 比較的安全な時間帯
    if (hour <= 9 || hour >= 17) {
      return 10; // ボーナス
    }

    return 0; // ニュートラル
  }

  generateHeatWarnings(route, safetyScore) {
    const warnings = [];

    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;
    const hour = new Date().getHours();

    if (safetyScore < 30) {
      warnings.push("⚠️ 熱中症リスクが非常に高いです");
    } else if (safetyScore < 50) {
      warnings.push("⚠️ 熱中症リスクが高めです");
    }

    if (distanceKm > 1) {
      warnings.push(`🚶 距離が長めです (${distanceKm.toFixed(1)}km)`);
    }

    if (durationMinutes > 20) {
      warnings.push(`⏰ 徒歩時間が長めです (${Math.round(durationMinutes)}分)`);
    }

    if (hour >= 10 && hour <= 16) {
      warnings.push("🌡️ 日中の暑い時間帯です");
      warnings.push("💧 こまめな水分補給を心がけてください");
    }

    if (hour >= 12 && hour <= 14) {
      warnings.push("☀️ 最も暑い時間帯です。可能なら時間をずらすことをお勧めします");
    }

    if (warnings.length === 0) {
      warnings.push("✅ 比較的安全にお出かけできそうです");
    }

    return warnings;
  }

  identifyRestStops(route) {
    // 簡易的な休憩ポイント識別
    // 実際の実装では、POI APIや建物データベースを使用
    const restStops = [];
    const coordinates = route.coordinates || [];

    // 距離が長い場合は休憩ポイントを提案
    if (route.distance > 800) {
      const midPoint = Math.floor(coordinates.length / 2);
      if (coordinates[midPoint]) {
        restStops.push({
          name: "コンビニ・商店",
          coordinates: {
            lat: coordinates[midPoint][1],
            lng: coordinates[midPoint][0],
          },
          type: "convenience_store",
          description: "水分補給・休憩スポット",
        });
      }
    }

    return restStops;
  }

  getSafetyColor(score) {
    if (score >= 70) return "#28a745"; // 安全 - 緑
    if (score >= 50) return "#ffc107"; // 注意 - 黄
    if (score >= 30) return "#fd7e14"; // 警戒 - オレンジ
    return "#dc3545"; // 危険 - 赤
  }

  getSafetyLabel(score) {
    if (score >= 70) return "安全";
    if (score >= 50) return "注意";
    if (score >= 30) return "警戒";
    return "危険";
  }
}

// ルート表示機能（地図上への描画）
class RouteDisplayService {
  constructor(map) {
    this.map = map;
    this.routeLayer = null;
    this.markersGroup = null;
    this.safetyCalculator = new HeatSafetyCalculator();
  }

  displayRoute(route, startLocation, destinationFacility) {
    // 既存のルートとマーカーをクリア
    this.clearRoute();

    // 熱中症安全度を計算
    const safetyScore = this.safetyCalculator.calculateHeatSafetyScore(route, destinationFacility);
    const warnings = this.safetyCalculator.generateHeatWarnings(route, safetyScore);
    const restStops = this.safetyCalculator.identifyRestStops(route);

    // ルートを地図に表示
    this.routeLayer = L.geoJSON(route.geometry, {
      style: {
        color: this.safetyCalculator.getSafetyColor(safetyScore),
        weight: 5,
        opacity: 0.8,
        dashArray: safetyScore < 50 ? "10, 10" : null, // 危険な場合は点線
      },
    }).addTo(this.map);

    // マーカーグループを作成
    this.markersGroup = L.layerGroup().addTo(this.map);

    // 出発点マーカー
    const startMarker = L.marker([startLocation.lat, startLocation.lng], {
      icon: this.createCustomIcon("🚩", "#007bff"),
    })
      .bindPopup(startLocation.name ? `📍 ${startLocation.name}` : "📍 現在地")
      .addTo(this.markersGroup);

    // 目的地マーカー
    const destMarker = L.marker([destinationFacility.coordinates.lat, destinationFacility.coordinates.lng], {
      icon: this.createCustomIcon(
        getFacilityIcon(destinationFacility.type),
        this.safetyCalculator.getSafetyColor(safetyScore)
      ),
    })
      .bindPopup(this.createDestinationPopup(destinationFacility, safetyScore))
      .addTo(this.markersGroup);

    // 休憩ポイントマーカー
    restStops.forEach((stop, index) => {
      L.marker([stop.coordinates.lat, stop.coordinates.lng], {
        icon: this.createCustomIcon("🏪", "#17a2b8"),
      })
        .bindPopup(`🏪 ${stop.name}<br><small>${stop.description}</small>`)
        .addTo(this.markersGroup);
    });

    // 地図の表示範囲を調整
    const bounds = this.routeLayer.getBounds();
    this.map.fitBounds(bounds, { padding: [20, 20] });

    // ルート情報を表示
    this.showRouteInfo(route, destinationFacility, safetyScore, warnings);

    return {
      route: route,
      safetyScore: safetyScore,
      warnings: warnings,
      restStops: restStops,
    };
  }

  createCustomIcon(text, color) {
    return L.divIcon({
      html: `<div style="
              background-color: ${color};
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 16px;
              border: 2px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">${text}</div>`,
      className: "custom-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  }

  createDestinationPopup(facility, safetyScore) {
    return `
            <div style="min-width: 200px;">
              <h4>${getFacilityIcon(facility.type)} ${facility.name}</h4>
              <p><strong>熱中症安全度:</strong> 
                <span style="color: ${this.safetyCalculator.getSafetyColor(safetyScore)}; font-weight: bold;">
                  ${safetyScore}/100 (${this.safetyCalculator.getSafetyLabel(safetyScore)})
                </span>
              </p>
              <p><strong>屋内率:</strong> ${facility.indoorRatio}%</p>
              <p><strong>住所:</strong> ${facility.address}</p>
            </div>
          `;
  }

  showRouteInfo(route, facility, safetyScore, warnings) {
    const info = `
${facility.name}への熱中症対策ルート

📊 熱中症安全度: ${safetyScore}/100 (${this.safetyCalculator.getSafetyLabel(safetyScore)})
📍 距離: ${(route.distance / 1000).toFixed(1)}km
⏱️ 所要時間: ${Math.round(route.duration / 60)}分
🏠 目的地屋内率: ${facility.indoorRatio}%

⚠️ 注意事項:
${warnings.join("\n")}
          `;

    alert(info);
  }

  clearRoute() {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
    if (this.markersGroup) {
      this.map.removeLayer(this.markersGroup);
      this.markersGroup = null;
    }
  }
}

function updateWeatherInfo() {
  // 実装時は気象庁APIまたは東京暑さマップAPIから取得
  const now = new Date();
  const hour = now.getHours();

  let temp, wbgt, alert;
  if (hour >= 10 && hour <= 16) {
    temp = Math.floor(Math.random() * 5) + 30; // 30-34°C
    wbgt = Math.floor(Math.random() * 4) + 28; // 28-31
    alert = wbgt >= 31 ? "危険" : wbgt >= 28 ? "厳重警戒" : "警戒";
  } else {
    temp = Math.floor(Math.random() * 3) + 25; // 25-27°C
    wbgt = Math.floor(Math.random() * 3) + 25; // 25-27
    alert = "注意";
  }

  document.getElementById("temperature").textContent = `${temp}°C`;
  document.getElementById("wbgt").textContent = `暑さ指数: ${wbgt} (${alert})`;
}

function getRiskLevelClass(level) {
  switch (level) {
    case "low":
      return "risk-low";
    case "medium":
      return "risk-medium";
    case "high":
      return "risk-high";
    default:
      return "risk-medium";
  }
}

function getRiskLevelText(level) {
  switch (level) {
    case "low":
      return "安全";
    case "medium":
      return "注意";
    case "high":
      return "要注意";
    default:
      return "注意";
  }
}

function getFacilityIcon(type) {
  switch (type) {
    case "museum":
      return "🏛️";
    case "aquarium":
      return "🐟";
    case "indoor_playground":
      return "🎪";
    case "library":
      return "📚";
    case "mall":
      return "🏬";
    case "zoo":
      return "🦁";
    default:
      return "📍";
  }
}

function hasFacility(facility, facilityType) {
  if (!facility || !facility.facilities) return false;
  // support multiple schemas: array of keys or object with boolean flags
  if (Array.isArray(facility.facilities)) {
    return facility.facilities.includes(facilityType);
  }
  if (typeof facility.facilities === 'object') {
    return !!facility.facilities[facilityType];
  }
  return false;
}

function renderFacilities(facilities) {
  const container = document.getElementById("facilities");

  if (facilities.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">条件に合う施設が見つかりませんでした。</p>';
    return;
  }

  container.innerHTML = facilities
    .map((facility) => {
      // 料金表示のフォールバック
      let priceLabel = '';
      if (facility.price && typeof facility.price.avgPerPerson === 'number') {
        priceLabel = facility.price.avgPerPerson === 0 ? '無料' : `平均料金: ¥${facility.price.avgPerPerson.toLocaleString()}`;
      } else if (facility.admission && typeof facility.admission.adult === 'number') {
        priceLabel = facility.admission.adult === 0 ? '無料' : `目安料金: ¥${facility.admission.adult.toLocaleString()}`;
      }

      // 営業時間表示
      let hoursLabel = '';
      if (facility.operatingHours) {
        const h = facility.operatingHours;
        const parts = [];
        if (h.weekday) parts.push(`平日: ${h.weekday}`);
        if (h.weekend) parts.push(`土日: ${h.weekend}`);
        if (h.holiday) parts.push(`定休日: ${h.holiday}`);
        hoursLabel = parts.join(' / ');
      }

      // 体力スコア表示
      let exertionLabel = '';
      if (facility.exertion) {
        const e = facility.exertion;
        exertionLabel = `体力スコア: ${e.score} (${e.level || ''})` + (e.description ? ` — ${e.description}` : '');
      }

      // 最寄り駅表示
      let stationLabel = '';
      if (facility.nearestStation) {
        const s = facility.nearestStation;
        const lineInfo = Array.isArray(s.lines) && s.lines.length > 0 ? `(${s.lines[0]})` : '';
        stationLabel = `${s.name || '最寄り駅'} 徒歩約${s.walkTime != null ? s.walkTime + '分' : 'N/A'} ${lineInfo}`;
      } else if (facility.walkTime != null) {
        stationLabel = `徒歩約${facility.walkTime}分`;
      }

      return `
                <div class="facility-item">
                    <div class="facility-name">
                        ${getFacilityIcon(facility.type)} ${facility.name}
                    </div>
                    <div class="facility-info">
                        <div class="info-item">
                            <span class="info-icon">📍</span>
                            ${facility.address}
                        </div>
                        <div class="info-item">
                            <span class="info-icon">🚶</span>
                            ${stationLabel}
                        </div>
                        ${hoursLabel ? `
                        <div class="info-item">
                            <span class="info-icon">⏰</span>
                            ${hoursLabel}
                        </div>
                        ` : ''}
                        ${priceLabel ? `
                        <div class="info-item">
                            <span class="info-icon">💴</span>
                            ${priceLabel}
                        </div>
                        ` : ''}
                        ${exertionLabel ? `
                        <div class="info-item">
                            <span class="info-icon">💪</span>
                            ${exertionLabel}
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="info-icon">🏠</span>
                            屋内率${facility.indoorRatio}%
                        </div>
                        <div class="info-item">
                            <span class="risk-level ${getRiskLevelClass(facility.riskLevel)}">
                                熱中症リスク: ${getRiskLevelText(facility.riskLevel)}
                            </span>
                        </div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <span class="info-icon">♿</span>
                        ${hasFacility(facility, "wheelchair") ? "車椅子対応" : ""}
                        ${hasFacility(facility, "diaper") ? " | おむつ交換台" : ""}
                        ${hasFacility(facility, "elevator") ? " | エレベーター" : ""}
                        ${hasFacility(facility, "rest_area") ? " | 休憩エリア" : ""}
                    </div>
                    <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">${facility.description}</p>
                    <button class="route-btn" onclick="showRoute('${facility.name.replace(/'/g, "\\'") }')">
                        🗺️ ルートを表示
                    </button>
                </div>
            `;
    })
    .join("");
}

function searchFacilities() {
  const loading = document.getElementById("loading");
  const facilities = document.getElementById("facilities");

  loading.style.display = "block";
  facilities.style.display = "none";

  // 検索条件を取得
  const facilityType = document.getElementById("facilityType").value;
  const travelTime = parseInt(document.getElementById("travelTime").value);
  const requiredFacilities = [];

  if (document.getElementById("wheelchair").checked) requiredFacilities.push("wheelchair");
  if (document.getElementById("diaper").checked) requiredFacilities.push("diaper");
  if (document.getElementById("elevator").checked) requiredFacilities.push("elevator");
  if (document.getElementById("rest_area").checked) requiredFacilities.push("rest_area");

  // フィルタリング処理
  setTimeout(() => {
    let filtered = currentFacilities.filter((facility) => {
      // 施設タイプフィルター
      if (facilityType !== "all" && facility.type !== facilityType) {
        return false;
      }

      // 移動時間フィルター
      if (facility.walkTime > travelTime) {
        return false;
      }

      // 必要設備フィルター
      for (let required of requiredFacilities) {
        if (!facility.facilities.includes(required)) {
          return false;
        }
      }

      return true;
    });

    // 熱中症リスクの低い順、屋内率の高い順でソート
    filtered.sort((a, b) => {
      const riskOrder = { low: 0, medium: 1, high: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.indoorRatio - a.indoorRatio;
    });

    currentFacilities = filtered;

    loading.style.display = "none";
    facilities.style.display = "block";
    renderFacilities(filtered);
  }, 1000);
}

async function showRoute(facilityName) {
  try {
    // 施設情報を取得
    const facility = currentFacilities.find((f) => f.name === facilityName);
    if (!facility || !facility.coordinates) {
      alert("施設の位置情報が見つかりません");
      return;
    }

    // 出発点を決定: まず施設データにnearestStation.coordinatesがあればそれを使う
    let startLocation = null;

    if (facility.nearestStation && facility.nearestStation.coordinates && typeof facility.nearestStation.coordinates.lat === 'number') {
      const sc = facility.nearestStation.coordinates;
      startLocation = { lat: sc.lat, lng: sc.lng, name: facility.nearestStation.name || '最寄り駅' };
      console.log('施設データのnearestStation.coordinatesを開始点に使用:', startLocation);
    } else {
      // 施設データに駅座標がない場合、駅名でジオコーディングを試みる
      const stationName = facility.nearestStation && facility.nearestStation.name ? facility.nearestStation.name : null;

      if (stationName) {
        const query = `${stationName} 駅, 東京`;
        const geo = await geocodePlace(query);
        if (geo) {
          startLocation = { lat: geo.lat, lng: geo.lng, name: stationName };
          console.log('最寄り駅ジオコーディング成功:', stationName, startLocation);
        } else {
          console.warn('最寄り駅のジオコーディングに失敗しました:', stationName);
        }
      }

      // それでもstartLocationが決まらなければ現在地を使用
      if (!startLocation) {
        const curr = await locationService.getCurrentLocation();
        startLocation = { lat: curr.lat, lng: curr.lng, accuracy: curr.accuracy, name: '現在地' };
        console.log('現在地を出発点として使用:', startLocation);
      }
    }

    // ルートを計算
    const route = await routingService.calculateRoute(startLocation, facility.coordinates);
    console.log("ルート計算結果:", route);

    // ルートを地図に表示
    const routeInfo = routeDisplayService.displayRoute(route, startLocation, facility);
    console.log("ルート表示完了:", routeInfo);
  } catch (error) {
    console.error("ルート表示エラー:", error);
    alert("ルートを表示できませんでした: " + error.message);
  }
}

// 初期化
document.addEventListener("DOMContentLoaded", async function () {
  initMap();
  // データの読み込み
  await dataManager.loadData();
  currentFacilities = dataManager.getFacilities();

  updateWeatherInfo();
  renderFacilities(currentFacilities);

  // 5分ごとに気象情報を更新
  setInterval(updateWeatherInfo, 300000);
});
