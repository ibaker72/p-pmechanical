import { logoutAction } from '@/app/admin/login/actions';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full rounded border border-white/15 px-2 py-1 text-xs font-semibold text-steel-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}
