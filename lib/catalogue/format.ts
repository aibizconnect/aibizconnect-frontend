import type { Catalogue, CatalogueService } from "@/lib/catalogue/schema";

/** Human-readable price label for a service, e.g. "Free", "Commission-based", "$120 CAD/hr". */
export function priceLabel(price: CatalogueService["price"]): string {
  const cur = price.currency || "CAD";
  switch (price.model) {
    case "free":
      return "Free";
    case "commission":
      return "Commission-based";
    case "quote":
      return "Price on request";
    case "hourly":
      return price.amount != null ? `$${price.amount} ${cur}/hr` : "Hourly rate";
    case "fixed":
      return price.amount != null ? `$${price.amount} ${cur}` : "Fixed price";
    default:
      return "Price on request";
  }
}

/** Map service area ids to their display names for a given service. */
export function areaNames(doc: Catalogue, service: CatalogueService): string[] {
  return service.area_ids
    .map((id) => doc.service_areas.find((a) => a.id === id)?.name)
    .filter((n): n is string => !!n);
}
