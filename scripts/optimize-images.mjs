import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const widths = [320, 640, 960];
const policy = `webp-v1-${widths.join('-')}-quality78-${sharp.versions.sharp}`;

export async function createImageVariants(input, stem, directory) {
  if (!/^[a-f0-9]{20}$/.test(stem)) throw new Error('Invalid thumbnail cache key');
  await mkdir(directory, { recursive: true });
  const variants = [];
  for (const width of widths) {
    const result = await sharp(input, { limitInputPixels: 40000000, animated: false })
      .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    if (variants.some(variant => variant.width === result.info.width)) continue;
    const file = `${stem}-${width}.webp`;
    await writeFile(resolve(directory, file), result.data);
    variants.push({ file, width: result.info.width, height: result.info.height, bytes: result.data.length });
  }
  return { sourceBytes: input.length, variants };
}

async function downloadImage(source) {
  const url = new URL(source);
  if (url.protocol !== 'https:' || url.hostname !== 'static.wixstatic.com' || !url.pathname.startsWith('/media/') || url.username || url.password) {
    throw new Error('Thumbnail source must be a public Wix image');
  }
  let failure;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!response.ok || !/^image\/(jpeg|png|webp|avif|gif)(;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('Image download failed');
      if (Number(response.headers.get('content-length')) > 20000000) throw new Error('Image exceeds download limit');
      const chunks = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 20000000) throw new Error('Image exceeds download limit');
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) { failure = error; }
  }
  throw failure;
}

async function cachedVariants(source, cache) {
  const stem = createHash('sha256').update(`${policy}|${source}`).digest('hex').slice(0, 20);
  const manifestPath = resolve(cache, `${stem}.json`);
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (!manifest.variants?.length || manifest.variants.length > 3) throw new Error('Invalid image cache');
    for (const variant of manifest.variants) {
      if (!new RegExp(`^${stem}-(320|640|960)\\.webp$`).test(variant.file) || !Number.isInteger(variant.width) || variant.width < 1 || variant.width > 960) throw new Error('Invalid cached variant');
      if ((await stat(resolve(cache, variant.file))).size !== variant.bytes) throw new Error('Incomplete cached variant');
    }
    return { ...manifest, cached: true };
  } catch {
    const manifest = await createImageVariants(await downloadImage(source), stem, cache);
    await writeFile(manifestPath, JSON.stringify(manifest));
    return { ...manifest, cached: false };
  }
}

async function main() {
  const snapshot = JSON.parse(await readFile(resolve(root, 'src/data/resources.json'), 'utf8'));
  const cache = resolve(root, '.cache/thumbnails');
  const output = resolve(root, 'public/images/generated');
  await mkdir(cache, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const sources = new Map();
  for (const item of [...snapshot.resources, ...(snapshot.blogPosts || [])]) {
    if (!item.image) { delete item.thumbnail; continue; }
    if (!sources.has(item.image)) {
      const manifest = await cachedVariants(item.image, cache);
      for (const variant of manifest.variants) await copyFile(resolve(cache, variant.file), resolve(output, variant.file));
      sources.set(item.image, manifest);
      const largest = manifest.variants.at(-1);
      console.log(`Thumbnail ${manifest.cached ? 'cache hit' : 'generated'}: ${Math.round(manifest.sourceBytes / 1024)} KB original -> ${Math.round(largest.bytes / 1024)} KB at ${largest.width}px.`);
    }
    const manifest = sources.get(item.image);
    const fallback = manifest.variants.find(variant => variant.width >= 640) || manifest.variants.at(-1);
    item.thumbnail = {
      src: `/images/generated/${fallback.file}`,
      srcSet: manifest.variants.map(variant => `/images/generated/${variant.file} ${variant.width}w`).join(', '),
      width: fallback.width, height: fallback.height,
    };
  }
  for (const directory of ['src/data', 'public/data']) {
    await writeFile(resolve(root, directory, 'resources.json'), JSON.stringify(snapshot, null, 2) + '\n');
  }
  console.log(`Optimized ${sources.size} unique CMS images for local static delivery.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(`Image optimization failed: ${error.message}`); process.exitCode = 1; });
}