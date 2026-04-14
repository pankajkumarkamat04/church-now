export type SuperadminSiteContentFields = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  miniAboutTitle?: string;
  miniAboutText?: string;
  miniAboutImageUrl?: string;
  aboutBox1Title?: string;
  aboutBox1Text?: string;
  aboutBox2Title?: string;
  aboutBox2Text?: string;
  aboutBox3Title?: string;
  aboutBox3Text?: string;
  aboutPageTitle?: string;
  aboutPageBody?: string;
  contactHeading?: string;
  contactIntro?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
};

/** Platform-wide frontend copy from API */
export type SuperadminFrontendSiteRecord = SuperadminSiteContentFields & {
  _id: string;
  key?: string;
};

export type SuperadminFrontendSitePayload = {
  site: SuperadminFrontendSiteRecord;
};

export type SuperadminEventRecord = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string;
  imageUrl?: string;
  published?: boolean;
  featuredOnHome?: boolean;
};

export type SuperadminGalleryRecord = {
  _id: string;
  title?: string;
  imageUrl: string;
  caption?: string;
  sortOrder?: number;
  published?: boolean;
  showOnHome?: boolean;
};
