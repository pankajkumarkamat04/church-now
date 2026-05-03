import { redirect } from 'next/navigation';

/** Redirect — expense creation uses church admin routes. */
export default function SuperadminCreateExpenseRedirect() {
  redirect('/dashboard/superadmin/finance/expenses');
}
