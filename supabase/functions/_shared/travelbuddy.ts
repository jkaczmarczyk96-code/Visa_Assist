export async function fetchTravelBuddy(passport: string, destination: string) {
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

    // 🔥 přidej toto
    if (!res.ok) {
    console.log("TB HTTP ERROR:", res.status);
    return null;
    }

    const json = await res.json();

    const primary = json?.data?.visa_rules?.primary_rule;
    const secondary = json?.data?.visa_rules?.secondary_rule;

    if (!primary && !secondary) return null;

    let visaName = primary?.name || secondary?.name;

    if (primary?.name && secondary?.name) {
      visaName = `${primary.name} / ${secondary.name}`;
    }

    return {
      visa_name: visaName,
      visa_duration: primary?.duration || secondary?.duration || "",
      visa_color: primary?.color || "yellow",
      source: "travel_buddy"
    };

  } catch (e) {
    console.log("TB ERROR:", e);
    return null;
  }
}