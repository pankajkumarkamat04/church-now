import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className="min-h-screen w-full min-w-0 overflow-x-clip bg-white font-sans text-neutral-900 antialiased"
      >
        <SystemSettingsProvider>
          <AuthProvider>{children}</AuthProvider>
        </SystemSettingsProvider>
      </body>
    </html>
  );
}
