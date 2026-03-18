import type { ServiceType } from "@/types/app.types";

export function buildGoogleMapsUrl(
  serviceType: string,
  zipCode: string
): string {
  const query = encodeURIComponent(`${serviceType} near ${zipCode}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildYelpUrl(serviceType: string, zipCode: string): string {
  const term = encodeURIComponent(serviceType);
  const location = encodeURIComponent(zipCode);
  return `https://www.yelp.com/search?find_desc=${term}&find_loc=${location}`;
}

export function getServiceTypeKeyword(serviceType: ServiceType): string {
  const map: Record<string, string> = {
    HVAC: "HVAC contractor",
    Plumbing: "plumber",
    Electrical: "electrician",
    Landscaping: "landscaping company",
    "Window Cleaning": "window cleaning service",
    "Pest Control": "pest control",
    "Appliance Repair": "appliance repair",
    Roofing: "roofer",
    Gutters: "gutter cleaning",
    Painting: "house painter",
    Moving: "moving company",
    Other: "home service contractor",
  };
  return map[serviceType] ?? serviceType;
}
