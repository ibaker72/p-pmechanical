// Invisible field bots will fill in, real users will not.
// Posted as `website_url` — the API drops the lead silently if non-empty.
export function Honeypot() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
      }}
    >
      <label>
        Website (leave blank)
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

// Read the honeypot value out of the submit event's form. Returns '' when not
// found so callers can pass the result straight into the POST body.
export function readHoneypot(event?: {
  target?: EventTarget | null;
  currentTarget?: EventTarget | null;
}): string {
  const form =
    (event?.currentTarget as HTMLFormElement | undefined) ||
    (event?.target as HTMLFormElement | undefined);
  if (!form || typeof FormData === 'undefined') return '';
  try {
    const fd = new FormData(form);
    const v = fd.get('website_url');
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}
