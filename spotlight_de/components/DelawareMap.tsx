"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Tooltip,
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
  const [allLayers, setAllLayers] = useState<Record<string, GeoData> | null>(
    null
  );
  const [selectedLayer, setSelectedLayer] = useState<string>("tax_change");
  const [county, setCounty] = useState("sussex"); // default county
  useEffect(() => {
    const fetchCountyData = async () => {
      if (county === "all") {
        const counties = ["sussex", "newcastle"]; // add kent if you have it
        const allData: Record<string, GeoData> = {};

        for (const c of counties) {
          const res = await fetch(`/data/${c}_all_layers.json`);
          const data = await res.json();
          // Merge layers
          for (const layer in data) {
            if (!allData[layer]) {
              allData[layer] = { type: "FeatureCollection", features: [] };
            }
            allData[layer].features.push(...data[layer].features);
          }
        }

        setAllLayers(allData);
      } else {
        const res = await fetch(`/data/${county}_all_layers.json`);
        const data = await res.json();
        setAllLayers(data);
      }
    };

    fetchCountyData().catch((err) =>
      console.error("Error loading GeoJSON:", err)
    );
  }, [county]);

  // console.log(allLayers);
  const geoData = allLayers ? allLayers[selectedLayer] : null;
  // console.log(geoData);
  // ---- Return numeric value depending on layer ----
  const getValue = (p: Record<string, any>) => {
    switch (selectedLayer) {
      case "tax_change":
        return p.tax_change_pct;
      case "assessment_change":
        return p.assessment_change_pct;
      case "tax_burden_change":
        return p.burden_change != null ? p.burden_change * 100 : null;
      case "res_share_change":
        return p.res_share_change != null ? p.res_share_change * 100 : null;
      case "com_share_change":
        return p.com_share_change != null ? p.com_share_change * 100 : null;
      case "agr_share_change":
        return p.agr_share_change != null ? p.agr_share_change * 100 : null;
      case "top10_tax_increase":
        return p.tax_change_pct;
      default:
        return null;
    }
  };

  // ---- Compute dynamic range (min/max) for current layer ----
  const [valueRange, setValueRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!geoData?.features) return;

    const values = geoData.features
      .map((f) => getValue(f.properties))
      .filter((v) => v != null && !isNaN(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      // avoid zero-width range
      const safeMin = min === max ? min - 1 : min;
      const safeMax = min === max ? max + 1 : max;
      setValueRange([safeMin, safeMax]);
    }
  }, [geoData, selectedLayer]);

  const interpolate = (start: number[], end: number[], t: number) => {
    return start.map((s, i) => Math.round(s + (end[i] - s) * t));
  };

  const rgb = (arr: number[]) => `rgb(${arr[0]},${arr[1]},${arr[2]})`;

  const gradient = [
    [0, 70, 170], // Blue
    [40, 180, 40], // Green
    [255, 255, 0], // Yellow
    [255, 140, 0], // Orange
    [255, 0, 0], // Red
  ];

  const getColor = (value: number | null) => {
    if (value == null || isNaN(value)) return "#ccc";

    const [minVal, maxVal] = valueRange;
    if (minVal === maxVal) return "#e0e0e0";

    // Normalize to 0 → 1
    let t = (value - minVal) / (maxVal - minVal);
    t = Math.min(1, Math.max(0, t)); // clamp

    const n = gradient.length - 1;
    const scaled = t * n;

    const idx = Math.floor(scaled);
    const localT = scaled - idx;

    const start = gradient[idx];
    const end = gradient[Math.min(idx + 1, n)]; // <= FIXED

    return rgb(interpolate(start, end, localT));
  };

  // ---- Compute top 10 (for highlight layers only) ----
  const highlightable = [
    "tax_change",
    "assessment_change",
    "tax_burden_change",
  ];

  const top10 = useMemo(() => {
    if (!geoData?.features || !highlightable.includes(selectedLayer)) return [];
    return [...geoData.features]
      .filter((f) => getValue(f.properties) != null)
      .sort(
        (a, b) =>
          Math.abs(getValue(b.properties)) - Math.abs(getValue(a.properties))
      )
      .slice(0, 10);
  }, [geoData, selectedLayer]);

  const top10Ids = useMemo(
    () => new Set(top10.map((f) => f.properties.GEOID)),
    [top10]
  );
  // ---- Style ----
  const style = (feature: GeoFeature) => {
    const p = feature.properties;
    const value = getValue(p);
    const isTop = top10Ids.has(p.GEOID);
    return {
      fillColor: getColor(value),
      weight: isTop ? 3 : 1,
      opacity: 1,
      color: isTop ? "#000" : "#666",
      fillOpacity: isTop ? 0.9 : 0.6,
    };
  };

  // ---- Tooltip ----
  const onEachFeature = (feature: GeoFeature, layer: L.Layer) => {
    const p = feature.properties;
    const name =
      selectedLayer === "top10_tax_increase"
        ? p.district || p.NAMELSAD || p.NAME || p.GEOID
        : p.NAMELSAD || p.NAME || p.GEOID;
    const value = getValue(p);

    let tooltipHTML = `
    <div style="font-size: 13px">
      <b>${name}</b><br />
      Change: ${value?.toFixed(2) ?? "N/A"}%
    </div>
  `;

    if (selectedLayer === "tax_burden_change") {
      tooltipHTML = `
      <div style="font-size: 13px">
        <b>${name}</b><br />
        2024 Burden: ${p.tax_burden_2024?.toFixed(2) ?? "N/A"}<br />
        2025 Burden: ${p.tax_burden_2025?.toFixed(2) ?? "N/A"}<br />
        Change: ${(value ?? 0).toFixed(2)}%
      </div>
    `;
    }

    // Bind the tooltip to the layer
    layer.bindTooltip(tooltipHTML, { sticky: true });

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle({ weight: 4, color: "#000" });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        const isTop = top10Ids.has(p.GEOID);
        target.setStyle({
          weight: isTop ? 3 : 1,
          color: isTop ? "#000" : "#666",
        });
      },
    });
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
        {/* Logo */}
        <img
          src="https://i0.wp.com/spotlightdelaware.org/wp-content/uploads/2023/11/SpotlightIcon2-Damon-Martin.png"
          alt="Logo"
          style={{ height: 40, marginRight: 16 }}
        />

        {/* Title and description */}
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#555" }}>
            Spotlight Delaware - Property Reassesment
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
            An understanding of the reassessment process across Delaware
            communities.
          </p>
        </div>
      </header>

      {/* Map wrapper */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* County & Layer selectors */}
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 10, // below the header
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
          {/* County selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              htmlFor="countySelect"
              style={{
                color: "#333",
                fontWeight: "bold",
                fontSize: "14px",
                whiteSpace: "nowrap",
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
                borderRadius: "4px",
                fontSize: "14px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                color: "#333",
              }}
            >
              <option value="all">All Counties</option>
              <option value="sussex">Sussex</option>
              <option value="newcastle">New Castle</option>
            </select>
          </div>

          {/* Layer selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              htmlFor="layerSelect"
              style={{
                color: "#333",
                fontWeight: "bold",
                fontSize: "14px",
                whiteSpace: "nowrap",
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
                borderRadius: "4px",
                fontSize: "14px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                color: "#333",
              }}
            >
              <option value="tax_change">Tax % Change</option>
              <option value="assessment_change">Assessment % Change</option>
              <option value="tax_burden_change">Tax Burden % Change</option>
              <option value="res_share_change">Residential Share Change</option>
              <option value="com_share_change">Commercial Share Change</option>
              <option value="agr_share_change">
                Agricultural Share Change
              </option>
              <option value="top10_tax_increase">Top 10 Tax Increase</option>
            </select>
          </div>
        </div>

        {/* Map */}
        <MapContainer
          center={[39.0, -75.5]}
          zoom={9}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Custom zoom control */}
          <ZoomControl position="bottomleft" />
          {geoData && (
            <GeoJSONLayer
              data={geoData}
              style={style as any}
              onEachFeature={onEachFeature as any}
            />
          )}
          {top10.map((f, i) => {
            const lat = parseFloat(f.properties.INTPTLAT);
            const lon = parseFloat(f.properties.INTPTLON);
            if (isNaN(lat) || isNaN(lon)) return null;
            const name =
              f.properties.NAMELSAD || f.properties.NAME || f.properties.GEOID;
            const value = getValue(f.properties);
            return (
              <Marker
                key={i}
                position={[lat, lon]}
                icon={L.divIcon({
                  className: "label-icon",
                  html: `<div style="background: rgba(255,255,255,0.9); border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: bold; border: 1px solid #333; white-space: nowrap;">${name}<br/><span style="color:#d33;">${value?.toFixed(
                    1
                  )}%</span></div>`,
                })}
              />
            );
          })}
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
    if (!data) return;

    // Remove old layer if exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Create and add new layer
    const newLayer = L.geoJSON(data, { style, onEachFeature });
    newLayer.addTo(map);

    //Recenter the map depending on county
    if (data.features.length > 0) {
      const bounds = newLayer.getBounds();
      map.fitBounds(bounds);
    }

    layerRef.current = newLayer;

    // Clean up when unmounting or changing data
    return () => {
      map.removeLayer(newLayer);
    };
  }, [data, style, onEachFeature, map]);

  return null;
}
