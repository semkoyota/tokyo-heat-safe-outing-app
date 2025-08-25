import { useEffect, useState } from "react";
import "./App.css";
import type { FacilityFull } from "./types";
import { fetchFacilities } from "./lib/dataManager";
import FacilityModal from "./components/FacilityModal";

function App() {
  const [facilities, setFacilities] = useState<FacilityFull[]>([]);
  const [selected, setSelected] = useState<FacilityFull | null>(null);
  // routeRequested state removed (unused)

  // weather state (migrated from main.js -> updateWeatherInfo)
  const [temperature, setTemperature] = useState<string>("-- °C");
  const [wbgtText, setWbgtText] = useState<string>("暑さ指数: --");

  const searchFacilities = () => {
    // placeholder: filtering logic can be implemented later
    // keep this noop so the search button doesn't error
    // we intentionally read form values by id or convert to controlled inputs later
    console.log("searchFacilities clicked");
  };

  useEffect(() => {
    fetchFacilities().then(setFacilities);
  }, []);

  useEffect(() => {
    const updateWeatherInfo = () => {
      const now = new Date();
      const hour = now.getHours();

      let temp: number, wbgt: number, alert: string;
      if (hour >= 10 && hour <= 16) {
        temp = Math.floor(Math.random() * 5) + 30; // 30-34°C
        wbgt = Math.floor(Math.random() * 4) + 28; // 28-31
        alert = wbgt >= 31 ? "危険" : wbgt >= 28 ? "厳重警戒" : "警戒";
      } else {
        temp = Math.floor(Math.random() * 3) + 25; // 25-27°C
        wbgt = Math.floor(Math.random() * 3) + 25; // 25-27
        alert = "注意";
      }

      setTemperature(`${temp}°C`);
      setWbgtText(`暑さ指数: ${wbgt} (${alert})`);
    };

    // initial
    updateWeatherInfo();
    // update every 5 minutes
    const timer = window.setInterval(updateWeatherInfo, 300000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>🌡️ Play & Nap</h1>
        <p>子供を遊んで寝かせたい！熱中症対策を考慮した施設案内</p>
      </div>
      <div className="main-content">
        <aside className="sidebar">
          {/* 気象情報 */}
          <div className="weather-banner">
            <h3>🌡️ 現在の暑さ情報</h3>
            <div className="temperature" id="temperature">
              {temperature}
            </div>
            <div className="wbgt-value" id="wbgt">
              {wbgtText}
            </div>
          </div>

          {/* フィルター */}
          <div className="filters">
            <h3>🔍 施設検索フィルター</h3>

            <div className="filter-group">
              <label>出発地</label>
              <input type="text" id="startLocation" placeholder="例: 新宿駅" defaultValue="新宿駅" />
            </div>

            <div className="filter-group">
              <label>施設タイプ</label>
              <select id="facilityType" defaultValue="all">
                <option value="all">すべて</option>
                <option value="museum">博物館・科学館</option>
                <option value="aquarium">水族館</option>
                <option value="indoor_playground">屋内遊び場</option>
                <option value="library">図書館</option>
                <option value="mall">ショッピングモール</option>
              </select>
            </div>

            <div className="filter-group">
              <label>移動時間（最大）</label>
              <select id="travelTime" defaultValue="30">
                <option value="30">30分以内</option>
                <option value="45">45分以内</option>
                <option value="60">1時間以内</option>
              </select>
            </div>

            <div className="filter-group">
              <label>必要な設備</label>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input type="checkbox" id="wheelchair" defaultChecked />
                  <label htmlFor="wheelchair">車椅子対応</label>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" id="diaper" defaultChecked />
                  <label htmlFor="diaper">おむつ交換台</label>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" id="elevator" defaultChecked />
                  <label htmlFor="elevator">エレベーター</label>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" id="rest_area" />
                  <label htmlFor="rest_area">休憩エリア</label>
                </div>
              </div>
            </div>

            <button className="search-btn" onClick={searchFacilities}>
              🔍 施設を検索
            </button>
          </div>
        </aside>
        <section className="content-area">
          <div className="facility-list">
            <h3 style={{ marginBottom: "12px" }}>📍 おすすめ施設一覧</h3>
            <div id="facilities">
              {facilities.length === 0 ? (
                <div className="loading">読み込み中...</div>
              ) : (
                facilities.map((facility: FacilityFull) => {
                  const getFacilityIcon = (type?: string) => {
                    const map: Record<string, string> = {
                      museum: "🏛️",
                      aquarium: "🐟",
                      indoor_playground: "🧸",
                      library: "📚",
                      mall: "🏬",
                      zoo: "🦁",
                      park: "🌳",
                      community_center: "🏢",
                    };
                    return map[type || ""] || "📍";
                  };

                  const toCamel = (k: string) =>
                    k.includes("_")
                      ? k
                          .split("_")
                          .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
                          .join("")
                      : k;

                  const hasFacility = (f: FacilityFull, key: string) => {
                    if (!f.facilities) return false;
                    const camel = toCamel(key);
                    if (Array.isArray(f.facilities)) return f.facilities.includes(key) || f.facilities.includes(camel);
                    const obj = f.facilities as Record<string, boolean>;
                    return !!(obj[key] ?? obj[camel]);
                  };

                  const getRiskLevelClass = (rl?: string) => {
                    if (!rl) return "risk-low";
                    return rl === "low"
                      ? "risk-low"
                      : rl === "medium"
                      ? "risk-medium"
                      : rl === "high"
                      ? "risk-high"
                      : "risk-high";
                  };

                  const getRiskLevelText = (rl?: string) => {
                    if (!rl) return "不明";
                    if (rl === "low") return "安全";
                    if (rl === "medium") return "注意";
                    if (rl === "high") return "要注意";
                    return rl;
                  };

                  const getExertionLevelClass = (lvl?: string) => {
                    if (!lvl) return "risk-low";
                    return lvl === "low" ? "risk-low" : lvl === "medium" ? "risk-medium" : "risk-high";
                  };

                  const getExertionLevelText = (lvl?: string) => {
                    switch (lvl) {
                      case "low":
                        return "軽い";
                      case "medium":
                        return "中程度";
                      case "high":
                        return "激しい";
                      default:
                        return "中程度";
                    }
                  };

                  // station label
                  let stationLabel = "";
                  if (facility.nearestStation) {
                    const s = facility.nearestStation;
                    const lineInfo = Array.isArray(s.lines) && s.lines.length > 0 ? `(${s.lines[0]})` : "";
                    stationLabel = `${s.name || "最寄り駅"} 徒歩約${
                      s.walkTime != null ? s.walkTime + "分" : "N/A"
                    } ${lineInfo}`;
                  } else if (facility.walkTime != null) {
                    stationLabel = `徒歩約${facility.walkTime}分`;
                  }

                  // hours label (combine weekday/weekend/holiday similar to original)
                  let hoursLabel = "";
                  if (facility.operatingHours) {
                    const h = facility.operatingHours;
                    const parts: string[] = [];
                    if (h.weekday) parts.push(`平日: ${h.weekday}`);
                    if (h.weekend) parts.push(`土日: ${h.weekend}`);
                    if (h.holiday) parts.push(`定休日: ${h.holiday}`);
                    hoursLabel = parts.join(" / ");
                  }

                  // price label - prefer avgPerPerson, fallback to admission.adult
                  let priceLabel = "";
                  if (facility.price && typeof facility.price.avgPerPerson === "number") {
                    priceLabel =
                      facility.price.avgPerPerson === 0
                        ? "無料"
                        : `平均料金: ¥${facility.price.avgPerPerson.toLocaleString()}`;
                  } else if (facility.admission && typeof facility.admission.adult === "number") {
                    priceLabel =
                      facility.admission.adult === 0
                        ? "無料"
                        : `目安料金: ¥${facility.admission.adult.toLocaleString()}`;
                  }

                  // exertion label (detailed)
                  let exertionLabel = "";
                  if (facility.exertion) {
                    const e = facility.exertion;
                    const levelText = getExertionLevelText(e.level);
                    exertionLabel =
                      `体力スコア: ${e.score} (${levelText})` + (e.description ? ` — ${e.description}` : "");
                  }

                  return (
                    <div className="facility-item" key={facility.id}>
                      <div className="facility-name">
                        {getFacilityIcon(facility.type)} {facility.name}
                      </div>
                      <p style={{ margin: "0 0 15px 10px", color: "#666", fontSize: "0.9rem" }}>
                        {facility.description}
                      </p>

                      <div className="info-card basic-info-card">
                        <h4 className="card-title">施設情報</h4>
                        <div className="facility-info">
                          <div className="info-item">
                            <span className="info-icon">📍</span>
                            {facility.address}
                          </div>
                          <div className="info-item">
                            <span className="info-icon">🚶</span>
                            {stationLabel}
                          </div>
                          {hoursLabel && (
                            <div className="info-item">
                              <span className="info-icon">⏰</span>
                              {hoursLabel}
                            </div>
                          )}
                          {priceLabel && (
                            <div className="info-item">
                              <span className="info-icon">💴</span>
                              {priceLabel}
                            </div>
                          )}
                          <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                            <span className="info-icon">♿</span>
                            {(() => {
                              const MAP: Record<string, string> = {
                                wheelchair: "車椅子対応",
                                diaper: "おむつ交換台",
                                elevator: "エレベーター",
                                rest_area: "休憩エリア",
                                restArea: "休憩エリア",
                                nursing: "授乳室",
                                parking: "駐車場",
                                restaurant: "レストラン",
                              };
                              const parts: string[] = [];
                              Object.keys(MAP).forEach((k) => {
                                if (hasFacility(facility, k)) parts.push(MAP[k]);
                              });
                              const unique = Array.from(new Set(parts));
                              return unique.length > 0 ? unique.join(" | ") : "";
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="info-card indoor-safety-card">
                        <h4 className="card-title">熱中症対策情報</h4>
                        <div className="facility-info">
                          <div className="info-item">
                            <span className={`risk-level ${getRiskLevelClass(facility.riskLevel)}`}>
                              熱中症リスク: {getRiskLevelText(facility.riskLevel)}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className={`risk-level ${getExertionLevelClass(facility.exertion?.level)}`}>
                              体力スコア: {getExertionLevelText(facility.exertion?.level)}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-icon">🏠</span>
                            屋内率{facility.indoorRatio}%
                          </div>
                          {exertionLabel && (
                            <div className="info-item">
                              <span className="info-icon">💪</span>
                              {exertionLabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        className="route-btn"
                        onClick={() => {
                          setSelected(facility);
                        }}
                      >
                        🗺️ 施設詳細・ルート
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
      <FacilityModal
        facility={selected}
        onClose={() => {
          setSelected(null);
        }}
        onClearRequest={() => {}}
      />
    </div>
  );
}

export default App;
