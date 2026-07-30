export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  province?: string;
  country?: string;
  postcode?: string;
}

// Free OpenStreetMap Nominatim search - no API key required. Keep usage light
// (only on explicit user action, never as-you-type) per their usage policy.
// addressdetails=1 lets us derive city/province/country/postalCode from a
// single free-text address instead of asking for them as separate fields.
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!res.ok) throw new Error("No se pudo buscar la dirección");
  const data: Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: NominatimAddress;
  }> = await res.json();
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    displayName: d.display_name,
    city: d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.municipality,
    province: d.address?.state ?? d.address?.province,
    country: d.address?.country,
    postalCode: d.address?.postcode,
  }));
}
