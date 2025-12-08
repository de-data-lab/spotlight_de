"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Legend } from "./Legend";

type GeoFeature = {
  type: string;
  properties: { [key: string]: any };
  geometry: { type: string; coordinates: any };
};

type GeoData = {
  type: string;
  features: GeoFeature[];
};

export default function DelawareMap() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [maskData, setMaskData] = useState<GeoData | null>(null);
  const [selectedLayer, setSelectedLayer] = useState("tax_change");
  const [county, setCounty] = useState("all"); // default county
  const [valueRange, setValueRange] = useState<[number, number]>([0, 0]);

  // Load surrounding states mask
  useEffect(() => {
    fetch("/data/surrounding_states.json")
      .then((res) => res.json())
      .then(setMaskData)
      .catch((err) => console.error("Error loading mask:", err));
  }, []);

  const isValidFeature = (f: GeoFeature) => {
    const p = f.properties;
    const fieldsToCheck = [
      "tax_sum_2024",
      "tax_sum_2025",
      "assess_sum_2024",
      "assess_sum_2025",
      "tax_mean_2024",
      "tax_mean_2025",
      "tax_median_2024",
      "tax_median_2025",
      "assess_mean_2024",
      "assess_mean_2025",
      "assess_median_2024",
      "assess_median_2025",
      "tax_change_pct",
      "assessment_change_pct",
      "burden_2024",
      "burden_2025",
      "burden_change_pct",
    ];
    return fieldsToCheck.some((field) => p[field] != null);
  };

  // Load county data
  useEffect(() => {
    const fetchCountyData = async () => {
      let url: string;

      if (county === "all") {
        url = `/data/FE_statewide_tract_metrics.json`; // the combined JSON file
      } else {
        url = `/data/FE_${county}_tract_metrics.json`;
      }

      const res = await fetch(url);
      const data: GeoData = await res.json();

      // Filter features to ensure we only show valid data
      const filteredFeatures = data.features.filter(isValidFeature);

      setGeoData({
        type: "FeatureCollection",
        features: filteredFeatures,
      });
    };

    fetchCountyData().catch((err) =>
      console.error("Error loading GeoJSON:", err)
    );
  }, [county]);

  const getValue = (p: Record<string, any>) => {
    switch (selectedLayer) {
      case "tax_change":
        return p.tax_change_pct;
      case "assessment_change":
        return p.assessment_change_pct;
      case "tax_burden_change":
        return p.burden_change_pct;
      default:
        return null;
    }
  };

  // Compute dynamic range
  useEffect(() => {
    if (!geoData?.features) return;
    const values = geoData.features
      .map((f) => getValue(f.properties))
      .filter((v) => v != null && !isNaN(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      setValueRange([min === max ? min - 1 : min, min === max ? max + 1 : max]);
    }
  }, [geoData, selectedLayer]);

  const bucketColors = [
    "#08306b",
    "#08519c",
    "#2171b5",
    "#6baed6",
    "#c6dbef",
    "#ffffff",
    "#fcbba1",
    "#fc9272",
    "#fb6a4a",
    "#de2d26",
    "#a50f15",
  ];

  const getColor = (value: number | null) => {
    if (value == null || isNaN(value)) return "#ccc";
    const [minVal, maxVal] = valueRange;
    if (Math.abs(value) < 1e-10) return "#ffffff";

    if (value < 0) {
      const t = value / minVal;
      return bucketColors[Math.max(0, Math.min(4, Math.floor((1 - t) * 5)))];
    }
    if (value > 0) {
      const t = value / maxVal;
      return bucketColors[Math.max(6, Math.min(10, 6 + Math.floor(t * 5)))];
    }
    return "#ffffff";
  };

  const style = (feature: GeoFeature) => ({
    fillColor: getColor(getValue(feature.properties)),
    weight: 1,
    opacity: 1,
    color: "#666",
    fillOpacity: 0.6,
  });

  const onEachFeature = (feature: GeoFeature, layer: L.Layer) => {
    const p = feature.properties;

    let tooltipHTML: string;

    if (selectedLayer === "assessment_change") {
      const changePct =
        p.assessment_change_pct != null
          ? p.assessment_change_pct.toFixed(2)
          : "N/A";
      const cityName = p.CITY_NAME || "Unknown";
      const tractID = p.GEOID || "N/A";
      const avg2024 =
        p.assess_mean_2024 != null
          ? `$${p.assess_mean_2024.toLocaleString()}`
          : "N/A";
      const avg2025 =
        p.assess_mean_2025 != null
          ? `$${p.assess_mean_2025.toLocaleString()}`
          : "N/A";
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Assessment Percent Change: ${changePct}%</b><br/><br/>
        <b>${cityName}</b> - Census Tract ${tractID}<br/><br/>
        Avg Assessment 2024: ${avg2024}<br/>
        Avg Assessment 2025: ${avg2025}<br/>
        Parcels Compared: ${parcels}
      </div>
    `;
    } else if (selectedLayer === "tax_burden_change") {
      const changePct =
        p.burden_change_pct != null ? p.burden_change_pct.toFixed(2) : "N/A";
      const cityName = p.CITY_NAME || "Unknown";
      const tractID = p.GEOID || "N/A";
      const burden2024 =
        p.burden_2024 != null ? `$${p.burden_2024.toLocaleString()}` : "N/A";
      const burden2025 =
        p.burden_2025 != null ? `$${p.burden_2025.toLocaleString()}` : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Tax Burden Change: ${changePct}%</b><br/><br/>
        <b>${cityName}</b> - Census Tract ${tractID}<br/><br/>
        Tax Burden = total tax divided by total assessed value<br/>
        Burden 2024: ${burden2024}<br/>
        Burden 2025: ${burden2025}
      </div>
    `;
    } else if (selectedLayer === "tax_change") {
      const changePct =
        p.tax_change_pct != null ? p.tax_change_pct.toFixed(2) : "N/A";
      const cityName = p.CITY_NAME || "Unknown";
      const tractID = p.GEOID || "N/A";
      const tax2024 =
        p.tax_mean_2024 != null
          ? `$${p.tax_mean_2024.toLocaleString()}`
          : "N/A";
      const tax2025 =
        p.tax_mean_2025 != null
          ? `$${p.tax_mean_2025.toLocaleString()}`
          : "N/A";
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Tax Percent Change: ${changePct}%</b><br/><br/>
        <b>${cityName}</b> - Census Tract ${tractID}<br/><br/>
        Avg Tax 2024: ${tax2024}<br/>
        Avg Tax 2025: ${tax2025}<br/>
        Parcels Compared: ${parcels}
      </div>
    `;
    } else {
      const name = p.NAMELSAD || p.NAME || p.GEOID;
      const value = getValue(p);
      tooltipHTML = `<div style="font-size:13px"><b>${name}</b><br/>Change: ${
        value?.toFixed(2) ?? "N/A"
      }%</div>`;
    }

    layer.bindTooltip(tooltipHTML, { sticky: true });

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({ weight: 4, color: "#000" });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({ weight: 1, color: "#666" });
      },
    });
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 20px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
      >
        <img
          src="https://i0.wp.com/spotlightdelaware.org/wp-content/uploads/2023/11/SpotlightIcon2-Damon-Martin.png"
          alt="Logo"
          style={{ height: 40, marginRight: 16 }}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#555" }}>
            Spotlight Delaware - Property Reassessment
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
            An understanding of the reassessment process across Delaware
            communities.
          </p>
        </div>
      </header>

      <div style={{ flex: 1, position: "relative" }}>
        {/* Selectors */}
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            background: "white",
            padding: "10px",
            borderRadius: 4,
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            minWidth: "280px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              htmlFor="countySelect"
              style={{
                color: "#333",
                fontWeight: "bold",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              Select County:
            </label>
            <select
              id="countySelect"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              style={{
                flexGrow: 1,
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 14,
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                color: "#333",
              }}
            >
              <option value="all">All Counties</option>
              <option value="sussex">Sussex</option>
              <option value="newcastle">New Castle</option>
              <option value="kent">Kent</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              htmlFor="layerSelect"
              style={{
                color: "#333",
                fontWeight: "bold",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              View by:
            </label>
            <select
              id="layerSelect"
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              style={{
                flexGrow: 1,
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 14,
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                color: "#333",
              }}
            >
              <option value="tax_change">Tax % Change</option>
              <option value="assessment_change">Assessment % Change</option>
              <option value="tax_burden_change">Tax Burden % Change</option>
            </select>
          </div>
        </div>

        <MapContainer
          center={[39.0, -75.5]}
          zoom={9}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomleft" />

          {/* Greyed-out surrounding states */}
          {maskData && (
            <GeoJSON
              data={maskData as GeoJSON.FeatureCollection}
              style={{
                fillColor: "#ccc",
                fillOpacity: 0.6,
                color: "#666",
                weight: 1,
              }}
            />
          )}

          {/* Delaware tracts */}
          {geoData && (
            <GeoJSONLayer
              data={geoData}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}

          <Legend min={valueRange[0]} max={valueRange[1]} />
        </MapContainer>
      </div>
    </div>
  );
}

function GeoJSONLayer({ data, style, onEachFeature }: any) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!data || !map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    // Create new layer
    const newLayer = L.geoJSON(data, { style, onEachFeature });
    newLayer.addTo(map);

    // Fit bounds if there are features
    if (data.features?.length > 0) {
      map.fitBounds(newLayer.getBounds());
    }

    // Save reference
    layerRef.current = newLayer;

    // Cleanup function
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, style, onEachFeature, map]);

  return null;
}
