import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data = await req.json();

    const url = Deno.env.get("PROJECT_URL");
    const key = Deno.env.get("SERVICE_ROLE_KEY");

    await fetch(`${url}/rest/v1/feedback`, {
      method: "POST",
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err)
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});