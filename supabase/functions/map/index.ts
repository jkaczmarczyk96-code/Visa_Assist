import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { ISO3_TO_ISO2 } from "../_shared/countries.ts";

const ISO2_TO_ISO3 = Object.fromEntries(
  Object.entries(ISO3_TO_ISO2).map(([iso3, iso2]) => [iso2, iso3])
);

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // vezmeme všechny záznamy
  const { data, error } = await supabase
    .from("visa_records")
    .select("destination, visa_color, visa_name, visa_duration");

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

const result: Record<string, any> = {};

for (const row of data || []) {
  const iso3 = ISO2_TO_ISO3[row.destination];

  // pokud nemáme mapování, přeskočíme (zatím OK)
  if (!iso3) continue;

  result[iso3] = {
    visa_color: row.visa_color,
    visa_name: row.visa_name,
    visa_duration: row.visa_duration
  };
}

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
});