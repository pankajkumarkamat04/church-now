import { redirect } from 'next/navigation';

/** Expense creation is done in church admin (same flow for main and local congregations). */
export default function SuperadminCreateExpenseRedirect() {
  redirect('/dashboard/superadmin/finance/expenses');
}
