export async function isTBEnabled(url: string, key: string) {
  const res = await fetch(
    `${url}/rest/v1/app_config?key=eq.tb_refresh_enabled`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    }
  );

  const data = await res.json();
  return data?.[0]?.value === "true";
}