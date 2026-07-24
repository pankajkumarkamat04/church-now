import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Privacy policy | UCCZ Connect',
  description: 'How UCCZ Connect collects and uses personal data for church membership administration.',
};

export default function PrivacyPage() {
  return (
    <AuthShell maxWidthClassName="max-w-3xl">
      <h1 className="text-xl font-semibold text-neutral-900">Privacy policy</h1>
      <p className="mt-2 text-sm text-neutral-600">Last updated: 23 July 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-neutral-700">
        <section>
          <h2 className="font-semibold text-neutral-900">Who we are</h2>
          <p className="mt-1">
            UCCZ Connect is the membership and administration platform for the United Congregational Church of
            Zimbabwe (UCCZ). This notice explains how personal data is used when you register or are registered as
            a member.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">What we collect</h2>
          <p className="mt-1">
            At self-registration we collect your name, email, phone, congregation and council affiliation. After
            approval you may add further details yourself (such as national ID, date of birth, sex and address). Church
            administrators may also add or update membership records when needed.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">Why we use it</h2>
          <p className="mt-1">
            Data is processed to create and manage membership records, route registrations for church approval,
            support pastoral and administrative contact, and operate church services such as payments and reporting
            where you are authorised to use them.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">Access and retention</h2>
          <p className="mt-1">
            Access is limited to authorised UCCZ officers (for example your congregation administrators and
            designated national administrators). Records are retained while your membership relationship is active
            and thereafter as required for legitimate church administration and legal obligations.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">Your rights</h2>
          <p className="mt-1">
            You may request access to or correction of your membership details through your congregation
            administrator or the national UCCZ office. If you believe data has been mishandled, contact your church
            administrator promptly.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">Security</h2>
          <p className="mt-1">
            We use access controls, encrypted transport (HTTPS in production), and password policies to protect
            accounts. Never share your password. Admins should not set or share member passwords; members set their
            own password via a secure activation or reset link.
          </p>
        </section>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-600">
        <Link href="/signup" className="font-medium text-neutral-900 underline underline-offset-2">
          Back to registration
        </Link>
        {' · '}
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
