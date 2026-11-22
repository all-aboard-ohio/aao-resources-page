import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryHeading } from '../src/data/categories.js';

export const SOCIAL_WIDTH = 1200;
export const SOCIAL_HEIGHT = 630;
const root = fileURLToPath(new URL('../', import.meta.url));
const fontfile = resolve(root, 'scripts/Poppins-Bold.ttf');
const regularFont = resolve(root, 'scripts/Poppins-Regular.ttf');
const semiBoldFont = resolve(root, 'scripts/Poppins-SemiBold.ttf');
const montserratFont = resolve(root, 'scripts/Montserrat-Variable.ttf');
const fallbackColor = '#012345';
const escapeText = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));

export function whiteContrast(rgb) {
  const luminance = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  return 1.05 / (luminance + 0.05);
}

export function readableColor(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(value => !Number.isFinite(value) || value < 0 || value > 255)) return fallbackColor;
  let channels = rgb.map(Math.round);
  while (whiteContrast(channels) < 4.5) channels = channels.map(value => Math.floor(value * 0.9));
  return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function socialDescription(value, fallback) {
  const text = String(value || fallback).replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  const shortened = text.slice(0, 157).replace(/\s+\S*$/, '');
  return `${shortened || text.slice(0, 157)}...`;
}

const lineHeightFactors = new Map();

async function relativeLineHeight(font, fontPath, fontSize, lineHeight) {
  const key = `${fontPath}:${font}:${fontSize}:${lineHeight}`;
  if (!lineHeightFactors.has(key)) {
    const heights = [];
    for (const count of [2, 3]) {
      const sample = await sharp({ text: {
        text: `<span line_height="1">${Array(count).fill('Hg').join('\n')}</span>`,
        font: `${font} ${fontSize}`, fontfile: fontPath, rgba: true,
      } }).png().toBuffer({ resolveWithObject: true });
      heights.push(sample.info.height);
    }
    const baseline = heights[1] - heights[0];
    if (baseline <= 0) throw new Error('Unable to measure social preview font line height');
    lineHeightFactors.set(key, (fontSize * lineHeight / baseline).toFixed(6));
  }
  return lineHeightFactors.get(key);
}

async function fitTitle(title, { width, height, size, align, color = '#ffffff', font = 'Poppins Bold', fontPath = fontfile, lineHeight }) {
  for (let fontSize = size; fontSize >= 14; fontSize -= 2) {
    const factor = lineHeight ? await relativeLineHeight(font, fontPath, fontSize, lineHeight) : null;
    const rendered = await sharp({ text: {
      text: `<span foreground="${color}"${factor ? ` line_height="${factor}"` : ''}>${escapeText(title)}</span>`,
      font: `${font} ${fontSize}`, fontfile: fontPath, width, align,
      spacing: 0, wrap: 'word-char', rgba: true,
    } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.height <= height && rendered.info.width <= width) return rendered;
  }
  throw new Error('Social preview title does not fit its text area');
}

export async function renderSocialImage({ title, kind = 'resource', thumbnail, logo, category: categoryName = '', description = '' }) {
  if (!String(title).trim()) throw new Error('Social preview title is required');
  const category = kind === 'category';
  if (!category) {
    const layers = [];
    const categoryText = await fitTitle(categoryName || 'Resource', { width: 762, height: 65, size: 37, align: 'left', color: '#388cbb', font: 'Poppins SemiBold', fontPath: semiBoldFont });
    layers.push({ input: categoryText.data, left: 69, top: 58 });
    const titleText = await fitTitle(title, { width: 762, height: 205, size: 72, align: 'left', color: '#000000', font: 'Poppins', fontPath: regularFont, lineHeight: 1.15 });
    layers.push({ input: titleText.data, left: 69, top: 130 });
    if (description.trim()) {
      const descriptionText = await fitTitle(description, { width: 762, height: 205, size: 37, align: 'left', color: '#b5b5b5', font: 'Montserrat SemiBold', fontPath: montserratFont });
      layers.push({ input: descriptionText.data, left: 69, top: 355 });
    }
    if (thumbnail) {
      const image = await sharp(thumbnail).rotate().resize(250, 250, { fit: 'cover' }).png().toBuffer();
      const mask = Buffer.from('<svg width="250" height="250"><rect width="250" height="250" rx="6" fill="white"/></svg>');
      const rounded = await sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
      layers.push({ input: rounded, left: 881, top: 58 });
    }
    const grayLogo = Buffer.from(logo.toString('utf8').replace(/#ffffff/gi, '#b5b5b5'));
    const mark = await sharp(grayLogo).resize({ height: 45 }).png().toBuffer({ resolveWithObject: true });
    layers.push({ input: mark.data, left: 881 + Math.max(0, 250 - mark.info.width), top: 515 });
    const bars = Buffer.from('<svg width="1200" height="29"><rect width="753" height="29" fill="#388cbb"/><rect x="753" width="78" height="29" fill="#ddf254"/><rect x="831" width="369" height="29" fill="#012345"/></svg>');
    layers.push({ input: bars, left: 0, top: 601 });
    return sharp({ create: { width: SOCIAL_WIDTH, height: SOCIAL_HEIGHT, channels: 3, background: '#ffffff' } }).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  }
  let background = fallbackColor;
  const layers = [];
  if (!category && thumbnail) {
    const average = await sharp(thumbnail).flatten({ background: fallbackColor }).resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    background = readableColor([...average].slice(0, 3));
    layers.push({ input: await sharp(thumbnail).rotate().resize(480, SOCIAL_HEIGHT, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 });
  }
  const logoHeight = category ? 88 : 47;
  const mark = await sharp(logo).resize({ height: logoHeight }).png().toBuffer({ resolveWithObject: true });
  layers.push({ input: mark.data, left: category ? 70 : 528, top: 65 });
  const text = await fitTitle(title, { width: category ? 1060 : 624, height: category ? 350 : 390, size: category ? 94 : 70, align: 'left' });
  layers.push({ input: text.data, left: category ? 70 : 528, top: category ? 220 : Math.round((SOCIAL_HEIGHT - text.info.height) / 2) });
  return sharp({ create: { width: SOCIAL_WIDTH, height: SOCIAL_HEIGHT, channels: 3, background } })
    .composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

export async function generateSocialImages(snapshot, categories) {
  const destination = resolve(root, 'dist/images/social');
  await mkdir(destination, { recursive: true });
  const logo = await readFile(resolve(root, 'public/header-logo.svg'));
  const defaultSource = await readFile(resolve(root, 'docs/references/All_Aboard_Ohio_train_header_image.jpg'));
  async function save(buffer, label, alt) {
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 20);
    const file = `${label}-${hash}.jpg`;
    await writeFile(resolve(destination, file), buffer);
    return { path: `/images/social/${file}`, alt };
  }
  const fallback = await save(await sharp(defaultSource).rotate().resize(SOCIAL_WIDTH, SOCIAL_HEIGHT, { fit: 'cover' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer(), 'default', 'All Aboard Ohio passenger rail resources');
  const resources = new Map();
  for (const resource of snapshot.resources) {
    const thumbnailPath = resource.thumbnail?.srcSet?.split(', ').at(-1)?.split(' ')[0] || resource.thumbnail?.src;
    let thumbnail = defaultSource;
    if (/^\/images\/generated\/[a-f0-9]{20}-(320|640|960)\.webp$/.test(thumbnailPath || '')) {
      try { thumbnail = await readFile(resolve(root, `dist${thumbnailPath}`)); await sharp(thumbnail).metadata(); }
      catch { console.warn(`Social preview uses default thumbnail: ${resource.id}`); thumbnail = defaultSource; }
    }
    const title = resource.shortTitle || resource.title;
    resources.set(resource.id, await save(await renderSocialImage({ title, thumbnail, logo, category: resource.type, description: resource.summary }), 'resource', `${title} | All Aboard Ohio`));
  }
  const categoryImages = new Map();
  for (const category of categories) {
    categoryImages.set(category.slug, await save(await renderSocialImage({ title: category.title, kind: 'category', logo }), 'category', `${categoryHeading(category.title)} | All Aboard Ohio`));
  }
  return { fallback, resources, categories: categoryImages };
}