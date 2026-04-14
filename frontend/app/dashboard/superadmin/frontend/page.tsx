'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SuperadminFrontendSitePayload, SuperadminSiteContentFields } from '@/lib/superadminContentTypes';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

const textarea = `${field} min-h-[100px] font-mono text-xs`;

export default function SuperadminFrontendSettingPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [miniAboutTitle, setMiniAboutTitle] = useState('');
  const [miniAboutText, setMiniAboutText] = useState('');
  const [miniAboutImageUrl, setMiniAboutImageUrl] = useState('');
  const [aboutPageTitle, setAboutPageTitle] = useState('');
  const [aboutPageBody, setAboutPageBody] = useState('');
  const [contactHeading, setContactHeading] = useState('');
  const [contactIntro, setContactIntro] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!token) return;
      setLoadErr(null);
      if (!opts?.quiet) setFetching(true);
      try {
        const data = await apiFetch<SuperadminFrontendSitePayload>('/api/superadmin/frontend/site', {
          token,
        });
        const s = data.site;
        setHeroTitle(s.heroTitle || '');
        setHeroSubtitle(s.heroSubtitle || '');
        setHeroImageUrl(s.heroImageUrl || '');
        setMiniAboutTitle(s.miniAboutTitle || '');
        setMiniAboutText(s.miniAboutText || '');
        setMiniAboutImageUrl(s.miniAboutImageUrl || '');
        setAboutPageTitle(s.aboutPageTitle || '');
        setAboutPageBody(s.aboutPageBody || '');
        setContactHeading(s.contactHeading || '');
        setContactIntro(s.contactIntro || '');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setContactAddress(s.contactAddress || '');
      } finally {
        if (!opts?.quiet) setFetching(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const body: SuperadminSiteContentFields = {
        heroTitle,
        heroSubtitle,
        heroImageUrl,
        miniAboutTitle,
        miniAboutText,
        miniAboutImageUrl,
        aboutPageTitle,
        aboutPageBody,
        contactHeading,
        contactIntro,
        contactEmail,
        contactPhone,
        contactAddress,
      };
      await apiFetch('/api/superadmin/frontend/site', {
        method: 'PUT',
        token,
        body: JSON.stringify(body),
      });
      await load({ quiet: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadErr}</p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Superadmin</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">Frontend setting</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Shared hero, about, and contact copy for every church’s public pages. Each church still shows its own
          name in the header; this content is the same across all congregations.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-8" onSubmit={onSubmit}>
          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Home hero</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Subtitle</label>
                <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Hero image URL</label>
                <input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className={field} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Home “about” teaser</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                <input value={miniAboutTitle} onChange={(e) => setMiniAboutTitle(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Text</label>
                <textarea value={miniAboutText} onChange={(e) => setMiniAboutText(e.target.value)} className={textarea} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Image URL</label>
                <input
                  value={miniAboutImageUrl}
                  onChange={(e) => setMiniAboutImageUrl(e.target.value)}
                  className={field}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">About page</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Page title</label>
                <input value={aboutPageTitle} onChange={(e) => setAboutPageTitle(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Body (Markdown)</label>
                <textarea value={aboutPageBody} onChange={(e) => setAboutPageBody(e.target.value)} className={textarea} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Contact page</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Heading</label>
                <input value={contactHeading} onChange={(e) => setContactHeading(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Intro</label>
                <textarea value={contactIntro} onChange={(e) => setContactIntro(e.target.value)} className={textarea} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Phone</label>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Address (display)</label>
                <textarea
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className={textarea}
                />
              </div>
            </div>
          </section>

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60 sm:w-auto"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
