import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

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

  // převedeme na mapu podle ISO2
  const result: Record<string, any> = {};

  for (const row of data || []) {
    result[row.destination] = {
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