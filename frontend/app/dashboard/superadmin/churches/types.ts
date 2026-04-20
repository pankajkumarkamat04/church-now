export type ChurchRecord = {
  _id: string;
  name: string;
  churchType?: 'MAIN' | 'SUB';
  conference?:
    | string
    | {
        _id: string;
        name?: string;
        conferenceId?: string;
      }
    | null;
  mainChurch?:
    | string
    | {
        _id: string;
        name?: string;
      }
    | null;
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
};
