import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import { ChurchSiteNav } from '@/components/church/ChurchSiteNav';
import { ChurchSiteFooter } from '@/components/church/ChurchSiteFooter';

export type PublicSitePayload = {
  church: { name: string; slug: string; city?: string; country?: string };
  site: Record<string, string>;
};

export default async function ChurchSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicGet<PublicSitePayload>(`/api/public/${slug}/site`);
  if (!data) notFound();

  return (
    <div className="church-site">
      <ChurchSiteNav slug={slug} churchName={data.church.name} />
      <main className="church-main">{children}</main>
      <ChurchSiteFooter slug={slug} />
    </div>
  );
}
