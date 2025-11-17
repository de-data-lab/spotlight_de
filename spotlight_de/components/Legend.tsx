"use client";

import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { useEffect } from "react";

interface LegendProps {
  min: number;
  max: number;
  infoText?: string; // optional description
}

export function Legend({
  min,
  max,
  infoText = "Represents the percentage change in the value.",
}: LegendProps) {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      div.style.position = "relative";
      div.style.background = "white";
      div.style.padding = "12px 14px";
      div.style.borderRadius = "4px";
      div.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
      div.style.fontSize = "13px";
      div.style.fontFamily = "sans-serif";

      const WIDTH = 260;
      const mid = (min + max) / 2;

      div.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:6px;">
          <div style="font-weight:bold;">Change (%)</div>
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
            "
          >i
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

        <div id="legend-gradient"
          style="
            width:${WIDTH}px;
            height:16px;
            position:relative;
            cursor:crosshair;
            background:linear-gradient(to right,
              rgb(0,70,170),
              rgb(40,180,40),
              rgb(255,255,0),
              rgb(255,140,0),
              rgb(255,0,0)
            );
            border-radius:4px;
          "
        >
          <div id="legend-indicator" 
            style="
              position:absolute;
              top:-4px;
              width:2px;
              height:24px;
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

        <div style="display:flex; justify-content:space-between; width:${WIDTH}px; margin-top:6px;">
          <span>${min.toFixed(1)}%</span>
          <span>${mid.toFixed(1)}%</span>
          <span>${max.toFixed(1)}%</span>
        </div>
      `;

      const gradient = div.querySelector<HTMLDivElement>("#legend-gradient")!;
      const indicator = div.querySelector<HTMLDivElement>("#legend-indicator")!;
      const tooltip = div.querySelector<HTMLDivElement>("#legend-tooltip")!;

      function onMove(e: MouseEvent) {
        const rect = gradient.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pos = Math.max(0, Math.min(x, WIDTH));
        const t = pos / WIDTH;
        const val = min + t * (max - min);

        indicator.style.left = `${pos - 1}px`;
        tooltip.style.left = `${pos}px`;
        tooltip.textContent = val.toFixed(2) + "%";

        indicator.style.opacity = "1";
        tooltip.style.opacity = "1";
      }

      function onLeave() {
        indicator.style.opacity = "0";
        tooltip.style.opacity = "0";
      }

      gradient.addEventListener("mousemove", onMove);
      gradient.addEventListener("mouseleave", onLeave);

      // Info tooltip logic
      const info = div.querySelector<HTMLDivElement>("#legend-info")!;
      const infoTooltip = div.querySelector<HTMLDivElement>(
        "#legend-info-tooltip"
      )!;

      info.addEventListener("mouseenter", () => {
        infoTooltip.style.opacity = "1";
      });
      info.addEventListener("mouseleave", () => {
        infoTooltip.style.opacity = "0";
      });

      return div;
    };

    legend.addTo(map);
    return () => {
      legend.remove();
    };
  }, [map, min, max, infoText]);

  return null;
}
