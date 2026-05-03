/** Shown on superadmin finance and payments areas: full visibility, no mutations. */
export function SuperadminFinanceReadOnlyBanner() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Superadmin finance and payments are read-only.</p>
    </div>
  );
}
