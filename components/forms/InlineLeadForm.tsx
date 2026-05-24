'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { Input, Textarea, Select, Label, FieldError } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { inlineLeadSchema, type InlineLeadInput } from '@/lib/validations';
import { SERVICES } from '@/lib/constants';
import { Honeypot, readHoneypot } from './Honeypot';
import { trackLead } from '@/lib/analytics';

export function InlineLeadForm({
  defaultService,
  city,
  source = 'contact_form',
}: {
  defaultService?: string;
  city?: string;
  source?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InlineLeadInput>({
    resolver: zodResolver(inlineLeadSchema),
    defaultValues: { service_type: defaultService || '' },
  });

  async function onSubmit(values: InlineLeadInput, event?: React.BaseSyntheticEvent) {
    setStatus('submitting');
    const hp = readHoneypot(event);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, city, source, website_url: hp }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
      trackLead({ source, service_type: values.service_type, city });
      reset();
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-ember-300" />
        <p className="font-display text-2xl text-white">Request received.</p>
        <p className="max-w-md text-sm text-steel-100">
          A team member will call you within 2 hours during business hours. For urgent issues,
          please call us directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <div>
        <Label htmlFor="il-name">Name</Label>
        <Input id="il-name" placeholder="Jane Smith" {...register('name')} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="il-phone">Phone</Label>
        <Input id="il-phone" type="tel" placeholder="(973) 555-0123" {...register('phone')} />
        <FieldError>{errors.phone?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="il-email">Email</Label>
        <Input id="il-email" type="email" placeholder="you@example.com" {...register('email')} />
        <FieldError>{errors.email?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="il-service">Service</Label>
        <Select id="il-service" {...register('service_type')}>
          <option value="">Choose a service…</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
        <FieldError>{errors.service_type?.message}</FieldError>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="il-message">How can we help?</Label>
        <Textarea
          id="il-message"
          placeholder="Tell us about the system, the issue, and your goals."
          {...register('message')}
        />
        <FieldError>{errors.message?.message}</FieldError>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-steel-300">We respond within 2 hours during business hours.</p>
        <Button type="submit" size="lg" variant="primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Send Request
            </>
          )}
        </Button>
      </div>
      {status === 'error' && (
        <p className="text-sm text-ember-300 sm:col-span-2">
          {errorMsg || 'Something went wrong — please call us instead.'}
        </p>
      )}
    </form>
  );
}
