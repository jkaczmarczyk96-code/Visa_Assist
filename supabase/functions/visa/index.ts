import { serve } from "https://deno.land/std/http/server.ts";
import { toApiFormat } from "../_shared/countries.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const SOURCE_PRIORITY = {
  override: 4,
  travel_buddy: 3,
  visa_list: 2,
  wikipedia: 1
};

const BASE_CONFIDENCE = {
  override: 1.0,
  travel_buddy: 0.9,
  visa_list: 0.7,
  wikipedia: 0.4
};

// =========================
// NORMALIZE
// =========================
function normalizeDuration(value: any): string {
  if (!value || value === "") return "Není uvedeno";

  const text = String(value).toLowerCase().trim();

  if (text.includes("90")) return "90 dní";
  if (text.includes("30")) return "30 dní";
  if (text.includes("180")) return "180 dní";
  if (text.includes("varies") || text.includes("depends")) return "Liší se";

  return value;
}

function toResponse(record: any, confidence: number) {
  return {
    visa_name: record.visa_name,
    visa_duration: normalizeDuration(record.visa_duration),
    visa_color: record.visa_color,
    confidence: Number(confidence.toFixed(2)),
    source: record.source,
    generated_at: new Date().toISOString()
  };
}

// =========================
// DB
// =========================
async function getFromDB(url: string, key: string, passport: string, destination: string) {
  const res = await fetch(
    `${url}/rest/v1/visa_records?passport=eq.${passport}&destination=eq.${destination}&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    }
  );

  const data = await res.json();
  return data[0] || null;
}

async function upsertDB(
  url: string,
  key: string,
  passport: string,
  destination: string,
  incoming: any
) {
  const existing = await getFromDB(url, key, passport, destination);

  let needs_review = false;

  if (existing) {
    const currentP = SOURCE_PRIORITY[existing.source] || 0;
    const incomingP = SOURCE_PRIORITY[incoming.source] || 0;

    // ❌ horší zdroj nepřepisuje
    if (incomingP < currentP) return;

    // 🔥 DETEKCE KONFLIKTU (jen mezi různými zdroji)
    if (
      existing.source !== incoming.source &&
      (
        existing.visa_name !== incoming.visa_name ||
        existing.visa_color !== incoming.visa_color
      )
    ) {
      needs_review = true;
    }
  }

  await fetch(`${url}/rest/v1/visa_records`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      passport,
      destination,
      ...incoming,
      needs_review,
      updated_at: new Date().toISOString()
    })
  });
}

// =========================
// VISA LIST
// =========================
function normalizeRequirement(value: string) {
  if (!value) return null;
  const v = value.toLowerCase();

  if (!isNaN(Number(v))) {
    return { visa_name: "Visa-free", visa_duration: `${v} days`, visa_color: "green", source: "visa_list" };
  }

  if (v.includes("free")) return { visa_name: "Visa-free", visa_color: "green", source: "visa_list" };
  if (v.includes("arrival")) return { visa_name: "Visa on Arrival", visa_color: "orange", source: "visa_list" };
  if (v.includes("e-visa") || v.includes("evisa")) return { visa_name: "eVisa", visa_color: "orange", source: "visa_list" };
  if (v.includes("eta")) return { visa_name: "Visa waiver", visa_color: "green", source: "visa_list" };
  if (v.includes("required")) return { visa_name: "Visa required", visa_color: "red", source: "visa_list" };

  return null;
}

async function fetchVisaList(passport: string, destination: string) {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-matrix.json"
    );
    const data = await res.json();

    return normalizeRequirement(data?.[passport]?.[destination]);
  } catch {
    return null;
  }
}

// =========================
// WIKIPEDIA
// =========================
async function fetchWikipedia(passport: string, country: string) {
  try {
    const map: any = { CZ: "Czech", SK: "Slovak" };
    const wikiPassport = map[passport] || passport;

    const res = await fetch(
      `https://en.wikipedia.org/wiki/Visa_requirements_for_${wikiPassport}_citizens`
    );

    const html = await res.text();
    const rows = html.split("<tr");

    for (const row of rows) {
      const clean = row.replace(/<[^>]+>/g, " ").toLowerCase();
      if (clean.startsWith(country.toLowerCase())) {
        return {
          visa_name: clean.slice(0, 100),
          visa_duration: "",
          visa_color: "yellow",
          source: "wikipedia"
        };
      }
    }
  } catch {}

  return null;
}

// =========================
// TRAVEL BUDDY
// =========================
async function fetchTravelBuddy(passport: string, destination: string) {
  try {
    const body = new URLSearchParams();
    body.append("passport", passport);
    body.append("destination", destination);

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
    const primary = json?.data?.visa_rules?.primary_rule;

    if (!primary?.name) return null;

    return {
      visa_name: primary.name,
      visa_duration: primary.duration,
      visa_color: primary.color || "yellow",
      source: "travel_buddy"
    };
  } catch {
    return null;
  }
}

// =========================
// FEEDBACK
// =========================
async function getFeedback(passport: string, destination: string, url: string, key: string) {
  try {
    const res = await fetch(
      `${url}/rest/v1/feedback?passport=eq.${passport}&country=eq.${destination}`,
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

  const { passport, country: countryName } = await req.json();
  const destination = toApiFormat(countryName);

  const url = Deno.env.get("PROJECT_URL")!;
  const key = Deno.env.get("SERVICE_ROLE_KEY")!;

  const existing = await getFromDB(url, key, passport, destination);

  // override má absolutní prioritu
  if (existing?.source === "override") {
    return new Response(JSON.stringify(toResponse(existing, 1)), {
      headers: corsHeaders
    });
  }

 if (existing) {
  // 🔥 background refresh (neblokuje response)


  const { pos, neg } = await getFeedback(passport, destination, url, key);

  let confidence = BASE_CONFIDENCE[existing.source] || 0.5;
  confidence = confidence - neg * 0.1 + pos * 0.05;
  confidence = Math.max(0, Math.min(1, confidence));

  return new Response(JSON.stringify(toResponse(existing, confidence)), {
    headers: corsHeaders
  });
}

  let result =
    await fetchTravelBuddy(passport, destination) ||
    await fetchVisaList(passport, destination) ||
    await fetchWikipedia(passport, countryName);

  if (!result) {
    result = {
      visa_name: "Unknown",
      visa_duration: "",
      visa_color: "yellow",
      source: "fallback"
    };
  }

  if (result.source !== "fallback") {
    await upsertDB(url, key, passport, destination, result);
  }

  const { pos, neg } = await getFeedback(passport, destination, url, key);

  let confidence = BASE_CONFIDENCE[result.source] || 0.5;
  confidence = confidence - neg * 0.1 + pos * 0.05;
  confidence = Math.max(0, Math.min(1, confidence));

  return new Response(JSON.stringify(toResponse(result, confidence)), {
    headers: corsHeaders
  });
});