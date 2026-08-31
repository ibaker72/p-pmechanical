import { redirect } from 'next/navigation';

// /admin already renders the dashboard; this keeps the documented
// /admin/dashboard URL working without duplicating the page.
export default function AdminDashboardAlias() {
  redirect('/admin');
}
