// Seed the Platform tenant's CRM taxonomy (Ali): a cross-industry TAG registry +
// CUSTOM FIELDS covering every vertical AIBizConnect targets (real estate, mortgage,
// legal, insurance, coaching/consulting, agencies/B2B) plus generic lifecycle/source/
// engagement. Idempotent: existing names/keys are never overwritten (fill-missing only).
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7"; // AIBizConnect Platform — THE tenant

// ---- TAGS (grouped; color per group for visual scanning) ----
const C = {
  lifecycle: "#1e3a8a", hot: "#dc2626", warm: "#f59e0b", cold: "#64748b",
  source: "#7c3aed", realestate: "#059669", mortgage: "#0d9488", legal: "#334155",
  insurance: "#0284c7", coaching: "#db2777", b2b: "#4f46e5", engage: "#d97706", guard: "#b91c1c",
};
const TAGS: Array<[string, string]> = [
  // Lifecycle
  ["Lead", C.lifecycle], ["Prospect", C.lifecycle], ["Client", C.lifecycle], ["Past Client", C.lifecycle],
  ["VIP", C.lifecycle], ["Referral", C.lifecycle], ["Referral Partner", C.lifecycle], ["Partner", C.lifecycle], ["Vendor", C.lifecycle],
  ["Hot Lead", C.hot], ["Warm Lead", C.warm], ["Cold Lead", C.cold],
  // Compliance guards
  ["Do Not Contact", C.guard], ["Unsubscribed", C.guard], ["Bounced Email", C.guard],
  // Sources
  ["Website Lead", C.source], ["Facebook Lead", C.source], ["Instagram Lead", C.source], ["Google Ads Lead", C.source],
  ["LinkedIn Lead", C.source], ["YouTube Lead", C.source], ["Event Lead", C.source], ["Walk-In", C.source],
  ["Cold Call", C.source], ["Imported", C.source], ["Newsletter Subscriber", C.source],
  // Real estate
  ["Buyer", C.realestate], ["Seller", C.realestate], ["First-Time Buyer", C.realestate], ["Investor", C.realestate],
  ["Renter", C.realestate], ["Landlord", C.realestate], ["Pre-Approved", C.realestate], ["Open House Lead", C.realestate],
  ["Listing Lead", C.realestate], ["Downsizing", C.realestate], ["Relocation", C.realestate], ["FSBO", C.realestate],
  ["Expired Listing", C.realestate], ["Past Buyer", C.realestate], ["Past Seller", C.realestate],
  // Mortgage / finance
  ["Mortgage Lead", C.mortgage], ["Mortgage Renewal", C.mortgage], ["Mortgage Refinance", C.mortgage],
  ["Pre-Approval Requested", C.mortgage], ["First Mortgage", C.mortgage], ["HELOC", C.mortgage],
  ["Private Lending", C.mortgage], ["Commercial Mortgage", C.mortgage], ["Debt Consolidation", C.mortgage],
  // Legal
  ["Family Law", C.legal], ["Real Estate Law", C.legal], ["Wills & Estates", C.legal], ["Corporate Law", C.legal],
  ["Litigation", C.legal], ["Immigration", C.legal], ["Notary", C.legal], ["Active Matter", C.legal], ["Closed Matter", C.legal],
  // Insurance
  ["Life Insurance", C.insurance], ["Home Insurance", C.insurance], ["Auto Insurance", C.insurance],
  ["Commercial Insurance", C.insurance], ["Travel Insurance", C.insurance], ["Group Benefits", C.insurance],
  ["Policy Renewal", C.insurance], ["Claim In Progress", C.insurance],
  // Coaching / consulting / education
  ["Discovery Call", C.coaching], ["Webinar Lead", C.coaching], ["Workshop Attendee", C.coaching],
  ["Course Student", C.coaching], ["Group Program", C.coaching], ["1-on-1 Client", C.coaching], ["Alumni", C.coaching],
  // Agencies / B2B
  ["SMB", C.b2b], ["Enterprise", C.b2b], ["Startup", C.b2b], ["Nonprofit", C.b2b],
  ["E-Commerce", C.b2b], ["SaaS", C.b2b], ["Local Business", C.b2b], ["Franchise", C.b2b],
  // Engagement
  ["Booked Appointment", C.engage], ["No-Show", C.engage], ["Follow Up", C.engage], ["Nurture", C.engage],
  ["Re-Engage", C.engage], ["Proposal Sent", C.engage], ["Contract Sent", C.engage],
  ["Left Review", C.engage], ["Testimonial Given", C.engage], ["Gift Sent", C.engage],
];

// ---- CUSTOM FIELDS ----
type FT = "text" | "textarea" | "number" | "date" | "dropdown" | "checkbox" | "phone" | "email" | "url";
interface CF { object: "contact" | "opportunity"; name: string; key: string; type: FT; options?: string[] }
const FIELDS: CF[] = [
  // General (every industry)
  { object: "contact", name: "Birthday", key: "birthday", type: "date" },
  { object: "contact", name: "Preferred Contact Method", key: "preferred_contact_method", type: "dropdown", options: ["Phone", "Email", "SMS", "WhatsApp"] },
  { object: "contact", name: "Preferred Language", key: "preferred_language", type: "dropdown", options: ["English", "French", "Spanish", "Mandarin", "Farsi", "Other"] },
  { object: "contact", name: "Referral Source", key: "referral_source", type: "text" },
  { object: "contact", name: "Spouse / Partner Name", key: "spouse_partner_name", type: "text" },
  { object: "contact", name: "Email Consent", key: "email_consent", type: "checkbox" },
  { object: "contact", name: "SMS Consent", key: "sms_consent", type: "checkbox" },
  { object: "contact", name: "Budget", key: "budget", type: "number" },
  { object: "contact", name: "Notes / Goals", key: "notes_goals", type: "textarea" },
  // Real estate
  { object: "contact", name: "Property Type", key: "property_type", type: "dropdown", options: ["Detached", "Semi-Detached", "Townhouse", "Condo", "Multi-Family", "Commercial", "Land"] },
  { object: "contact", name: "Bedrooms", key: "bedrooms", type: "number" },
  { object: "contact", name: "Bathrooms", key: "bathrooms", type: "number" },
  { object: "contact", name: "Price Range (Min)", key: "price_range_min", type: "number" },
  { object: "contact", name: "Price Range (Max)", key: "price_range_max", type: "number" },
  { object: "contact", name: "Move-In Timeline", key: "move_in_timeline", type: "dropdown", options: ["0–3 months", "3–6 months", "6–12 months", "12+ months"] },
  { object: "contact", name: "Current Home Status", key: "current_home_status", type: "dropdown", options: ["Owns", "Rents", "Living with family"] },
  { object: "contact", name: "Areas of Interest", key: "areas_of_interest", type: "text" },
  { object: "contact", name: "Property Address", key: "property_address", type: "text" },
  { object: "contact", name: "Closing Date", key: "closing_date", type: "date" },
  // Mortgage / finance
  { object: "contact", name: "Mortgage Renewal Date", key: "mortgage_renewal_date", type: "date" },
  { object: "contact", name: "Current Lender", key: "current_lender", type: "text" },
  { object: "contact", name: "Mortgage Balance", key: "mortgage_balance", type: "number" },
  { object: "contact", name: "Interest Rate (%)", key: "interest_rate", type: "number" },
  { object: "contact", name: "Down Payment", key: "down_payment", type: "number" },
  { object: "contact", name: "Credit Score Range", key: "credit_score_range", type: "dropdown", options: ["Excellent (760+)", "Very Good (725–759)", "Good (660–724)", "Fair (560–659)", "Building (<560)"] },
  // Insurance
  { object: "contact", name: "Policy Renewal Date", key: "policy_renewal_date", type: "date" },
  { object: "contact", name: "Policy Number", key: "policy_number", type: "text" },
  { object: "contact", name: "Current Provider", key: "current_provider", type: "text" },
  { object: "contact", name: "Coverage Amount", key: "coverage_amount", type: "number" },
  // Legal
  { object: "contact", name: "Matter Type", key: "matter_type", type: "dropdown", options: ["Family", "Real Estate", "Wills & Estates", "Corporate", "Litigation", "Immigration", "Other"] },
  { object: "contact", name: "Court / Hearing Date", key: "court_hearing_date", type: "date" },
  { object: "contact", name: "File Number", key: "file_number", type: "text" },
  // Coaching / consulting
  { object: "contact", name: "Program / Package", key: "program_package", type: "text" },
  { object: "contact", name: "Program Start Date", key: "program_start_date", type: "date" },
  // B2B / agencies
  { object: "contact", name: "Industry", key: "industry", type: "dropdown", options: ["Real Estate", "Mortgage / Finance", "Legal", "Insurance", "Coaching / Consulting", "Agency", "Healthcare", "Home Services", "Retail / E-Commerce", "Other"] },
  { object: "contact", name: "Company Size", key: "company_size", type: "dropdown", options: ["Solo", "2–10", "11–50", "51–200", "200+"] },
  { object: "contact", name: "Company Website", key: "company_website", type: "url" },
  { object: "contact", name: "Annual Revenue", key: "annual_revenue", type: "dropdown", options: ["< $100K", "$100K–$500K", "$500K–$1M", "$1M–$5M", "$5M+"] },
  // Opportunity-level
  { object: "opportunity", name: "Expected Close Date", key: "expected_close_date", type: "date" },
  { object: "opportunity", name: "Deal Type", key: "deal_type", type: "dropdown", options: ["New Business", "Renewal", "Upsell", "Referral"] },
  { object: "opportunity", name: "Commission (%)", key: "commission_pct", type: "number" },
  { object: "opportunity", name: "Lost Reason", key: "lost_reason", type: "dropdown", options: ["Price", "Timing", "Chose Competitor", "No Response", "Not Qualified", "Other"] },
];

(async () => {
  const sb = createSupabaseServiceClient();

  // Tags — fill-missing by lower(name).
  const { data: existingTags } = await sb.from("tenant_tags").select("name").eq("tenant_id", TENANT);
  const have = new Set((existingTags ?? []).map((t: any) => String(t.name).toLowerCase()));
  const newTags = TAGS.filter(([n]) => !have.has(n.toLowerCase())).map(([name, color]) => ({ tenant_id: TENANT, name, color }));
  if (newTags.length) {
    const { error } = await sb.from("tenant_tags").insert(newTags);
    if (error) { console.error("tags:", error.message); process.exit(1); }
  }
  console.log(`tags: ${newTags.length} created, ${have.size} already existed, ${TAGS.length} in taxonomy`);

  // Custom fields — fill-missing by (object_type, lower(field_key)); position appends after existing.
  const { data: existingCf } = await sb.from("tenant_custom_fields").select("object_type, field_key, position").eq("tenant_id", TENANT);
  const haveCf = new Set((existingCf ?? []).map((f: any) => `${f.object_type}:${String(f.field_key).toLowerCase()}`));
  let pos = Math.max(0, ...((existingCf ?? []).map((f: any) => f.position ?? 0))) + 1;
  const newCf = FIELDS.filter((f) => !haveCf.has(`${f.object}:${f.key}`)).map((f) => ({
    tenant_id: TENANT, object_type: f.object, name: f.name, field_key: f.key,
    field_type: f.type, options: f.options ?? [], required: false, position: pos++,
  }));
  if (newCf.length) {
    const { error } = await sb.from("tenant_custom_fields").insert(newCf);
    if (error) { console.error("fields:", error.message); process.exit(1); }
  }
  console.log(`custom fields: ${newCf.length} created, ${haveCf.size} already existed, ${FIELDS.length} in taxonomy`);

  const { count: tagCount } = await sb.from("tenant_tags").select("*", { count: "exact", head: true }).eq("tenant_id", TENANT);
  const { count: cfCount } = await sb.from("tenant_custom_fields").select("*", { count: "exact", head: true }).eq("tenant_id", TENANT);
  console.log(`now live: ${tagCount} tags, ${cfCount} custom fields`);
})();
