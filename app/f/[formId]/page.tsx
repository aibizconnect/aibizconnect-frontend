import FormRenderer from "@/components/forms/FormRenderer";
import { getFormPublic } from "@/lib/server/forms";

/** Public hosted form (D-312): /f/[formId]. Renders the form; submissions flow through
 *  /api/leads/submit (store + CRM contact). Archived forms are hidden. */
export default async function HostedFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const res = await getFormPublic(formId).catch(() => null);

  if (!res || res.form.status === "archived") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div><h1 className="text-xl font-semibold text-slate-800">Form not available</h1><p className="mt-1 text-sm text-slate-500">This form may have been unpublished or removed.</p></div>
      </div>
    );
  }
  const { tenantId, form } = res;
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{form.name}</h1>
        <p className="mb-6 text-sm text-slate-500">Fill out the form below and we'll get back to you.</p>
        <FormRenderer tenantId={tenantId} formId={form.id} name={form.name} fields={form.fields} settings={form.settings} />
        <p className="mt-6 text-center text-xs text-slate-400">Powered by AIBizConnect</p>
      </div>
    </div>
  );
}
