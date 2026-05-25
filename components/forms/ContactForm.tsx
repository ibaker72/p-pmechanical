'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { Input, Textarea, Select, Label, FieldError } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { contactSchema, type ContactInput } from '@/lib/validations';
import { RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES, ALL_SERVICE_AREAS } from '@/lib/constants';
import { Honeypot, readHoneypot } from './Honeypot';
import { trackLead } from '@/lib/analytics';

type ContactFormProps = {
  defaultCity?: string;
  source?: string;
};

export function ContactForm({ defaultCity, source = 'contact_form' }: ContactFormProps = {}) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultCity ? { city: defaultCity } : undefined,
  });

  async function onSubmit(values: ContactInput, event?: React.BaseSyntheticEvent) {
    setStatus('submitting');
    const hp = readHoneypot(event);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          city: values.city || defaultCity || null,
          source,
          website_url: hp,
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
      trackLead({
        source,
        service_type: values.service_type ?? undefined,
        city: values.city ?? defaultCity,
      });
      reset();
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-ember-300" />
        <p className="font-display text-3xl text-white">Thanks — we got it.</p>
        <p className="max-w-md text-sm text-steel-100">
          A team member will reach out within 2 hours during business hours. If your issue is an
          emergency, please call our 24/7 line.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" placeholder="Jane Smith" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" type="tel" placeholder="(201) 456-5151" {...register('phone')} />
          <FieldError>{errors.phone?.message}</FieldError>
        </div>
      </div>
      <div>
        <Label htmlFor="c-email">Email</Label>
        <Input id="c-email" type="email" placeholder="you@example.com" {...register('email')} />
        <FieldError>{errors.email?.message}</FieldError>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-service">Service of interest</Label>
          <Select id="c-service" {...register('service_type')}>
            <option value="">Any / not sure</option>
            <optgroup label="Residential">
              {RESIDENTIAL_SERVICES.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Commercial">
              {COMMERCIAL_SERVICES.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>
        <div>
          <Label htmlFor="c-city">City</Label>
          <Select id="c-city" {...register('city')}>
            <option value="">Choose your city</option>
            {defaultCity && !ALL_SERVICE_AREAS.includes(defaultCity) && (
              <option value={defaultCity}>{defaultCity}, NJ</option>
            )}
            {ALL_SERVICE_AREAS.map((c) => (
              <option key={c} value={c}>
                {c}, NJ
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="c-message">How can we help?</Label>
        <Textarea
          id="c-message"
          placeholder="Tell us about the system, the issue, and your goals."
          {...register('message')}
        />
        <FieldError>{errors.message?.message}</FieldError>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-steel-300">We respond within 2 hours during business hours.</p>
        <Button type="submit" size="lg" variant="primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Send Message
            </>
          )}
        </Button>
      </div>
      {status === 'error' && (
        <p className="text-sm text-ember-300">
          {errorMsg || 'Please try again or call us directly.'}
        </p>
      )}
    </form>
  );
}
