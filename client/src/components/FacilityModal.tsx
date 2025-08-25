import { useEffect, useRef, useState } from "react";
import type { FacilityFull, RouteResult } from "../types";
import type { Coordinates } from "../types";
import MapView from "./MapView";
import { calculateRoute } from "../lib/routing";

type Props = {
  facility: FacilityFull | null;
  onClose: () => void;
  onClearRequest?: () => void;
};

type MapHandle = {
  fitToBounds: (bounds: [Coordinates, Coordinates]) => void;
  showGeoJSON: (geojson: unknown) => void;
};

export default function FacilityModal({ facility, onClose, onClearRequest }: Props) {
  const mapRef = useRef<MapHandle | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  useEffect(() => {
    if (!facility) return;
    if (!facility.coordinates) return;

    setLoadingRoute(true);
    setRouteResult(null);
    // 可能であれば施設の最寄駅座標を始点にする。なければ既存のデフォルトにフォールバック。
    const start = facility.nearestStation?.coordinates ?? { lat: 35.681236, lng: 139.767125 };
    calculateRoute(start, facility.coordinates)
      .then((r) => {
        setRouteResult(r);
        mapRef.current?.showGeoJSON(r.geometry);
        // 駅と施設の両方が見えるようにフィットする
        try {
          mapRef.current?.fitToBounds([start, facility.coordinates!]);
        } catch {
          // ignore fit errors
        }
      })
      .catch((e) => {
        console.error(e);
        alert("ルート計算に失敗しました");
      })
      .finally(() => {
        setLoadingRoute(false);
        if (onClearRequest) onClearRequest();
      });
  }, [facility, onClearRequest]);

  if (!facility) return null;

  const getRiskLevelClass = (rl?: string) => {
    if (!rl) return "risk-low";
    return rl === "low" ? "risk-low" : rl === "medium" ? "risk-medium" : rl === "high" ? "risk-high" : "risk-high";
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

  let exertionLabel = "";
  if (facility.exertion) {
    const e = facility.exertion;
    const levelText = getExertionLevelText(e.level);
    exertionLabel = `体力スコア: ${e.score} (${levelText})` + (e.description ? ` — ${e.description}` : "");
  }

  const renderFacilitiesLabels = () => {
    if (!facility.facilities) return "情報なし";
    const FACILITY_LABELS: Record<string, string> = {
      wheelchair: "車椅子対応",
      diaper: "おむつ交換台",
      elevator: "エレベーター",
      restArea: "休憩エリア",
      rest_area: "休憩エリア",
      nursing: "授乳室",
      parking: "駐車場",
      restaurant: "レストラン",
    };
    const toCamel = (k: string) =>
      k.includes("_")
        ? k
            .split("_")
            .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
            .join("")
        : k;

    const keys: string[] = Array.isArray(facility.facilities)
      ? facility.facilities
      : Object.keys(facility.facilities).filter((k) => (facility.facilities as Record<string, boolean>)[k]);

    const labels = keys.map((k) => FACILITY_LABELS[k] ?? FACILITY_LABELS[toCamel(k)] ?? k);
    const unique = Array.from(new Set(labels));
    return unique.length > 0 ? unique.join(" ・ ") : "情報なし";
  };

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal">
        <header className="modal-header">
          <h2>
            <span className="modal-title-icon">📍</span>
            {facility.name}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>

        <div className="modal-content">
          <div id="modalBody">
            {facility.photos && facility.photos.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                {facility.photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`${facility.name} ${i}`}
                    style={{ width: "100%", borderRadius: 8, marginBottom: 6 }}
                  />
                ))}
              </div>
            ) : null}

            <div className="info-card basic-info-card">
              <h4 className="card-title">施設情報</h4>
              <div style={{ padding: 8 }}>
                <div>{facility.address || ""}</div>
                <div style={{ marginTop: 8 }}>{facility.description || ""}</div>

                {/* 見どころ */}
                {facility.highlights && facility.highlights.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong>見どころ</strong>
                    <div style={{ fontSize: 13, color: "#333" }}>{(facility.highlights || []).join(" ・ ")}</div>
                  </div>
                )}

                {/* 料金 */}
                <div style={{ marginTop: 8 }}>
                  <strong>料金</strong>
                  <div style={{ fontSize: 13, color: "#333" }}>
                    {facility.admission
                      ? `大人: ${facility.admission.adult || "-"}円 / 子供: ${facility.admission.child || "-"}円`
                      : "情報なし"}
                  </div>
                </div>

                {/* 設備 */}
                <div style={{ marginTop: 8 }}>
                  <strong>設備</strong>
                  <div style={{ fontSize: 13, color: "#333" }}>{renderFacilitiesLabels()}</div>
                </div>

                {/* 最寄り駅 */}
                <div style={{ marginTop: 8 }}>
                  <strong>最寄り駅</strong>
                  <div style={{ fontSize: 13, color: "#333" }}>
                    {facility.nearestStation
                      ? `${facility.nearestStation.name || ""} 徒歩約${facility.nearestStation.walkTime || "-"}分`
                      : "情報なし"}
                  </div>
                </div>
              </div>
            </div>

            <div className="info-card indoor-safety-card">
              <h4 className="card-title">熱中症対策情報</h4>
              <div className="facility-info" style={{ padding: 8 }}>
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
                <div style={{ marginTop: 8 }}>
                  <strong>営業時間</strong>
                  <div style={{ fontSize: 13, color: "#333" }}>
                    {facility.operatingHours ? facility.operatingHours.weekday || "" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="info-card route-info-card">
              <h4 className="card-title">最寄り駅からのルート情報</h4>
              <div className="facility-info" style={{ padding: 8 }}>
                {loadingRoute ? (
                  <div className="loading">ルート計算中...</div>
                ) : routeResult ? (
                  <>
                    <div className="info-item">
                      <span className="info-icon">🚶</span>
                      距離: <strong>{(routeResult.distance / 1000).toFixed(2)} km</strong>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">⏱️</span>
                      所要時間: <strong>{Math.ceil(routeResult.duration / 60)} 分</strong>
                    </div>
                    <div className="info-item">
                      {(() => {
                        const originLat = facility.nearestStation?.coordinates?.lat ?? 35.681236;
                        const originLng = facility.nearestStation?.coordinates?.lng ?? 139.767125;
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${facility.coordinates?.lat},${facility.coordinates?.lng}&travelmode=walking`;
                        return (
                          <a className="route-btn" href={url} target="_blank" rel="noreferrer">
                            🔗Google Maps でルートを開く
                          </a>
                        );
                      })()}
                    </div>

                    {/* 簡易ルートは非表示にする（表示を削除） */}
                  </>
                ) : (
                  <div className="info-item">ルート情報はありません</div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-map" style={{ marginTop: 12 }}>
            <MapView
              ref={mapRef}
              center={facility.coordinates || undefined}
              zoom={14}
              facilities={
                facility.coordinates
                  ? [{ id: facility.id, name: facility.name, coordinates: facility.coordinates }]
                  : []
              }
            />
            {loadingRoute && <div className="loading">ルート計算中...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
