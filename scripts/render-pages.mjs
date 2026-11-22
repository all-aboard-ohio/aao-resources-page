import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../.server/entry-server.js';
import { SITE_URL } from './resource-data.mjs';
import { getCategoryDirectory } from '../src/data/categories.js';
import privacyConfig from '../src/data/privacy-config.js';
import { generateSocialImages, socialDescription, SOCIAL_WIDTH, SOCIAL_HEIGHT } from './social-images.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = JSON.parse(await readFile(resolve(root, 'src/data/resources.json'), 'utf8'));
const categories = getCategoryDirectory(snapshot.resources);
const social = await generateSocialImages(snapshot, []);
const template = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const pages = [
  { path: '/', title: 'All Aboard Ohio Resources | Tools for the Track Ahead', description: 'Passenger rail and public transit resources for Ohio. Find research, policy briefs, maps, printable handouts, and advocacy tools from All Aboard Ohio.', schemaType: 'WebSite' },
  { path: '/privacy/', title: 'Privacy & Cookies | All Aboard Ohio', description: 'Resource-library privacy information and choices.', noindex: !privacyConfig.privacyReviewed },
  ...categories.map(category => ({ path: `/${category.slug}/`, title: `${category.title} Resources | All Aboard Ohio`, description: category.description || `Explore ${category.title.toLowerCase()} resources from All Aboard Ohio.`, image: social.fallback, schemaType: 'CollectionPage' })),
  ...snapshot.resources.map(resource => ({ path: resource.path, title: `Resource: ${resource.shortTitle || resource.title} | All Aboard Ohio`, description: resource.summary || `Explore ${resource.shortTitle || resource.title}, a ${resource.type.toLowerCase()} resource from All Aboard Ohio for passenger rail and transit advocacy.`, image: social.resources.get(resource.id), schemaType: 'WebPage' })),
  { path: '/404.html', title: 'Resource Not Found | All Aboard Ohio', description: 'This resource is unavailable.', notFound: true },
];
for (const page of pages) {
  const canonical = SITE_URL + page.path;
  const image = page.image || social.fallback;
  const imageUrl = SITE_URL + image.path;
  const description = socialDescription(page.description, 'Passenger rail resources from All Aboard Ohio.');
  const tags = [
    ['name', 'description', description],
    ['property', 'og:title', page.title], ['property', 'og:description', description],
    ['property', 'og:type', 'website'], ['property', 'og:url', canonical],
    ['property', 'og:site_name', 'All Aboard Ohio Resources'], ['property', 'og:locale', 'en_US'],
    ['property', 'og:image', imageUrl], ['property', 'og:image:secure_url', imageUrl],
    ['property', 'og:image:width', SOCIAL_WIDTH], ['property', 'og:image:height', SOCIAL_HEIGHT],
    ['property', 'og:image:type', 'image/jpeg'], ['property', 'og:image:alt', image.alt],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', page.title],
    ['name', 'twitter:description', description], ['name', 'twitter:image', imageUrl],
    ['name', 'twitter:image:alt', image.alt],
  ].map(([attribute, name, content]) => `<meta ${attribute}="${name}" content="${escape(content)}">`).join('');
  const structuredData = page.notFound ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': page.schemaType || 'WebPage',
    name: page.title, description, url: canonical, inLanguage: 'en-US',
    image: { '@type': 'ImageObject', url: imageUrl, width: SOCIAL_WIDTH, height: SOCIAL_HEIGHT },
    publisher: { '@type': 'Organization', name: 'All Aboard Ohio', url: 'https://www.allaboardohio.org' },
  }).replace(/</g, '\\u003c')}</script>`;
  const metadata = `${tags}<link rel="canonical" href="${escape(canonical)}">${structuredData}${page.notFound ? '<meta name="robots" content="noindex">' : ''}`;
  const html = template.replace(/<title>.*?<\/title>/, () => `<title>${escape(page.title)}</title>`)
    .replace('</head>', () => `${metadata}${page.noindex ? '<meta name="robots" content="noindex">' : ''}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${render(page.path)}</div>`);
  const destination = resolve(root, 'dist', page.notFound ? '404.html' : `.${page.path}index.html`);
  if (relative(resolve(root, 'dist'), destination).startsWith('..')) throw new Error('Invalid generated path');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}
await writeFile(resolve(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(page => !page.notFound && !page.noindex).map(page => `<url><loc>${escape(SITE_URL + page.path)}</loc></url>`).join('')}</urlset>\n`);
await writeFile(resolve(root, 'dist/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await writeFile(resolve(root, 'dist/CNAME'), 'resources.allaboardohio.org\n');
await writeFile(resolve(root, 'dist/.nojekyll'), '');
console.log(`Rendered ${pages.length} HTML pages from snapshot ${snapshot.hash.slice(0, 12)}.`);