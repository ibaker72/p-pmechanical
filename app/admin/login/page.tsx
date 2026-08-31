import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/server';
import { isAdminAuthConfigured } from '@/lib/auth/admin-session';
import { BUSINESS } from '@/lib/constants';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getAdminSession();
  if (session) redirect(searchParams.next?.startsWith('/admin') ? searchParams.next : '/admin');

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-400">
            {BUSINESS.name}
          </p>
          <h1 className="mt-1 font-display text-2xl text-white">Commercial Estimating</h1>
          <p className="mt-1 text-sm text-steel-400">Internal system. Authorized access only.</p>
        </div>

        {!isAdminAuthConfigured() ? (
          <div className="rounded-lg border border-ember-400/40 bg-ember-400/[0.06] px-4 py-3 text-sm text-ember-100">
            <p className="font-semibold">Sign-in is not configured</p>
            <p className="mt-1 opacity-90">
              Set <code className="rounded bg-ink-900 px-1">ADMIN_SECRET</code> to a value of at
              least 16 characters in the server environment, then redeploy.
            </p>
          </div>
        ) : (
          <LoginForm next={searchParams.next} />
        )}
      </div>
    </main>
  );
}
