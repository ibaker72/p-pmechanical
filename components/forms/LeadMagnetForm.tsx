'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Input, FieldError } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { savingsGuideSchema, type SavingsGuideInput } from '@/lib/validations';
import { Honeypot, readHoneypot } from './Honeypot';
import { trackLead } from '@/lib/analytics';

export function LeadMagnetForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SavingsGuideInput>({ resolver: zodResolver(savingsGuideSchema) });

  async function onSubmit(values: SavingsGuideInput, event?: React.BaseSyntheticEvent) {
    setStatus('submitting');
    setErrorMsg('');
    const hp = readHoneypot(event);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, source: 'savings_guide', website_url: hp }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
      trackLead({ source: 'savings_guide' });
      reset();
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 px-6 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-ember-300" />
        <p className="font-display text-2xl text-white">Check your inbox.</p>
        <p className="max-w-md text-sm text-steel-100">
          Your free NJ Homeowner&apos;s HVAC Savings Guide is on the way. If you don&apos;t see it
          in 2 minutes, check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={
        compact
          ? 'flex flex-col gap-3 sm:flex-row'
          : 'mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl bg-ink-950/40 p-6 backdrop-blur-md sm:flex-row sm:items-start'
      }
    >
      <Honeypot />
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Your name (optional)"
          {...register('name')}
          aria-label="Your name"
        />
      </div>
      <div className="flex-1">
        <Input
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          aria-label="Your email"
        />
        <FieldError>{errors.email?.message}</FieldError>
      </div>
      <Button type="submit" size="md" variant="primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" /> Get the Guide
          </>
        )}
      </Button>
      {status === 'error' && (
        <p className="text-xs text-ember-300 sm:basis-full">{errorMsg || 'Please try again.'}</p>
      )}
    </form>
  );
}
