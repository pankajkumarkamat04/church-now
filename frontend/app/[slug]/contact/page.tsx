import { notFound } from 'next/navigation';
import { publicGet } from '@/lib/publicApi';
import type { PublicSitePayload } from '../layout';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicGet<PublicSitePayload>(`/api/public/${slug}/site`);
  if (!data) notFound();
  const s = data.site;
  const heading = s.contactHeading || 'Contact';
  const intro = s.contactIntro || '';
  const email = s.contactEmail || '';
  const phone = s.contactPhone || '';
  const address = s.contactAddress || '';

  return (
    <div className="church-container church-page">
      <h1 className="church-page-title">{heading}</h1>
      {intro ? <p className="church-contact-intro">{intro}</p> : null}
      <div className="church-contact-card">
        {address ? (
          <p>
            <strong>Address</strong>
            <br />
            {address}
          </p>
        ) : null}
        {phone ? (
          <p>
            <strong>Phone</strong>
            <br />
            <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
          </p>
        ) : null}
        {email ? (
          <p>
            <strong>Email</strong>
            <br />
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        ) : null}
        {!address && !phone && !email ? (
          <p className="church-muted">Contact details will appear here once your admin adds them.</p>
        ) : null}
      </div>
    </div>
  );
}
