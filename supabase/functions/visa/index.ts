import { serve } from "https://deno.land/std/http/server.ts";

import { toApiFormat } from "../_shared/countries.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const WEIGHTS = {
  travel_buddy: 1.0,
  wikipedia: 0.1
};

// =========================
// FIX: BEST RESULT
// =========================
function pickBestResult(results: any[]) {
  let best = null;
  let bestScore = -1;

  for (const r of results) {
    if (!r) continue;

    const w = WEIGHTS[r.source] || 0;

    if (w > bestScore) {
      best = r;
      bestScore = w;
    }
  }

  return best;
}

// =========================
// MAPOVÁNÍ
// =========================
function mapStatusToName(status: string) {
  switch (status) {
    case "visa_free": return "Visa not required";
    case "visa_on_arrival": return "Visa on arrival";
    case "evisa": return "eVisa";
    case "visa_required": return "Visa required";
    default: return status;
  }
}

function mapStatusToColor(status: string) {
  switch (status) {
    case "visa_free": return "green";
    case "visa_on_arrival": return "blue";
    case "evisa": return "yellow";
    case "visa_required": return "red";
    default: return "gray";
  }
}

// =========================
// NORMALIZE DURATION
// =========================
function normalizeDuration(value: any): string {
  if (!value || value === "") return "Není uvedeno";

  const text = String(value).toLowerCase().trim();

  if (text.includes("90")) return "90 dní";
  if (text.includes("30")) return "30 dní";
  if (text.includes("180")) return "180 dní";
  if (text.includes("day") || text.includes("dní")) return value;
  if (text.includes("varies") || text.includes("depends")) return "Liší se";

  return value.length > 50 ? "Není uvedeno" : value;
}

// =========================
// COLOR DETECTION (wiki)
// =========================
function detectColor(text: string) {
  const t = text.toLowerCase();

  if (t.includes("visa free") || t.includes("no visa")) return "green";
  if (t.includes("visa on arrival")) return "blue";
  if (t.includes("evisa") || t.includes("eta")) return "yellow";
  if (t.includes("visa required")) return "red";

  return "yellow";
}

// =========================
// WIKIPEDIA FETCH
// =========================
async function fetchWikipedia(passport: string, country: string) {
  try {
    const map: any = { CZ: "Czech", SK: "Slovak" };
    const wikiPassport = map[passport] || passport;

    const url = `https://en.wikipedia.org/wiki/Visa_requirements_for_${wikiPassport}_citizens`;

    const res = await fetch(url);
    const html = await res.text();

    const rows = html.split("<tr");

    for (const row of rows) {
      const clean = row.replace(/<[^>]+>/g, " ").toLowerCase();

      if (clean.startsWith(country.toLowerCase())) {
        return {
          visa_name: clean.slice(0, 100),
          visa_duration: "",
          visa_color: detectColor(clean),
          source: "wikipedia"
        };
      }
    }
  } catch (e) {
    console.log("WIKI ERROR:", e);
  }

  return null;
}

// =========================
// TRAVEL BUDDY FETCH
// =========================
async function fetchTravelBuddy(passport: string, country: string) {
  try {
    const body = new URLSearchParams();
    body.append("passport", passport);
    body.append("destination", country);

    const res = await fetch(
      "https://visa-requirement.p.rapidapi.com/v2/visa/check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-rapidapi-host": "visa-requirement.p.rapidapi.com",
          "x-rapidapi-key": Deno.env.get("RAPIDAPI_KEY")!
        },
        body
      }
    );

    const json = await res.json();
    console.log("TB RAW:", json);

    const data = json?.data;

    if (!data?.visa_rules) {
      console.log("TB INVALID STRUCTURE:", json);
      return null;
    }

    const primary = data.visa_rules.primary_rule || {};
    const secondary = data.visa_rules.secondary_rule || {};

    if (!primary.name && !secondary.name) {
      console.log("TB NO DATA:", json);
      return null;
    }

    // 🔥 FIX: správné složení názvu
    let visaName = primary.name || secondary.name;

    if (primary.name && secondary.name) {
      visaName = `${primary.name} / ${secondary.name}`;
    }

    let duration = primary.duration || secondary?.duration || "";
    let color = primary.color || "yellow";

    return {
      visa_name: visaName,
      visa_duration: duration,
      visa_color: color,
      source: "travel_buddy",
      mandatory_registration: data.mandatory_registration || null
    };

  } catch (e) {
    console.log("TRAVEL BUDDY ERROR:", e);
  }

  return null;
}
// =========================
// FEEDBACK
// =========================
async function getFeedback(passport: string, country: string, url: string, key: string) {
  try {
    const res = await fetch(
      `${url}/rest/v1/feedback?passport=eq.${passport}&country=eq.${country}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    const data = await res.json();

    let pos = 0;
    let neg = 0;

    data.forEach((r: any) => {
      if (r.rating === 1) pos++;
      else neg++;
    });

    return { pos, neg };
  } catch {
    return { pos: 0, neg: 0 };
  }
}

// =========================
// MAIN
// =========================
serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.json();

  const passport = body.passport;
  const countryName = body.country;
  const country = toApiFormat(countryName);

  const url = Deno.env.get("PROJECT_URL");
  const key = Deno.env.get("SERVICE_ROLE_KEY");

  // =========================
  // CACHE
  // =========================
  const cacheRes = await fetch(
    `${url}/rest/v1/visa_cache?passport=eq.${passport}&country=eq.${country}&order=updated_at.desc&limit=1`,
    {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`
      }
    }
  );

  const cache = await cacheRes.json();

  if (cache.length > 0) {
    const cachedRow = cache[0];
    const cached = cachedRow.data;

    const updatedAt = new Date(cachedRow.updated_at).getTime();
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - updatedAt > TTL;

    if (cached?.override === true && !isExpired) {
      return new Response(JSON.stringify({
        visa_name: mapStatusToName(cached.status),
        visa_duration: cached.max_stay,
        visa_color: mapStatusToColor(cached.status),
        confidence: 1,
        source: "admin_override",
        generated_at: new Date().toISOString()
      }), { headers: corsHeaders });
    }

    if (!isExpired) {
      return new Response(JSON.stringify(cached), {
        headers: corsHeaders
      });
    }
  }

// =========================
// REAL DATA
// =========================
    const tb = await fetchTravelBuddy(passport, country);
    const wiki = await fetchWikipedia(passport, countryName);
    
    const resultPicked = pickBestResult([tb, wiki]);
    
    let result = resultPicked;
    
    if (!result) {
      result = {
        visa_name: "Unknown",
        visa_duration: "Není uvedeno",
        visa_color: "yellow",
        source: "fallback"
      };
    }
    
    result["source_priority"] =
      result.source === "travel_buddy" ? "primary" : "fallback";
  
  // =========================
  // CONFIDENCE
  // =========================
  const { pos, neg } = await getFeedback(passport, country, url!, key!);

  let confidence = 0.6;
  confidence = Math.max(0, Math.min(1, confidence - neg * 0.1 + pos * 0.05));

  result["confidence"] = Number(confidence.toFixed(2));
  result["generated_at"] = new Date().toISOString();

  result.visa_duration = normalizeDuration(result.visa_duration);

  // =========================
  // SAVE CACHE
  // =========================
  await fetch(`${url}/rest/v1/visa_cache`, {
    method: "POST",
    headers: {
      apikey: key!,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      passport,
      country,
      country_name: countryName,
      data: result
    })
  });

  return new Response(JSON.stringify(result), {
    headers: corsHeaders
  });
});
