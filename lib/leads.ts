import { getServiceSupabase, type LeadRecord } from './supabase';
import { sendCustomerConfirmation, sendOwnerNotification } from './resend';

export async function captureLead(lead: LeadRecord) {
  const supabase = getServiceSupabase();

  let id: string | null = null;
  let supabaseError: string | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select('id')
      .single();
    if (error) supabaseError = error.message;
    else id = data?.id ?? null;
  } else {
    supabaseError = 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured';
  }

  // Send emails in parallel — do not fail the lead capture if email is misconfigured.
  const [ownerResult, customerResult] = await Promise.allSettled([
    sendOwnerNotification(lead),
    sendCustomerConfirmation(lead),
  ]);

  return {
    id,
    supabaseError,
    emails: {
      owner: ownerResult.status === 'fulfilled' ? 'sent' : 'failed',
      customer: customerResult.status === 'fulfilled' ? 'sent' : 'failed',
    },
  };
}
