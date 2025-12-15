"use client";

import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { useEffect } from "react";

interface LegendProps {
  min: number;
  max: number;
  center: number;
  infoText?: string;
  title?: string;
}

export function Legend({
  min,
  max,
  infoText = "Larger decreases are shown in blue, larger increases in red.",
  center,
  title = "Legend",
}: LegendProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Create legend control
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend") as HTMLDivElement;
      div.style.position = "relative";
      div.style.background = "white";
      div.style.padding = "14px 16px";
      div.style.borderRadius = "6px";
      div.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
      div.style.fontSize = "13px";
      div.style.fontFamily = "sans-serif";

      const WIDTH = 300;
      const HEIGHT = 22;

      const bucketColors = [
        // 3 blues (dark → light)
        "#08306b",
        "#2171b5",
        "#c6dbef",

        // neutral
        "#ffffff",

        // 3 reds (light → dark)
        "#fcbba1",
        "#fb6a4a",
        "#a50f15",
      ];

      const CENTER_BAND_FRACTION = 0.1; // 10% of total range
      const centerHalfWidth = ((max - min) * CENTER_BAND_FRACTION) / 2;

      const centerMin = center - centerHalfWidth;
      const centerMax = center + centerHalfWidth;

      // Compute bucket ranges
      const bucketCount = bucketColors.length;
      const bucketRanges: [number, number][] = [];

      // 3 below-center buckets
      for (let i = 0; i < 3; i++) {
        const start = min + (i / 3) * (centerMin - min);
        const end = min + ((i + 1) / 3) * (centerMin - min);
        bucketRanges.push([start, end]);
      }

      // center (white) bucket — REAL RANGE
      bucketRanges.push([centerMin, centerMax]);

      // 3 above-center buckets
      for (let i = 0; i < 3; i++) {
        const start = centerMax + (i / 3) * (max - centerMax);
        const end = centerMax + ((i + 1) / 3) * (max - centerMax);
        bucketRanges.push([start, end]);
      }

      const bucketsHTML = bucketColors
        .map(
          (color) =>
            `<div style="flex:1; height:100%; background:${color};"></div>`
        )
        .join("");

      div.innerHTML = `
        <!-- Title Row -->
        <div style="display:flex; align-items:center; margin-bottom:8px;">
<div style="font-weight:bold; font-size:14px;">${title}</div>
          <div id="legend-info" 
            style="
              margin-left:6px;
              width:14px;
              height:14px;
              border-radius:50%;
              background:#555;
              color:white;
              font-size:10px;
              text-align:center;
              line-height:14px;
              cursor:help;
              position:relative;
            ">i
            <div id="legend-info-tooltip"
              style="
                position:absolute;
                bottom:120%;
                left:50%;
                transform:translateX(-50%);
                background:black;
                color:white;
                padding:4px 6px;
                font-size:11px;
                border-radius:3px;
                white-space:nowrap;
                opacity:0;
                pointer-events:none;
                transition:opacity 0.2s;
              "
            >${infoText}</div>
          </div>
        </div>

        <!-- Labels Above Bucket Bar -->
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#444; margin-bottom:4px;">
          <span>Larger Decrease</span>
          <span>Larger Increase</span>
        </div>

        <!-- Bucket Color Bar -->
        <div id="legend-gradient"
          style="
            width:${WIDTH}px;
            height:${HEIGHT}px;
            position:relative;
            cursor:crosshair;
            display:flex;
            border-radius:4px;
            overflow:visible;
          "
        >
          ${bucketsHTML}
          <div id="legend-indicator" 
            style="
              position:absolute;
              top:-4px;
              width:2px;
              height:${HEIGHT + 10}px;
              background:black;
              opacity:0;
              pointer-events:none;
            "
          ></div>
          <div id="legend-tooltip"
            style="
              position:absolute;
              top:-28px;
              padding:2px 6px;
              background:black;
              color:white;
              font-size:11px;
              border-radius:3px;
              white-space:nowrap;
              opacity:0;
              transform:translateX(-50%);
              pointer-events:none;
            "
          ></div>
        </div>
      `;

      const gradient = div.querySelector<HTMLDivElement>("#legend-gradient")!;
      const indicator = div.querySelector<HTMLDivElement>("#legend-indicator")!;
      const tooltip = div.querySelector<HTMLDivElement>("#legend-tooltip")!;
      const info = div.querySelector<HTMLDivElement>("#legend-info")!;
      const infoTooltip = div.querySelector<HTMLDivElement>(
        "#legend-info-tooltip"
      )!;

      // Gradient hover
      const onMove = (e: MouseEvent) => {
        const rect = gradient.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pos = Math.max(0, Math.min(x, WIDTH));

        const t = pos / WIDTH;
        const bucketIndex = Math.floor(t * bucketCount);

        // Move the indicator
        indicator.style.left = `${pos - 1}px`;
        tooltip.style.left = `${pos}px`;

        if (bucketIndex >= 0 && bucketIndex < bucketCount) {
          const [rangeMin, rangeMax] = bucketRanges[bucketIndex];
          tooltip.textContent = `${rangeMin.toFixed(2)}% → ${rangeMax.toFixed(
            2
          )}%`;
        } else {
          tooltip.textContent = "";
        }

        indicator.style.opacity = "1";
        tooltip.style.opacity = "1";
      };

      const onLeave = () => {
        indicator.style.opacity = "0";
        tooltip.style.opacity = "0";
      };

      gradient.addEventListener("mousemove", onMove);
      gradient.addEventListener("mouseleave", onLeave);

      // Info tooltip hover
      const onInfoEnter = () => (infoTooltip.style.opacity = "1");
      const onInfoLeave = () => (infoTooltip.style.opacity = "0");
      info.addEventListener("mouseenter", onInfoEnter);
      info.addEventListener("mouseleave", onInfoLeave);

      // Cleanup event listeners when legend is removed
      const cleanup = () => {
        gradient.removeEventListener("mousemove", onMove);
        gradient.removeEventListener("mouseleave", onLeave);
        info.removeEventListener("mouseenter", onInfoEnter);
        info.removeEventListener("mouseleave", onInfoLeave);
      };

      // Attach cleanup to the div so React/Leaflet can remove it safely
      (div as any)._cleanup = cleanup;

      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
      // Call internal cleanup for event listeners
      const div = (legend.getContainer() as any)?._cleanup;
      if (div) div();
    };
  }, [map, min, max, center, infoText]);

  return null;
}
