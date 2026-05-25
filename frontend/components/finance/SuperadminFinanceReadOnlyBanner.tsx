/** Shown on superadmin finance and payments areas: full visibility, no mutations. */
export function SuperadminFinanceReadOnlyBanner() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Superadmin finance and payments are read-only.</p>
      <p className="mt-1 text-amber-900/90">
        Church remittances are recorded by each church group (admin portal). You can view totals and history here only.
      </p>
    </div>
  );
}
