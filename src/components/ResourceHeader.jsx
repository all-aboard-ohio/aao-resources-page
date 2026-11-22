import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Menu, Search, Share2, X } from 'lucide-react';
import { getCategoryDirectory } from '../data/categories.js';

const Context = createContext(null);
const mainSite = 'https://www.allaboardohio.org';
const origin = 'https://resources.allaboardohio.org';

export function resourceShareURL(resource) {
  const url = new URL(resource.path, origin);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', 'social');
  return url.href;
}

export function ResourceUIProvider({ resources, children }) {
  const [overlay, setOverlay] = useState('');
  const [message, setMessage] = useState('');
  const overlayRef = useRef('');
  const ignoreScrollUntil = useRef(0);
  const open = useCallback(name => { overlayRef.current = name; setOverlay(name); }, []);
  const close = useCallback(() => { overlayRef.current = ''; ignoreScrollUntil.current = Date.now() + 250; setOverlay(''); }, []);
  async function share(resource) {
    const url = resourceShareURL(resource);
    if (navigator.share) {
      try { await navigator.share({ title: resource.shortTitle || resource.title, url }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); setMessage('Link copied'); }
    catch { setMessage('Unable to copy the link. Please copy it from the address bar.'); }
  }
  return <Context.Provider value={{ resources, overlay, overlayRef, ignoreScrollUntil, open, close, share }}>
    {children}<span className="sr-only" aria-live="polite">{message}</span>{message && <div className="share-toast"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></div>}
  </Context.Provider>;
}

export function ResourceShare({ resource }) {
  const { share } = useContext(Context);
  return <button type="button" className="resource-share" onClick={() => share(resource)}><Share2 size={17} aria-hidden="true" /><span>Share</span></button>;
}

function Modal({ label, close, children, className = '' }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = panel.current;
    const focusable = () => [...node.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length);
    (node.querySelector('[data-autofocus]') || focusable()[0] || node).focus({ preventScroll: true });
    function keys(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        if (!elements.length) { event.preventDefault(); node.focus(); return; }
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keys);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keys); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [close]);
  return <div className="overlay-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}><section ref={panel} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`overlay-panel ${className}`}><div className="overlay-heading"><h2>{label}</h2><button className="icon-button" type="button" onClick={close} aria-label={`Close ${label}`}><X size={22} /></button></div>{children}</section></div>;
}

export function InteractiveHeader({ home, resource }) {
  const { overlay, overlayRef, ignoreScrollUntil, open, share } = useContext(Context);
  const [scroll, setScroll] = useState({ position: 0, hidden: false, progress: 0 });
  const [headingAbove, setHeadingAbove] = useState(false);
  useEffect(() => {
    let previous = window.scrollY;
    function onScroll() {
      const position = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const direction = position - previous;
      const preserveHeader = Boolean(overlayRef.current) || Date.now() < ignoreScrollUntil.current;
      setScroll(current => ({ position, hidden: preserveHeader ? current.hidden : position > 120 && direction > 3 ? true : direction < -3 || position < 20 ? false : current.hidden, progress: height > 0 ? Math.min(100, position / height * 100) : 0 }));
      previous = position;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlayRef, ignoreScrollUntil]);
  useEffect(() => {
    if (!resource) return;
    const heading = document.querySelector('main h1');
    if (!heading || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setHeadingAbove(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(heading);
    return () => observer.disconnect();
  }, [resource]);
  return <><div className={`utility-spacer${home ? ' utility-home-spacer' : ''}`} aria-hidden="true" /><header className={`utility-header${home ? ' utility-home' : ''}${scroll.position > 0 ? ' is-scrolled' : ''}${scroll.position > 195 ? ' is-ready' : ''}${scroll.hidden && !overlay ? ' is-hidden' : ''}`}>
    <div className="utility-inner">
      {resource && headingAbove ? <a href="/" className="utility-context" title={resource.shortTitle}><ArrowLeft size={20} aria-hidden="true" /><span>{resource.shortTitle}</span></a> : <a className="utility-brand" href="/" aria-label="Resources home"><img src="/header-logo.svg" alt="All Aboard Ohio" /></a>}
      <div className="utility-actions"><button className="icon-button" type="button" aria-label="Search resources" aria-expanded={overlay === 'search'} aria-controls="resource-overlay" onClick={() => open('search')}><Search /></button>
        {resource && <button className="icon-button utility-desktop-share" type="button" aria-label="Share resource" onClick={() => share(resource)}><Share2 /></button>}
        <button className="icon-button" type="button" aria-label="Open navigation menu" aria-expanded={overlay === 'menu'} aria-controls="resource-overlay" onClick={() => open('menu')}><Menu /></button></div>
    </div><div className="reading-progress" aria-hidden="true" style={{ width: `${scroll.progress}%` }} />
  </header></>;
}

export function ResourceOverlays() {
  const { resources, overlay, close } = useContext(Context);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = getCategoryDirectory(resources);
  if (!overlay) return <div id="resource-overlay" />;
  return <div id="resource-overlay">
    {overlay === 'menu' && <Modal label="Navigation" close={close} className="overlay-drawer"><nav className="drawer-nav" aria-label="Main navigation">{[['Home', '/'], ['About', `${mainSite}/about`], ['Events', `${mainSite}/events`], ['News', `${mainSite}/news`], ['Shop', `${mainSite}/shop`], ['Resources', '/']].map(([label, url]) => <a key={label} href={url}>{label}</a>)}<h3>Resource categories</h3>{categories.map(item => <a key={item.id} href={`/${item.slug}/`}>{item.title}</a>)}<a className="drawer-return" href={mainSite}>Back to AllAboardOhio.org</a><a className="action-link" href={`${mainSite}/donate`}>Donate</a></nav></Modal>}
    {overlay === 'search' && <Modal label="Search resources" close={close} className="overlay-search"><label className="sr-only" htmlFor="overlay-search">Search resources</label><input id="overlay-search" data-autofocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search resources" /><div className="search-chips"><button type="button" aria-pressed={!category} onClick={() => setCategory('')}>All</button>{categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.slug} onClick={() => setCategory(item.slug)}>{item.title}</button>)}</div><ul className="overlay-results">{resources.filter(item => (!category || item.categories.some(value => categories.find(entry => entry.slug === category)?.id === value.id) || item.typeSlug === category) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase().trim())).map(item => <li key={item.id}><a href={item.path}>{item.shortTitle}</a></li>)}</ul></Modal>}
  </div>;
}