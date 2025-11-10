"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Tooltip,
  useMap,
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
    const countyFile = `${county.toLowerCase()}_all_layers.json`; // Adjust this if necessary
    fetch(`/data/${countyFile}`)
      .then((res) => res.json())
      .then((data) => setAllLayers(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, [county]); // The effect now runs whenever the county changes

  console.log(allLayers);
  const geoData = allLayers ? allLayers[selectedLayer] : null;
  console.log(geoData);
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

  // ---- Improved diverging color scale (blue ↔ gray ↔ yellow/red) with dynamic scaling ----
  const getColor = (value: number | null) => {
    if (value == null || isNaN(value)) return "#ccc";

    const [minVal, maxVal] = valueRange;
    if (minVal === maxVal) return "#e0e0e0";

    // Normalize value to [-1, 1]
    const range = Math.max(Math.abs(minVal), Math.abs(maxVal));
    const norm = Math.max(-1, Math.min(value / range, 1));

    if (norm > 0) {
      // positive → yellow→orange→red
      const t = norm;
      const r = 255;
      const g = Math.floor(255 - t * 155); // 255→100
      const b = 0;
      return `rgb(${r},${g},${b})`;
    } else if (norm < 0) {
      // negative → lightblue→deepblue
      const t = Math.abs(norm);
      const r = Math.floor(173 - t * 73); // 173→100
      const g = Math.floor(216 - t * 116); // 216→100
      const b = Math.floor(230 - t * 130); // 230→100
      return `rgb(${r},${g},${b})`;
    } else {
      return "#e0e0e0";
    }
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
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* County selector */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 10,
          left: 10,
          background: "white",
          padding: "6px 10px",
          borderRadius: 4,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        <label
          htmlFor="countySelect"
          style={{
            marginRight: 8,
            color: "#333", // Darker text color for better contrast
            fontWeight: "bold",
            fontSize: "14px", // Slightly larger text
          }}
        >
          Select County:
        </label>
        <select
          id="countySelect"
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            color: "#333", // Dark text for contrast
          }}
        >
          <option value="sussex">Sussex</option>
          {/* <option value="kent">Kent</option> */}
          <option value="newcastle">New Castle</option>
        </select>
      </div>

      {/* Layer selector */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 50,
          left: 10,
          background: "white",
          padding: "6px 10px",
          borderRadius: 4,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        <label
          htmlFor="layerSelect"
          style={{
            marginRight: 8,
            color: "#333", // Darker text color for better contrast
            fontWeight: "bold",
            fontSize: "14px", // Slightly larger text
          }}
        >
          Select layer:
        </label>
        <select
          id="layerSelect"
          value={selectedLayer}
          onChange={(e) => setSelectedLayer(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            border: "1px solid #ccc", // Border for better visibility
            backgroundColor: "#fff",
            color: "#333", // Dark text for contrast
          }}
        >
          <option value="tax_change">Tax % Change</option>
          <option value="assessment_change">Assessment % Change</option>
          <option value="tax_burden_change">Tax Burden % Change</option>
          <option value="res_share_change">Residential Share Change</option>
          <option value="com_share_change">Commercial Share Change</option>
          <option value="agr_share_change">Agricultural Share Change</option>
          <option value="top10_tax_increase">Top 10 Tax Increase</option>
        </select>
      </div>

      {/* Map */}
      <MapContainer
        center={[39.0, -75.5]}
        zoom={9}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && (
          <GeoJSONLayer
            data={geoData}
            style={style as any}
            onEachFeature={onEachFeature as any}
          />
        )}

        {/* Persistent labels for top 10 (only highlightable layers) */}
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

        {/* <Legend selectedLayer={selectedLayer} /> */}
      </MapContainer>
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
