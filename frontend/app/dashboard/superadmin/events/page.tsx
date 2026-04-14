import { ChurchContentHub } from '@/components/dashboard/superadmin/ChurchContentHub';

export default function SuperadminEventsHubPage() {
  return (
    <ChurchContentHub
      moduleLabel="Events"
      title="Events by church"
      description="Manage event listings for any congregation."
      actionLabel="Manage events"
      manageBasePath="/dashboard/superadmin/events"
    />
  );
}
