"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Legend } from "./Legend";

type GeoFeature = {
  type: string;
  properties: {
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
};

type GeoData = {
  type: string;
  features: GeoFeature[];
};

export default function DelawareMap() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);

  console.log(geoData);
  useEffect(() => {
    fetch("/data/sussex_all_layers.json")
      .then((res) => res.json())
      .then((data) => {
        // filter out polygons with no tax data
        const filtered = {
          ...data,
          features: data.features.filter((f: any) => {
            const p = f.properties;
            const tax24 = p.tax_2024;
            const tax25 = p.tax_2025;

            // keep only if at least one has a value (not null or undefined)
            return tax24 != null || tax25 != null;
          }),
        };
        setGeoData(filtered);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  // Optionally: color by some property (e.g., tax_change)
  const getColor = (feature: GeoFeature) => {
    const { tax_2024, tax_2025 } = feature.properties;
    if (tax_2024 == null || tax_2025 == null) return "#ccc"; // fallback (should rarely happen now)
    const diff = tax_2025 - tax_2024;
    if (diff > 0) return "#d73027"; // red = increase
    if (diff < 0) return "#1a9850"; // green = decrease
    return "#cccccc"; // no change
  };

  // Define style per feature
  const style = (feature: GeoFeature) => ({
    fillColor: getColor(feature),
    weight: 1,
    opacity: 1,
    color: "#333",
    fillOpacity: 0.6,
  });

  // Tooltip & hover
  const onEachFeature = (feature: GeoFeature, layer: L.Layer) => {
    const props = feature.properties;
    const name = props.district || props.County || "Unknown";
    const tax = props.tax_change ?? "N/A";
    const taxPercentage =
      `${props.tax_pct_change}%` || "Unknown Percentage Change";
    const assessment2024 =
      props.assessment_2024 ?? "Unknown Assessment for 2024";
    const assessment2025 =
      props.assessment_2025 ?? "Unknown Assessment for 2024";
    const assessment_change =
      props.assessment_change ?? "Unknown assessment_change";
    const assessment_pct_change =
      `${props.assessment_pct_change}%` ||
      "Unknown assessment percentage change";
    layer.bindTooltip(
      `<div style="font-size:14px;">
        <strong>${name}</strong><br/>
        2024 Assement: ${assessment2024}<br/>
        2025 Assement: ${assessment2025}<br/>
        Tax Change: ${tax}<br/>
        Tax Percentage Change: ${taxPercentage}<br/>
        Assement Change: ${assessment_change}<br/>
        Assement Percentage Change: ${assessment_pct_change}<br/>
      </div>`,
      { sticky: true }
    );

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle({ weight: 3, color: "#000" });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle({ weight: 1, color: "#333" });
      },
    });
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[39.0, -75.5]} // Delaware center
        zoom={9}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <GeoJSON
            data={geoData as any}
            style={style as any}
            onEachFeature={onEachFeature as any}
          />
        )}
        {/* Legend here */}
        <Legend />
      </MapContainer>
    </div>
  );
}
