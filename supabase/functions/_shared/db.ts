export async function upsertDB(
  url: string,
  key: string,
  passport: string,
  destination: string,
  incoming: any
) {
  const res = await fetch(
    `${url}/rest/v1/visa_records?passport=eq.${passport}&destination=eq.${destination}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    }
  );

  const existing = (await res.json())[0];

  const SOURCE_PRIORITY = {
    override: 4,
    travel_buddy: 3,
    visa_list: 2,
    wikipedia: 1
  };

  let needs_review = false;

  if (existing) {
    const currentP = SOURCE_PRIORITY[existing.source] || 0;
    const incomingP = SOURCE_PRIORITY[incoming.source] || 0;

    if (incomingP < currentP) return;

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