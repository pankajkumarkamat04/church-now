export type ChurchRecord = {
  _id: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
};
