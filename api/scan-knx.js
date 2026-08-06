// KNX publishes its installer directory as a plain, unauthenticated JSON API
// (found by inspecting the network requests the "Find an Installer" map
// page makes) rather than rendering it into the page HTML - reading that
// directly is far more reliable than trying to scrape/parse the map UI.
// Only Gold/Platinum tier installers are included: per KNX's own page copy,
// those are the ones "actively offering KNX services" and contactable -
// Silver covers ~83% of entries and is mostly individual certifications,
// not necessarily active businesses worth prospecting.

function parseAddress(rawAddress) {
  const clean = (rawAddress || "").replace(/<br\s*\/?>/gi, "\n");
  const lines = clean
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const country = lines[lines.length - 1] || "";
  const cityLine = lines[lines.length - 2] || "";
  const match = cityLine.match(/^(\S[\w-]{2,9})\s+(.*)$/);
  const postalCode = match ? match[1] : "";
  const city = match ? match[2] : cityLine;
  return { city, postalCode, country };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  try {
    const r = await fetch("https://www.knx.org/api/installers", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ILeadsBot/1.0; +https://ileads.prestigedistribution.es)" },
    });
    if (!r.ok) {
      res.status(502).json({ error: `KNX respondió ${r.status}` });
      return;
    }
    const json = await r.json();

    const rows = (json.data ?? [])
      .filter((d) => d.rating === "gold" || d.rating === "platinum")
      .filter((d) => /spain|españa|portugal/i.test(d.address ?? ""))
      .map((d) => {
        const { city, postalCode, country } = parseAddress(d.address);
        const name = (d.company_name || "").trim() || `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();
        const lat = Number(d.lat);
        const lng = Number(d.lng);
        if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          name,
          type: "Integrador",
          city,
          postalCode,
          country: /portugal/i.test(country) ? "Portugal" : "España",
          lat,
          lng,
          phone: d.phone || undefined,
        };
      })
      .filter(Boolean);

    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error desconocido" });
  }
}
