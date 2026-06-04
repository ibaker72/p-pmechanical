// Server-side Anthropic Claude client. Import only from Route Handlers / server
// code — ANTHROPIC_API_KEY must NEVER reach the browser.
//
// This is a thin wrapper around POST /v1/messages with tool-use. We use raw
// fetch (rather than @anthropic-ai/sdk) to keep the dependency surface small
// and to match the lib/openclaw/client.ts pattern.

export type AnthropicTool = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
};

export type AnthropicToolUse<T = Record<string, unknown>> = {
  type: 'tool_use';
  id: string;
  name: string;
  input: T;
};

export type AnthropicResult<T = Record<string, unknown>> =
  | { ok: true; toolUse: AnthropicToolUse<T>; raw: unknown }
  | { ok: false; error: string; status?: number; detail?: string };

export type AnthropicCallOptions = {
  system: string;
  user: string;
  tools: AnthropicTool[];
  toolName: string;
  maxTokens?: number;
  temperature?: number;
  /** Override the configured model for this call. */
  model?: string;
};

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_TIMEOUT_MS = 30_000;

function config() {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const baseUrl = (process.env.ANTHROPIC_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const timeoutMs =
    Number(process.env.ANTHROPIC_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS)) || DEFAULT_TIMEOUT_MS;
  return { apiKey, baseUrl, model, timeoutMs };
}

export function isAnthropicConfigured(): boolean {
  return !!config().apiKey;
}

function findToolUse(data: unknown, toolName: string): AnthropicToolUse | null {
  if (!data || typeof data !== 'object') return null;
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (
      block &&
      typeof block === 'object' &&
      (block as { type?: unknown }).type === 'tool_use' &&
      (block as { name?: unknown }).name === toolName
    ) {
      return block as AnthropicToolUse;
    }
  }
  return null;
}

export async function callAnthropicWithTool<T = Record<string, unknown>>(
  opts: AnthropicCallOptions,
): Promise<AnthropicResult<T>> {
  const c = config();
  if (!c.apiKey) return { ok: false, error: 'anthropic_unconfigured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), c.timeoutMs);

  try {
    const res = await fetch(`${c.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': c.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: opts.model || c.model,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.4,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        tools: opts.tools,
        tool_choice: { type: 'tool', name: opts.toolName },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        error: `anthropic_http_${res.status}`,
        status: res.status,
        detail: detail.slice(0, 500),
      };
    }

    const data: unknown = await res.json().catch(() => null);
    const toolUse = findToolUse(data, opts.toolName);
    if (!toolUse) {
      return { ok: false, error: 'anthropic_no_tool_use', detail: 'Model did not invoke tool' };
    }
    return { ok: true, toolUse: toolUse as AnthropicToolUse<T>, raw: data };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return { ok: false, error: aborted ? 'anthropic_timeout' : 'anthropic_network_error' };
  } finally {
    clearTimeout(timer);
  }
}
