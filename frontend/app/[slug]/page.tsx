import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import type { PublicSitePayload } from './layout';

type EventItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  startsAt?: string;
  imageUrl?: string;
};

type GalleryItem = {
  _id: string;
  title?: string;
  imageUrl: string;
  caption?: string;
};

export default async function ChurchHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [siteData, events, gallery] = await Promise.all([
    publicGet<PublicSitePayload>(`/api/public/${slug}/site`),
    publicGet<EventItem[]>(`/api/public/${slug}/events?limit=4`),
    publicGet<GalleryItem[]>(`/api/public/${slug}/gallery?limit=6`),
  ]);
  if (!siteData) notFound();

  const s = siteData.site;
  const eventList = events || [];
  const galleryList = gallery || [];

  return (
    <>
      <section className="church-hero">
        {s.heroImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="church-hero-bgimg" src={s.heroImageUrl} alt="" />
            <div className="church-hero-scrim" aria-hidden />
          </>
        ) : null}
        <div className="church-hero-inner">
          <h1>{s.heroTitle || siteData.church.name}</h1>
          {s.heroSubtitle ? <p className="church-hero-sub">{s.heroSubtitle}</p> : null}
          <div className="church-hero-actions">
            <Link className="church-btn church-btn-primary" href={`/${slug}/about`}>
              About us
            </Link>
            <Link className="church-btn church-btn-ghost" href={`/${slug}/contact`}>
              Contact
            </Link>
          </div>
        </div>
      </section>

      <div className="church-container">
        <section className="church-section">
          <div className="church-section-head">
            <h2>{s.miniAboutTitle || 'About us'}</h2>
            <Link href={`/${slug}/about`} className="church-link-all">
              Read more
            </Link>
          </div>
          <div className="church-mini-about">
            {s.miniAboutImageUrl ? (
              <div className="church-mini-about-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.miniAboutImageUrl} alt="" />
              </div>
            ) : null}
            <div className="church-mini-about-text">
              <p>{s.miniAboutText || 'Welcome to our church community.'}</p>
            </div>
          </div>
        </section>

        <section className="church-section">
          <div className="church-section-head">
            <h2>Upcoming &amp; recent events</h2>
            <Link href={`/${slug}/events`} className="church-link-all">
              View all events
            </Link>
          </div>
          {eventList.length === 0 ? (
            <p className="church-muted">Events will appear here when your admin adds them.</p>
          ) : (
            <ul className="church-event-grid">
              {eventList.map((ev) => (
                <li key={ev._id} className="church-event-card">
                  <Link href={`/${slug}/events/${ev.slug}`}>
                    {ev.imageUrl ? (
                      <div className="church-event-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ev.imageUrl} alt="" />
                      </div>
                    ) : null}
                    <div className="church-event-body">
                      <h3>{ev.title}</h3>
                      {ev.excerpt ? <p>{ev.excerpt}</p> : null}
                      {ev.startsAt ? (
                        <time className="church-muted">
                          {new Date(ev.startsAt).toLocaleString()}
                        </time>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="church-section church-section-last">
          <div className="church-section-head">
            <h2>Gallery</h2>
            <Link href={`/${slug}/gallery`} className="church-link-all">
              Full gallery
            </Link>
          </div>
          {galleryList.length === 0 ? (
            <p className="church-muted">Photos will appear here when your admin adds them.</p>
          ) : (
            <ul className="church-gallery-preview">
              {galleryList.map((g) => (
                <li key={g._id}>
                  <Link href={`/${slug}/gallery`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.imageUrl} alt={g.title || g.caption || 'Gallery'} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
