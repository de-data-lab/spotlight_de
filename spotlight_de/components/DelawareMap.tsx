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
type Bucket = {
  min: number;
  max: number;
  color: string;
};

const BUCKETS: Record<string, Record<string, Bucket[]>> = {
  // --------------------------------------------------
  // TAX CHANGE
  // --------------------------------------------------
  tax_change: {
    statewide: [
      { min: -36.3, max: -13, color: "#08306b" },
      { min: -13, max: 11, color: "#2171b5" },
      { min: 11, max: 33.2, color: "#c6dbef" },
      { min: 33.2, max: 44.2, color: "#fcbba1" },
      { min: 44.2, max: 90.5, color: "#fb6a4a" },
      { min: 90.5, max: 531.2, color: "#a50f15" },
    ],
    kent: [
      { min: 2, max: 10, color: "#08306b" },
      { min: 10, max: 16.5, color: "#2171b5" },
      { min: 16.5, max: 33.1, color: "#c6dbef" },
      { min: 33.1, max: 40, color: "#fcbba1" },
      { min: 40, max: 75.7, color: "#fb6a4a" },
      { min: 75.7, max: 137.7, color: "#a50f15" },
    ],
    sussex: [
      { min: -36.3, max: -20, color: "#08306b" },
      { min: -20, max: -7.7, color: "#2171b5" },
      { min: -7.7, max: 14.1, color: "#c6dbef" },
      { min: 14.1, max: 29.6, color: "#fcbba1" },
      { min: 29.6, max: 78.6, color: "#fb6a4a" },
      { min: 78.6, max: 147.1, color: "#a50f15" },
    ],
    newcastle: [
      { min: -5, max: 10, color: "#08306b" },
      { min: 10, max: 25, color: "#2171b5" },
      { min: 25, max: 43.0, color: "#c6dbef" },
      { min: 43.0, max: 48, color: "#fcbba1" },
      { min: 48, max: 100.7, color: "#fb6a4a" },
      { min: 100.7, max: 531.2, color: "#a50f15" },
    ],
  },

  // --------------------------------------------------
  // ASSESSMENT CHANGE
  // --------------------------------------------------
  assessment_change: {
    statewide: [
      { min: 300.9, max: 472.4, color: "#08306b" },
      { min: 472.4, max: 568.0, color: "#2171b5" },
      { min: 568.0, max: 1020.4, color: "#c6dbef" },
      { min: 1020.4, max: 1696.4, color: "#fcbba1" },
      { min: 1696.4, max: 2570.8, color: "#fb6a4a" },
      { min: 2570.8, max: 5890.5, color: "#a50f15" },
    ],
    kent: [
      { min: 461.6, max: 613.3, color: "#08306b" },
      { min: 613.3, max: 702.4, color: "#2171b5" },
      { min: 702.4, max: 835.6, color: "#c6dbef" },
      { min: 835.6, max: 900.0, color: "#fcbba1" },
      { min: 900.0, max: 1273.0, color: "#fb6a4a" },
      { min: 1273.0, max: 3716.5, color: "#a50f15" },
    ],
    sussex: [
      { min: 1191.8, max: 1728.4, color: "#08306b" },
      { min: 1728.4, max: 1884.0, color: "#2171b5" },
      { min: 1884.0, max: 2124.7, color: "#c6dbef" },
      { min: 2124.7, max: 2500.0, color: "#fcbba1" },
      { min: 2500.0, max: 3842.0, color: "#fb6a4a" },
      { min: 3842.0, max: 5890.5, color: "#a50f15" },
    ],
    newcastle: [
      { min: 300.9, max: 434.8, color: "#08306b" },
      { min: 434.8, max: 482.3, color: "#2171b5" },
      { min: 482.3, max: 505.5, color: "#c6dbef" },
      { min: 505.5, max: 528.5, color: "#fcbba1" },
      { min: 528.5, max: 728.3, color: "#fb6a4a" },
      { min: 728.3, max: 2062.2, color: "#a50f15" },
    ],
  },

  // --------------------------------------------------
  // TAX BURDEN CHANGE
  // --------------------------------------------------
  tax_burden_change: {
    statewide: [
      { min: -96.01, max: -93.26, color: "#08306b" },
      { min: -93.26, max: -82.95, color: "#2171b5" },
      { min: -82.95, max: -79.16, color: "#c6dbef" },
      { min: -79.16, max: -76.42, color: "#fcbba1" },
      { min: -76.42, max: -75.7, color: "#fb6a4a" },
      { min: -75.7, max: -75.1, color: "#a50f15" },
    ],
    kent: [
      { min: -84.84, max: -84.37, color: "#08306b" },
      { min: -84.37, max: -83.99, color: "#2171b5" },
      { min: -83.99, max: -83.1, color: "#c6dbef" },
      { min: -83.1, max: -80.76, color: "#fcbba1" },
      { min: -80.76, max: -80.72, color: "#fb6a4a" },
      { min: -80.72, max: -80.67, color: "#a50f15" },
    ],
    sussex: [
      { min: -96.01, max: -95.72, color: "#08306b" },
      { min: -95.72, max: -94.83, color: "#2171b5" },
      { min: -94.83, max: -94.75, color: "#c6dbef" },
      { min: -94.75, max: -94.41, color: "#fcbba1" },
      { min: -94.41, max: -92.93, color: "#fb6a4a" },
      { min: -92.93, max: -92.75, color: "#a50f15" },
    ],
    newcastle: [
      { min: -80.51, max: -77.11, color: "#08306b" },
      { min: -77.11, max: -76.84, color: "#2171b5" },
      { min: -76.84, max: -76.49, color: "#c6dbef" },
      { min: -76.49, max: -76.05, color: "#fcbba1" },
      { min: -76.05, max: -75.7, color: "#fb6a4a" },
      { min: -75.7, max: -75.1, color: "#a50f15" },
    ],
  },
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

  const legendTitle =
    selectedLayer === "tax_change"
      ? "Tax % Change"
      : selectedLayer === "assessment_change"
        ? "Assessment % Change"
        : selectedLayer === "tax_burden_change"
          ? "Tax Burden % Change"
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
      console.error("Error loading GeoJSON:", err),
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

    const regionKey = county === "all" ? "statewide" : county;

    const layerBuckets = BUCKETS[selectedLayer]?.[regionKey];

    if (!layerBuckets) return "#ccc";

    const bucket = layerBuckets.find((b) => value >= b.min && value < b.max);

    return bucket?.color ?? "#ccc";
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

    const formatCountyName = (countyKey: string) => {
      if (countyKey === "newcastle") return "New Castle County";
      if (countyKey === "sussex") return "Sussex County";
      if (countyKey === "kent") return "Kent County";
      return "Delaware";
    };

    let tooltipHTML = "";
    let countyMedianHTML = "";

    // -----------------------------------
    // Build County Median Block (if county selected)
    // -----------------------------------
    if (centerValue != null && !isNaN(centerValue)) {
      const isStatewide = county === "all";

      const regionName = isStatewide ? "Delaware" : formatCountyName(county);

      const layerLabel =
        selectedLayer === "tax_change"
          ? "percent change in taxes"
          : selectedLayer === "assessment_change"
            ? "percent change in assessments"
            : "percent change in tax burden";

      countyMedianHTML = `
    <hr style="margin:8px 0;" />
    <div style="font-size:12px; color:#444;">
      <b>${isStatewide ? "Statewide Median" : "Countywide Median"}:</b><br/>
      The ${layerLabel} for <b>${regionName}</b> is 
      <b>${centerValue.toFixed(2)}%</b>.
    </div>
  `;
    }

    // ==========================================================
    // TAX % CHANGE
    // ==========================================================
    if (selectedLayer === "tax_change") {
      const pct =
        p.tax_change_pct != null ? p.tax_change_pct.toFixed(2) : "N/A";
      const city = p.CITY_NAME || "Unknown community";
      const tract = p.GEOID || "N/A";
      const tax2024 =
        p.median_tax_2024 != null
          ? `$${p.median_tax_2024.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "N/A";

      const tax2025 =
        p.median_tax_2025 != null
          ? `$${p.median_tax_2025.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "N/A";

      const parcels =
        p.parcel_count != null ? p.parcel_count.toLocaleString() : "N/A";

      tooltipHTML = `
      <div style="font-size:13px">
        <b>Tax % Change: ${pct}%</b><br/><br/>
        In <b>${city}</b> (census tract ${tract}), the median percent change in taxes was <b>${pct}%</b>.<br/><br/>
        In 2024, the median tax was ${tax2024}, and in 2025 it changed to ${tax2025}.<br/>
        There were <b>${parcels}</b> comparable parcels in this tract.
      </div>
      ${countyMedianHTML}
    `;
    }

    // ==========================================================
    // ASSESSMENT % CHANGE
    // ==========================================================
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
      ${countyMedianHTML}
    `;
    }

    // ==========================================================
    // TAX BURDEN % CHANGE
    // ==========================================================
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
      ${countyMedianHTML}
    `;
    }

    // Bind tooltip
    layer.bindTooltip(tooltipHTML, { sticky: true });

    // Hover styling
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
                  <option value="newcastle">New Castle</option>
                  <option value="kent">Kent</option>
                  <option value="sussex">Sussex</option>
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
                  {/* <option value="property_class">Property Class</option> */}
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
