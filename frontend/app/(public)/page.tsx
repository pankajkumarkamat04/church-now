import Link from 'next/link';
import { ArrowRight, Calendar, Heart, Users } from 'lucide-react';
import { publicGet } from '@/lib/publicApi';

type GlobalPublicSitePayload = {
  site: Record<string, string | undefined>;
};

const FALLBACK_HERO_TITLE = 'A simple home for your church online';
const FALLBACK_HERO_SUB =
  'One place for your website, events, photo gallery, and member portal—without the clutter.';
const FALLBACK_ABOUT_TITLE = 'About';
const FALLBACK_ABOUT_TEXT =
  'Church OS helps you share who you are, what you do, and when you meet. Leaders manage content; members see a clear profile and church details—nothing flashy, just what you need.';

type PublicHomepageEvent = {
  _id: string;
  title: string;
  excerpt?: string;
  startsAt?: string;
  church?: { name?: string; slug?: string };
};

type PublicHomepageGalleryItem = {
  _id: string;
  title?: string;
  imageUrl: string;
  caption?: string;
  church?: { name?: string; slug?: string };
};

export default async function HomePage() {
  const [data, eventsData, galleryData] = await Promise.all([
    publicGet<GlobalPublicSitePayload>('/api/public/site'),
    publicGet<PublicHomepageEvent[]>('/api/public/events?home=1&limit=6'),
    publicGet<PublicHomepageGalleryItem[]>('/api/public/gallery?home=1&limit=9'),
  ]);
  const s = data?.site ?? {};
  const events = eventsData ?? [];
  const galleryImages = galleryData ?? [];

  const heroTitle = (s.heroTitle && s.heroTitle.trim()) || FALLBACK_HERO_TITLE;
  const heroSubtitle = (s.heroSubtitle && s.heroSubtitle.trim()) || FALLBACK_HERO_SUB;
  const heroImageUrl = (s.heroImageUrl && s.heroImageUrl.trim()) || '';
  const aboutTitle = (s.miniAboutTitle && s.miniAboutTitle.trim()) || FALLBACK_ABOUT_TITLE;
  const aboutText = (s.miniAboutText && s.miniAboutText.trim()) || FALLBACK_ABOUT_TEXT;
  const aboutImageUrl = (s.miniAboutImageUrl && s.miniAboutImageUrl.trim()) || '';
  const aboutBoxes = [
    {
      icon: Heart,
      title: (s.aboutBox1Title && s.aboutBox1Title.trim()) || 'Plain and clear',
      text: (s.aboutBox1Text && s.aboutBox1Text.trim()) || 'Interfaces that stay out of the way.',
    },
    {
      icon: Users,
      title: (s.aboutBox2Title && s.aboutBox2Title.trim()) || 'Roles that fit',
      text: (s.aboutBox2Text && s.aboutBox2Text.trim()) || 'Superadmin, church admin, and member views.',
    },
    {
      icon: Calendar,
      title: (s.aboutBox3Title && s.aboutBox3Title.trim()) || 'Life together',
      text: (s.aboutBox3Text && s.aboutBox3Text.trim()) || 'Events and photos tell your story.',
    },
  ];

  return (
    <main className="bg-white">
      <section
        className="relative overflow-hidden border-b border-neutral-200"
        aria-labelledby="hero-heading"
      >
        {heroImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={heroImageUrl}
              alt=""
            />
            <div className="absolute inset-0 bg-neutral-900/55" aria-hidden />
          </>
        ) : null}
        <div
          className={`relative px-4 py-16 sm:px-6 sm:py-20 ${heroImageUrl ? 'text-white' : ''}`}
        >
          <div className="mx-auto max-w-5xl text-center">
            <h1
              id="hero-heading"
              className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
            >
              {heroTitle}
            </h1>
            <p
              className={`mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg ${
                heroImageUrl ? 'text-white/90' : 'text-neutral-600'
              }`}
            >
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium sm:w-auto ${
                  heroImageUrl
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#about"
                className={`inline-flex w-full items-center justify-center rounded-md border px-6 py-3 text-sm font-medium sm:w-auto ${
                  heroImageUrl
                    ? 'border-white/40 bg-white/10 text-white hover:bg-white/15'
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="scroll-mt-20 bg-neutral-50 px-4 py-16 sm:px-6 sm:py-20"
        aria-labelledby="about-heading"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
            {aboutImageUrl ? (
              <div className="shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white lg:w-2/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aboutImageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2
                id="about-heading"
                className="text-2xl font-semibold text-neutral-900 sm:text-3xl"
              >
                {aboutTitle}
              </h2>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-neutral-600">{aboutText}</p>
            </div>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {aboutBoxes.map((item) => (
              <li
                key={item.title}
                className="rounded-lg border border-neutral-200 bg-white p-5"
              >
                <item.icon className="size-5 text-neutral-700" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="events"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
        aria-labelledby="events-heading"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="events-heading"
                className="text-2xl font-semibold text-neutral-900 sm:text-3xl"
              >
                Events
              </h2>
              <p className="mt-2 max-w-xl text-neutral-600">
                Featured events across churches.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
            >
              Manage events
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {events.map((ev) => (
              <article key={ev._id} className="rounded-lg border border-neutral-200 bg-white p-5">
                <Calendar className="size-5 text-neutral-600" aria-hidden />
                <h3 className="mt-3 text-base font-semibold text-neutral-900">{ev.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {ev.startsAt ? new Date(ev.startsAt).toLocaleString() : 'Date TBA'}
                </p>
                {ev.church?.name ? <p className="mt-1 text-xs text-neutral-500">{ev.church.name}</p> : null}
                <p className="mt-2 text-sm text-neutral-600">{ev.excerpt || 'Event details available on church page.'}</p>
              </article>
            ))}
          </div>
          {events.length === 0 ? <p className="mt-8 text-sm text-neutral-500">No featured events yet.</p> : null}
        </div>
      </section>

      <section
        id="gallery"
        className="scroll-mt-20 border-t border-neutral-200 bg-neutral-50 px-4 py-16 sm:px-6 sm:py-20"
        aria-labelledby="gallery-heading"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2
              id="gallery-heading"
              className="text-2xl font-semibold text-neutral-900 sm:text-3xl"
            >
              Gallery
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-neutral-600">
              Featured gallery photos from churches.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {galleryImages.map((img) => (
              <div
                key={img._id}
                className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.title || img.caption || 'Gallery'}
                  className="aspect-square w-full object-cover"
                />
              </div>
            ))}
          </div>
          {galleryImages.length === 0 ? (
            <p className="mt-8 text-center text-sm text-neutral-500">No featured photos yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
