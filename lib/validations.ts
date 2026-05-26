import { z } from 'zod';

const phoneRegex = /^[+()\-\s\d]{7,}$/;

export const contactSchema = z.object({
  name: z.string().min(2, 'Please tell us your name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(phoneRegex, 'Enter a valid phone number'),
  service_type: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP')
    .optional()
    .or(z.literal('')),
  urgency: z.string().optional().nullable(),
  message: z.string().min(5, 'A short message helps us prepare').max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const savingsGuideSchema = z.object({
  name: z.string().min(2, 'Please tell us your name').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email'),
});
export type SavingsGuideInput = z.infer<typeof savingsGuideSchema>;

export const inlineLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(phoneRegex, 'Enter a valid phone number'),
  email: z.string().email(),
  service_type: z.string().min(1, 'Pick a service'),
  message: z.string().max(2000).optional().or(z.literal('')),
});
export type InlineLeadInput = z.infer<typeof inlineLeadSchema>;

export const quoteWizardSchema = z.object({
  service_type: z.string().min(1, 'Pick a service'),
  home_size: z.string().min(1, 'Pick a home size'),
  system_age: z.string().min(1, 'Pick system age'),
  name: z.string().min(2),
  phone: z.string().regex(phoneRegex),
  email: z.string().email(),
  preferred_contact_time: z.string().optional().or(z.literal('')),
});
export type QuoteWizardInput = z.infer<typeof quoteWizardSchema>;

export const webhookSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  service_type: z.string().optional(),
  home_size: z.string().optional(),
  system_age: z.string().optional(),
  message: z.string().optional(),
  source: z.string().min(1),
  preferred_contact_time: z.string().optional(),
  city: z.string().optional(),
  // Honeypot: real users never see/fill this. If non-empty, treat as spam.
  website_url: z.string().optional(),
});
export type WebhookInput = z.infer<typeof webhookSchema>;
