// Admin session tokens.
//
// The application already had exactly one authorization primitive: the
// ADMIN_SECRET bearer token guarding /api/leads/list. Rather than introduce a
// second, competing identity system for the estimating admin, this module
// promotes that same secret into a real browser session:
//
//   password (= ADMIN_SECRET)  ->  timing-safe compare  ->  HMAC-SHA256 signed,
//   HttpOnly, SameSite=Lax cookie with a hard expiry.
//
// The token is signed, NOT encrypted: it carries no secret, only a subject and
// timestamps. Forging one requires the signing key.
//
// Everything here uses Web Crypto and no Node built-ins, so the exact same
// verification runs in Edge middleware and in Node server components. There is
// no second, weaker code path.

export const ADMIN_COOKIE_NAME = 'pp_admin_session';
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours
const TOKEN_VERSION = 'v1';

export type AdminSession = {
  /** Who the session belongs to. Single-owner today; ready for more later. */
  sub: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

/**
 * The HMAC signing key. Prefers a dedicated ADMIN_SESSION_SECRET so the login
 * password and the signing key can be rotated independently; falls back to
 * ADMIN_SECRET so no new configuration is required to get started.
 */
function signingSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16) {
    throw new AuthConfigError(
      'Admin sessions are not configured. Set ADMIN_SECRET (or ADMIN_SESSION_SECRET) to a value of at least 16 characters.',
    );
  }
  return secret;
}

/** True when the server has enough configuration to sign in at all. */
export function isAdminAuthConfigured(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET;
  return !!secret && secret.length >= 16;
}

export function adminIdentity(): string {
  return process.env.ADMIN_EMAIL || 'owner';
}

// --- base64url helpers (no Buffer: must run in the Edge runtime) ------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Copied into a freshly allocated ArrayBuffer so the result is a
// `Uint8Array<ArrayBuffer>` and satisfies the BufferSource parameter of
// crypto.subtle in both the Node and Edge lib definitions.
function encodeUtf8(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(value));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encodeUtf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encodeUtf8(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

/**
 * Constant-time string comparison. Compares byte-by-byte over the full length
 * of both inputs so neither a length mismatch nor an early differing byte
 * shortens the comparison.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encodeUtf8(a);
  const bBytes = encodeUtf8(b);
  let diff = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/** Verify a submitted login password against ADMIN_SECRET. */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || expected.length < 16) return false;
  return timingSafeEqual(password, expected);
}

export async function createSessionToken(
  subject = adminIdentity(),
  now = Date.now(),
): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  const session: AdminSession = {
    sub: subject,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS,
  };
  const payload = bytesToBase64Url(encodeUtf8(JSON.stringify(session)));
  const body = `${TOKEN_VERSION}.${payload}`;
  const signature = await sign(body, signingSecret());
  return `${body}.${signature}`;
}

/**
 * Verify a token's signature and expiry.
 * Returns null for anything malformed, mis-signed or expired — callers must
 * treat null as "not signed in" and never distinguish the reasons to the user.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
): Promise<AdminSession | null> {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [version, payload, signature] = parts;
  if (version !== TOKEN_VERSION) return null;

  let expectedSignature: string;
  try {
    expectedSignature = await sign(`${version}.${payload}`, signingSecret());
  } catch {
    // Auth is not configured — no session can be valid.
    return null;
  }
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  let session: AdminSession;
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(payload));
    const parsed: unknown = JSON.parse(decoded);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as AdminSession).sub !== 'string' ||
      typeof (parsed as AdminSession).iat !== 'number' ||
      typeof (parsed as AdminSession).exp !== 'number'
    ) {
      return null;
    }
    session = parsed as AdminSession;
  } catch {
    return null;
  }

  if (session.exp * 1000 <= now) return null;
  return session;
}

/** Cookie attributes for the session cookie. Secure everywhere but local dev. */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
