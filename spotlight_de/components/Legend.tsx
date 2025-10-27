import L from "leaflet";
import { useMap } from "react-leaflet";
import { useEffect } from "react";

export function Legend() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = L.control({ position: "bottomleft" }); // Tool tip alignment

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      div.innerHTML = `
        <h4 style="margin:4px 0;">Tax Change</h4>
        <div style="display:flex;align-items:center;margin-bottom:2px;">
          <i style="background:#d73027;width:18px;height:18px;margin-right:6px;display:inline-block;border:1px solid #333;"></i>
          Increase
        </div>
        <div style="display:flex;align-items:center;">
          <i style="background:#1a9850;width:18px;height:18px;margin-right:6px;display:inline-block;border:1px solid #333;"></i>
          Decrease
        </div>
      `;
      return div;
    };

    legend.addTo(map);

    // cleanup when component unmounts
    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
}
