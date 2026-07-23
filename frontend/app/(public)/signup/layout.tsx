import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Member registration',
  description: 'Register for UCCZ Connect membership',
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
