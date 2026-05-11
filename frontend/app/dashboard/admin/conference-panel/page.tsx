import { redirect } from 'next/navigation';

export default function LegacyAdminConferencePanelRedirect() {
  redirect('/dashboard/conference-leader');
}
