'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SuperadminFrontendSitePayload, SuperadminSiteContentFields } from '@/lib/superadminContentTypes';
import { FileManagerField } from '@/components/dashboard/superadmin/FileManagerField';

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
  const [aboutBox1Title, setAboutBox1Title] = useState('');
  const [aboutBox1Text, setAboutBox1Text] = useState('');
  const [aboutBox2Title, setAboutBox2Title] = useState('');
  const [aboutBox2Text, setAboutBox2Text] = useState('');
  const [aboutBox3Title, setAboutBox3Title] = useState('');
  const [aboutBox3Text, setAboutBox3Text] = useState('');
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
        setAboutBox1Title(s.aboutBox1Title || '');
        setAboutBox1Text(s.aboutBox1Text || '');
        setAboutBox2Title(s.aboutBox2Title || '');
        setAboutBox2Text(s.aboutBox2Text || '');
        setAboutBox3Title(s.aboutBox3Title || '');
        setAboutBox3Text(s.aboutBox3Text || '');
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
        aboutBox1Title,
        aboutBox1Text,
        aboutBox2Title,
        aboutBox2Text,
        aboutBox3Title,
        aboutBox3Text,
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
      <div className="mx-auto max-w-4xl">
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
    <div className="mx-auto max-w-4xl">
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Subtitle</label>
                <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className={field} />
              </div>
              <div className="md:col-span-2">
                <FileManagerField label="Hero image URL" value={heroImageUrl} onChange={setHeroImageUrl} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Home “about” teaser</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                <input value={miniAboutTitle} onChange={(e) => setMiniAboutTitle(e.target.value)} className={field} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Text</label>
                <textarea value={miniAboutText} onChange={(e) => setMiniAboutText(e.target.value)} className={textarea} />
              </div>
              <div className="md:col-span-2">
                <FileManagerField
                  label="Image URL"
                  value={miniAboutImageUrl}
                  onChange={setMiniAboutImageUrl}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">About section boxes</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Box 1</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                    <input value={aboutBox1Title} onChange={(e) => setAboutBox1Title(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Text</label>
                    <textarea value={aboutBox1Text} onChange={(e) => setAboutBox1Text(e.target.value)} className={textarea} />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Box 2</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                    <input value={aboutBox2Title} onChange={(e) => setAboutBox2Title(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Text</label>
                    <textarea value={aboutBox2Text} onChange={(e) => setAboutBox2Text(e.target.value)} className={textarea} />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Box 3</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
                    <input value={aboutBox3Title} onChange={(e) => setAboutBox3Title(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Text</label>
                    <textarea value={aboutBox3Text} onChange={(e) => setAboutBox3Text(e.target.value)} className={textarea} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">About page</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Page title</label>
                <input value={aboutPageTitle} onChange={(e) => setAboutPageTitle(e.target.value)} className={field} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Body (Markdown)</label>
                <textarea value={aboutPageBody} onChange={(e) => setAboutPageBody(e.target.value)} className={textarea} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-900">Contact page</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Heading</label>
                <input value={contactHeading} onChange={(e) => setContactHeading(e.target.value)} className={field} />
              </div>
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
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
