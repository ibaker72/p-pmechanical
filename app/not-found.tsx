import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-ember-400">404</p>
      <h1 className="mt-3 font-display text-5xl text-white">Page not found.</h1>
      <p className="mt-4 max-w-md text-steel-200">
        That page doesn&apos;t exist (or it moved). Try the home page or browse our services.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg" variant="primary">
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/services">View services</Link>
        </Button>
      </div>
    </div>
  );
}
