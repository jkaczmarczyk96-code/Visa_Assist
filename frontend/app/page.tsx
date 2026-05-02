"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  COUNTRIES,
  toApiFormat,
  getMzvCzLink,
  getMzvSkLink
} from "../lib/countries";
import WorldMap from "./components/WorldMap";

export default function Home() {
  const router = useRouter();

  const [passport, setPassport] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [result, setResult] = useState<any>(null);

  // 🔥 MAP DATA (chybělo)
  const [mapData, setMapData] = useState<any>({});

  const [openCountry, setOpenCountry] = useState(false);
  const [error, setError] = useState("");

  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function check() {
    console.log("CALLING API");

    if (!passport || !country) {
      setError("Nejdřív vyber pas a zemi");
      return;
    }

    setError("");
    setSubmitted(false);
    setShowComment(false);
    setComment("");

    const res = await fetch("https://vimpzdcfqmujbgcfkwlz.functions.supabase.co/visa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        passport,
        country: toApiFormat(country)
      })
    });

    const data = await res.json();
    setResult(data);

    // 🔥 MAP UPDATE
    setMapData((prev: any) => ({
      ...prev,
      [country]: data
    }));
  }

  // 🔥 CLICK Z MAPY
  function handleMapSelect(name: string) {
    setCountry(name);
  }

  async function sendFeedback(rating: number, text: string = "") {
    await fetch("https://vimpzdcfqmujbgcfkwlz.functions.supabase.co/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        passport,
        country,
        result,
        rating,
        comment: text
      })
    });

    setSubmitted(true);

    setShowComment(false);
      setComment("");

    setTimeout(() => {
      setSubmitted(false);
      }, 3000);
  }

  const statusMap: any = {
    green: ["Bez víza", "#22c55e"],
    blue: ["Vízum při příjezdu / eVisa", "#3b82f6"],
    yellow: ["Registrace / eVisa", "#eab308"],
    red: ["Vízum nutné", "#ef4444"]
  };

  const [label, color] = result
    ? statusMap[result.visa_color] || ["Neznámé", "#999"]
    : ["", "#fff"];

  const mzvLink =
    passport === "SK"
      ? getMzvSkLink(country)
      : getMzvCzLink(country);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e1117",
      color: "white",
      padding: "40px 20px",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700 }}>🌍 Visa Assist</h1>
            <div style={{ color: "#9ca3af" }}>
              Rychlá kontrola vízových podmínek
            </div>
          </div>

          <button
            onClick={() => router.push("/admin")}
            style={{
              height: "32px",
              padding: "2px 8px",
              borderRadius: 6,
              lineHeight: "22px",
              border: "0.5px solid #2a2f3a",
              background: "transparent",
              color: "#9ca3af",
              fontSize: 14,
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.border = '1px solid #3b82f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#9ca3af'
              e.currentTarget.style.border = '0.5px solid #2a2f3a'
            }}
          >
            Admin
          </button>
        </div>

        <div style={{ marginTop: 30 }} />

        {/* PASSPORT */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6 }}>🛂 Pas</div>

          <div style={{ display: "flex", gap: 10 }}>
            {["CZ", "SK"].map(p => (
              <div
                key={p}
                onClick={() => setPassport(p)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: passport === p
                    ? "1px solid #2563eb"
                    : "1px solid #2a2f3a",
                  background: passport === p
                    ? "#1d4ed8"
                    : "#111827",
                  fontWeight: 600
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* COUNTRY */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6 }}>🌍 Země</div>

          <div
            onClick={() => setOpenCountry(!openCountry)}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #2a2f3a",
              background: "#111827",
              cursor: "pointer"
            }}
          >
            {country || "Vyber zemi"}
          </div>

          {openCountry && (
            <div style={{
              marginTop: 6,
              background: "#111827",
              border: "1px solid #2a2f3a",
              borderRadius: 10,
              position: "relative", 
              zIndex: 20, 
              maxHeight: 220,
              overflowY: "auto"
            }}>
              {COUNTRIES.map(c => (
                <div
                  key={c}
                  onClick={() => {
                    setCountry(c);
                    setOpenCountry(false);
                  }}
                  style={{ padding: 12, cursor: "pointer" }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ color: "#f87171" }}>⚠ {error}</div>}

        <button
          onClick={check}
          disabled={!passport || !country}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            background: (!passport || !country) ? "#374151" : "#2563eb",
            color: "white",
            fontWeight: 700
          }}
        >
          🔍 Zkontrolovat
        </button>

        {/* RESULT */}
        {result && (
          <div style={{
            marginTop: 30,
            background: "#111827",
            borderRadius: 14,
            padding: 22,
            border: "1px solid #2a2f3a"
          }}>

            {/* TOP BAR */}
            <div style={{
              height: 6,
              background: color,
              borderRadius: 6,
              marginBottom: 16
            }} />

            <h2 style={{ marginBottom: 12 }}>{country}</h2>

            {/* STATUS BADGE */}
            <div style={{
              display: "inline-block",
              background: color,
              color: "black",
              padding: "5px 12px",
              borderRadius: 8,
              fontWeight: 700,
              marginBottom: 20
            }}>
              {label}
            </div>

            <div style={{ height: 1, background: "#2a2f3a", margin: "16px 0" }} />

            {/* VISA INFO */}
            <div style={{ lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                🛂 <b>Typ víza:</b> {label}
              </div>

              <div>
                ⏳ <b>Maximální pobyt:</b>{" "}
                {result.visa_duration ? result.visa_duration : "Není uvedeno"}
              </div>
            </div>

            <div style={{ height: 1, background: "#2a2f3a", margin: "16px 0" }} />

            {/* META */}
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              <div>Zdroj: {result.source}</div>
              <div>Confidence: {Math.round(result.confidence * 100)}%</div>
              <div>Aktualizováno: {new Date(result.generated_at).toLocaleString()}</div>
            </div>

            {/* WARNING */}
            {(result.visa_color === "yellow" || result.visa_color === "blue") && (
              <div style={{
                marginTop: 14,
                padding: 12,
                background: "#3f3f00",
                borderRadius: 10
              }}>
                ⚠️ Podmínky se mohou lišit – ověř informace na MZV
              </div>
            )}

            {/* MANDATORY */}
            {result.mandatory_registration && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: "#3f3f00",
                borderRadius: 10
              }}>
                ⚠ Povinná registrace před odletem:{" "}
                <b>{result.mandatory_registration.name}</b>
              </div>
            )}

            {/* MZV LINK */}
            {mzvLink && (
              <button
                onClick={() => window.open(mzvLink, "_blank")}
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #2563eb",
                  background: "transparent",
                  color: "#60a5fa",
                  cursor: "pointer"
                }}
              >
                🔗 Ověřit na MZV
              </button>
            )}

          {/* FEEDBACK */}
            {!submitted && (
              <div style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 10, color: "#9ca3af" }}>
                  💬 Pomohl ti výsledek?
                </div>
            
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => sendFeedback(1)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid #2a2f3a",
                      background: "#111827",
                      cursor: "pointer"
                    }}
                  >
                    👍
                  </button>
            
                  <button
                    onClick={() => setShowComment(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid #2a2f3a",
                      background: "#111827",
                      cursor: "pointer"
                    }}
                  >
                    👎
                  </button>
                </div>
            
                {showComment && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{
                        width: "100%",
                        maxWidth: 420,
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #2a2f3a",
                        background: "#0e1117",
                        color: "white"
                      }}
                    />
            
                    <button
                      onClick={() => sendFeedback(0, comment)}
                      style={{
                        marginTop: 10,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #2563eb",
                        background: "transparent",
                        color: "#60a5fa",
                        cursor: "pointer"
                      }}
                    >
                      Odeslat
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {submitted && (
              <div style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 10,
                background: "#052e1f",
                border: "1px solid #065f46",
                color: "#6ee7b7",
                textAlign: "center",
                fontWeight: 600
              }}>
                ✔ Feedback odeslán, děkujeme
              </div>
            )}
            
                    </div> 
            
                  )} 
            
                  {/* 🌍 MAPA */}
                  <div style={{ marginTop: 40, position: "relative", zIndex: 10 }}>
                    <WorldMap
                      data={mapData}
                      onSelect={handleMapSelect}
                    />
                  </div>
            
                </div> 
              </div> 
            );
            }
