import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { LogoutButton } from '@/components/admin/LogoutButton';

export const metadata: Metadata = {
  title: {
    default: 'Estimating',
    template: '%s · P&P Estimating',
  },
  // Internal commercial data must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

// The session is read from a cookie, so nothing in the admin can be statically
// rendered or cached across users.
export const dynamic = 'force-dynamic';

// This layout wraps every authenticated admin page. `/admin/login` sits OUTSIDE
// this route group on purpose — if the sign-in page inherited this layout,
// requireAdmin() would redirect it to itself and the browser would follow a
// redirect loop.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Second, authoritative check. middleware.ts blocks the request earlier; this
  // guarantees the guard even if the matcher is ever changed.
  const session = await requireAdmin();

  return (
    <AdminShell identity={session.sub} logout={<LogoutButton />}>
      {children}
    </AdminShell>
  );
}
