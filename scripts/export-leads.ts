#!/usr/bin/env tsx
// Export leads from Supabase to CSV.
//
// Usage:
//   npm run leads:export                  # last 30 days
//   npm run leads:export -- --days 90
//   npm run leads:export -- --since 2025-01-01 --out leads-jan.csv

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.replace(/^--/, ''), arr[i + 1] ?? '']);
    return acc;
  }, []),
);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const days = args.days ? parseInt(args.days, 10) : 30;
const since = args.since ? new Date(args.since) : new Date(Date.now() - days * 86400_000);
const out = args.out || `leads-${since.toISOString().slice(0, 10)}.csv`;

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await sb
  .from('leads')
  .select('*')
  .gte('created_at', since.toISOString())
  .order('created_at', { ascending: false });

if (error) {
  console.error('Supabase error:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log(`No leads since ${since.toISOString().slice(0, 10)}.`);
  process.exit(0);
}

const cols = Object.keys(data[0]);
const csv = [
  cols.join(','),
  ...data.map((row) =>
    cols
      .map((c) => {
        const v = (row as Record<string, unknown>)[c];
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      })
      .join(','),
  ),
].join('\n');

const dest = path.resolve(process.cwd(), out);
fs.writeFileSync(dest, csv, 'utf8');
console.log(`Exported ${data.length} lead(s) to ${dest}`);
