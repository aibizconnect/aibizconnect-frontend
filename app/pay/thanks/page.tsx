export default function PayThanksPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment received</h1>
        <p className="mt-2 text-slate-500">Thank you — your payment was processed securely by Stripe. A receipt has been emailed to you.</p>
      </div>
    </div>
  );
}
