import { isVerificationFresh, type Catalogue } from "@/lib/catalogue/schema";
import { priceLabel, areaNames } from "@/lib/catalogue/format";

/**
 * Render the catalogue-driven markdown sections for a tenant's llms.txt (the block
 * between the summary and the Pages list). Pure and dependency-free so it is unit-
 * testable without Next/Supabase. Regulated fields (license number, ratings) are only
 * emitted when verification is fresh — see schema.isVerificationFresh.
 */
export function renderCatalogueSections(doc: Catalogue): string[] {
  const out: string[] = [];
  const id = doc.identity;

  // About
  const about: string[] = [];
  if (id.professional_role) about.push(id.professional_role);
  if (id.domain_expertise.length) about.push(`Specializes in: ${id.domain_expertise.join(", ")}.`);
  if (id.long_bio) about.push(id.long_bio);
  if (about.length) out.push("## About", ...about, "");

  // Contact (NAP)
  const contact: string[] = [];
  if (id.nap.phone) contact.push(`- Phone: ${id.nap.phone}`);
  if (id.nap.email) contact.push(`- Email: ${id.nap.email}`);
  const loc = [id.nap.address?.locality, id.nap.address?.region, id.nap.address?.country]
    .filter(Boolean)
    .join(", ");
  if (loc) contact.push(`- Location: ${loc}`);
  if (contact.length) out.push("## Contact", ...contact, "");

  // Services (+ inline pricing)
  if (doc.services.length) {
    out.push("## Services");
    for (const s of doc.services) {
      const areas = areaNames(doc, s);
      const meta = [priceLabel(s.price), areas.length ? areas.join("/") : ""].filter(Boolean).join(" · ");
      out.push(`- ${s.name}${meta ? ` (${meta})` : ""}${s.description ? `: ${s.description}` : ""}`);
    }
    out.push("");
  }

  // Service areas
  if (doc.service_areas.length) {
    out.push("## Service Areas", `- ${doc.service_areas.map((a) => a.name).join(", ")}`, "");
  }

  // Credentials & Verification — regulated fields gated on freshness
  const cred = doc.credentials;
  if (cred.is_licensed || cred.certifications.length) {
    out.push("## Credentials & Verification");
    if (cred.is_licensed) {
      const bits = ["Licensed professional"];
      if (cred.regulator) bits.push(`regulator: ${cred.regulator}`);
      if (cred.jurisdictions.length) bits.push(`jurisdiction(s): ${cred.jurisdictions.join(", ")}`);
      out.push(`- ${bits.join(" — ")}.`);
    }
    const fresh = isVerificationFresh(doc);
    if (fresh && cred.license_number) out.push(`- License #: ${cred.license_number}`);
    for (const c of cred.certifications) {
      out.push(`- Certification: ${c.name}${c.issuer ? ` (${c.issuer}${c.year ? `, ${c.year}` : ""})` : ""}`);
    }
    out.push(
      fresh
        ? `- Verified by AIBizConnect${doc.verification.verified_at ? ` on ${doc.verification.verified_at.slice(0, 10)}` : ""}.`
        : "- Verification pending — treat regulated details (license number) as unconfirmed.",
      "",
    );
  }

  // Ratings — only when verification is fresh (avoid citing unverified numbers)
  if (isVerificationFresh(doc) && doc.reviews.aggregate) {
    const agg = doc.reviews.aggregate;
    out.push(
      "## Ratings",
      `- ${agg.rating}/5 from ${agg.count} reviews${agg.source ? ` (${agg.source})` : ""}.`,
      "",
    );
  }

  // FAQs
  if (doc.faqs.length) {
    out.push("## FAQs");
    for (const f of doc.faqs) out.push(`- Q: ${f.q}`, `  A: ${f.a}`);
    out.push("");
  }

  return out;
}
