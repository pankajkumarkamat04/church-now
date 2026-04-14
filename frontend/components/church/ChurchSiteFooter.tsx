import Link from 'next/link';

export function ChurchSiteFooter({ slug }: { slug: string }) {
  const p = `/${slug}`;
  return (
    <footer className="church-footer">
      <div className="church-footer-inner">
        <Link href={`${p}/contact`}>Contact</Link>
        <span className="church-footer-dot">·</span>
        <Link href="/login">Staff login</Link>
      </div>
    </footer>
  );
}
