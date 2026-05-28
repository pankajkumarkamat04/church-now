export const LOCAL_ROLE_LABELS: Record<string, string> = {
  churchPresident: 'Church president (minister)',
  vicePresident: 'Vice president (minister)',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  superintendent: 'Superintendent (minister)',
  viceSuperintendent: 'Vice superintendent (minister)',
  conferenceMinister1: 'Conference minister 1',
  conferenceMinister2: 'Conference minister 2',
  minister: 'Minister',
  deacon: 'Deacon (elected)',
  viceDeacon: 'Vice deacon',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
};

export const MAIN_LEADERSHIP_KEYS = [
  'churchPresident',
  'vicePresident',
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
  'minister',
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
] as const;

export const SUB_LEADERSHIP_KEYS = [
  'deacon',
  'viceDeacon',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
] as const;

export const MAIN_PASTOR_ONLY_KEYS = new Set<string>([
  'churchPresident',
  'vicePresident',
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
  'minister',
]);

export const LOCAL_SINGLE_KEYS = [...MAIN_LEADERSHIP_KEYS, ...SUB_LEADERSHIP_KEYS] as const;

export function poolForLeadershipRoleKey(key: string): 'pastors' | 'lay' {
  return MAIN_PASTOR_ONLY_KEYS.has(key) ? 'pastors' : 'lay';
}
