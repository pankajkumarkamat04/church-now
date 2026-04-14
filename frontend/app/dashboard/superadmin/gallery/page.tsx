import { ChurchContentHub } from '@/components/dashboard/superadmin/ChurchContentHub';

export default function SuperadminGalleryHubPage() {
  return (
    <ChurchContentHub
      moduleLabel="Gallery"
      title="Photo gallery by church"
      description="Manage gallery images shown on each church’s public site."
      actionLabel="Manage gallery"
      manageBasePath="/dashboard/superadmin/gallery"
    />
  );
}
