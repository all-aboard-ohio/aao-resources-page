import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeBlogPost, normalizeResource } from './resource-data.mjs';
import { normalizeWixRichContent } from './wix-rich-content.mjs';

const root = new URL('../', import.meta.url);
const client = createClient({
  modules: { items },
  auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID || '9559f2fe-3c4f-418d-97dc-fe3e6996d980' }),
});

async function retry(operation) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) { failure = error; }
  }
  throw failure;
}

async function allPages(first) {
  let page = await retry(first);
  const records = [...page.items];
  while (page.hasNext()) {
    page = await retry(() => page.next());
    records.push(...page.items);
  }
  return records;
}

async function previousSnapshot() {
  const url = process.env.PREVIOUS_ROUTES_URL;
  if (url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Previous route manifest could not be loaded');
    const snapshotResponse = await fetch(new URL('resources.json', url), { signal: AbortSignal.timeout(20000) });
    if (!snapshotResponse.ok) throw new Error('Previous snapshot could not be loaded');
    return { routes: await response.json(), hash: (await snapshotResponse.json()).hash };
  }
  try { return { routes: JSON.parse(await readFile(new URL('src/data/routes.json', root), 'utf8')), hash: null }; }
  catch (error) { if (error.code === 'ENOENT') return { routes: {}, hash: null }; throw error; }
}

async function main() {
  const previous = await previousSnapshot();
  const routes = previous.routes;
  if (!routes || typeof routes !== 'object' || Array.isArray(routes)) throw new Error('Invalid previous route manifest');
  const records = await allPages(() => client.items.query('Resources').limit(100).find());
  const warnings = [];
  const resources = [];
  for (const record of records) {
    const data = record.data || record;
    const references = await allPages(() => client.items.queryReferenced('Resources', data._id, 'resourceCategory'));
    const categories = references.map(reference => {
      const category = reference.data || reference;
      if (!category._id || !category.title) throw new Error('Invalid category reference');
      return { id: category._id, title: category.title };
    });
    resources.push(normalizeResource({ ...data, studyInfo: normalizeWixRichContent(data.studyInfo, warnings) }, categories, routes, warnings));
  }
  resources.sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(resources.map(resource => resource.id)).size !== resources.length) throw new Error('Duplicate resource IDs');
  if (new Set(resources.map(resource => resource.path)).size !== resources.length) throw new Error('Duplicate resource paths');
  const blogResult = await retry(() => client.items.query('Blog/Posts').le('publishedDate', new Date()).descending('publishedDate').limit(3).find());
  const blogPosts = blogResult.items.map(record => normalizeBlogPost(record.data || record));
  if (new Set(blogPosts.map(post => post.id)).size !== blogPosts.length) throw new Error('Duplicate blog post IDs');
  const hash = createHash('sha256').update(JSON.stringify({ resources, blogPosts })).digest('hex');
  const snapshot = { version: 1, hash, resources, blogPosts };
  const nextRoutes = { ...routes, ...Object.fromEntries(resources.map(resource => [resource.id, resource.path])) };
  for (const directory of ['src/data/', 'public/data/']) await mkdir(new URL(directory, root), { recursive: true });
  for (const directory of ['src/data/', 'public/data/']) {
    await writeFile(new URL(`${directory}resources.json`, root), JSON.stringify(snapshot, null, 2) + '\n');
    await writeFile(new URL(`${directory}routes.json`, root), JSON.stringify(nextRoutes, null, 2) + '\n');
  }
  console.log(`Exported ${resources.length} public resources and ${blogPosts.length} published blog stories. Snapshot ${hash.slice(0, 12)}.`);
  for (const warning of warnings) console.warn(`Content warning: ${warning}`);
  console.log(`Snapshot: ${fileURLToPath(new URL('public/data/resources.json', root))}`);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${hash !== previous.hash}\nhash=${hash}\n`);
  }
}

main().catch(() => {
  console.error('Resource sync failed. No deployment should run; check Wix availability, permissions, and content validation.');
  process.exitCode = 1;
});