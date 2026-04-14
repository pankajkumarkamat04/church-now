import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import type { PublicSitePayload } from '../layout';

type GalleryItem = {
  _id: string;
  title?: string;
  imageUrl: string;
  caption?: string;
};

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [siteData, items] = await Promise.all([
    publicGet<PublicSitePayload>(`/api/public/${slug}/site`),
    publicGet<GalleryItem[]>(`/api/public/${slug}/gallery?limit=120`),
  ]);
  if (!siteData) notFound();
  const list = items || [];

  return (
    <div className="church-container church-page">
      <h1 className="church-page-title">Gallery</h1>
      <p className="church-muted church-page-lead">Moments from life at {siteData.church.name}.</p>
      {list.length === 0 ? (
        <p className="church-muted">No gallery images yet.</p>
      ) : (
        <ul className="church-gallery-full">
          {list.map((g) => (
            <li key={g._id}>
              <figure className="church-gallery-full-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.imageUrl} alt={g.title || g.caption || ''} />
                {(g.title || g.caption) ? (
                  <figcaption>
                    {g.title ? <strong>{g.title}</strong> : null}
                    {g.caption ? <span>{g.caption}</span> : null}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
