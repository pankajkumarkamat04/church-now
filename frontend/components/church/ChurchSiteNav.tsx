import Link from 'next/link';

export function ChurchSiteNav({ slug, churchName }: { slug: string; churchName: string }) {
  const p = `/${slug}`;
  return (
    <header className="church-nav">
      <div className="church-nav-inner">
        <Link href={p} className="church-brand">
          {churchName}
        </Link>
        <nav className="church-nav-links">
          <Link href={p}>Home</Link>
          <Link href={`${p}/about`}>About</Link>
          <Link href={`${p}/events`}>Events</Link>
          <Link href={`${p}/gallery`}>Gallery</Link>
          <Link href={`${p}/contact`}>Contact</Link>
        </nav>
      </div>
    </header>
  );
}
