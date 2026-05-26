// Prompt templates for OpenClaw workflows. Each builder returns a
// { system, user } pair. Keep guardrails in the system prompt: no invented
// facts, no certainty in diagnosis, no fake credentials/reviews/guarantees.

import { BUSINESS } from '@/lib/constants';

const BRAND = BUSINESS.name;

const NO_INVENT =
  'Do not invent facts, prices, credentials, reviews, awards, or guarantees. ' +
  'If information is missing, say so plainly rather than guessing.';

function kv(label: string, value?: string | null): string {
  const v = (value ?? '').toString().trim();
  return `${label}: ${v || '(not provided)'}`;
}

// ---------------------------------------------------------------------------
// A. Lead Summary
// ---------------------------------------------------------------------------
export type LeadSummaryInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  service?: string | null;
  city?: string | null;
  message?: string | null;
  urgency?: string | null;
  sourcePage?: string | null;
};

export function leadSummaryPrompt(input: LeadSummaryInput) {
  const system =
    `You are an HVAC office assistant for ${BRAND}. Summarize this lead for the ` +
    `owner in plain English. Be concise, practical, and sales-focused. ${NO_INVENT}\n\n` +
    `Respond in this exact format:\n` +
    `SUMMARY: <2-3 sentences>\n` +
    `LIKELY SERVICE: <best guess at service type>\n` +
    `URGENCY: <low | medium | high | emergency>\n` +
    `NEXT ACTION: <single recommended next step>\n` +
    `CALLBACK SCRIPT: <2-4 sentences the tech/owner can say on the phone>\n` +
    `MISSING INFO: <comma-separated list of details to ask for>`;

  const user = [
    'New website lead:',
    kv('Name', input.name),
    kv('Phone', input.phone),
    kv('Email', input.email),
    kv('Service requested', input.service),
    kv('City', input.city),
    kv('Stated urgency', input.urgency),
    kv('Source page', input.sourcePage),
    kv('Message', input.message),
  ].join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// B. Follow-Up Text (SMS)
// ---------------------------------------------------------------------------
export type FollowUpInput = {
  name?: string | null;
  service?: string | null;
  city?: string | null;
};

export function followUpPrompt(input: FollowUpInput) {
  const system =
    `Write a short, friendly SMS follow-up from ${BRAND} after a missed lead or ` +
    `quote request. Rules: under 320 characters, friendly tone, no aggressive sales ` +
    `language, include a clear callback CTA, mention ${BRAND}, and reference the ` +
    `customer's phone number ${BUSINESS.phone} for callback. ${NO_INVENT} ` +
    `Output only the SMS text, nothing else.`;

  const user = [
    'Draft the follow-up SMS for:',
    kv('Customer name', input.name),
    kv('Service interest', input.service),
    kv('City', input.city),
  ].join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// C. Estimate Prep (technician notes)
// ---------------------------------------------------------------------------
export type EstimatePrepInput = {
  service?: string | null;
  city?: string | null;
  issue: string;
};

export function estimatePrepPrompt(input: EstimatePrepInput) {
  const system =
    `You are a senior HVAC technician preparing a colleague for a service call for ` +
    `${BRAND}. Generate prep notes. Use the words "possible" and "may" — do NOT ` +
    `diagnose with certainty. Do NOT give dangerous DIY instructions to homeowners; ` +
    `these are internal tech notes. ${NO_INVENT}\n\n` +
    `Respond in this exact format:\n` +
    `POSSIBLE CAUSES: <bulleted list>\n` +
    `QUESTIONS TO ASK: <bulleted list>\n` +
    `TOOLS/PARTS TO CONSIDER: <bulleted list>\n` +
    `RED FLAGS: <bulleted list>\n` +
    `SAFETY CONCERNS: <bulleted list>`;

  const user = [
    'Prepare technician notes for:',
    kv('Service type', input.service),
    kv('City', input.city),
    kv('Customer-described issue', input.issue),
  ].join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// D. Review Request (SMS/email)
// ---------------------------------------------------------------------------
export type ReviewRequestInput = {
  name?: string | null;
  service?: string | null;
  channel?: 'sms' | 'email';
  reviewLink?: string | null;
};

export function reviewRequestPrompt(input: ReviewRequestInput) {
  const channel = input.channel ?? 'sms';
  const link = input.reviewLink || '{{REVIEW_LINK}}';
  const system =
    `Write a short, polite ${channel === 'email' ? 'email' : 'SMS'} from ${BRAND} ` +
    `requesting a review after a completed service. Rules: short, polite, NO ` +
    `incentive language (do not offer discounts/gifts), NO fake or pre-written ` +
    `review wording, include the review link exactly as given. ${NO_INVENT} ` +
    `Output only the message text.`;

  const user = [
    'Draft the review request for:',
    kv('Customer name', input.name),
    kv('Service completed', input.service),
    kv('Review link', link),
  ].join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// E. SEO Page Draft (service / city pages)
// ---------------------------------------------------------------------------
export type SeoPageDraftInput = {
  pageType: 'service' | 'city';
  topic: string; // service name or city name
  city?: string | null;
};

export function seoPageDraftPrompt(input: SeoPageDraftInput) {
  const system =
    `You are an SEO copywriter for ${BRAND}, an HVAC company serving ` +
    `${BUSINESS.address.city} and North Jersey. Draft first-draft page copy. Rules: ` +
    `no keyword stuffing, must read as unique human copy, include genuine local ` +
    `context, and propose FAQ ideas. ${NO_INVENT} Do not claim licenses, ` +
    `certifications, reviews, or guarantees unless explicitly provided.\n\n` +
    `Respond in this format:\n` +
    `H1: <headline>\n` +
    `INTRO: <2 short paragraphs>\n` +
    `SECTIONS: <bulleted outline of body sections>\n` +
    `FAQ IDEAS: <5 question prompts, no answers required>`;

  const localLine =
    input.pageType === 'city'
      ? `Target city: ${input.topic}, NJ.`
      : `Service: ${input.topic}. Mention ${input.city || BUSINESS.address.city} and North Jersey naturally.`;

  const user = [`Draft ${input.pageType} page copy.`, localLine].join('\n');

  return { system, user };
}
