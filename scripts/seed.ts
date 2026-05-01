import "https://deno.land/std/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("PROJECT_URL")!;
const SUPABASE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const DATA_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso2.csv";

// =========================
// NORMALIZE VISA
// =========================
function normalizeRequirement(value: string) {
  if (!value) return null;

  const v = value.toLowerCase();

  if (!isNaN(Number(v))) {
    return {
      visa_name: "Visa-free",
      visa_duration: `${v} days`,
      visa_color: "green",
      source: "visa_list",
      confidence: 0.7
    };
  }

  if (v.includes("not required")) return { visa_name: "Visa-free", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("no visa")) return { visa_name: "Visa-free", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("free")) return { visa_name: "Visa-free", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("arrival")) return { visa_name: "Visa on Arrival", visa_color: "orange", source: "visa_list", confidence: 0.7 };
  if (v.includes("e-visa") || v.includes("evisa")) return { visa_name: "eVisa", visa_color: "orange", source: "visa_list", confidence: 0.7 };
  if (v.includes("eta")) return { visa_name: "Visa waiver", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("required")) return { visa_name: "Visa required", visa_color: "red", source: "visa_list", confidence: 0.7 };

  return null;
}

// =========================
// MAIN
// =========================
async function run() {
  console.log("Fetching CSV...");

  const res = await fetch(DATA_URL);
  const text = await res.text();

  const rows = text.split("\n");
  rows.shift(); // odstraní header

  let count = 0;

  for (const row of rows) {
    if (!row.trim()) continue;

    // ✅ správný parsing ISO datasetu
    const parts = row.split(",");
    if (parts.length < 3) continue;

    let [passport, destination, ...rest] = parts;
    const requirement = rest.join(","); // kvůli případným čárkám

    passport = passport.trim().toUpperCase();
    destination = destination.trim().toUpperCase();

    // ✅ filtr jen CZ + SK
    if (passport !== "CZ" && passport !== "SK") continue;

    const normalized = normalizeRequirement(requirement);

    if (!normalized) {
      console.log("❌ UNKNOWN VISA:", requirement);
      continue;
    }

    // 💾 insert do Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/visa_records`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        passport,
        destination,
        ...normalized,
        updated_at: new Date().toISOString()
      })
    });

    count++;

    if (count % 200 === 0) {
      console.log("Inserted:", count);
    }
  }

  console.log("DONE:", count);
}

run();