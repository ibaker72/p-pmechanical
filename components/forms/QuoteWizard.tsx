'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { trackLead } from '@/lib/analytics';
import {
  ArrowLeft,
  ArrowRight,
  Snowflake,
  Wind,
  Flame,
  Thermometer,
  Siren,
  Loader2,
  Home as HomeIcon,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError, Select } from '@/components/ui/input';
import { quoteWizardSchema, type QuoteWizardInput } from '@/lib/validations';

const SERVICE_OPTIONS = [
  { value: 'AC Installation', icon: Snowflake, label: 'AC Install' },
  { value: 'AC Repair', icon: Wind, label: 'AC Repair' },
  { value: 'Boiler Installation', icon: Flame, label: 'Boiler' },
  { value: 'HVAC Installation', icon: Thermometer, label: 'Heating' },
  { value: '24/7 Emergency HVAC', icon: Siren, label: 'Emergency' },
];

const HOME_SIZES = ['Under 1,000 sqft', '1,000 – 2,000 sqft', '2,000 – 3,500 sqft', '3,500+ sqft'];
const SYSTEM_AGES = [
  'Less than 5 years',
  '5 – 10 years',
  '10 – 15 years',
  '15+ years',
  'No system installed',
];
const TIME_PREFS = ['Morning (8a–12p)', 'Afternoon (12p–5p)', 'Evening (5p–8p)', 'Anytime today'];

export function QuoteWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<QuoteWizardInput>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteWizardInput, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  const totalSteps = 4;

  function next() {
    const fieldErrors: Partial<Record<keyof QuoteWizardInput, string>> = {};
    if (step === 0 && !data.service_type) fieldErrors.service_type = 'Pick a service';
    if (step === 1 && !data.home_size) fieldErrors.home_size = 'Pick a home size';
    if (step === 2 && !data.system_age) fieldErrors.system_age = 'Pick system age';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) setStep((s) => Math.min(totalSteps - 1, s + 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    const parsed = quoteWizardSchema.safeParse(data);
    if (!parsed.success) {
      const errs: Partial<Record<keyof QuoteWizardInput, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const k = issue.path[0] as keyof QuoteWizardInput;
        errs[k] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setStatus('submitting');
    const hp = honeypotRef.current?.value || '';
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, source: 'quote_wizard', website_url: hp }),
      });
      if (!res.ok) throw new Error('Submission failed');
      trackLead({ source: 'quote_wizard', service_type: parsed.data.service_type });
      router.push('/thank-you');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Website (leave blank)
          <input
            ref={honeypotRef}
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      {/* Progress bar */}
      <div className="mb-10">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
          <span className="text-ember-300">
            Step {step + 1} of {totalSteps}
          </span>
          <span className="text-steel-300">
            {Math.round(((step + 1) / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-ember-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <Step
                eyebrow="01 / Service"
                title="What can we help you with?"
                subtitle="Pick the option closest to your situation — we'll dial in details later."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SERVICE_OPTIONS.map((opt) => {
                    const selected = data.service_type === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setData((d) => ({ ...d, service_type: opt.value }))}
                        className={`group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all ${
                          selected
                            ? 'border-ember-400 bg-ember-500/10 shadow-emberSoft'
                            : 'border-white/10 bg-white/[0.02] hover:border-ember-400/50 hover:bg-white/[0.05]'
                        }`}
                      >
                        <opt.icon
                          className={`h-7 w-7 ${selected ? 'text-ember-300' : 'text-ember-400'}`}
                        />
                        <span className="font-display text-lg text-white">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.service_type}</FieldError>
              </Step>
            )}

            {step === 1 && (
              <Step
                eyebrow="02 / Home Size"
                title="How big is the space we'd be working in?"
                subtitle="Rough is fine — we'll measure precisely on the in-home visit."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {HOME_SIZES.map((opt) => {
                    const selected = data.home_size === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setData((d) => ({ ...d, home_size: opt }))}
                        className={`flex items-center gap-3 rounded-xl border p-5 text-left transition-all ${
                          selected
                            ? 'border-ember-400 bg-ember-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-ember-400/50'
                        }`}
                      >
                        <HomeIcon
                          className={`h-5 w-5 ${selected ? 'text-ember-300' : 'text-ember-400'}`}
                        />
                        <span className="font-medium text-white">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.home_size}</FieldError>
              </Step>
            )}

            {step === 2 && (
              <Step
                eyebrow="03 / System Age"
                title="How old is your current system?"
                subtitle="Age is the single best predictor of repair vs. replace economics."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {SYSTEM_AGES.map((opt) => {
                    const selected = data.system_age === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setData((d) => ({ ...d, system_age: opt }))}
                        className={`flex items-center gap-3 rounded-xl border p-5 text-left transition-all ${
                          selected
                            ? 'border-ember-400 bg-ember-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-ember-400/50'
                        }`}
                      >
                        <Calendar
                          className={`h-5 w-5 ${selected ? 'text-ember-300' : 'text-ember-400'}`}
                        />
                        <span className="font-medium text-white">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.system_age}</FieldError>
              </Step>
            )}

            {step === 3 && (
              <Step
                eyebrow="04 / Contact"
                title="Where should we send your quote?"
                subtitle="We respond within 2 hours during business hours."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="qw-name">Name</Label>
                    <Input
                      id="qw-name"
                      placeholder="Jane Smith"
                      value={data.name || ''}
                      onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                    />
                    <FieldError>{errors.name}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="qw-phone">Phone</Label>
                    <Input
                      id="qw-phone"
                      type="tel"
                      placeholder="(973) 555-0123"
                      value={data.phone || ''}
                      onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
                    />
                    <FieldError>{errors.phone}</FieldError>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="qw-email">Email</Label>
                    <Input
                      id="qw-email"
                      type="email"
                      placeholder="you@example.com"
                      value={data.email || ''}
                      onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
                    />
                    <FieldError>{errors.email}</FieldError>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="qw-time">Best time to call</Label>
                    <Select
                      id="qw-time"
                      value={data.preferred_contact_time || ''}
                      onChange={(e) =>
                        setData((d) => ({ ...d, preferred_contact_time: e.target.value }))
                      }
                    >
                      <option value="">Anytime works</option>
                      {TIME_PREFS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-ember-500/10 p-4 text-sm text-ember-100">
                  <CheckCircle2 className="mb-1 inline h-4 w-4 text-ember-300" /> Summary:{' '}
                  <strong className="text-white">{data.service_type}</strong> · {data.home_size} ·{' '}
                  {data.system_age}
                </div>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={back}
            disabled={step === 0 || status === 'submitting'}
            className={step === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < totalSteps - 1 ? (
            <Button type="button" size="md" variant="primary" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              variant="primary"
              onClick={submit}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>Get My Free Quote</>
              )}
            </Button>
          )}
        </div>
        {status === 'error' && (
          <p className="mt-4 text-sm text-ember-300">{errorMsg || 'Please try again.'}</p>
        )}
      </div>
    </div>
  );
}

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-widest text-ember-400">{eyebrow}</span>
      <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">{title}</h2>
      <p className="mt-2 text-steel-200">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
