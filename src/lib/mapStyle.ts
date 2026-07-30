// Custom Google Maps style so the base map blends into the dashboard's flat
// cream/teal palette instead of looking like a generic embedded Google Map:
// POI icons, transit, and most road clutter are hidden, water/land are tinted
// to match --color-surface and the mint accent, and labels are toned down.
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f9f3ec" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a39a8c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f9f3ec" }, { weight: 3 }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#c9beae" }, { weight: 1 }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text", stylers: [{ visibility: "simplified" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f9f3ec" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#efe7da" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8dcc8" }] },
  { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dde6e1" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export const IBERIA_CENTER = { lat: 40.0, lng: -3.8 };
export const IBERIA_DEFAULT_ZOOM = 6;
export const IBERIA_BOUNDS = { north: 44.2, south: 35.5, west: -10.2, east: 4.8 };
