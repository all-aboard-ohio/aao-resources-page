import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCategoryDirectory } from '../src/data/categories.js';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const snapshot = JSON.parse(await readFile(resolve(root, 'data/resources.json'), 'utf8'));
const paths = new Set(snapshot.resources.map(resource => resource.path));
for (const category of getCategoryDirectory(snapshot.resources)) {
  const html = await readFile(resolve(root, category.slug, 'index.html'), 'utf8');
  assert(html.includes('class="category-page content-width"'), 'Dedicated category page missing');
  assert(!html.includes('id="blog-heading"'), 'Category page rendered the homepage');
  assert((await readFile(resolve(root, 'sitemap.xml'), 'utf8')).includes(`/${category.slug}/`), 'Category missing from sitemap');
}
for (const item of [...snapshot.resources, ...(snapshot.blogPosts || [])]) {
  if (!item.image) continue;
  assert(item.thumbnail?.src?.startsWith('/images/generated/'), 'Preview image was not optimized');
  assert(item.thumbnail.width > 0 && item.thumbnail.width <= 960, 'Invalid thumbnail dimensions');
  for (const candidate of item.thumbnail.srcSet.split(', ')) {
    const [path] = candidate.split(' ');
    assert(/^\/images\/generated\/[a-f0-9]{20}-(320|640|960)\.webp$/.test(path), 'Invalid thumbnail URL');
    assert((await stat(resolve(root, `.${path}`))).size > 0, 'Generated image missing');
  }
}
assert.equal(paths.size, snapshot.resources.length, 'Resource routes must be unique');
assert(Array.isArray(snapshot.blogPosts) && snapshot.blogPosts.length <= 3, 'Expected up to three blog stories');
const homepage = await readFile(resolve(root, 'index.html'), 'utf8');
for (const [index, post] of snapshot.blogPosts.entries()) {
  assert(/^https:\/\/www\.allaboardohio\.org\/posts\/[^/?#]+\/?$/.test(post.url), 'Invalid blog destination');
  assert(homepage.includes(post.url), 'Blog link missing from static HTML');
  assert(Number.isFinite(Date.parse(post.publishedDate)), 'Invalid blog date');
  if (index > 0) assert(snapshot.blogPosts[index - 1].publishedDate >= post.publishedDate, 'Blog stories are not newest first');
}
if (snapshot.blogPosts.length) assert(homepage.indexOf('id="intent-heading"') < homepage.indexOf('id="blog-heading"') && homepage.indexOf('id="blog-heading"') < homepage.indexOf('id="join-heading"'), 'Blog section is in the wrong position');
for (const resource of snapshot.resources) {
  const html = await readFile(resolve(root, `.${resource.path}index.html`), 'utf8');
  assert(html.includes('rel="canonical"'), 'Canonical metadata missing');
  assert(html.includes('<h1>'), 'Static article HTML missing');
  assert(html.includes('id="root"><'), 'Empty client-only page');
  assert(!html.includes('aao-site-header'), 'Unexpected Data Lab branding');
}
const json = JSON.stringify(snapshot);
assert(!json.includes('test-only-snapshot') && !json.includes('Deterministic blog fixture'), 'Test content leaked into production');
for (const field of ['"_owner"', '"_publishingStatus"', '"author"', '"refreshToken"', '"accessToken"']) assert(!json.includes(field), `Private field in public snapshot: ${field}`);
async function inspect(directory) {
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    if ((await stat(path)).isDirectory()) await inspect(path);
    else if (name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = match[1];
        if (href.startsWith('//')) continue;
        await stat(resolve(root, `.${href}${href.endsWith('/') ? 'index.html' : ''}`));
      }
    } else if (name.endsWith('.js')) {
      const script = await readFile(path, 'utf8');
      assert(!/wixapis\.com|generateVisitorTokens|OAuthStrategy/.test(script), 'Wix API code found in browser bundle');
    }
  }
}
await inspect(root);
assert((await readFile(resolve(root, '404.html'), 'utf8')).includes('Resource Not Found'));
console.log(`Artifact checks passed: ${snapshot.resources.length} resource pages, ${snapshot.blogPosts.length} blog links, internal links, metadata and public-data boundaries.`);