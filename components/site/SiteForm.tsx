import FormRenderer from "@/components/forms/FormRenderer";
import type { FormDef } from "@/lib/server/forms";

/**
 * Embedded built form (Ali D-401, Phase 2): renders a tenant_forms FormDef inside a page section,
 * brand-aware. Used when a page section has `{ type: "form", formId }` — the AI assistant / Insert
 * picker drops these in. Submissions flow through FormRenderer → /api/leads/submit (store + CRM).
 */
export default function SiteForm({ tenantId, form, heading }: { tenantId: string; form: FormDef; heading?: string }) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-lg">
        {heading ? (
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight"
            style={{ color: "var(--primary, #0f172a)", fontFamily: "var(--font-heading)" }}>{heading}</h2>
        ) : null}
        <FormRenderer tenantId={tenantId} formId={form.id} name={form.name} fields={form.fields} settings={form.settings} embedded />
      </div>
    </section>
  );
}
