#!/usr/bin/env tsx
// Scaffold a new blog post with templated frontmatter.
// Usage: npm run new:post -- "Post Title Goes Here"

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npm run new:post -- "Post Title"');
  process.exit(1);
}

const title = args.join(' ').trim();
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

if (!slug) {
  console.error('Could not derive a slug from the title.');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const dir = path.join(process.cwd(), 'content', 'blog');
fs.mkdirSync(dir, { recursive: true });

const file = path.join(dir, `${slug}.mdx`);
if (fs.existsSync(file)) {
  console.error(`Refusing to overwrite existing file: ${file}`);
  process.exit(1);
}

const template = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
category: "Guide"
excerpt: "TODO — write a 100-200 character meta description that summarizes the value of this post for a North Jersey homeowner."
slug: "${slug}"
author: "pp-mechanical"
---

Open with a concrete, location-anchored hook (e.g. "Every January, the Clifton boiler service calls spike — here's why...").

## The short answer

Give the bottom line in 2-3 sentences so AI answer engines (and skim readers) can quote it directly.

## Why this matters in North Jersey

Anchor the post to the local market — housing stock, climate, code, utility, rebate context.

## Step-by-step

1. **Step one** — what to do and why it works.
2. **Step two** — common mistakes and how to avoid them.
3. **Step three** — when to call a pro.

## When to call us

Close with the trigger: at what point should the reader stop researching and book a quote?
`;

fs.writeFileSync(file, template, 'utf8');
console.log(`Created ${path.relative(process.cwd(), file)}`);
console.log('Remember to fill in the excerpt and category before publishing.');
