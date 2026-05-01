import { serve } from "https://deno.land/std/http/server.ts";

import { isTBEnabled } from "../_shared/config.ts";
import { fetchTravelBuddy } from "../_shared/travelBuddy.ts";
import { upsertDB } from "../_shared/db.ts";

serve(async (req) => {
  try {
    const { passport, destination } = await req.json();

        if (!destination) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid destination"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const url = Deno.env.get("PROJECT_URL")!;
    const key = Deno.env.get("SERVICE_ROLE_KEY")!;

    // 🔒 toggle kontrola
    const enabled = await isTBEnabled(url, key);

    if (!enabled) {
      return new Response(
        JSON.stringify({ success: false, message: "TB disabled" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔄 TB call
    const tb = await fetchTravelBuddy(passport, destination);

    if (!tb) {
        return new Response(
            JSON.stringify({
            success: false,
            message: "No TB data (quota or invalid response)"
            }),
            { headers: { "Content-Type": "application/json" } }
        );
        }

    // 💾 save
    await upsertDB(url, key, passport, destination, tb);

    return new Response(
      JSON.stringify({ success: true, source: "travel_buddy" }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});