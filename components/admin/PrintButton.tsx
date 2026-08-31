'use client';

/**
 * Prints the proposal. The print stylesheet in globals.css hides the admin
 * chrome and lays the sheet out on letter paper, so the browser's own
 * "Save as PDF" produces the deliverable — no PDF dependency to keep working.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
    >
      Print / Save as PDF
    </button>
  );
}
