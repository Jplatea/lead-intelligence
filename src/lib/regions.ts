// The `province` field is mixed-granularity in the underlying data — some
// records store the actual province, others already store the autonomous
// community, and Portuguese records store a district. This normalizes all of
// them to a single "comunidad autónoma" bucket for filtering/grouping.
const REGION_BY_PROVINCE: Record<string, string> = {
  Madrid: "Comunidad de Madrid",
  "Comunidad de Madrid": "Comunidad de Madrid",
  Toledo: "Castilla-La Mancha",
  Valencia: "Comunitat Valenciana",
  Alicante: "Comunitat Valenciana",
  "Comunitat Valenciana": "Comunitat Valenciana",
  Sevilla: "Andalucía",
  Málaga: "Andalucía",
  Granada: "Andalucía",
  Córdoba: "Andalucía",
  Andalucía: "Andalucía",
  Barcelona: "Catalunya",
  Girona: "Catalunya",
  Catalunya: "Catalunya",
  Vizcaya: "Euskadi",
  Gipuzkoa: "Euskadi",
  Euskadi: "Euskadi",
  Zaragoza: "Aragón",
  Murcia: "Región de Murcia",
  "Región de Murcia": "Región de Murcia",
  Pontevedra: "Galicia",
  "A Coruña": "Galicia",
  Galicia: "Galicia",
  "Illes Balears": "Illes Balears",
  Valladolid: "Castilla y León",
  "Sin especificar": "Sin especificar",
  Lisboa: "Portugal",
  Porto: "Portugal",
  Coimbra: "Portugal",
  Braga: "Portugal",
  Faro: "Portugal",
};

export function regionOf(province: string): string {
  return REGION_BY_PROVINCE[province] ?? province;
}
