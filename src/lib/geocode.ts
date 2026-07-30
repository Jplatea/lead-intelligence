export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

// Free OpenStreetMap Nominatim search - no API key required. Keep usage light
// (only on explicit user action, never as-you-type) per their usage policy.
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!res.ok) throw new Error("No se pudo buscar la dirección");
  const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    displayName: d.display_name,
  }));
}
