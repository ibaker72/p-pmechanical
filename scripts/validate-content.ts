#!/usr/bin/env tsx
// Validate every MDX file in content/blog:
//   - required frontmatter fields
//   - title length 30-80 chars
//   - excerpt (meta description) length 100-200 chars
//   - ISO date format
//   - slug uniqueness + kebab-case
//   - body length >= 400 words
//
// Exits non-zero on the first batch of errors. Run: `npm run validate:content`

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

type Issue = { file: string; level: 'error' | 'warn'; message: string };
const issues: Issue[] = [];
const slugs = new Map<string, string>();

if (!fs.existsSync(BLOG_DIR)) {
  console.log(`[validate-content] No blog dir at ${BLOG_DIR} — nothing to validate.`);
  process.exit(0);
}

const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

for (const file of files) {
  const full = path.join(BLOG_DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const { data, content } = matter(raw);

  const required = ['title', 'date', 'category', 'excerpt', 'slug'] as const;
  for (const k of required) {
    if (!data[k] || String(data[k]).trim() === '') {
      issues.push({ file, level: 'error', message: `missing required frontmatter "${k}"` });
    }
  }

  if (typeof data.title === 'string') {
    if (data.title.length < 30)
      issues.push({
        file,
        level: 'warn',
        message: `title is short (${data.title.length} chars; aim 30-80)`,
      });
    if (data.title.length > 80)
      issues.push({
        file,
        level: 'warn',
        message: `title is long (${data.title.length} chars; aim 30-80)`,
      });
  }

  if (typeof data.excerpt === 'string') {
    if (data.excerpt.length < 100)
      issues.push({
        file,
        level: 'warn',
        message: `excerpt is short (${data.excerpt.length} chars; aim 100-200)`,
      });
    if (data.excerpt.length > 200)
      issues.push({
        file,
        level: 'warn',
        message: `excerpt is long (${data.excerpt.length} chars; aim 100-200)`,
      });
  }

  if (typeof data.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    issues.push({
      file,
      level: 'error',
      message: `date must be ISO yyyy-mm-dd, got "${data.date}"`,
    });
  }

  if (typeof data.slug === 'string') {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      issues.push({
        file,
        level: 'error',
        message: `slug must be kebab-case lowercase, got "${data.slug}"`,
      });
    }
    if (slugs.has(data.slug)) {
      issues.push({
        file,
        level: 'error',
        message: `slug "${data.slug}" duplicates ${slugs.get(data.slug)}`,
      });
    } else {
      slugs.set(data.slug, file);
    }
    const expected = file.replace(/\.(mdx|md)$/, '');
    if (data.slug !== expected) {
      issues.push({
        file,
        level: 'warn',
        message: `slug "${data.slug}" does not match filename "${expected}"`,
      });
    }
  }

  const words = content.split(/\s+/).filter(Boolean).length;
  if (words < 400) {
    issues.push({ file, level: 'warn', message: `body is short (${words} words; aim 400+)` });
  }
}

const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

for (const i of issues) {
  const fn = i.level === 'error' ? console.error : console.warn;
  fn(`[${i.level}] ${i.file}: ${i.message}`);
}

console.log(
  `[validate-content] ${files.length} file(s) checked, ${errors.length} error(s), ${warns.length} warning(s).`,
);

if (errors.length > 0) process.exit(1);
