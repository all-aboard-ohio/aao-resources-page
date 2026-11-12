import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createImageVariants } from './optimize-images.mjs';
import { safeUrl, normalizeBlogPost, normalizeResource, publicRichContent, publishedResourceRoutes } from './resource-data.mjs';
import { normalizeWixRichContent } from './wix-rich-content.mjs';
import { renderRichContent, render } from '../.server/entry-server.js';
import { getCategoryDirectory, resourceInCategory } from '../src/data/categories.js';
import privacyConfig from '../src/data/privacy-config.js';
import { CONSENT_DURATION, consentRecord, parseConsent, trackingConfigured, mayLoadTracking, loadWixSiteScript, WIX_SCRIPT_URL } from '../src/utils/privacy.mjs';

const text = (value, decorations = []) => ({ type: 'TEXT', textData: { text: value, decorations } });
const paragraph = value => ({ type: 'PARAGRAPH', nodes: [text(value)] });
const renderNodes = nodes => renderRichContent(publicRichContent(normalizeWixRichContent({ nodes })));

test('Wix tracking requires consent and completed privacy/platform reviews', () => {
  const consent = { analytics: true };
  assert.equal(trackingConfigured(privacyConfig), true);
  assert.equal(mayLoadTracking(privacyConfig, null, privacyConfig.hostname), false);
  assert.equal(mayLoadTracking(privacyConfig, consent, privacyConfig.hostname), true);
  for (const missing of ['enabled', 'privacyReviewed', 'wixSettingsReviewed']) {
    const config = { ...privacyConfig, enabled: true, privacyReviewed: true, wixSettingsReviewed: true, [missing]: false };
    assert.equal(mayLoadTracking(config, consent, config.hostname), false);
  }
});

test('consent is governed by the site and never written through Wix policy APIs', async () => {
  const controls = await readFile(new URL('../src/components/PrivacyControls.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(controls, /consentPolicyManager|setConsentPolicy/);
  const html = render('/', null);
  assert.match(html, /class="privacy-notice"/);
  assert.match(html, /Allow analytics<\/button>/);
});

test('consent requires an explicit choice and expires after six months or a policy change', () => {
  const now = 1000000000000;
  assert.equal(parseConsent('', privacyConfig, now), null);
  assert.equal(parseConsent('bad json', privacyConfig, now), null);
  assert.equal(parseConsent(consentRecord(false, privacyConfig, now), privacyConfig, now).analytics, false);
  assert.equal(parseConsent(consentRecord(true, privacyConfig, now), privacyConfig, now + CONSENT_DURATION), null);
  assert.equal(parseConsent(consentRecord(true, { ...privacyConfig, policyVersion: privacyConfig.policyVersion + 1 }, now), privacyConfig, now), null);
});

test('Wix script is opt-in only, production-only, GPC-aware and never inserted twice', () => {
  const config = { ...privacyConfig, enabled: true, privacyReviewed: true, wixSettingsReviewed: true };
  const scripts = [];
  const environment = {
    location: { hostname: config.hostname }, navigator: { globalPrivacyControl: false },
    document: {
      getElementById: id => scripts.find(script => script.id === id),
      createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
      head: { appendChild(script) { scripts.push(script); } },
    },
  };
  assert.equal(loadWixSiteScript(environment, config, null), false);
  assert.equal(loadWixSiteScript(environment, config, { analytics: false }), false);
  environment.navigator.globalPrivacyControl = true;
  assert.equal(loadWixSiteScript(environment, config, { analytics: true }), false);
  environment.navigator.globalPrivacyControl = false;
  environment.location.hostname = 'localhost';
  assert.equal(loadWixSiteScript(environment, config, { analytics: true }), false);
  environment.location.hostname = config.hostname;
  assert.equal(loadWixSiteScript(environment, config, { analytics: true }), true);
  assert.equal(scripts[0].src, WIX_SCRIPT_URL);
  assert.equal(scripts[0]['data-client-id'], config.clientId);
  assert.equal(loadWixSiteScript(environment, config, { analytics: true }), false);
});

test('AAO privacy policy uses public-facing language without injecting a tracker', () => {
  const privacy = render('/privacy/', null);
  assert.match(privacy, /How We Use Information/);
  assert.match(privacy, /enabled only after you choose Allow analytics/);
  for (const implementationDetail of ['Wix', 'GitHub Pages', 'CMS', 'visitor token', 'cross-subdomain identity bridge', 'Draft for All Aboard Ohio review']) assert(!privacy.includes(implementationDetail), implementationDetail);
  assert.match(render('/', null), /Privacy settings/);
  assert(!privacy.includes('id="wix-site-script"'));
  assert.equal(render('/', null).includes('class="privacy-notice"'), trackingConfigured(privacyConfig));
});

test('rendering regressions use a deterministic fixture instead of live editorial content', () => {
  assert.match(render('/', null), /Deterministic blog fixture, not live Wix content\./);
});

test('creates responsive WebP files without enlarging small source images', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'aao-thumbnail-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#388cbb' } }).png().toBuffer();
  const result = await createImageVariants(input, 'a'.repeat(20), directory);
  assert.deepEqual(result.variants.map(variant => variant.width), [320, 640, 960]);
  for (const variant of result.variants) {
    const metadata = await sharp(await readFile(join(directory, variant.file))).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
  }
  const small = await sharp({ create: { width: 180, height: 90, channels: 3, background: '#388cbb' } }).png().toBuffer();
  const smallResult = await createImageVariants(small, 'b'.repeat(20), directory);
  assert.deepEqual(smallResult.variants.map(variant => variant.width), [180]);
});

test('header has the source logo and Resources in place of More, with no login', () => {
  const html = render('/', null);
  const nav = html.match(/<nav class="desktop-nav".*?<\/nav>/s)?.[0];
  assert(nav);
  assert.match(nav, /<summary>Resources<\/summary>/);
  assert.match(nav, /href="\/printables\/"/);
  assert(!html.includes('<summary>More</summary>'));
  assert(!html.includes('Log In'));
  assert.match(html, /src="\/header-logo.svg"/);
});

test('compact resource and privacy headers retain the shared mobile navigation', () => {
  for (const path of ['/privacy/', '/analysis/ohio-runs-on-rail-book--84a1aa95-ecc9-4979-a528-c777cd95e09f/']) {
    const html = render(path, null);
    assert.match(html, /site-header compact/);
    assert.equal((html.match(/class="mobile-nav"/g) || []).length, 1);
    assert.match(html, /aria-label="Mobile navigation"/);
    assert.match(html, /aria-label="Open navigation menu"/);
    assert(!html.includes('class="desktop-nav"'));
  }
});

test('downloads and external destinations appear before the long article content and remain at the bottom', () => {
  const download = render('/analysis/ohio-runs-on-rail-book--84a1aa95-ecc9-4979-a528-c777cd95e09f/', null);
  const external = render('/uncategorized/cincinnati-station-information--dde3ec9f-9dbf-401e-9c86-c2fe42261c28/', null);
  for (const html of [download, external]) {
    assert(html.indexOf('class="resource-quick-links"') < html.indexOf('class="prose-content"'));
    assert.match(html, /class="resource-actions"/);
    assert.match(html, /aria-label="Resource downloads and external links"/);
  }
  assert.match(download.replace(/<!--.*?-->/g, ''), /Download All Aboard Ohio/);
  assert.match(external.replace(/<!--.*?-->/g, ''), /Visit (?:www\.)?amtrak.com/);
});

test('rejects unsafe URLs and accepts expected Wix asset URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'https://example.com/\nfoo', '"https://example.com/file.pdf"\n]']) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl('wix:image://v1/asset.png/image.png'), 'https://static.wixstatic.com/media/asset.png');
  assert.match(safeUrl('wix:document://v1/ugd/file.pdf/name.pdf'), /\/ugd\/file.pdf$/);
});

test('normalizes Wix Blog cards using the actual /posts/ field and excludes private/full-content fields', () => {
  const post = normalizeBlogPost({
    _id: 'blog-123', title: ' A rail story ', excerpt: 'A public summary',
    publishedDate: new Date('2026-10-31T12:00:00Z'),
    'link-posts-title': '/posts/a-rail-story', postPageUrl: '/post/wrong-path',
    coverImage: 'wix:image://v1/cover.jpg/image.jpg', author: 'PRIVATE', richContent: { text: 'PRIVATE' },
  });
  assert.equal(post.url, 'https://www.allaboardohio.org/posts/a-rail-story');
  assert.equal(post.title, 'A rail story');
  assert.equal(post.publishedDate, '2026-10-31T12:00:00.000Z');
  assert.equal(post.image, 'https://static.wixstatic.com/media/cover.jpg');
  assert(!JSON.stringify(post).includes('PRIVATE'));
});

test('rejects invalid blog destinations and missing publication fields', () => {
  const data = { _id: 'post', title: 'Story', publishedDate: '2026-10-31', slug: 'story' };
  assert.equal(normalizeBlogPost(data).url, 'https://www.allaboardohio.org/posts/story');
  for (const destination of ['https://example.com/posts/story', '/post/story', 'javascript:alert(1)', '//evil.example/posts/story', '/posts/story?redirect=elsewhere']) {
    assert.throws(() => normalizeBlogPost({ ...data, 'link-posts-title': destination }));
  }
  assert.throws(() => normalizeBlogPost({ ...data, publishedDate: 'invalid' }));
  assert.throws(() => normalizeBlogPost({ ...data, title: '' }));
});

test('latest three blog stories render between the action and joining sections', () => {
  const html = render('/', null);
  assert.equal((html.match(/class="blog-story"/g) || []).length, 3);
  assert(html.indexOf('id="intent-heading"') < html.indexOf('id="blog-heading"'));
  assert(html.indexOf('id="blog-heading"') < html.indexOf('id="join-heading"'));
  assert.match(html, /href="https:\/\/www.allaboardohio.org\/posts\/toledo-takes-center-stage-in-national-rail-conversation"/);
  assert.match(html, /<time dateTime="2026-10-31/);
});

test('normalizes missing categories and malformed optional attachments without leaking private fields', () => {
  const warnings = [];
  const resource = normalizeResource({ _id: 'abc-123', title: 'A resource', _owner: 'PRIVATE', author: 'PRIVATE', arraydocument: '"bad"\n]' }, [], {}, warnings);
  assert.equal(resource.type, 'Uncategorized');
  assert.equal(resource.attachments.length, 0);
  assert.equal(warnings.length, 1);
  assert(!JSON.stringify(resource).includes('PRIVATE'));
});

test('duplicate titles remain unique, and established paths survive title/category changes', () => {
  const first = normalizeResource({ _id: 'abc', title: 'Same title' }, []);
  const second = normalizeResource({ _id: 'def', title: 'Same title' }, []);
  assert.notEqual(first.path, second.path);
  const changed = normalizeResource({ _id: 'abc', title: 'New title' }, [{ id: 'cat', title: 'New type' }], { abc: first.path });
  assert.equal(changed.path, first.path);
  assert.throws(() => normalizeResource({ title: 'Missing ID' }, []));
});

test('public route manifest keeps active paths without exposing withdrawn titles', () => {
  const previous = { active: '/analysis/original-title--active/', withdrawn: '/printables/retired-title--withdrawn/' };
  const active = normalizeResource({ _id: 'active', title: 'Updated active title' }, [], previous);
  const routes = publishedResourceRoutes([active]);
  assert.deepEqual(routes, { active: previous.active });
  assert(!JSON.stringify(routes).includes('retired-title'));
  assert.deepEqual(publishedResourceRoutes([]), {});
});

test('renders paragraphs, H2/H3, bold, italic and external hyperlinks', () => {
  const html = renderNodes([paragraph('Paragraph'), { type: 'HEADING', headingData: { level: 2 }, nodes: [text('Heading two')] }, { type: 'HEADING', headingData: { level: 3 }, nodes: [text('Heading three')] }, { type: 'PARAGRAPH', nodes: [text('Bold', [{ type: 'BOLD' }]), text('Italic', [{ type: 'ITALIC' }]), text('Link', [{ type: 'LINK', linkData: { link: { url: 'https://example.com' } } }])] }]);
  for (const snippet of ['<p>Paragraph</p>', '<h2>Heading two</h2>', '<h3>Heading three</h3>', '<strong>Bold</strong>', '<em>Italic</em>', 'target="_blank"', 'noopener noreferrer', 'opens in a new tab']) assert(html.includes(snippet), snippet);
});

test('renders bulleted/numbered nested lists and quotes', () => {
  const html = renderNodes([{ type: 'BULLETED_LIST', nodes: [{ type: 'LIST_ITEM', nodes: [paragraph('Bullet'), { type: 'ORDERED_LIST', orderedListData: { start: 3 }, nodes: [{ type: 'LIST_ITEM', nodes: [paragraph('Number')] }] }] }] }, { type: 'BLOCKQUOTE', nodes: [paragraph('Quote')] }]);
  assert.match(html, /<ul><li>/);
  assert.match(html, /<ol start="3">/);
  assert.match(html, /<blockquote><p>Quote/);
});

test('renders images with captions and accessibility descriptions using official media normalization', () => {
  const html = renderNodes([{ type: 'IMAGE', imageData: { image: { src: { id: 'asset.png' }, width: 640, height: 480 }, altText: 'Train at the station', caption: 'An Ohio station' } }]);
  assert.match(html, /alt="Train at the station"/);
  assert.match(html, /width="640" height="480"/);
  assert.match(html, /<figcaption>An Ohio station<\/figcaption>/);
  assert.match(html, /static.wixstatic.com/);
});

test('renders hosted video and privacy-conscious external video controls', () => {
  const html = renderNodes([{ type: 'VIDEO', videoData: { video: { src: { id: 'abc123' } }, title: 'Ohio rail' } }, { type: 'VIDEO', videoData: { video: { src: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } }, title: 'Rail video' } }]);
  assert.match(html, /<video controls/);
  assert.match(html, /video.wixstatic.com/);
  assert.match(html, /Play Rail video/);
  assert(!html.includes('<iframe'));
});

test('renders file attachments and linked buttons', () => {
  const html = renderNodes([{ type: 'FILE', fileData: { src: { id: 'document.pdf' }, name: 'Report PDF' } }, { type: 'BUTTON', buttonData: { text: 'Read report', link: { url: 'https://example.com/report' } } }]);
  assert.match(html, /Report PDF/);
  assert.match(html, /class="action-link"/);
  assert.match(html, /https:\/\/example.com\/report/);
});

test('renders actual Wix table-level header semantics', () => {
  const cell = value => ({ type: 'TABLE_CELL', nodes: [paragraph(value)] });
  const html = renderNodes([{ type: 'TABLE', tableData: { columnHeader: true }, nodes: [{ type: 'TABLE_ROW', nodes: [cell('Station'), cell('Route')] }, { type: 'TABLE_ROW', nodes: [cell('Cincinnati'), cell('Cardinal')] }] }]);
  assert.match(html, /<th[^>]*scope="col"/);
  assert.match(html, /<td/);
  assert.match(html, /class="table-scroll"/);
});

test('escapes text, drops unsafe embeds, and never exposes private media URLs', () => {
  const html = renderNodes([paragraph('<script>alert(1)</script>'), { type: 'HTML', htmlData: { html: '<script>bad()</script>' } }, { type: 'IMAGE', imageData: { image: { src: { url: 'https://example.com/PRIVATE', private: true } } } }, { type: 'BUTTON', buttonData: { text: 'Unsafe', link: { url: 'javascript:alert(1)' } } }]);
  assert(!html.includes('<script>'));
  assert(!html.includes('PRIVATE'));
  assert(!html.includes('javascript:'));
  assert.match(html, /&lt;script&gt;/);
});

test('unknown paths render not-found content and notification is optional', () => {
  assert.match(render('/not-a-resource/', null), /Resource Not Found/);
  assert(!render('/', null).includes('class="notification"'));
  assert.match(render('/', { enabled: true, message: 'A rail announcement' }), /A rail announcement/);
});

test('homepage preserves the reference category tabs, lead story and smaller-resource row', () => {
  const html = render('/', null);
  for (const snippet of ['role="tablist"', 'aria-label="Resource categories"', 'role="tabpanel"', 'lead-resource', 'small-resource-grid', 'footer-about', 'footer-brand', 'footer-contact']) assert(html.includes(snippet), snippet);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
  assert(!html.includes('page-intro'));
});

test('resource presentation keeps the blog title band without the homepage navigation', () => {
  const html = render('/uncategorized/cincinnati-station-information--dde3ec9f-9dbf-401e-9c86-c2fe42261c28/', null);
  assert.match(html, /resource-title-band/);
  assert.match(html, /site-header compact/);
  assert(!html.includes('desktop-nav'));
});

test('resource headings follow the selected type and CMS thumbnails are rendered', () => {
  assert.match(render('/', null), /id="browse-heading">Resources<\/h2>/);
  assert.match(render('/analysis/', null).replace(/<!--.*?-->/g, ''), /<h1>Analysis Resources<\/h1>/);
  const html = render('/onboarding/', null);
  assert.match(html.replace(/<!--.*?-->/g, ''), /<h1>Onboarding Resources<\/h1>/);
  assert.match(html, /src="(?:https:\/\/static\.wixstatic\.com\/media\/cb899b_a0a121dbaa374badb6eae24455ded1f7~mv2.png|\/images\/generated\/[a-f0-9]{20}-\d+\.webp)"/);
});

test('featured resources and AAO joining sections follow the library in template order', () => {
  const html = render('/', null);
  const library = html.indexOf('id="browse"');
  const featured = html.indexOf('id="featured-heading"');
  const join = html.indexOf('id="join-heading"');
  assert(library < featured && featured < join);
  assert.match(html, /class="featured-picks"/);
  const featuredSection = html.slice(featured, html.indexOf('</section>', featured));
  assert.equal((featuredSection.match(/content-coming-soon/g) || []).length, 1);
  assert.match(html, /Become a member/);
  assert.match(html, /Join our supporter list/);
  assert(!html.includes('type="email"'));
  assert(!html.includes('data-tagular'));
});

test('category pages have dedicated listings and empty categories do not expose drafts', () => {
  const analysis = render('/analysis/', null);
  assert.match(analysis, /class="category-resource-list"/);
  assert.match(analysis, /Ohio Runs on Rail Book/);
  assert(!analysis.includes('id="blog-heading"'));
  assert(!analysis.includes('id="join-heading"'));
  const printables = render('/printables/', null);
  assert.match(printables.replace(/<!--.*?-->/g, ''), /<h1>Printables Resources<\/h1>/);
  assert.match(printables, /More content on the way/);
  assert(!/\d+ published resource/.test(analysis + printables));
  assert(!/class="results-status"/.test(analysis + printables));
  assert.equal((analysis.match(/class="resource-card small-resource content-coming-soon"/g) || []).length, 1);
  assert.equal((printables.match(/class="resource-card small-resource content-coming-soon"/g) || []).length, 1);
  assert(!printables.includes('Fiscal Analysis of Operating Costs'));
});

test('category directory includes empty categories and secondary references', () => {
  const resource = { typeSlug: 'analysis', categories: [{ id: '65bf1934-b070-4e34-8a61-a6870946ba7b', title: 'Analysis' }, { id: '529c5287-bd31-4c97-a4c5-61598ab909e2', title: 'Printables' }] };
  const directory = getCategoryDirectory([resource]);
  const printables = directory.find(category => category.slug === 'printables');
  assert(resourceInCategory(resource, printables));
  assert.equal(printables.count, 1);
  assert.equal(getCategoryDirectory([]).find(category => category.slug === 'printables').count, 0);
});

test('homepage action section contains four working destinations between featured and joining content', () => {
  const html = render('/', null);
  for (const title of ['Contact my legislators', 'Pass out impactful fliers', 'Host a local event', 'Make the case for passenger rail']) assert(html.includes(title), title);
  assert(html.indexOf('id="featured-heading"') < html.indexOf('id="intent-heading"'));
  assert(html.indexOf('id="intent-heading"') < html.indexOf('id="join-heading"'));
  assert.match(html, /href="https:\/\/www.allaboardohio.org\/advocacy"/);
  assert.match(html, /href="https:\/\/www.allaboardohio.org\/chapters"/);
  assert.match(html, /href="\/analysis\/"/);
  assert.match(html, /class="home-page"/);
  assert(!render('/not-a-resource/', null).includes('class="home-page"'));
});