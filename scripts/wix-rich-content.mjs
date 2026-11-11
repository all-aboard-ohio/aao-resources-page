import { RichContent } from 'ricos-schema';
import { media } from '@wix/sdk';
import { safeUrl } from './resource-data.mjs';

const supported = new Set(['TEXT', 'PARAGRAPH', 'HEADING', 'BULLETED_LIST', 'ORDERED_LIST',
  'LIST_ITEM', 'BLOCKQUOTE', 'DIVIDER', 'IMAGE', 'VIDEO', 'FILE', 'BUTTON', 'TABLE', 'TABLE_ROW', 'TABLE_CELL']);

export function normalizeWixRichContent(value, warnings = []) {
  if (value == null) return { nodes: [] };
  if (!value || typeof value !== 'object' || !Array.isArray(value.nodes)) throw new Error('Invalid Wix Rich Content document');
  const parsed = RichContent.toJSON(RichContent.fromJSON(value));
  function source(sourceValue, kind) {
    if (!sourceValue || sourceValue.private) return null;
    let url = sourceValue.url;
    const id = sourceValue.id;
    if (!url && typeof id === 'string' && /^[\w.~%/-]+$/.test(id)) {
      if (kind === 'image') url = `wix:image://v1/${id}/image`;
      if (kind === 'video') url = `wix:video://v1/${id}/video`;
      if (kind === 'file') url = `wix:document://v1/${id.startsWith('ugd/') ? id : `ugd/${id}`}/file`;
    }
    try {
      if (url?.startsWith('wix:image:')) url = media.getImageUrl(url).url;
      if (url?.startsWith('wix:video:')) url = media.getVideoUrl(url).url;
      if (url?.startsWith('wix:document:')) url = media.getDocumentUrl(url).url;
    } catch { return null; }
    const safe = safeUrl(url, { media: true });
    return safe ? { url: safe } : null;
  }
  function visit(node, depth = 0) {
    if (depth > 35) throw new Error('Rich Content nesting exceeds supported depth');
    if (!supported.has(node.type)) warnings.push(`Unsupported Rich Content node: ${node.type}`);
    if (node.type === 'IMAGE') {
      const data = node.imageData;
      if (data?.image) data.image.src = source(data.image.src, 'image');
      if (!data?.altText) warnings.push('Content image is missing an accessibility description');
    }
    if (node.type === 'VIDEO' && node.videoData?.video) node.videoData.video.src = source(node.videoData.video.src, 'video');
    if (node.type === 'FILE' && node.fileData) node.fileData.src = source(node.fileData.src, 'file');
    node.nodes = (node.nodes || []).map(child => visit(child, depth + 1));
    return node;
  }
  return { nodes: parsed.nodes.map(node => visit(node)) };
}