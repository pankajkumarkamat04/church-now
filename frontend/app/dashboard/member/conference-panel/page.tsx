import { redirect } from 'next/navigation';

export default function LegacyMemberConferencePanelRedirect() {
  redirect('/dashboard/conference-leader');
}
