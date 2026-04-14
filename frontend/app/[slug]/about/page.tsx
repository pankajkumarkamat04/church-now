import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import { AboutBody } from '@/components/church/AboutBody';
import type { PublicSitePayload } from '../layout';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicGet<PublicSitePayload>(`/api/public/${slug}/site`);
  if (!data) notFound();
  const title = data.site.aboutPageTitle || 'About us';
  const body = data.site.aboutPageBody || '';

  return (
    <div className="church-container church-page">
      <h1 className="church-page-title">{title}</h1>
      <AboutBody text={body} />
    </div>
  );
}
