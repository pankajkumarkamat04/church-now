import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import type { PublicSitePayload } from '../../layout';

type EventDetail = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  imageUrl?: string;
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
}) {
  const { slug, eventSlug } = await params;
  const [siteData, ev] = await Promise.all([
    publicGet<PublicSitePayload>(`/api/public/${slug}/site`),
    publicGet<EventDetail>(`/api/public/${slug}/events/${eventSlug}`),
  ]);
  if (!siteData || !ev) notFound();

  return (
    <article className="church-container church-page church-article">
      <p className="church-back">
        <Link href={`/${slug}/events`}>← All events</Link>
      </p>
      {ev.imageUrl ? (
        <div className="church-article-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.imageUrl} alt="" />
        </div>
      ) : null}
      <h1 className="church-page-title">{ev.title}</h1>
      <div className="church-event-meta church-event-meta-block">
        {ev.startsAt ? <time>{new Date(ev.startsAt).toLocaleString()}</time> : null}
        {ev.endsAt ? (
          <time> — {new Date(ev.endsAt).toLocaleString()}</time>
        ) : null}
        {ev.location ? <span className="church-event-location">{ev.location}</span> : null}
      </div>
      {ev.excerpt ? <p className="church-article-excerpt">{ev.excerpt}</p> : null}
      {ev.description ? (
        <div className="church-prose">
          {ev.description.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para.trim()}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}
