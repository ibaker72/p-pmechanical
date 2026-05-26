// Server-side OpenClaw gateway client. Import only from Route Handlers / server
// code — the API key NEVER reaches the browser. If OpenClaw
// is disabled or unconfigured, callers get a clean { ok: false } fallback so
// nothing downstream breaks.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type OpenClawResult = {
  ok: boolean;
  text: string;
  raw?: unknown;
  error?: string;
};

export type OpenClawOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Override the default model for this call. */
  model?: string;
};

function config() {
  const enabled = (process.env.OPENCLAW_ENABLED ?? '').toLowerCase() === 'true';
  const baseUrl = (process.env.OPENCLAW_BASE_URL ?? '').replace(/\/$/, '');
  const apiKey = process.env.OPENCLAW_API_KEY ?? '';
  const model = process.env.OPENCLAW_MODEL || 'gpt-4o-mini';
  // Some gateways expose a non-OpenAI path; keep it configurable.
  const chatPath = process.env.OPENCLAW_CHAT_PATH || '/v1/chat/completions';
  const timeoutMs = Number(process.env.OPENCLAW_TIMEOUT_MS || '15000') || 15000;
  return { enabled, baseUrl, apiKey, model, chatPath, timeoutMs };
}

/** True only when the feature flag is on AND the required vars are present. */
export function isOpenClawConfigured(): boolean {
  const c = config();
  return c.enabled && !!c.baseUrl && !!c.apiKey;
}

// Best-effort extraction of assistant text across common gateway shapes
// (OpenAI chat completions, plain { text }, etc.). Never throws.
function extractText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const choices = d.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices[0]) {
    const msg = choices[0].message as Record<string, unknown> | undefined;
    if (msg && typeof msg.content === 'string') return msg.content;
    if (typeof choices[0].text === 'string') return choices[0].text as string;
  }
  if (typeof d.text === 'string') return d.text;
  if (typeof d.output === 'string') return d.output;
  return '';
}

export async function openClawChat(opts: OpenClawOptions): Promise<OpenClawResult> {
  const c = config();

  if (!c.enabled) return { ok: false, text: '', error: 'openclaw_disabled' };
  if (!c.baseUrl || !c.apiKey) return { ok: false, text: '', error: 'openclaw_unconfigured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), c.timeoutMs);

  try {
    const res = await fetch(`${c.baseUrl}${c.chatPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${c.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || c.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 700,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      // Read body for diagnostics but never surface raw key material.
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        text: '',
        error: `openclaw_http_${res.status}`,
        raw: detail.slice(0, 500),
      };
    }

    const data: unknown = await res.json().catch(() => null);
    const text = extractText(data).trim();
    if (!text) return { ok: false, text: '', error: 'openclaw_empty_response', raw: data };
    return { ok: true, text, raw: data };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return { ok: false, text: '', error: aborted ? 'openclaw_timeout' : 'openclaw_network_error' };
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: a system + user prompt pair → normalized result. */
export function runPrompt(
  system: string,
  user: string,
  opts?: Partial<Omit<OpenClawOptions, 'messages'>>,
): Promise<OpenClawResult> {
  return openClawChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...opts,
  });
}
