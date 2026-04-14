import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ConditionalPublicShell } from '@/components/marketing/ConditionalPublicShell';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Church Management',
  description: 'Multi-church management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-white font-sans text-neutral-900 antialiased"
      >
        <AuthProvider>
          <ConditionalPublicShell>{children}</ConditionalPublicShell>
        </AuthProvider>
      </body>
    </html>
  );
}
