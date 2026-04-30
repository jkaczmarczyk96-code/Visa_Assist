"use client";

import {
  ComposableMap,
  Geographies,
  Geography
} from "react-simple-maps";
import { useState } from "react";
import { getCountry } from "../../../shared/countries";
// nebo relativní cesta pokud nepoužíváš alias

import React from "react";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const colorMap: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444"
};

type MapData = Record<string, any>;

type Props = {
  data: MapData;
  onSelect: (name: string) => void;
};

export default function WorldMap({ data, onSelect }: Props) {

  const [hovered, setHovered] = useState<{
    name: string;
    visa?: string;
    color?: string;
  } | null>(null);

  return (
    <div style={{ marginTop: 30 }}>
      <ComposableMap
        width={1000}
        height={500}
        style={{ width: "100%", height: "auto", userSelect: "none" }} // ✅ fix
        projectionConfig={{ scale: 180 }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const name = geo?.properties?.name;

              if (!name) return null;

              const countryExists = getCountry(name);  

              const item = data?.[name];

              const fill = item
                ? colorMap[item.visa_color] || "#374151"
                : "#1f2937";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={countryExists ? fill : "#020617"} // tmavé pro neaktivní
                  stroke="#0e1117"
                
                  onMouseEnter={() => {
                    if (!countryExists) return;
                    setHovered({
                      name,
                      visa: item?.visa_name,
                      color: item?.visa_color
                    });
                  }}
                
                  onMouseLeave={() => setHovered(null)}
                
                  onClick={() => {
                    if (!countryExists) return;
                    onSelect(name);
                  }}
                
                  style={{
                    default: { outline: "none" },
                    hover: countryExists
                      ? {
                          fill: "#60a5fa",
                          cursor: "pointer"
                        }
                      : {
                          fill: "#020617",
                          cursor: "default"
                        },
                    pressed: { outline: "none" }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* TOOLTIP */}
      <div style={{ marginTop: 12, minHeight: 60 }}>
        {hovered ? (
          <div style={{
            background: "#111827",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #2a2f3a",
            textAlign: "center"
          }}>
            {hovered.color && (
              <div style={{
                height: 4,
                width: 60,
                background: colorMap[hovered.color] || "#374151",
                borderRadius: 4,
                margin: "0 auto 8px"
              }} />
            )}

            <div style={{ fontWeight: 600 }}>
              {hovered.name}
            </div>

            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {hovered.visa || "Žádná data"}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: 13
          }}>
            Najetím na stát zobrazíš informace
          </div>
        )}
      </div>
    </div>
  );
}
