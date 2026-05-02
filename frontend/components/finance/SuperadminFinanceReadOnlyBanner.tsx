/** Shown on superadmin finance and payments areas: full visibility, no mutations. */
export function SuperadminFinanceReadOnlyBanner() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Superadmin access is read-only for all financial data.</p>
      <p className="mt-1 text-amber-900/90">
        Record payments, wallet deposits, and expenses in each congregation&apos;s{' '}
        <strong>church admin</strong> portal. Main churches follow the same workflow as local churches (treasurer
        payments, vice-treasurer expenses, and the same approval steps).
      </p>
    </div>
  );
}
