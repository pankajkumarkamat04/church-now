import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import type { PublicSitePayload } from '../layout';

type EventItem = {
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

export default async function EventsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [siteData, events] = await Promise.all([
    publicGet<PublicSitePayload>(`/api/public/${slug}/site`),
    publicGet<EventItem[]>(`/api/public/${slug}/events?limit=100`),
  ]);
  if (!siteData) notFound();
  const list = events || [];

  return (
    <div className="church-container church-page">
      <h1 className="church-page-title">Events</h1>
      <p className="church-muted church-page-lead">
        All public events at {siteData.church.name}.
      </p>
      {list.length === 0 ? (
        <p className="church-muted">No events published yet.</p>
      ) : (
        <ul className="church-events-full">
          {list.map((ev) => (
            <li key={ev._id} className="church-events-full-item">
              <Link href={`/${slug}/events/${ev.slug}`} className="church-events-full-link">
                {ev.imageUrl ? (
                  <div className="church-event-thumb church-event-thumb-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.imageUrl} alt="" />
                  </div>
                ) : null}
                <div>
                  <h2>{ev.title}</h2>
                  {ev.excerpt ? <p>{ev.excerpt}</p> : null}
                  <div className="church-event-meta">
                    {ev.startsAt ? (
                      <time>{new Date(ev.startsAt).toLocaleString()}</time>
                    ) : null}
                    {ev.location ? <span>{ev.location}</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
