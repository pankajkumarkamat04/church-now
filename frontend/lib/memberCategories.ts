/** Mirrors backend `MEMBER_CATEGORIES` on User — classification only; does not grant ADMIN. */
export const MEMBER_CATEGORIES = [
  'MEMBER',
  'PRESIDENT',
  'MODERATOR',
  'PASTOR',
  'CYF_PRESIDENT',
  'CYF_TREASURER',
  'CHAIRPERSON',
] as const;

export type MemberCategory = (typeof MEMBER_CATEGORIES)[number];

export const MEMBER_CATEGORY_OPTIONS: { value: MemberCategory; label: string }[] = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'PRESIDENT', label: 'President' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'PASTOR', label: 'Pastor' },
  { value: 'CYF_PRESIDENT', label: 'CYF President' },
  { value: 'CYF_TREASURER', label: 'CYF Treasurer' },
  { value: 'CHAIRPERSON', label: 'Chairperson' },
];
