import "https://deno.land/std/dotenv/load.ts";
import { toApiFormat } from "../supabase/functions/_shared/countries.ts";

const SUPABASE_URL = Deno.env.get("PROJECT_URL")!;
const SUPABASE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const DATA_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy.csv";

// 👉 passport mapping
const PASSPORT_MAP: Record<string, string> = {
  "Czech Republic": "CZ",
  "Slovakia": "SK"
};

function normalizeRequirement(value: string) {
  if (!value) return null;

  const v = value.toLowerCase();

  if (!isNaN(Number(v))) {
    return { visa_name: "Visa-free", visa_duration: `${v} days`, visa_color: "green", source: "visa_list", confidence: 0.7 };
  }

  if (v.includes("free")) return { visa_name: "Visa-free", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("arrival")) return { visa_name: "Visa on Arrival", visa_color: "orange", source: "visa_list", confidence: 0.7 };
  if (v.includes("e-visa")) return { visa_name: "eVisa", visa_color: "orange", source: "visa_list", confidence: 0.7 };
  if (v.includes("eta")) return { visa_name: "Visa waiver", visa_color: "green", source: "visa_list", confidence: 0.7 };
  if (v.includes("required")) return { visa_name: "Visa required", visa_color: "red", source: "visa_list", confidence: 0.7 };

  return null;
}

async function run() {
  console.log("Fetching CSV...");

  const res = await fetch(DATA_URL);
  const text = await res.text();

  const rows = text.split("\n");
  rows.shift();

  let count = 0;

  for (const row of rows) {
    const [passportName, destinationName, requirement] = row.split(",");

    if (!passportName || !destinationName || !requirement) continue;

    // ✅ filtr + map passport
    const passport = PASSPORT_MAP[passportName];
    if (!passport) continue;

    // ✅ destination přes helper
    const destination = toApiFormat(destinationName);
    if (!destination) continue;

    const normalized = normalizeRequirement(requirement);
    if (!normalized) continue;

    await fetch(`${SUPABASE_URL}/rest/v1/visa_records`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        passport,        // CZ / SK
        destination,     // ISO (CN, US…)
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