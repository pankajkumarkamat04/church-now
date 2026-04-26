export type ChurchMemberRef = {
  _id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  surname?: string;
};

export type LocalLeadership = {
  spiritualPastor?: ChurchMemberRef | string | null;
  churchPresident?: ChurchMemberRef | string | null;
  vicePresident?: ChurchMemberRef | string | null;
  moderator?: ChurchMemberRef | string | null;
  viceModerator?: ChurchMemberRef | string | null;
  superintendent?: ChurchMemberRef | string | null;
  viceSuperintendent?: ChurchMemberRef | string | null;
  conferenceMinister1?: ChurchMemberRef | string | null;
  conferenceMinister2?: ChurchMemberRef | string | null;
  minister?: ChurchMemberRef | string | null;
  deacon?: ChurchMemberRef | string | null;
  viceDeacon?: ChurchMemberRef | string | null;
  secretary?: ChurchMemberRef | string | null;
  viceSecretary?: ChurchMemberRef | string | null;
  treasurer?: ChurchMemberRef | string | null;
  viceTreasurer?: ChurchMemberRef | string | null;
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

export type ServiceCouncil = {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type ChurchRecord = {
  _id: string;
  name: string;
  churchType?: 'MAIN' | 'SUB';
  localLeadership?: LocalLeadership;
  councils?: ChurchCouncil[];
  serviceCouncils?: ServiceCouncil[];
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
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
};
