"use client";

import {
  ComposableMap,
  Geographies,
  Geography
} from "react-simple-maps";
import { useState } from "react";
import React from "react";

const geoUrl =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const colorMap: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444"
};

const VISA_COLOR_MAP: Record<string, string> = {
  "Visa-free": "#22c55e",
  "Visa waiver": "#22c55e",

  "Visa on Arrival": "#3b82f6",
  "eVisa": "#3b82f6",

  "Registration required": "#eab308",

  "Visa required": "#ef4444"
};

type MapData = Record<string, any>;

type Props = {
  data: MapData;
  onSelect: (iso3: string) => void;
};

export default function WorldMap({ data, onSelect }: Props) {
  const [hovered, setHovered] = useState<{
    name: string;
    visa?: string;
    color?: string;
  } | null>(null);

  console.log("MAP DATA:", data);

  return (
    <div style={{ marginTop: 30 }}>
      <ComposableMap
        width={1000}
        height={500}
        style={{ width: "100%", height: "auto", userSelect: "none" }}
        projectionConfig={{ scale: 180 }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const iso3 = geo.id || geo.properties.ISO_A3;

              const item = data?.[iso3];

              console.log("ISO3:", iso3, "ITEM:", item);

              const fill = item
                ? VISA_COLOR_MAP[item.visa_name] || "#475569"
                : "#475569";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#0e1117"

                  tabIndex={-1}
                  onMouseDown={(e: React.MouseEvent<SVGPathElement>) => e.preventDefault()}

                  onMouseEnter={() => {
                    if (!item) return;
                    setHovered({
                      name: geo.properties.name,
                      visa: item?.visa_name,
                      color: item?.visa_color
                    });
                  }}

                  onMouseLeave={() => setHovered(null)}

                  onClick={() => {
                    if (!item) return;
                    onSelect(iso3);
                  }}

                  style={{
                    default: {
                      outline: "none",
                      cursor: item ? "pointer" : "default"
                    },
                    hover: item
                      ? {
                          fill: "#60a5fa",
                          cursor: "pointer"
                        }
                      : {
                          fill: "#020617",
                          cursor: "default"
                        },
                    pressed: {
                      outline: "none"
                    }
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
          <div
            style={{
              background: "#111827",
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #2a2f3a",
              textAlign: "center"
            }}
          >
            {hovered.color && (
              <div
                style={{
                  height: 4,
                  width: 60,
                  background: colorMap[hovered.color] || "#374151",
                  borderRadius: 4,
                  margin: "0 auto 8px"
                }}
              />
            )}

            <div style={{ fontWeight: 600 }}>{hovered.name}</div>

            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {hovered.visa || "Žádná data"}
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: 13
            }}
          >
            Najetím na stát zobrazíš informace
          </div>
        )}
      </div>
    </div>
  );
}