export const SITE_URL = 'https://resources.allaboardohio.org';

export function slugify(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resource';
}

export function normalizeBlogPost(data) {
  if (!data._id || typeof data.title !== 'string' || !data.title.trim()) throw new Error('Blog post is missing an ID or title');
  const date = new Date(data.publishedDate);
  if (!data.publishedDate || Number.isNaN(date.getTime())) throw new Error('Blog post is missing a valid publication date');
  const path = data['link-posts-title'] || (data.slug ? `/posts/${data.slug}` : null);
  if (!path) throw new Error('Blog post has no destination');
  const url = new URL(path, 'https://www.allaboardohio.org');
  if (url.origin !== 'https://www.allaboardohio.org' || !/^\/posts\/[^/]+\/?$/.test(url.pathname)
    || url.search || url.hash || url.username || url.password) throw new Error('Invalid AAO blog destination');
  return {
    id: String(data._id), title: data.title.trim(), summary: typeof data.excerpt === 'string' ? data.excerpt : '',
    image: safeUrl(data.coverImage, { media: true }), publishedDate: date.toISOString(), url: url.href,
  };
}

export function safeUrl(value, { media = false } = {}) {
  if (typeof value !== 'string' || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;
  const url = value.trim();
  if (url.startsWith('wix:image://v1/')) {
    const id = url.slice('wix:image://v1/'.length).split('/')[0];
    return /^[\w.~%-]+$/.test(id) ? `https://static.wixstatic.com/media/${id}` : null;
  }
  if (url.startsWith('wix:document://v1/')) {
    const parts = url.slice('wix:document://v1/'.length).split('/');
    if (parts[0] !== 'ugd' || !/^[\w.%-]+$/.test(parts[1] || '')) return null;
    return `https://www.allaboardohio.org/_files/ugd/${parts[1]}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return null;
    return (media ? ['https:'] : ['https:', 'mailto:', 'tel:']).includes(parsed.protocol)
      ? parsed.href : null;
  } catch { return null; }
}

export function publicRichContent(value, warnings = []) {
  if (!value || typeof value !== 'object') return { nodes: [] };
  const allowed = new Set(['type', 'nodes', 'textData', 'text', 'decorations', 'linkData',
    'link', 'url', 'target', 'headingData', 'level', 'paragraphData', 'textStyle',
    'textAlignment', 'imageData', 'image', 'src', 'id', 'width', 'height', 'altText',
    'caption', 'description', 'videoData', 'video', 'fileData', 'file', 'name',
    'mimeType', 'size', 'buttonData', 'containerData', 'tableData',
    'tableCellData', 'colSpan', 'rowSpan', 'header', 'quoteData', 'listData',
    'orderedListData', 'start', 'thumbnail', 'duration', 'media', 'title', 'captions',
    'columnHeader', 'rowHeader', 'language', 'label']);
  function clean(current, depth = 0) {
    if (depth > 40) throw new Error('Rich content exceeds the supported nesting limit');
    if (Array.isArray(current)) return current.map(child => clean(child, depth + 1));
    if (current && typeof current === 'object') {
      return Object.fromEntries(Object.entries(current).filter(([key]) => allowed.has(key))
        .map(([key, child]) => [key, clean(child, depth + 1)]));
    }
    return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
      ? current : null;
  }
  if (!Array.isArray(value.nodes)) warnings.push('Rich content has no node array');
  return { nodes: clean(value.nodes || []) };
}

export function normalizeResource(data, categories, previousRoutes = {}, warnings = []) {
  if (!/^[a-zA-Z0-9-]+$/.test(data._id || '') || !data.title?.trim()) {
    throw new Error('A resource is missing a valid ID or title');
  }
  const primary = categories.find(category => category.id === data._primaryCategory) || categories[0];
  const type = primary?.title || 'Uncategorized';
  const typeSlug = slugify(type);
  const previous = previousRoutes[data._id];
  const proposed = `/${typeSlug}/${slugify(data.title)}--${data._id}/`;
  const path = typeof previous === 'string' && /^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(previous)
    ? previous : proposed;
  const rawAttachments = Array.isArray(data.arraydocument) ? data.arraydocument : [data.arraydocument];
  const attachments = rawAttachments.filter(Boolean).flatMap((value, index) => {
    const url = safeUrl(typeof value === 'string' ? value : value.url, { media: true });
    if (!url) { warnings.push(`${data._id}: invalid attachment ${index + 1}`); return []; }
    let name = typeof value === 'object' ? value.name : null;
    if (!name && value.startsWith('wix:document:')) {
      try { name = decodeURIComponent(value.split('/').at(-1)); } catch { name = null; }
    }
    return [{ url, name: name || `Download document ${index + 1}` }];
  });
  const externalValues = Array.isArray(data.externalResourceLinks) ? data.externalResourceLinks : [data.externalResourceLinks];
  const externalLinks = externalValues.filter(Boolean).flatMap(value => {
    const url = safeUrl(typeof value === 'string' ? value : value.url);
    if (!url) { warnings.push(`${data._id}: invalid external link`); return []; }
    return [{ url, name: typeof value === 'object' && value.title ? value.title : new URL(url).hostname || 'External resource' }];
  });
  return {
    id: data._id, title: data.title.trim(), shortTitle: data.shortTitle || data.title.trim(),
    summary: data.subjectLine || '', type, typeSlug, categories, path,
    featured: data.featured === true, image: safeUrl(data.imagePreview, { media: true }),
    updated: data._updatedDate instanceof Date ? data._updatedDate.toISOString() : data._updatedDate || null,
    content: publicRichContent(data.studyInfo, warnings), attachments, externalLinks,
  };
}