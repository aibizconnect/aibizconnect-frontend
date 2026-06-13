export default function PayCancelledPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment cancelled</h1>
        <p className="mt-2 text-slate-500">No charge was made. You can return to the invoice link any time to complete your payment.</p>
      </div>
    </div>
  );
}
