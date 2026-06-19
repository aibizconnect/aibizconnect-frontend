import type { MetadataRoute } from "next";
import { INDUSTRY_SLUGS } from "@/lib/marketing/industries";

/** Sitemap for the public marketing site (aibizconnect.app). */
const SITE = "https://aibizconnect.app";

const STATIC = [
  "", "/product", "/pricing", "/solutions", "/crm", "/ai-builder", "/websites-funnels",
  "/automations", "/consumer-portal", "/marketplace", "/templates", "/about", "/contact",
  "/resources", "/blog", "/guides", "/webinars", "/start",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [...STATIC, ...INDUSTRY_SLUGS.map((s) => `/solutions/${s}`)];
  return routes.map((r) => ({
    url: `${SITE}${r}`,
    lastModified,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : r === "/pricing" || r === "/product" ? 0.9 : 0.7,
  }));
}
