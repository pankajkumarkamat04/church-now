export type ChurchMemberRef = {
  _id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  surname?: string;
};

export type LocalLeadership = {
  spiritualPastor?: ChurchMemberRef | string | null;
  deacon?: ChurchMemberRef | string | null;
  viceDeacon?: ChurchMemberRef | string | null;
  secretary?: ChurchMemberRef | string | null;
  viceSecretary?: ChurchMemberRef | string | null;
  treasurer?: ChurchMemberRef | string | null;
  committeeMembers?: Array<ChurchMemberRef | string>;
};

export type ChurchCouncilRole = {
  roleKey: string;
  roleLabel?: string;
  member?: ChurchMemberRef | string | null;
};

export type ChurchCouncil = {
  _id?: string;
  name: string;
  roles: ChurchCouncilRole[];
};

export type ChurchRecord = {
  _id: string;
  name: string;
  churchType?: 'MAIN' | 'SUB';
  localLeadership?: LocalLeadership;
  councils?: ChurchCouncil[];
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
