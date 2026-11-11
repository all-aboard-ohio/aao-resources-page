import { useState } from 'react';
import { ExternalLink, FileDown, Play } from 'lucide-react';
import { safeUrl } from '../../scripts/resource-data.mjs';

export function ExternalLinkAnchor({ href, children, className = '' }) {
  const url = safeUrl(href);
  if (!url) return <span>{children}</span>;
  return <a className={className} href={url} target="_blank" rel="noopener noreferrer">
    {children}<ExternalLink size={14} aria-hidden="true" className="external-icon" />
    <span className="sr-only"> (opens in a new tab)</span>
  </a>;
}

function sourceUrl(source, kind) {
  const raw = typeof source === 'string' ? source : source?.url;
  if (raw) return safeUrl(raw, { media: true });
  if (kind === 'image' && /^[\w.~%-]+$/.test(source?.id || '')) return `https://static.wixstatic.com/media/${source.id}`;
  return null;
}

function Video({ data }) {
  const [playing, setPlaying] = useState(false);
  const url = sourceUrl(data.video?.src || data.src, 'video');
  if (!url) return <p className="content-notice">Video unavailable.</p>;
  const parsed = new URL(url);
  let embed;
  if (['www.youtube.com', 'youtube.com', 'youtu.be'].includes(parsed.hostname)) {
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').at(-1);
    if (/^[\w-]{11}$/.test(id || '')) embed = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(parsed.hostname)) {
    const id = parsed.pathname.split('/').filter(Boolean).at(-1);
    if (/^\d+$/.test(id || '')) embed = `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
  }
  const title = data.title || data.caption || 'Resource video';
  if (embed) return <figure className="rich-video">
    {playing ? <iframe src={embed} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : <button className="video-play" onClick={() => setPlaying(true)}><Play aria-hidden="true" />Play {title}</button>}
    <figcaption><ExternalLinkAnchor href={url}>Watch video</ExternalLinkAnchor></figcaption>
  </figure>;
  if (!/\.(mp4|webm|ogg)(\?|$)/i.test(url) && parsed.hostname !== 'video.wixstatic.com') return <p><ExternalLinkAnchor href={url}>Watch {title}</ExternalLinkAnchor></p>;
  return <figure className="rich-video"><video controls preload="metadata" aria-label={title}>
    <source src={url} />
    {(data.captions || []).map((track, index) => {
      const src = sourceUrl(track.src, 'video');
      return src ? <track key={index} kind="captions" src={src} srcLang={track.language || 'en'} label={track.label || 'English'} /> : null;
    })}
    <a href={url}>Download video</a>
  </video>{data.caption && <figcaption>{data.caption}</figcaption>}</figure>;
}

function Text({ data }) {
  let content = data?.text || '';
  for (const [index, decoration] of (data?.decorations || []).entries()) {
    if (decoration.type === 'BOLD') content = <strong key={index}>{content}</strong>;
    if (decoration.type === 'ITALIC') content = <em key={index}>{content}</em>;
    if (decoration.type === 'UNDERLINE') content = <u key={index}>{content}</u>;
    if (decoration.type === 'LINK') content = <ExternalLinkAnchor key={index} href={decoration.linkData?.link?.url}>{content}</ExternalLinkAnchor>;
  }
  return content;
}

export function RichNode({ node, headerCell = false, headerScope = 'col' }) {
  const children = (node.nodes || []).map((child, index) => <RichNode node={child} key={child.id || index} />);
  switch (node.type) {
    case 'TEXT': return <Text data={node.textData} />;
    case 'PARAGRAPH': return <p>{children.length ? children : <br />}</p>;
    case 'HEADING': return node.headingData?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
    case 'BULLETED_LIST': return <ul>{children}</ul>;
    case 'ORDERED_LIST': return <ol start={node.orderedListData?.start || 1}>{children}</ol>;
    case 'LIST_ITEM': return <li>{children}</li>;
    case 'BLOCKQUOTE': return <blockquote>{children}</blockquote>;
    case 'DIVIDER': return <hr />;
    case 'IMAGE': {
      const data = node.imageData || {};
      const url = sourceUrl(data.image?.src || data.src, 'image');
      if (!url) return <p className="content-notice">Image unavailable.</p>;
      return <figure><img src={url} alt={data.altText || data.description || ''} width={data.image?.width || undefined} height={data.image?.height || undefined} loading="lazy" />{data.caption && <figcaption>{data.caption}</figcaption>}</figure>;
    }
    case 'VIDEO': return <Video data={node.videoData || {}} />;
    case 'FILE': {
      const data = node.fileData || {};
      const url = sourceUrl(data.src || data.file?.src, 'file');
      return url ? <p><ExternalLinkAnchor className="download-link" href={url}><FileDown size={18} aria-hidden="true" />{data.name || data.file?.name || 'Download attachment'}</ExternalLinkAnchor></p> : <p className="content-notice">Attachment unavailable.</p>;
    }
    case 'BUTTON': {
      const data = node.buttonData || {};
      return <p><ExternalLinkAnchor className="action-link" href={data.link?.url}>{data.text || 'View resource'}</ExternalLinkAnchor></p>;
    }
    case 'TABLE': return <div className="table-scroll" role="region" aria-label={node.tableData?.title || 'Resource table'} tabIndex={0}><table>{node.tableData?.title && <caption>{node.tableData.title}</caption>}<tbody>{(node.nodes || []).map((row, rowIndex) => <tr key={row.id || rowIndex}>{(row.nodes || []).map((cell, cellIndex) => <RichNode key={cell.id || cellIndex} node={cell} headerCell={Boolean(((node.tableData?.header || node.tableData?.columnHeader) && rowIndex === 0) || (node.tableData?.rowHeader && cellIndex === 0))} headerScope={rowIndex === 0 && (node.tableData?.header || node.tableData?.columnHeader) ? 'col' : 'row'} />)}</tr>)}</tbody></table></div>;
    case 'TABLE_ROW': return <tr>{children}</tr>;
    case 'TABLE_CELL': {
      const data = node.tableCellData || {};
      const Cell = headerCell || data.header ? 'th' : 'td';
      return <Cell colSpan={Math.max(1, Math.min(20, Number(data.colSpan) || 1))} rowSpan={Math.max(1, Math.min(100, Number(data.rowSpan) || 1))} scope={headerCell || data.header ? headerScope : undefined}>{children}</Cell>;
    }
    default: return <>{children}</>;
  }
}

export default function RichContent({ content }) {
  return <div className="prose-content">{(content?.nodes || []).map((node, index) => <RichNode node={node} key={node.id || index} />)}</div>;
}