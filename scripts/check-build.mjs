import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCategoryDirectory } from '../src/data/categories.js';
import privacyConfig from '../src/data/privacy-config.js';
import { publishedResourceRoutes } from './resource-data.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const snapshot = JSON.parse(await readFile(resolve(root, 'data/resources.json'), 'utf8'));
const paths = new Set(snapshot.resources.map(resource => resource.path));
const routes = JSON.parse(await readFile(resolve(root, 'data/routes.json'), 'utf8'));
assert.deepEqual(routes, publishedResourceRoutes(snapshot.resources), 'Public routes include stale or unpublished resources');
const publicHtml = new Set(['index.html', '404.html', 'privacy/index.html',
  ...getCategoryDirectory(snapshot.resources).map(category => `${category.slug}/index.html`),
  ...snapshot.resources.map(resource => `${resource.path.slice(1)}index.html`)]);
const publicFiles = new Set(['.nojekyll', 'CNAME', 'robots.txt', 'sitemap.xml',
  'header-logo.svg', 'header-stripes.svg', 'footer-logo.svg',
  'data/resources.json', 'data/routes.json']);
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
assert(!homepage.includes('id="wix-site-script"'), 'Tracking script must not load before consent');
assert(homepage.includes('https://all-aboard-ohio.github.io/aao-lab-components/aao-banner.js'), 'Shared AAO notification component script is missing');
assert(homepage.includes('<aao-notification config-url="https://raw.githubusercontent.com/all-aboard-ohio/aao-lab-components/main/banner.json" mode="standard"></aao-notification>'), 'Shared AAO notification feed is missing');
assert(!homepage.includes('aao-site-header'), 'The shared AAO header must not be rendered');
const privacyPage = await readFile(resolve(root, 'privacy/index.html'), 'utf8');
assert(privacyPage.includes('How We Use Information'), 'Privacy policy is incomplete');
if (!privacyConfig.privacyReviewed) assert(privacyPage.includes('content="noindex"'), 'Unreviewed privacy policy must remain noindex');
else assert(!privacyPage.includes('content="noindex"'), 'Approved privacy policy should be indexable');
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
    const publicPath = relative(root, path).replaceAll('\\', '/');
    assert(!/(^|\/)(docs|scripts|src|node_modules|\.cache|\.server|\.git)(\/|$)/.test(publicPath), `Internal directory in public build: ${publicPath}`);
    assert(!/(^|\/)\.env($|\.)|\.(md|map|pem|key|log|ts|jsx|mjs)$/i.test(publicPath), `Internal file in public build: ${publicPath}`);
    if ((await stat(path)).isDirectory()) { await inspect(path); continue; }
    const approved = publicHtml.has(publicPath) || publicFiles.has(publicPath)
      || /^assets\/[^/]+\.(js|css)$/.test(publicPath)
      || /^images\/generated\/[a-f0-9]{20}-(320|640|960)\.webp$/.test(publicPath)
      || /^images\/join-aao\.(jpg|jpeg|webp|png)$/.test(publicPath);
    assert(approved, `Unexpected file in public build: ${publicPath}`);
    if (name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      assert(html.includes('lang="en"'), 'Document language missing');
      assert.equal((html.match(/<h1(?:\s[^>]*)?>/g) || []).length, 1, 'Expected one page-level heading');
      assert(html.includes('<title>') && html.includes('<meta name="description"'), 'Page SEO title or description missing');
      assert(html.includes('rel="canonical"') && html.includes('property="og:title"'), 'Canonical/social metadata missing');
      for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = match[1];
        if (href.startsWith('//')) continue;
        await stat(resolve(root, `.${href}${href.endsWith('/') ? 'index.html' : ''}`));
      }
    } else if (name.endsWith('.js')) {
      const script = await readFile(path, 'utf8');
      assert(!/wixapis\.com|generateVisitorTokens|OAuthStrategy/.test(script), 'Wix API code found in browser bundle');
      assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{40,}|gh[pousr]_[A-Za-z0-9]{30,}/.test(script), 'Possible private credential in browser bundle');
    } else if (name.endsWith('.svg')) {
      const svg = await readFile(path, 'utf8');
      assert(!/<script\b|\bon[a-z]+\s*=/i.test(svg), 'Executable code in a public vector asset');
    }
  }
}
await inspect(root);
assert((await readFile(resolve(root, '404.html'), 'utf8')).includes('Resource Not Found'));
console.log(`Artifact checks passed: ${snapshot.resources.length} resource pages, ${snapshot.blogPosts.length} blog links, internal links, metadata and public-data boundaries.`);