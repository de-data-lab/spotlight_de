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
import { TourProvider, useTour } from "@reactour/tour";
type GeoFeature = {
  type: string;
  properties: { [key: string]: any };
  geometry: { type: string; coordinates: any };
};

type GeoData = {
  type: string;
  features: GeoFeature[];
};
const steps = [
  {
    selector: "#countySelect",
    content: (
      <>
        <h3>Select a County</h3>
        <p>
          Choose a county to filter the map data, or select “All Counties” to
          view statewide information.
        </p>
      </>
    ),
  },
  {
    selector: "#layerSelect",
    content: (
      <>
        <h3>Choose Data Layer</h3>
        <p>Pick the metric you want to explore on the map:</p>
        <ul>
          <li>Tax % Change – median changes in property taxes.</li>
          <li>Assessment % Change – changes in property assessments.</li>
          <li>Tax Burden % Change – changes in overall tax burden.</li>
          <li>
            Property Class – share of residential, commercial, and agricultural
            properties.
          </li>
        </ul>
      </>
    ),
  },
  {
    selector: ".leaflet-container",
    content: (
      <>
        <h3>Map Area</h3>
        <p>
          Explore property data by region. Hover over areas to see detailed
          info. Use zoom and pan to navigate.
        </p>
      </>
    ),
  },
  {
    selector: ".legend",
    content: (
      <>
        <h3>Legend</h3>
        <p>Colors indicate changes:</p>
        <ul>
          <li>Blue shades: decreases</li>
          <li>White: no change</li>
          <li>Red shades: increases</li>
        </ul>
      </>
    ),
  },
];

function TourButton() {
  const { setIsOpen } = useTour();
  return (
    <button
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1000,
        backgroundColor: "#007bff", // bright blue background
        color: "white", // white text
        fontWeight: "bold",
        fontSize: "14px",
        padding: "8px 16px",
        border: "none",
        borderRadius: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => setIsOpen(true)}
    >
      Show Tutorial
    </button>
  );
}

export default function DelawareMap() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [maskData, setMaskData] = useState<GeoData | null>(null);
  const [selectedLayer, setSelectedLayer] = useState("tax_change");
  const [county, setCounty] = useState("all"); // default county
  const [valueRange, setValueRange] = useState<[number, number]>([0, 0]);
  const [centerValue, setCenterValue] = useState<number>(0);

  const { setIsOpen } = useTour();
  const tour = useTour();

  const legendTitle =
    selectedLayer === "tax_change"
      ? "Tax % Change"
      : selectedLayer === "assessment_change"
      ? "Assessment % Change"
      : selectedLayer === "tax_burden_change"
      ? "Tax Burden % Change"
      : selectedLayer === "property_class"
      ? "Property Class Composition"
      : "Legend";

  // Load surrounding states mask
  useEffect(() => {
    fetch("/data/surrounding_states.json")
      .then((res) => res.json())
      .then(setMaskData)
      .catch((err) => console.error("Error loading mask:", err));
  }, []);

  const isValidFeature = (f: GeoFeature) => {
    const p = f.properties;

    switch (selectedLayer) {
      case "tax_change":
        return p.tax_change_pct != null || p.tax_change_pct_B != null;

      case "assessment_change":
        return (
          p.assessment_change_pct != null || p.assessment_change_pct_B != null
        );

      case "tax_burden_change":
        return (
          p.burden_change != null ||
          p.burden_change_pct != null ||
          p.median_burden_2024 != null ||
          p.median_burden_2025 != null
        );

      case "property_class":
        return (
          p.RES_share_2024 != null ||
          p.COM_share_2024 != null ||
          p.AGR_share_2024 != null
        );

      default:
        return true;
    }
  };

  // Load county data
  useEffect(() => {
    const fetchCountyData = async () => {
      const loadLayer = async (countyName: string) => {
        const res = await fetch(`/data/FE_${countyName}.json`);
        const data = await res.json();

        switch (selectedLayer) {
          case "tax_change":
            return data.layers?.tax_change || [];

          case "assessment_change":
            return data.layers?.assessment_change || [];

          case "tax_burden_change":
            return data.layers?.burden_change || [];

          case "property_class":
            return data.layers?.property_class || [];

          default:
            return [];
        }
      };

      let mergedFeatures: any[] = [];

      if (county === "all") {
        // Merge Sussex + Kent + New Castle
        const counties = ["sussex", "kent", "newcastle"];

        for (const c of counties) {
          const features = await loadLayer(c);
          mergedFeatures.push(...features);
        }
      } else {
        mergedFeatures = await loadLayer(county);
      }
      const filtered = mergedFeatures.filter(isValidFeature);

      setGeoData({
        type: "FeatureCollection",
        features: filtered,
      });
    };

    fetchCountyData().catch((err) =>
      console.error("Error loading GeoJSON:", err)
    );
  }, [county, selectedLayer]);

  const getValue = (p: Record<string, any>) => {
    switch (selectedLayer) {
      case "tax_change":
        return p.tax_change_pct ?? p.tax_change_pct_B;

      case "assessment_change":
        return p.assessment_change_pct ?? p.assessment_change_pct_B;

      case "tax_burden_change":
        return p.burden_change;

      case "property_class":
        return null;

      default:
        return null;
    }
  };

  // Compute dynamic range
  useEffect(() => {
    if (!geoData?.features) return;

    const values = geoData.features
      .map((f) => getValue(f.properties))
      .filter((v): v is number => v != null && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return;

    const min = values[0];
    const max = values[values.length - 1];

    // --- MEDIAN ---
    const mid = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];

    setValueRange([min, max]);
    setCenterValue(median);
  }, [geoData, selectedLayer]);

  const bucketColors = [
    "#08306b", // strong decrease
    "#2171b5", // moderate decrease
    "#c6dbef", // mild decrease

    "#ffffff", // neutral

    "#fcbba1", // mild increase
    "#fb6a4a", // moderate increase
    "#a50f15", // strong increase
  ];

  const getColor = (value: number | null) => {
    if (value == null || isNaN(value)) return "#ccc";

    const [minVal, maxVal] = valueRange;
    const mid = centerValue;

    // tolerance so "near the middle" is white
    const EPS = (maxVal - minVal) * 0.02; // ~2% of range

    const centerHalfWidth = (valueRange[1] - valueRange[0]) * 0.05;

    if (Math.abs(value - centerValue) <= centerHalfWidth) {
      return bucketColors[3]; // white
    }

    // BELOW median → blues
    if (value < mid) {
      const t = (value - minVal) / (mid - minVal); // 0 → 1
      const idx = Math.floor(t * 3);
      return bucketColors[Math.min(2, Math.max(0, idx))];
    }

    // ABOVE median → reds
    const t = (value - mid) / (maxVal - mid); // 0 → 1
    const idx = 4 + Math.floor(t * 3);
    return bucketColors[Math.min(6, Math.max(4, idx))];
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

    let tooltipHTML = "";

    // ----------------------------
    // TAX % CHANGE
    // ----------------------------
    if (selectedLayer === "tax_change") {
      const pct =
        p.tax_change_pct != null ? p.tax_change_pct.toFixed(2) : "N/A";
      const city = p.CITY_NAME || "Unknown community";
      const tract = p.GEOID || "N/A";
      const tax2024 =
        p.median_tax_2024 != null
          ? `$${p.median_tax_2024.toLocaleString()}`
          : "N/A";
      const tax2025 =
        p.median_tax_2025 != null
          ? `$${p.median_tax_2025.toLocaleString()}`
          : "N/A";
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Tax % Change: ${pct}%</b><br/><br/>
        In <b>${city}</b> (census tract ${tract}), the median percent change in taxes was <b>${pct}%</b>.<br/><br/>
        In 2024, the median tax was ${tax2024}, and in 2025 it increased to ${tax2025}.<br/>
        There were <b>${parcels}</b> comparable parcels in this tract.
      </div>
    `;
    }

    // ----------------------------
    // ASSESSMENT % CHANGE
    // ----------------------------
    else if (selectedLayer === "assessment_change") {
      const pct =
        p.assessment_change_pct != null
          ? p.assessment_change_pct.toFixed(2)
          : "N/A";
      const city = p.CITY_NAME || "Unknown community";
      const tract = p.GEOID || "N/A";
      const a2024 =
        p.median_assess_2024 != null
          ? `$${p.median_assess_2024.toLocaleString()}`
          : "N/A";
      const a2025 =
        p.median_assess_2025 != null
          ? `$${p.median_assess_2025.toLocaleString()}`
          : "N/A";
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Assessment % Change: ${pct}%</b><br/><br/>
        In <b>${city}</b> (tract ${tract}), the median assessment changed by <b>${pct}%</b>.<br/><br/>
        Median Assessment 2024: ${a2024}<br/>
        Median Assessment 2025: ${a2025}<br/>
        Parcels Compared: <b>${parcels}</b>
      </div>
    `;
    }

    // ----------------------------
    // TAX BURDEN % CHANGE
    // ----------------------------
    else if (selectedLayer === "tax_burden_change") {
      const pct = p.burden_change != null ? p.burden_change.toFixed(2) : "N/A";
      const city = p.CITY_NAME || "Unknown community";
      const tract = p.GEOID || "N/A";
      const fmtPct = (v: number | null) =>
        v != null && !isNaN(v) ? `${(v * 100).toFixed(2)}%` : "N/A";

      const b2024 = fmtPct(p.median_burden_2024);
      const b2025 = fmtPct(p.median_burden_2025);
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Tax Burden % Change: ${pct}%</b><br/><br/>
        In <b>${city}</b> (tract ${tract}), the median tax burden changed by <b>${pct}%</b>.<br/><br/>
        Burden 2024: ${b2024}<br/>
        Burden 2025: ${b2025}<br/>
        Parcels Compared: <b>${parcels}</b>
      </div>
    `;
    } else if (selectedLayer === "property_class") {
      const fmt = (v: number | null) =>
        v != null && !isNaN(v) ? (v * 100).toFixed(2) + "%" : "N/A";

      const RES_2024 = fmt(p.RES_share_2024);
      const RES_2025 = fmt(p.RES_share_2025);
      const COM_2024 = fmt(p.COM_share_2024);
      const COM_2025 = fmt(p.COM_share_2025);
      const AGR_2024 = fmt(p.AGR_share_2024);
      const AGR_2025 = fmt(p.AGR_share_2025);

      const city = p.CITY_NAME || "Unknown community";
      const tract = p.GEOID || "N/A";
      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
  <div style="font-size:13px">
    <b>Property Class Composition Change</b><br/><br/>

    <b>Residential share:</b> ${RES_2024} → ${RES_2025}<br/>
    <b>Commercial share:</b> ${COM_2024} → ${COM_2025}<br/>
    <b>Agricultural share:</b> ${AGR_2024} → ${AGR_2025}<br/><br/>

    <i>${city}</i> (tract ${tract})<br/>
    Parcels in this tract: <b>${parcels}</b>
  </div>
  `;
    }

    // fallback
    else {
      tooltipHTML = `
      <div style="font-size:13px">
        <b>${p.GEOID}</b><br/>
        Change: ${getValue(p)?.toFixed(2) ?? "N/A"}%
      </div>`;
    }

    // bind tooltip
    layer.bindTooltip(tooltipHTML, { sticky: true });

    // hover styles
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
    <>
      <TourProvider
        steps={steps}
        styles={{
          popover: (base) => ({
            ...base,
            fontSize: "16px",
            fontWeight: "600",
            color: "#222",
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            maxWidth: "320px",
            lineHeight: "1.5",
          }),
          close: (base) => ({
            ...base,
            color: "#444",
            fontWeight: "bold",
            fontSize: "18px",
          }),
        }}
      >
        <div
          style={{ height: "100vh", display: "flex", flexDirection: "column" }}
        >
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
            {/* Add a button to trigger the tour */}
            <TourButton />
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
                  <option value="property_class">Property Class</option>
                </select>
              </div>
            </div>

            <MapContainer
              center={[39.0, -75.5]}
              zoom={9}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              id="mapContainer"
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

              <Legend
                min={valueRange[0]}
                max={valueRange[1]}
                center={centerValue}
                title={legendTitle}
              />
            </MapContainer>
          </div>
        </div>
      </TourProvider>
    </>
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
