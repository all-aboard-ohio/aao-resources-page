import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../.server/entry-server.js';
import { SITE_URL } from './resource-data.mjs';
import { getCategoryDirectory } from '../src/data/categories.js';
import privacyConfig from '../src/data/privacy-config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = JSON.parse(await readFile(resolve(root, 'src/data/resources.json'), 'utf8'));
const template = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const pages = [
  { path: '/', title: 'Resources | All Aboard Ohio', description: 'Research, practical tools, and information for a more connected Ohio.' },
  { path: '/privacy/', title: 'Privacy & Cookies | All Aboard Ohio', description: 'Resource-library privacy information and choices.', noindex: !privacyConfig.privacyReviewed },
  ...getCategoryDirectory(snapshot.resources).map(category => ({ path: `/${category.slug}/`, title: `${category.title} Resources | All Aboard Ohio`, description: `Explore ${category.title.toLowerCase()} resources from All Aboard Ohio.` })),
  ...snapshot.resources.map(resource => ({ path: resource.path, title: `${resource.title} | All Aboard Ohio`, description: resource.summary || resource.title })),
  { path: '/404.html', title: 'Resource Not Found | All Aboard Ohio', description: 'This resource is unavailable.', notFound: true },
];
for (const page of pages) {
  const canonical = SITE_URL + page.path;
  const metadata = `<meta name="description" content="${escape(page.description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(canonical)}"><meta name="twitter:card" content="summary">${page.notFound ? '<meta name="robots" content="noindex">' : ''}`;
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