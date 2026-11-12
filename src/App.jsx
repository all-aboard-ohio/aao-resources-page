import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, AtSign, Bell, CalendarDays, ChartNoAxesCombined, ChevronRight, ExternalLink, FileText, Files, Image, Landmark, Menu, Search, X } from 'lucide-react';
import snapshot from './data/resources.json';
import RichContent, { ExternalLinkAnchor } from './components/RichContent.jsx';
import { slugify } from '../scripts/resource-data.mjs';
import { getCategoryDirectory, resourceInCategory } from './data/categories.js';
import PrivacyControls from './components/PrivacyControls.jsx';
import Privacy from './pages/Privacy.jsx';
import { PREFERENCES_EVENT } from './utils/privacy.mjs';

const MAIN_SITE = 'https://www.allaboardohio.org';
const groups = [
  { title: 'About', links: [['About AAO', '/about'], ["Ohio's Amtrak Routes", '/amtrak-rail-routes'], ['1979 Campaign', '/1979'], ['Join', '/join'], ['Donate', '/donate'], ['Advocacy', '/advocacy'], ['Accomplishments', '/about/accomplishments'], ['Press', '/about/press'], ['Work With Us', '/work-with-us'], ['Business Support', '/support']] },
  { title: 'Events', links: [['All Events', '/events'], ['Ohio Rail Summit 2027', '/ohio-rail-summit'], ['Statewide Meetings', '/events/statewide'], ['AAO Chapters', '/chapters']] },
];

function Brand({ full = false }) {
  return <a href={MAIN_SITE} className="brand" aria-label="All Aboard Ohio home"><img src={full ? '/footer-logo.svg' : '/header-logo.svg'} width={full ? 220 : 223} height={full ? 180 : 54} alt="All Aboard Ohio" /></a>;
}

function Header({ compact }) {
  const categories = getCategoryDirectory(snapshot.resources);
  return <header className={compact ? 'site-header compact' : 'site-header'}><span className="header-red-stripe" aria-hidden="true" /><div className="header-inner"><Brand />
    {compact ? <a href="/" className="back-link"><ArrowLeft size={17} aria-hidden="true" />Back to Resources</a> : <>
      <nav className="desktop-nav" aria-label="Main navigation"><a href={`${MAIN_SITE}/`}>Home</a>{groups.map(group => <details className="nav-group" key={group.title}><summary>{group.title}</summary><ul>{group.links.map(([label, path]) => <li key={path}><a href={MAIN_SITE + path}>{label}</a></li>)}</ul></details>)}<a href={`${MAIN_SITE}/news`}>News</a><a href={`${MAIN_SITE}/shop`}>Shop</a><details className="nav-group resource-menu"><summary>Resources</summary><ul><li><a href="/">All resources</a></li>{categories.map(category => <li key={category.id}><a href={`/${category.slug}/`}>{category.title}</a></li>)}</ul></details></nav>
      <a href={`${MAIN_SITE}/donate`} className="donate-link">Donate<ArrowRight size={15} aria-hidden="true" /></a>
    </>}
    <details className="mobile-nav"><summary aria-label="Open navigation menu"><Menu size={30} strokeWidth={2} aria-hidden="true" /></summary><nav aria-label="Mobile navigation"><a href={`${MAIN_SITE}/`}>Home</a>{groups.map(group => <details key={group.title}><summary>{group.title}</summary>{group.links.map(([label, path]) => <a key={path} href={MAIN_SITE + path}>{label}</a>)}</details>)}<a href={`${MAIN_SITE}/news`}>News</a><a href={`${MAIN_SITE}/shop`}>Shop</a><a href={`${MAIN_SITE}/donate`}>Donate</a><details><summary>Resources</summary><a href="/">All resources</a>{categories.map(category => <a href={`/${category.slug}/`} key={category.id}>{category.title}</a>)}</details></nav></details>
  </div></header>;
}

function Notification({ notice }) {
  const [dismissed, setDismissed] = useState(false);
  if (!notice?.enabled || !notice.message || dismissed) return null;
  return <aside className="notification" aria-label="All Aboard Ohio announcement"><Bell size={18} aria-hidden="true" /><p>{notice.message} {notice.url && <ExternalLinkAnchor href={notice.url}>{notice.linkText || 'Read more'}</ExternalLinkAnchor>}</p><button aria-label="Dismiss announcement" onClick={() => setDismissed(true)}><X size={18} /></button></aside>;
}

function Footer() {
  const socials = [
    ['Instagram', 'https://www.instagram.com/allaboardohio', null],
    ['Bluesky', 'https://bsky.app/profile/allaboardohio.org', null],
    ['Threads', 'https://www.threads.net/@allaboardohio', AtSign],
    ['YouTube', 'https://www.youtube.com/channel/UCkjgivJNrYqcMrxr_i0iLAg', null],
    ['Facebook', 'https://www.facebook.com/AllAboardOhio', null],
    ['X', 'https://x.com/allaboardohio', null],
    ['LinkedIn', 'https://www.linkedin.com/company/all-aboard-ohio/', null],
  ];
  return <footer className="site-footer"><div className="footer-inner">
    <div className="footer-about"><p>All Aboard Ohio is a 501c-3 nonprofit with over 50 years of advocacy work, advocating for improved public transportation and passenger rail service in the United States</p><form role="search" aria-label="Footer resource search" action="/#browse" method="get"><label className="sr-only" htmlFor="footer-search">Search resources</label><input id="footer-search" type="search" name="q" placeholder="Enter search term" required /><button type="submit" title="Search resources" aria-label="Search resources"><Search size={18} aria-hidden="true" /></button></form></div>
    <div className="footer-brand"><Brand full /><p>&copy; {new Date().getFullYear()} by All Aboard Ohio</p></div>
    <div className="footer-contact"><h2>Get in Touch</h2><a href={`${MAIN_SITE}/contact`}>Contact us form</a><a href="mailto:info@allaboardohio.org">info@allaboardohio.org</a><address>3136 Kingsdale Center,<br />#112 Columbus, OH 43221</address><p>Federal Tax ID: 31-1066182</p><ul className="social-links" aria-label="All Aboard Ohio social media">{socials.map(([label, href, Icon]) => <li key={label}><a href={href} aria-label={`${label} (opens in a new tab)`} title={label} target="_blank" rel="noopener noreferrer">{Icon ? <Icon size={25} aria-hidden="true" /> : <span aria-hidden="true" className={label === 'X' ? 'x-brand' : 'social-image-placeholder'}>{label === 'X' ? 'X' : ''}</span>}</a></li>)}</ul></div>
  </div><div className="footer-privacy"><a href="/privacy/">Privacy &amp; cookies</a><button onClick={() => window.dispatchEvent(new Event(PREFERENCES_EVENT))}>Privacy settings</button></div></footer>;
}

function Preview({ resource, featured = false, sizes = '(min-width: 1024px) 230px, (min-width: 768px) 25vw, 260px' }) {
  const [failedImage, setFailedImage] = useState(null);
  const image = resource.thumbnail?.src || resource.image;
  if (image && image !== failedImage) {
    return <div className={`resource-preview ${featured ? 'feature-preview' : ''}`} aria-hidden="true"><img src={image} srcSet={resource.thumbnail?.srcSet} sizes={resource.thumbnail ? sizes : undefined} width={resource.thumbnail?.width} height={resource.thumbnail?.height} alt="" loading={featured ? 'eager' : 'lazy'} fetchPriority={featured ? 'high' : undefined} decoding="async" onError={() => setFailedImage(image)} /></div>;
  }
  return <div className={`resource-preview ${featured ? 'feature-preview' : ''}`} aria-hidden="true"><div className="preview-lines" /><div className="preview-symbol"><FileText strokeWidth={1.3} size={featured ? 58 : 40} /></div><span>{resource.type}</span><Image className="placeholder-mark" size={17} /></div>;
}

function ResourceCard({ resource, featured = false }) {
  return <article className={featured ? 'resource-card lead-resource' : 'resource-card small-resource'}><a href={resource.path} className="resource-link"><Preview resource={resource} featured={featured} sizes={featured ? '(min-width: 1440px) 400px, (min-width: 1024px) 30vw, (min-width: 768px) calc(100vw - 64px), calc(100vw - 40px)' : '(min-width: 1024px) 180px, (min-width: 768px) 25vw, 64px'} /><div className="card-copy"><h3>{resource.shortTitle}</h3><p className="card-summary">{resource.summary}</p><p className="resource-metadata">{resource.type}{resource.attachments.length ? ' / Document' : ''}</p></div></a></article>;
}

function ComingSoonResource() {
  return <article className="resource-card small-resource content-coming-soon"><div className="resource-link"><div className="resource-preview" aria-hidden="true"><FileText size={34} strokeWidth={1.2} /></div><div className="card-copy"><h3>More content on the way</h3></div></div></article>;
}

function FeaturedResources() {
  const resources = snapshot.resources.filter(resource => resource.featured);
  return <section className="featured-resources" aria-labelledby="featured-heading"><h2 id="featured-heading">Featured Resources</h2><ul className="featured-picks">{resources.map(resource => <li key={resource.id}><a href={resource.path}><Preview resource={resource} sizes="(min-width: 768px) 80px, 64px" /><div><h3>{resource.shortTitle}</h3><p>{resource.summary || resource.type}</p></div></a></li>)}{resources.length < 4 && <li><ComingSoonResource /></li>}</ul></section>;
}

function ResourceActions() {
  const brochure = snapshot.resources.find(resource => resource.id === 'a65bdd10-1df4-4e29-92b5-b6fb7177f3ef');
  const analysis = snapshot.resources.find(resource => resource.type === 'Analysis');
  const choices = [
    { title: 'Contact my legislators', description: 'Speak up for better passenger rail and transit in Ohio.', href: `${MAIN_SITE}/advocacy`, Icon: Landmark },
    { title: 'Pass out impactful fliers', description: 'Bring the conversation to your community with materials to share.', href: brochure?.path || `${MAIN_SITE}/contact`, Icon: Files },
    { title: 'Host a local event', description: 'Connect with an AAO chapter to bring people together in your area.', href: `${MAIN_SITE}/chapters`, Icon: CalendarDays },
    { title: 'Make the case for passenger rail', description: 'Find the research and evidence behind a more connected Ohio.', href: analysis ? `/${analysis.typeSlug}/` : `${MAIN_SITE}/advocacy`, Icon: ChartNoAxesCombined },
  ];
  return <section className="intent-section" aria-labelledby="intent-heading"><div className="content-width"><h2 id="intent-heading">What do you want to do?</h2><ul className="intent-choices">{choices.map(({ title, description, href, Icon }) => {
    const external = href.startsWith('https://');
    return <li key={title}><a className="intent-link" href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}><div className="intent-image" aria-hidden="true"><Icon size={64} strokeWidth={1.2} /></div><div className="intent-copy"><h3>{title}<ArrowRight size={17} aria-hidden="true" /></h3><p>{description}</p></div>{external && <span className="sr-only"> (opens in a new tab)</span>}</a></li>;
  })}</ul></div></section>;
}

function LatestBlogStories() {
  const posts = snapshot.blogPosts || [];
  if (!posts.length) return null;
  const formatDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return <section className="blog-section" aria-labelledby="blog-heading"><div className="content-width"><div className="blog-section-heading"><h2 id="blog-heading">Latest From All Aboard Ohio</h2><ExternalLinkAnchor href={`${MAIN_SITE}/news`}>All stories</ExternalLinkAnchor></div><div className="blog-stories">{posts.map(post => <article className="blog-story" key={post.id}><a href={post.url} target="_blank" rel="noopener noreferrer"><Preview resource={{ image: post.image, thumbnail: post.thumbnail, type: 'AAO Blog' }} sizes="(min-width: 1440px) 420px, (min-width: 768px) 31vw, calc(100vw - 40px)" /><div className="blog-story-copy"><time dateTime={post.publishedDate}>{formatDate.format(new Date(post.publishedDate))}</time><h3>{post.title}<ExternalLink size={15} aria-hidden="true" /></h3>{post.summary && <p>{post.summary}</p>}</div><span className="sr-only"> (opens in a new tab)</span></a></article>)}</div></div></section>;
}

function JoinAllAboardOhio() {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = import.meta.env.AAO_JOIN_PHOTO;
  return <section className="join-section" aria-labelledby="join-heading"><div className="join-layout content-width"><div className="join-copy"><div className="join-copy-inner"><p className="eyebrow">All Aboard Ohio</p><h2 id="join-heading">A more connected Ohio starts with you.</h2><p className="join-summary">Join the people working for better passenger rail and public transportation across Ohio.</p><div className="join-actions"><ExternalLinkAnchor className="action-link" href={`${MAIN_SITE}/join`}>Become a member</ExternalLinkAnchor><ExternalLinkAnchor className="supporter-link" href={`${MAIN_SITE}/join`}>Join our supporter list</ExternalLinkAnchor></div><p className="join-note">Stay connected to rail news, advocacy updates, and opportunities to make a difference.</p></div></div><div className="join-photo">{photo && !imageFailed ? <img src={photo} alt="All Aboard Ohio members and supporters" loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <div className="join-photo-placeholder" role="img" aria-label="All Aboard Ohio community photo placeholder"><Image size={44} strokeWidth={1} aria-hidden="true" /></div>}</div></div></section>;
}

function subscribeToLocation(callback) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function Home() {
  const locationQuery = useSyncExternalStore(subscribeToLocation, () => new URLSearchParams(window.location.search).get('q') || '', () => '');
  const [queryOverride, setQuery] = useState(null);
  const query = queryOverride ?? locationQuery;
  const [type, setType] = useState('');
  const [sort, setSort] = useState('featured');
  const resources = snapshot.resources;
  const directory = getCategoryDirectory(resources);
  const types = directory.map(category => category.title);
  const selectedCategory = directory.find(category => category.title === type);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = resources.filter(resource => (!selectedCategory || resourceInCategory(resource, selectedCategory)) && words.every(word => `${resource.title} ${resource.summary} ${resource.type} ${resource.categories.map(category => category.title).join(' ')}`.toLowerCase().includes(word)))
    .sort((left, right) => sort === 'recent' ? String(right.updated).localeCompare(String(left.updated)) : sort === 'featured' ? Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title) : left.title.localeCompare(right.title));
  function chooseType(value) {
    setType(value);
  }
  function navigateCategories(event, index) {
    const buttons = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    let next;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % buttons.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    chooseType(['', ...types][next]);
    buttons[next].focus();
  }
  return <>
    <div className="library-page content-width"><div className="library-page-title"><h1>Resources</h1><p>Research, tools, and information from All Aboard Ohio.</p></div>
      <div className="library-toolbar"><form className="search-field" role="search" onSubmit={event => event.preventDefault()}><Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="resource-search">Search resources</label><input id="resource-search" type="search" placeholder="Search resources" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => setQuery('')}><X size={17} /></button>}</form><label className="sort-field">Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured first</option><option value="title">Title A-Z</option><option value="recent">Recently updated</option></select></label></div>
      <section id="browse" className="latest-section" aria-labelledby="browse-heading"><h2 id="browse-heading">{type ? `${type} Resources` : 'Resources'}</h2><div className="latest-layout">
        <div className="category-tabs" role="tablist" aria-label="Resource categories">{['', ...types].map((value, index) => <button key={value} type="button" role="tab" id={`category-${slugify(value || 'all')}`} aria-controls="resource-panel" aria-selected={type === value} tabIndex={type === value ? 0 : -1} onClick={() => chooseType(value)} onKeyDown={event => navigateCategories(event, index)}><span>{value || 'All'}</span><ChevronRight size={25} aria-hidden="true" /></button>)}</div>
        <div className="latest-panel" id="resource-panel" role="tabpanel" aria-labelledby={`category-${slugify(type || 'all')}`}><p className="sr-only" role="status">{query.trim() ? `Search results for "${query.trim()}"` : ''}</p>
          {matches.length ? <><ResourceCard resource={matches[0]} featured />{(matches.length > 1 || !query.trim()) && <div className="small-resource-grid">{matches.slice(1, 5).map(resource => <ResourceCard key={resource.id} resource={resource} />)}{!query.trim() && matches.length < 5 && <ComingSoonResource />}</div>}</> : query.trim() ? <div className="empty-state"><Search size={30} aria-hidden="true" /><h3>No resources found</h3><p>Try a different search or resource type.</p><button onClick={() => { setQuery(''); chooseType(''); }}>Clear filters</button></div> : <div className="small-resource-grid"><ComingSoonResource /></div>}
          {selectedCategory && <div className="category-callout"><a className="category-page-link" href={`/${selectedCategory.slug}/`}>See More {selectedCategory.title}<ArrowRight size={17} aria-hidden="true" /></a></div>}
        </div>
      </div></section>
      <FeaturedResources />
    </div>
    <ResourceActions />
    <LatestBlogStories />
    <JoinAllAboardOhio />
  </>;
}

function ResourceQuickLinks({ resource }) {
  if (!resource.attachments.length && !resource.externalLinks.length) return null;
  return <nav className="resource-quick-links" aria-label="Resource downloads and external links">{resource.attachments.map(item => <ExternalLinkAnchor key={item.url} href={item.url} className="resource-quick-link"><FileText size={18} aria-hidden="true" /><span>Download {item.name}</span></ExternalLinkAnchor>)}{resource.externalLinks.map(item => <ExternalLinkAnchor key={item.url} href={item.url} className="resource-quick-link"><span>Visit {item.name}</span></ExternalLinkAnchor>)}</nav>;
}

function CategoryPage({ category }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('title');
  const directory = getCategoryDirectory(snapshot.resources);
  const resources = snapshot.resources.filter(resource => resourceInCategory(resource, category));
  const matches = resources.filter(resource => `${resource.title} ${resource.summary}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => sort === 'recent' ? String(right.updated).localeCompare(String(left.updated)) : left.title.localeCompare(right.title));
  return <div className="category-page content-width">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Resources</a></li><li><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{category.title}</span></li></ol></nav>
    <header className="category-page-heading"><h1>{category.title} Resources</h1></header>
    <div className="category-page-layout">
      <nav className="category-directory" aria-label="Resource categories"><a href="/">All resources<ArrowRight size={16} aria-hidden="true" /></a>{directory.map(item => <a key={item.id} href={`/${item.slug}/`} aria-current={item.id === category.id ? 'page' : undefined}>{item.title}</a>)}</nav>
      <section className="category-listing" aria-labelledby="category-list-heading">
        <h2 id="category-list-heading" className="sr-only">{category.title} resources</h2>
        {resources.length > 0 && <div className="library-toolbar"><form className="search-field" role="search" onSubmit={event => event.preventDefault()}><Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="category-search">Search {category.title.toLowerCase()} resources</label><input id="category-search" type="search" placeholder={`Search ${category.title.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => setQuery('')}><X size={17} /></button>}</form><label className="sort-field">Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="title">Title A-Z</option><option value="recent">Recently updated</option></select></label></div>}
        <p role="status" className="sr-only">{query.trim() ? `Search results for "${query.trim()}"` : ''}</p>
        {matches.length || !query.trim() ? <ul className="category-resource-list">{matches.map(resource => <li key={resource.id}><ResourceCard resource={resource} /></li>)}{!query.trim() && matches.length < 4 && <li><ComingSoonResource /></li>}</ul> : <div className="empty-state"><Search size={30} aria-hidden="true" /><h2>No matching resources</h2><p>Try another search.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
      </section>
    </div>
  </div>;
}

function Detail({ resource }) {
  const related = snapshot.resources.filter(item => item.id !== resource.id).slice(0, 3);
  return <><section className="resource-title-band"><div className="detail-width"><nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Resources</a></li><li><ChevronRight size={14} aria-hidden="true" /><a href={`/${resource.typeSlug}/`}>{resource.type}</a></li><li><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{resource.shortTitle}</span></li></ol></nav><div className="detail-top"><div><p className="eyebrow">{resource.type}</p><h1>{resource.title}</h1>{resource.summary && <p className="detail-summary">{resource.summary}</p>}<ResourceQuickLinks resource={resource} /></div><figure className="detail-preview"><Preview resource={resource} /></figure></div></div></section><div className="detail-width"><article className="resource-detail"><RichContent content={resource.content} />
    {(resource.attachments.length > 0 || resource.externalLinks.length > 0) && <div className="resource-actions">{resource.attachments.length > 0 && <section aria-labelledby="download-heading"><h2 id="download-heading">Downloads</h2><ul>{resource.attachments.map(item => <li key={item.url}><ExternalLinkAnchor href={item.url} className="download-link"><FileText size={20} aria-hidden="true" />{item.name}</ExternalLinkAnchor></li>)}</ul></section>}{resource.externalLinks.length > 0 && <section aria-labelledby="external-heading"><h2 id="external-heading">External Resources</h2><ul>{resource.externalLinks.map(item => <li key={item.url}><ExternalLinkAnchor href={item.url}>{item.name}</ExternalLinkAnchor></li>)}</ul></section>}</div>}
    {!resource.content.nodes.length && !resource.attachments.length && !resource.externalLinks.length && <p className="content-notice">Additional materials are not currently available for this resource.</p>}
    <a href="/" className="back-to-library"><ArrowLeft size={17} aria-hidden="true" />Back to all resources</a></article>{related.length > 0 && <section className="related-resources" aria-labelledby="related-heading"><h2 id="related-heading">More From the Library</h2><ul>{related.map(item => <li key={item.id}><a href={item.path}><span><small>{item.type}</small>{item.shortTitle}</span><ArrowRight size={18} aria-hidden="true" /></a></li>)}</ul></section>}</div></>;
}

export default function App({ path = typeof window === 'undefined' ? '/' : window.location.pathname, notice = null }) {
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;
  const resource = snapshot.resources.find(item => item.path === normalizedPath);
  const category = getCategoryDirectory(snapshot.resources).find(item => `/${item.slug}/` === normalizedPath);
  const home = normalizedPath === '/';
  return <><a className="skip-link" href="#main">Skip to content</a><Header compact={!home && !category} /><Notification notice={notice} /><main id="main" className={home || category ? 'home-page' : undefined}>{normalizedPath === '/privacy/' ? <Privacy /> : resource ? <Detail resource={resource} /> : category ? <CategoryPage category={category} /> : home ? <Home /> : <section className="not-found content-width"><p className="eyebrow">404</p><h1>Resource Not Found</h1><p>This resource may have moved or is no longer published.</p><a className="action-link" href="/">Back to Resources<ArrowRight size={17} aria-hidden="true" /></a></section>}</main><Footer /><PrivacyControls /></>;
}
