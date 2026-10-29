import { reportAliases } from './report-aliases';
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { DataError, daysUntil, getListings, getReport, searchStories, youtubeVideoId, type ContentBlock, type Info, type Listings, type Report, type Story } from './data';
import { buildSeo, siteRootFor, syncSeoHead, type PageStatus } from './seo';
import { publicPath } from './paths';
import { infographicPath, resolveInfographic } from './infographics';
import type { RenderState } from './render-state';
import InitiativePage, { InitiativePanel } from './InitiativePage';

const RenderContext = createContext<Pick<RenderState, 'context' | 'now' | 'report' | 'status'>>({ context: { siteUrl: null, previewOrigin: 'http://localhost:4173' }, now: new Date().toISOString(), report: null, status: 200 });

function infographicShareUrl(path: string): string {
  return new URL(publicPath(path), window.location.origin).href;
}

function PageSeo({ data, report = null, status = 'ready' }: { data: Listings; report?: Report | null; status?: PageStatus }) {
  const { context } = useContext(RenderContext);
  const { pathname, search } = useLocation();
  useEffect(() => { syncSeoHead(buildSeo(data, pathname + search, report, context, status)); }, [data, report, context, pathname, search, status]);
  return null;
}

type IconName = 'search' | 'menu' | 'close' | 'left' | 'right' | 'down' | 'caret' | 'document' | 'calendar' | 'check' | 'globe' | 'copy' | 'print' | 'home' | 'coin' | 'eye' | 'edit' | 'scale' | 'bulb' | 'play' | 'arrow';
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" opacity=".12" /><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    left: <path d="m15 5-7 7 7 7" />,
    right: <path d="m9 5 7 7-7 7" />,
    down: <path d="m5 9 7 7 7-7" />,
    document: <><path d="M5 3h9l5 5v13H5Z" fill="currentColor" opacity=".12" stroke="none" /><path d="M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6" /></>,
    calendar: <><path d="M4 9h16v11H4Z" fill="currentColor" opacity=".15" stroke="none" /><path d="M4 5h16v15H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" /></>,
    check: <><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".12" stroke="none" /><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    globe: <><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".12" stroke="none" /><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="1" fill="currentColor" opacity=".12" /><path d="M8 8h12v13H8ZM16 8V3H3v13h5" /></>,
    print: <><path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6Z" /><path d="M17 11h1" /></>,
    home: <><path d="m3 10 9-7 9 7v11H3V10Z M9 21v-7h6v7" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M15 8c-1-1-5-1-6 1-2 3 6 2 6 5 0 3-5 3-7 1M12 5v14" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    caret: <path d="M6 9h12l-6 7Z" fill="currentColor" stroke="none" />,
    edit: <><path d="M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" /><path d="M17.5 2.5a2.1 2.1 0 0 1 3 3L12 14l-4 1 1-4Z" /></>,
    scale: <><path d="M12 3v18M7 21h10M5 7h14M12 5l-7 2M12 5l7 2" /><path d="m5 7-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></>,
    play: <path d="M8 5.5v13l11-6.5Z" fill="currentColor" stroke="none" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand({ site }: { site: Listings['site'] }) {
  return <Link to="/" className="brand" aria-label={`${site.name}，回首頁`}>
    <img className="brand-logo" src={publicPath('/images/tfc-logo.png')} alt={site.name} width="1000" height="191" />
  </Link>;
}

function Header({ data, onInfo }: { data: Listings; onInfo: (info: Info) => void }) {
  const [menu, setMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => { setMenu(false); setOpenDropdown(null); setSearchOpen(false); setQuery(new URLSearchParams(location.search).get('q') ?? ''); }, [location]);

  return <header className="site-header">
    <a className="skip-link" href="#main-content">跳至主要內容</a>
    <div className="header-inner page-padding">
      <Brand site={data.site} />
      <nav id="main-nav" aria-label="主要導覽" className={`main-nav ${menu ? 'is-open' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { setOpenDropdown(null); setMenu(false); menuButton.current?.focus(); } }}>
        {data.navigation.map(item => item.children?.length ? <details className="nav-dropdown" key={item.label} open={openDropdown === item.label}><summary onClick={event => { event.preventDefault(); setOpenDropdown(current => current === item.label ? null : item.label); }}>{item.label}<Icon name="caret" size={14} /></summary><div className="nav-dropdown-links">{item.children.map(child => <Link key={child.href} to={child.href} onClick={() => { setMenu(false); setOpenDropdown(null); }}>{child.label}</Link>)}</div></details> : <NavLink key={item.href} to={item.href} onClick={() => { setMenu(false); setOpenDropdown(null); }}>{item.label}</NavLink>)}
      </nav>
      <span className="header-divider" aria-hidden="true" />
      <div className="header-actions"><a className="donate-button" href={data.site.donationUrl} target="_blank" rel="noopener noreferrer">捐款支持<span className="sr-only">（開啟新視窗）</span></a><a className="official-link" href="https://tfc-taiwan.org.tw/" target="_blank" rel="noopener noreferrer">回官網<span className="sr-only">（開啟新視窗）</span></a><button className="icon-button header-search-toggle" aria-label={searchOpen ? '關閉搜尋' : '前往搜尋'} aria-expanded={searchOpen} aria-controls="header-search" onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) requestAnimationFrame(() => input.current?.focus()); }}><Icon name={searchOpen ? 'close' : 'search'} size={19} /></button></div>
    </div>
    {searchOpen && <form id="header-search" className="search-form header-search page-padding" role="search" action="https://tfc-taiwan.org.tw/" method="get"><input ref={input} name="s" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋台灣事實查核中心…" aria-label="搜尋台灣事實查核中心" /><button className="icon-button" type="submit" aria-label="送出搜尋"><Icon name="search" size={18} /></button></form>}
    <nav className="mobile-dock" aria-label="手機快速導覽"><Link to="/"><Icon name="home" /><span>首頁</span></Link><Link to="/#latest"><Icon name="check" /><span>選舉查核</span></Link>{data.sections.infographics?.slugs.length ? <Link to="/#infographics"><Icon name="bulb" /><span>資訊圖解</span></Link> : <Link to="/reports"><Icon name="document" /><span>查核報告</span></Link>}<button ref={menuButton} aria-label={menu ? '關閉選單' : '開啟選單'} aria-expanded={menu} aria-controls="main-nav" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /><span>選單</span></button></nav>
  </header>;
}

function Illustration({ image, className = '', eager = false }: { image: Story['image']; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`illustration ${className}`}>
    {!image || failed ? <div className="image-fallback" role="img" aria-label={image?.alt ?? '尚未提供封面圖片'}>FACT / CHECK</div> : <img src={publicPath(image.src)} alt={image.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} width="720" height="400" />}
  </div>;
}

const VERDICTS = ['錯誤', '部分錯誤', '事實釐清', '正確'] as const;
/** Presentation only: maps a verdict label to its colour class (verdict-0 … verdict-3). */
function verdictClass(verdict?: string): string {
  const index = VERDICTS.indexOf(verdict as (typeof VERDICTS)[number]);
  return index < 0 ? '' : `verdict-${index}`;
}

function StoryCard({ story, compact = false, hidden = false }: { story: Story; compact?: boolean; hidden?: boolean }) {
  const verdict = story.kind === 'report' && !compact ? story.verdict : undefined;
  return <Link className={`story-card ${compact ? 'compact' : ''}`} to={`/reports/${story.slug}`} hidden={hidden || undefined}>
    <Illustration image={story.image} />
    <div className="story-card-body">
      <div className="story-meta">
        {verdict && <><span className={`verdict-dot ${verdictClass(verdict)}`} aria-hidden="true" /><span className="verdict-label">{verdict}</span></>}
        {story.kind !== 'report' && <span className={`tag ${story.tone}`}>{story.tag}</span>}
        {story.date && <time dateTime={story.date}>{story.date}</time>}
      </div>
      <h3>{story.title}</h3>
      {!compact && <p>{story.description}</p>}
      {!compact && <span className="card-read">閱讀{story.kind === 'report' ? '報告' : '全文'} <span aria-hidden="true">→</span></span>}
    </div>
  </Link>;
}

type YouTubePlayer = { playVideo: () => void; stopVideo: () => void; destroy: () => void };
type YouTubeApi = {
  Player: new (frame: HTMLIFrameElement, options: { events: { onStateChange: (event: { data: number; target: YouTubePlayer }) => void } }) => YouTubePlayer;
  PlayerState: { PLAYING: number };
};
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  const target = window as YouTubeWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = target.onYouTubeIframeAPIReady;
    target.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (target.YT?.Player) resolve(target.YT);
      else reject(new Error('YouTube Player API 載入失敗'));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => { youtubeApiPromise = null; reject(new Error('YouTube Player API 載入失敗')); };
      document.head.append(script);
    }
  });
  return youtubeApiPromise;
}

function YouTubeShorts({ items, heading }: { items: { title: string; url: string }[]; heading: ReactNode }) {
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const players = useRef(new Map<string, YouTubePlayer>());
  const activePlayer = useRef<YouTubePlayer | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const itemKey = items.map(item => item.url).join('|');
  const row = useScrollRow(itemKey);
  useEffect(() => {
    let disposed = false;
    loadYouTubeApi().then(api => {
      if (disposed) return;
      frames.current.forEach((frame, url) => {
        if (players.current.has(url)) return;
        const player = new api.Player(frame, { events: { onStateChange: event => {
          if (event.data !== api.PlayerState.PLAYING) return;
          if (activePlayer.current && activePlayer.current !== event.target) activePlayer.current.stopVideo();
          activePlayer.current = event.target;
        } } });
        players.current.set(url, player);
      });
    }).catch(() => {});
    return () => {
      disposed = true;
      players.current.forEach(player => player.destroy());
      players.current.clear();
      activePlayer.current = null;
    };
  }, [itemKey]);
  function play(url: string) {
    setRevealed(current => {
      const next = new Set(current);
      next.add(url);
      return next;
    });
    const player = players.current.get(url);
    if (!player) return;
    if (activePlayer.current && activePlayer.current !== player) activePlayer.current.stopVideo();
    activePlayer.current = player;
    player.playVideo();
  }
  return <>
    <div className="section-heading no-bar">{heading}<ScrollControls row={row} label="60 秒短影音" /></div>
    <div ref={row.ref} className="shorts-grid scroll-track" tabIndex={0} aria-label="60 秒短影音，可左右捲動" onKeyDown={row.onKeyDown}>{items.map(item => {
    const id = youtubeVideoId(item.url);
    if (!id) return null;
    const showPreview = !revealed.has(item.url);
    return <article className="short-card" key={item.url}>
      <div className="short-player">
        <iframe ref={frame => { if (frame) frames.current.set(item.url, frame); else frames.current.delete(item.url); }} src={`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&playsinline=1`} title={item.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        {showPreview && <button className="short-preview" type="button" aria-label={`播放：${item.title}`} onClick={() => play(item.url)}>
          <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" onError={event => { const fallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback; }} />
          <span className="short-preview-play" aria-hidden="true"><Icon name="play" size={24} /></span>
          <span className="short-preview-title" aria-hidden="true">{item.title}</span>
        </button>}
      </div>
      <a className="short-card-copy" href={item.url} target="_blank" rel="noopener noreferrer"><strong className={showPreview ? 'sr-only' : undefined}>{item.title}</strong><span>在 YouTube 開啟 ↗<span className="sr-only">（開啟新視窗）</span></span></a>
    </article>;
  })}</div>
  </>;
}

type ScrollRow = { ref: React.RefObject<HTMLDivElement | null>; edges: { start: boolean; end: boolean }; scroll: (direction: number) => void; onKeyDown: (event: React.KeyboardEvent) => void };
function useScrollRow(contentKey: string): ScrollRow {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = 0;
    const measure = () => setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    const observer = new ResizeObserver(measure); observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true }); measure();
    return () => { observer.disconnect(); el.removeEventListener('scroll', measure); };
  }, [contentKey]);
  function scroll(direction: number) { const el = ref.current; if (el) el.scrollBy({ left: direction * el.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  function onKeyDown(event: React.KeyboardEvent) { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); scroll(event.key === 'ArrowRight' ? 1 : -1); } }
  return { ref, edges, scroll, onKeyDown };
}

function ScrollControls({ row, label, count }: { row: ScrollRow; label: string; count?: number }) {
  return <div className="scroll-controls">
    <div><button className="icon-button round-button" disabled={row.edges.start} aria-label={`${label}：上一組`} onClick={() => row.scroll(-1)}><Icon name="left" size={18} /></button><button className="icon-button round-button" disabled={row.edges.end} aria-label={`${label}：下一組`} onClick={() => row.scroll(1)}><Icon name="right" size={18} /></button></div>
  </div>;
}

function Carousel({ stories, label, heading, footer }: { stories: Story[]; label: string; heading: ReactNode; footer?: ReactNode }) {
  const row = useScrollRow(stories.map(story => story.slug).join(','));
  return <div className="carousel" role="region" aria-label={label}>
    <div className="section-heading">{heading}<ScrollControls row={row} label={label} count={stories.length} /></div>
    <div ref={row.ref} className="carousel-track" tabIndex={0} aria-label={`${label}，可左右捲動`} onKeyDown={row.onKeyDown}>{stories.map(story => <StoryCard key={story.slug} story={story} />)}</div>
    {footer && <div className="carousel-footer">{footer}</div>}
  </div>;
}

function InfographicGallery({ data, heading }: { data: Listings; heading: ReactNode }) {
  const section = data.sections.infographics!;
  const [active, setActive] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selected = section.items?.find(item => item.slug === active);
  const cards = selected?.cards ?? [];
  const row = useScrollRow(section.items?.map(group => group.slug).join(',') ?? '');
  useEffect(() => {
    const element = dialog.current;
    if (active && !element?.open) element?.showModal();
    if (!active && element?.open) element.close();
  }, [active]);
  function close() { setActive(null); setShareStatus(''); trigger.current?.focus(); }
  function move(delta: number) { setIndex(current => (current + delta + cards.length) % cards.length); setShareStatus(''); }
  async function share() {
    if (!active || !cards[index]) return;
    const pageUrl = infographicShareUrl(infographicPath(active, index + 1));
    try {
      if (navigator.share) await navigator.share({ url: pageUrl });
      else { await navigator.clipboard.writeText(pageUrl); setShareStatus('已複製這張圖卡的分享連結'); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus('無法自動分享，請複製圖卡連結'); }
  }
  function startSwipe(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  }
  function endSwipe(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    move(deltaX < 0 ? 1 : -1);
  }
  return <>
    <div className="section-heading no-bar">{heading}<ScrollControls row={row} label="圖卡懶人包" /></div>
    <div ref={row.ref} className="infographic-grid scroll-track" tabIndex={0} aria-label="圖卡懶人包，可左右捲動" onKeyDown={row.onKeyDown}>{(section.items ?? []).map(item => {
      const story = data.stories.find(value => value.slug === item.slug);
      return <div className="infographic-card" key={item.slug}>
        <button type="button" className="infographic-open" aria-label={`查看圖卡：${item.title}`} onClick={event => { trigger.current = event.currentTarget; setIndex(0); setActive(item.slug); }}>
          <Illustration image={item.cards[0]?.image ?? story?.image ?? null} />
          <span className="infographic-count"><Icon name="copy" size={13} /> {item.cards.length}</span>
          <span className="infographic-hover" aria-hidden="true"><span>點擊查看大圖</span></span>
        </button>
        <span className="infographic-copy"><small>{story?.tag ?? '圖卡懶人包'}</small><strong>{item.title}</strong>{story && <Link to={`/reports/${story.slug}`}>閱讀完整內容 ↗</Link>}</span>
      </div>;
    })}</div>
    <dialog ref={dialog} className="infographic-lightbox" aria-label="圖卡大圖瀏覽" onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }}>
      {selected && <div className="lightbox-layout"><div className="lightbox-top"><span>{index + 1} / {cards.length}</span><strong>{selected.title}</strong><button type="button" aria-label="關閉圖卡" onClick={close}><Icon name="close" /></button></div><div className="lightbox-stage"><button type="button" className="lightbox-arrow" aria-label="上一張" onClick={() => move(-1)}><Icon name="left" /></button><figure onTouchStart={startSwipe} onTouchEnd={endSwipe} onTouchCancel={() => { touchStart.current = null; }}><img src={publicPath(cards[index].image.src)} alt={cards[index].image.alt} /><figcaption>{cards[index].caption}</figcaption></figure><button type="button" className="lightbox-arrow" aria-label="下一張" onClick={() => move(1)}><Icon name="right" /></button></div><div className="lightbox-bottom"><button type="button" onClick={share}><Icon name="copy" size={17} />分享這張圖卡</button><span role="status">{shareStatus}</span></div></div>}
    </dialog>
  </>;
}

function InfographicPage({ data }: { data: Listings }) {
  const { slug = '', number = '' } = useParams();
  const [shareStatus, setShareStatus] = useState('');
  useEffect(() => setShareStatus(''), [slug, number]);
  const selected = resolveInfographic(data, infographicPath(slug, Number(number)));
  if (!selected) return <><PageSeo data={data} status="not-found" /><ErrorPage /></>;
  const { story, group, card } = selected;
  const current = selected.number;
  const total = group.cards.length;
  async function share() {
    const pageUrl = infographicShareUrl(infographicPath(slug, current));
    try {
      if (navigator.share) await navigator.share({ url: pageUrl });
      else { await navigator.clipboard.writeText(pageUrl); setShareStatus('已複製這張圖卡的專頁連結'); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus(`請複製網址：${pageUrl}`); }
  }
  return <><PageSeo data={data} /><article className="infographic-page">
    <nav className="breadcrumbs infographic-breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><Link to="/#infographics">圖卡懶人包</Link><span aria-hidden="true">／</span><span>{group.title}</span></nav>
    <div className="infographic-viewer"><div className="lightbox-layout">
      <div className="lightbox-top"><span>{current} / {total}</span><h1>{group.title}</h1><Link className="infographic-close" to="/#infographics" aria-label="返回圖卡列表"><Icon name="close" /></Link></div>
      <div className="lightbox-stage"><Link className="lightbox-arrow" to={infographicPath(slug, current === 1 ? total : current - 1)} aria-label="上一張"><Icon name="left" /></Link><figure><img src={publicPath(card.image.src)} alt={card.image.alt} width="720" height="900" /><figcaption>{card.caption}</figcaption></figure><Link className="lightbox-arrow" to={infographicPath(slug, current === total ? 1 : current + 1)} aria-label="下一張"><Icon name="right" /></Link></div>
      <div className="lightbox-bottom"><button type="button" onClick={share}><Icon name="copy" size={17} />分享這張圖卡</button><span role="status">{shareStatus}</span></div>
    </div></div>
    <div className="infographic-context">{(story?.description ?? group.description) && <p>{story?.description ?? group.description}</p>}{story && <Link to={`/reports/${story.slug}`}>閱讀原文章 ↗</Link>}</div>
  </article></>;
}

function HomePage({ data, onInfo }: { data: Listings; onInfo: (info: Info) => void }) {
  const { now, context } = useContext(RenderContext);
  const { hero, sections, stories } = data;
  const [script, setScript] = useState<string | null>(sections.scripts.items[0]?.id ?? null);
  const [today, setToday] = useState(() => new Date(now));
  useEffect(() => { setToday(new Date()); const timer = window.setInterval(() => setToday(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const pick = (slugs: string[]) => slugs.flatMap(slug => stories.find(story => story.slug === slug) ?? []);
  const homeReports = sections.reports.items.flatMap(item => {
    const story = stories.find(value => value.slug === item.slug);
    return story ? [{ ...story, title: item.title ?? story.title }] : [];
  });

  return <>
    <PageSeo data={data} />
    {(data.isMock || context.isPreview) && <p className="review-notice page-padding" role="note">{data.site.notice}</p>}
    <section className="hero section-padding grid-texture" id="about" aria-labelledby="hero-title">
      <div className="hero-intro"><div className="hero-kicker"><span>{hero.kicker}</span><small>2026 ELECTIONS</small></div><h1 id="hero-title">{hero.title.map(line => <span key={line}>{line}</span>)}</h1><p>{hero.description}</p><div className="countdown"><div><span>VOTING DAY</span><time dateTime={hero.electionDate}>{hero.electionDate.replaceAll('-', '.')}</time></div><p>距離投票日還有 <strong>{daysUntil(hero.electionDate, today)}</strong> 天</p></div></div>
      <div className="election-facts"><h2>{hero.factsTitle}</h2><ol>{hero.facts.map((fact, index) => <li key={fact.title}><span className="fact-number">{index + 1}</span><div><h3>{fact.title}</h3><p>{fact.description}</p></div></li>)}</ol></div>
    </section>
    {!!homeReports.length && <section className="reports-section section-padding" id="latest" aria-labelledby="latest-title">
      <Carousel stories={homeReports} label={sections.reports.title}
        heading={<h2 id="latest-title">{sections.reports.title}</h2>}
        footer={<Link className="pill-button section-more" to="/reports">查看全部查核報告<Icon name="arrow" size={16} /></Link>} />
    </section>}
    {sections.initiative && <section className="initiative-section section-padding" id="initiative" aria-labelledby="initiative-title">{sections.initiative.content ? <InitiativePanel title={sections.initiative.title} page={sections.initiative.content} description={sections.initiative.description} isMock={data.isMock} embedded /> : <><h2 id="initiative-title">{sections.initiative.title}</h2><p>{sections.initiative.description}</p></>}</section>}
    {!!sections.analyses.slugs.length && <section className="analysis-section section-padding" id="analysis" aria-labelledby="analysis-title">
      <Carousel stories={pick(sections.analyses.slugs)} label="資訊操弄解析" heading={<div><h2 id="analysis-title">{sections.analyses.title}</h2><p>{sections.analyses.description}</p></div>} />
    </section>}
    {!!sections.shorts?.items.length && <section className="shorts-section section-padding" id="shorts" aria-labelledby="shorts-title">
      <YouTubeShorts items={sections.shorts.items} heading={<div><h2 id="shorts-title">{sections.shorts.title}</h2><p>{sections.shorts.description}</p></div>} />
    </section>}
    {sections.infographics && <section className="infographics-section section-padding grid-texture" id="infographics" aria-labelledby="infographics-title">
      {sections.infographics.items?.length ? <InfographicGallery data={data} heading={<div><h2 id="infographics-title">{sections.infographics.title}</h2><p>{sections.infographics.description}</p></div>} /> : <><h2 id="infographics-title">{sections.infographics.title}</h2><p>{sections.infographics.description}</p><p className="pending-content">圖卡素材待補入，目前尚未發布圖卡。</p>{!!sections.infographics.pendingItems?.length && <ul className="pending-gallery-list">{sections.infographics.pendingItems.map(group => <li key={group.slug}>{group.title}（{group.count}張）</li>)}</ul>}</>}
    </section>}
    <section className="rumors-section section-padding" id="rumors" aria-labelledby="rumors-title">
      <h2 id="rumors-title">{sections.rumors.title}</h2>
      <div className="rumors-layout">
        <div className="scripts">{sections.scripts.items.map(item => <div className={`accordion ${script === item.id ? 'is-open' : ''}`} key={item.id}><h4><button id={`script-toggle-${item.id}`} aria-expanded={script === item.id} aria-controls={`script-${item.id}`} onClick={() => setScript(script === item.id ? null : item.id)}>{item.question}<Icon name="caret" size={18} /></button></h4><div id={`script-${item.id}`} role="region" aria-labelledby={`script-toggle-${item.id}`} hidden={script !== item.id}>{item.answer.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}{item.href && <p className="script-reading"><a href={item.href} target="_blank" rel="noopener noreferrer">延伸閱讀 <span aria-hidden="true">↗</span><span className="sr-only">：{item.question}（開啟新視窗）</span></a></p>}</div></div>)}</div>
      </div>
    </section>
    <section className="process-section section-padding" id="process" aria-labelledby="process-title"><div className="center-heading"><h2 id="process-title">{sections.process.title}</h2></div><div className="process-grid">{sections.process.items.map(item => <div className="process-card" key={item.id}><span className={`process-icon ${item.tone}`}><Icon name={item.icon} size={30} /></span><h3>{item.title}</h3><p>{item.description}</p>{item.href ? (item.href.startsWith('/') ? <Link className="text-button" to={item.href}>閱讀全文 <span aria-hidden="true">→</span><span className="sr-only">：{item.title}</span></Link> : <a className="text-button" href={item.href} target="_blank" rel="noopener noreferrer">閱讀全文 ↗<span className="sr-only">：{item.title}（開啟新視窗）</span></a>) : <button className="text-button" onClick={() => onInfo(item)}>了解更多 <span aria-hidden="true">→</span><span className="sr-only">：{item.title}</span></button>}</div>)}</div></section>
    {(!!sections.learning.items.length || !!sections.learning.resources?.length) && <section className="learning-section section-padding" id="learning" aria-labelledby="learning-title"><div className="center-heading"><h2 id="learning-title">{sections.learning.title}</h2></div><div className="learning-grid">{sections.learning.items.map(item => { const story = stories.find(s => s.slug === item.slug); return story && <div key={item.slug} className="learning-item"><Link to={`/reports/${item.slug}`} className="learning-art" tabIndex={-1} aria-hidden="true"><Illustration image={story.image} /></Link><div><span className="learning-topic">{item.badge}</span><h3>{story.title}</h3><p>{story.description}</p><Link to={`/reports/${item.slug}`}>閱讀教學指南<Icon name="arrow" size={16} /><span className="sr-only">：{story.title}</span></Link></div></div>; })}{sections.learning.resources?.map(item => <div className="learning-item" key={item.title}><div><h3>{item.title}</h3><p>{item.description}</p>{item.href && (item.href.startsWith('/') ? <Link to={item.href}>閱讀教學指南 ↗</Link> : <a href={item.href} target="_blank" rel="noopener noreferrer">閱讀教學指南 ↗</a>)}</div></div>)}</div></section>}
    <section className="activities-section section-padding" id="activities" aria-labelledby="activities-title"><div className="activities-inner"><h2 id="activities-title">{sections.activities.title}</h2><div className="activity-list">{sections.activities.items.map(item => <div className="activity" key={item.id}><span className={`activity-date ink-${item.tone}`}>{item.dateLabel}</span><div className="activity-content"><span className="tag neutral">{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p></div>{item.cta && (item.href ? item.href.startsWith('/') ? <Link className="button primary" to={item.href}>{item.cta}<span className="sr-only">：{item.title}</span> ↗</Link> : <a className="button primary" href={item.href} target="_blank" rel="noopener noreferrer">{item.cta}<span className="sr-only">：{item.title}（開啟新視窗）</span> ↗</a> : <button className="button primary" onClick={() => onInfo(item)}>{item.cta}<span className="sr-only">：{item.title}</span><span aria-hidden="true">↗</span></button>)}</div>)}</div></div></section>
  </>;
}

/** Cards beyond this count stay in the HTML (for no-JS readers and crawlers) but are hidden until「載入更多」. */
const LISTING_PAGE_SIZE = 12;

function ListingsPage({ data }: { data: Listings }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const requestedCategory = params.get('category') === '公投' ? '公投議題' : params.get('category');
  const category = data.sections.reports.categories.includes(requestedCategory as typeof data.sections.reports.categories[number]) ? requestedCategory! : '全部';
  const [visible, setVisible] = useState(LISTING_PAGE_SIZE);
  useEffect(() => setVisible(LISTING_PAGE_SIZE), [query, category]);
  const stories = searchStories(query ? data.stories : data.stories.filter(story => story.kind === 'report'), query, category);
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value && value !== '全部') next.set(key, value); else next.delete(key); setParams(next); }
  return <section className="listing-page section-padding grid-texture"><PageSeo data={data} />
    <nav className="breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><span>{query ? '搜尋結果' : '查核報告'}</span></nav>
    <span className="eyebrow">THE FACTCHECK INDEX</span>
    <h1>{query ? '尋找資訊的真實脈絡' : '選舉查核報告'}</h1>
    <p className="listing-intro">彙整台灣事實查核中心針對 2026 地方選舉與公投議題發布的查核報告，隨最新查證進度持續更新。</p>
    <div className="listing-filters"><div className="segmented" role="group" aria-label="篩選報告分類">{['全部', ...data.sections.reports.categories].map(value => <button key={value} aria-pressed={category === value} onClick={() => update('category', value)}>{value === '公投議題' ? '公投' : value}</button>)}</div><p role="status">{query && <>「{query}」・</>}{stories.length} 篇內容</p></div>
    {stories.length ? <>
      <div className="listing-grid">{stories.map((story, index) => <StoryCard story={story} key={story.slug} hidden={index >= visible} />)}</div>
      {stories.length > visible && <div className="listing-more"><button className="pill-button" type="button" onClick={() => setVisible(count => count + LISTING_PAGE_SIZE)}>載入更多報告<span className="sr-only">（尚有 {stories.length - visible} 篇）</span></button></div>}
    </> : <div className="empty-state"><Icon name="search" size={34} /><h2>{category === '辯論會查核' ? '敬請期待' : '沒有找到符合的內容'}</h2><p>{category === '辯論會查核' ? '辯論會查核內容將於發布後更新。' : '試試較短的關鍵字，或切換其他分類。'}</p><button className="button secondary" onClick={() => setParams({})}>清除搜尋與篩選</button></div>}
  </section>;
}

function ShareTools({ report, data }: { report: Report; data: Listings }) {
  const { context } = useContext(RenderContext);
  const [message, setMessage] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const url = siteRootFor(data, context) + `/reports/${report.slug}`;
  async function copy() { try { await navigator.clipboard.writeText(url); setMessage('已複製文章連結'); } catch { setManualCopy(true); setMessage('請選取下方連結複製'); } }
  return <div className="share-group"><span>分享：</span><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="分享到 Facebook（開啟新視窗）">Facebook</a><a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="分享到 LINE（開啟新視窗）">LINE</a><button className="icon-button" aria-label="複製文章連結" onClick={copy}><Icon name="copy" size={17} /></button><button className="share-text-button" type="button" aria-label="列印報告" onClick={() => window.print()}>列印</button><span className="share-status" role="status">{message}</span>{manualCopy && <input aria-label="文章網址" readOnly value={url} onFocus={event => event.target.select()} />}</div>;
}

function InlineContent({ content }: { content: Extract<ContentBlock, { type: 'paragraph' }>['content'] }) {
  return <>{content.map((run, index) => {
    let text: ReactNode = run.text;
    if (run.bold) text = <strong>{text}</strong>;
    if (run.italic) text = <em>{text}</em>;
    if (run.href) text = <a href={run.href} target="_blank" rel="noopener noreferrer">{text}</a>;
    return <React.Fragment key={index}>{text}</React.Fragment>;
  })}</>;
}

function ContentBlocks({ blocks, trimParagraphEdges = false }: { blocks: ContentBlock[]; trimParagraphEdges?: boolean }) {
  return <div className="article-content">{blocks.map((block, index) => {
    if (block.type === 'paragraph') {
      const content = trimParagraphEdges ? block.content.map(run => ({ ...run })) : block.content;
      if (trimParagraphEdges) {
        while (content.length && !content[0].text.trim()) content.shift();
        while (content.length && !content[content.length - 1].text.trim()) content.pop();
        if (content.length) {
          content[0].text = content[0].text.trimStart();
          content[content.length - 1].text = content[content.length - 1].text.trimEnd();
        }
      }
      return content.length ? <p key={index}><InlineContent content={content} /></p> : null;
    }
    if (block.type === 'heading') {
      const Heading = block.level === 3 ? 'h3' : 'h4';
      return <Heading key={index}><InlineContent content={block.content} /></Heading>;
    }
    if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return <List key={index}>{block.items.map((item, i) => <li key={i}><InlineContent content={item} /></li>)}</List>;
    }
    return <figure key={index}><img src={publicPath(block.image.src)} alt={block.image.alt} loading="lazy" decoding="async" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
  })}</div>;
}

function SectionContent({ section }: { section: Report['background'] }) {
  if (section.blocks) return <ContentBlocks blocks={section.blocks} />;
  return <>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.image && <figure><Illustration image={section.image} /><figcaption>{section.caption}</figcaption></figure>}</>;
}

function ArticleBody({ report, data }: { report: Report; data: Listings }) {
  const { context } = useContext(RenderContext);
  if (report.initiativeContent) return <InitiativePage report={report} />;
  const isGuide = report.kind === 'guide' || report.category === '選舉工具箱';
  const showSources = report.kind !== 'report' && report.sources.length > 0;
  const related = report.relatedSlugs.flatMap(slug => data.stories.find(story => story.slug === slug) ?? []);
  const kind = report.kind === 'report' ? '查核報告' : report.kind === 'analysis' ? '資訊操弄解析' : report.category === '選舉工具箱' ? '選舉工具箱' : '查核學堂';
  return <article className="report-page">
    <nav className="breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><Link to={report.kind === 'report' ? '/reports' : report.kind === 'analysis' ? '/#analysis' : isGuide ? '/#process' : '/#learning'}>{kind}</Link>{report.category && report.category !== kind && <><span aria-hidden="true">／</span><span>{report.category}</span></>}</nav>
    <div className="article-tags">{report.tags.map(tag => <span className={`tag ${tag === report.verdict ? `verdict-tag ${verdictClass(tag)}` : 'topic-tag'}`} key={tag}>{tag}</span>)}</div>
    <h1>{report.title}</h1>{!isGuide && <p className="article-finding">{report.finding}</p>}
    <div className="article-meta">{report.published && <span><strong>發佈：</strong><time dateTime={report.published}>{report.published}</time></span>}{!isGuide && <>{report.updated && <span><strong>更新：</strong><time dateTime={report.updated}>{report.updated}</time></span>}{report.presentation?.showReportMetadata !== false && <><span><strong>報告編號：</strong>{report.reportId}</span><span><strong>查核記者：</strong>{report.reporter}</span><span><strong>責任編輯：</strong>{report.editor}</span></>}</>}</div>
    {report.isMock ? <p className="article-mock-note"><span className="tag neutral">MOCK DATA</span> 本文為虛構示範，不代表真實事件或查核結論。</p> : (data.isMock || context.isPreview) && <p className="article-mock-note"><span className="tag neutral">PREVIEW</span> {data.site.notice}</p>}
    <div className="article-toolbar">{!isGuide && <nav aria-label="文章目錄"><span>內容：</span><a href="#background">背景</a><a href="#verification">{report.kind === 'report' ? '查核' : '解析'}</a>{!!report.supplementarySections?.length && <a href="#supplementary">補充資料</a>}{showSources && <a href="#sources">資料來源</a>}</nav>}<ShareTools report={report} data={data} /></div>
    {report.image && <figure className="article-cover"><Illustration image={report.image} eager /><figcaption>{report.imageCaption}</figcaption></figure>}
    {isGuide ? <div className="article-section guide-body">
      <SectionContent section={report.background} />
      {report.checkSections.map(section => <section className="guide-section" id={section.id} key={section.id}><h2>{section.title}</h2><SectionContent section={section} /></section>)}
      {report.supplementarySections?.map(section => <section className="guide-section" id={section.id} key={section.id}><h2>{section.title}</h2><SectionContent section={section} /></section>)}
    </div> : <>
    {report.presentation?.showSummary !== false && <section className="article-summary" aria-labelledby="summary-heading"><h2 id="summary-heading">{report.kind === 'report' ? '查核摘要' : '重點摘要'}</h2>{report.summaryBlocks ? <ContentBlocks blocks={report.summaryBlocks} trimParagraphEdges /> : <ol>{report.summaryPoints.map(point => <li key={point}>{point}</li>)}</ol>}{report.summaryClose && <p>{report.summaryClose}</p>}</section>}
    <section className="article-section" id="background"><h2>{report.background.title}</h2><SectionContent section={report.background} /></section>
    <section className="article-section" id="verification"><h2>{report.kind === 'report' ? '查核' : '深入解析'}</h2>{report.checkSections.map(section => <section className="check-section" key={section.id} id={section.id}><h3>{section.title}</h3><SectionContent section={section} /></section>)}</section>
    {!!report.supplementarySections?.length && <section className="article-section" id="supplementary"><h2>補充資料</h2>{report.supplementarySections.map(section => <section className="check-section" key={section.id} id={section.id}><h3>{section.title}</h3><SectionContent section={section} /></section>)}</section>}
    </>}
    {!!report.organizationGroups?.length && <div className="article-organizations">{report.organizationGroups.map(group => <section className="article-section organization-group" id={group.id} aria-labelledby={`${group.id}-heading`} key={group.id}>
      <h2 id={`${group.id}-heading`}>{group.title}</h2>
      {group.description && <p className="organization-description">{group.description}</p>}
      <ul className="organization-grid" role="list">{group.organizations.map(organization => <li className="organization-card" key={organization.name}>
        <div className={`organization-logo${organization.logoLayout === 'wide' ? ' organization-logo-wide' : ''}`}><img src={publicPath(organization.logo.src)} alt="" loading="lazy" decoding="async" /></div>
        <span className="organization-name">{organization.name}</span>
      </li>)}</ul>
    </section>)}</div>}
    {showSources && <section className="article-section article-sources" id="sources"><h2>資料來源與說明</h2><ul>{report.sources.map(source => <li key={source.label}><strong>{source.href ? <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} ↗</a> : source.label}</strong><p>{source.note}</p></li>)}</ul></section>}
    {report.kind === 'report' && <aside className="verdict-legend" aria-label="查核結果說明"><p>查核結果說明：</p><ul>{['錯誤', '部分錯誤', '事實釐清', '正確'].map((label, index) => <li key={label}><span className={`legend-dot verdict-${index}`} />{label}</li>)}</ul></aside>}
    {related.length > 0 && <section className="related-reports"><h2>{report.kind === 'report' ? '相關查核報告' : '延伸閱讀'}</h2><div className="related-grid">{related.map(story => <StoryCard key={story.slug} story={story} compact />)}</div></section>}
    <Link className="back-link" to={isGuide ? '/#process' : '/reports'}>{isGuide ? '← 返回選舉工具箱' : '← 返回完整報告列表'}</Link>
  </article>;
}

function ReportRoute({ data }: { data: Listings }) {
  const { slug = '' } = useParams();
  const location = useLocation();
  const replacement = reportAliases[slug];
  return replacement ? <Navigate replace to={`/reports/${replacement}${location.search}${location.hash}`} /> : <ReportPage key={location.pathname} data={data} />;
}

function ReportPage({ data }: { data: Listings }) {
  const { slug = '' } = useParams();
  const initial = useContext(RenderContext);
  const [report, setReport] = useState<Report | null>(() => initial.report?.slug === slug ? initial.report : null);
  const [error, setError] = useState<Error | null>(() => initial.status === 404 && !initial.report ? new DataError('找不到這篇內容', 404) : null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getReport(slug, controller.signal).then(value => { if (!controller.signal.aborted) setReport(value); }).catch(error => { if (!controller.signal.aborted) setError(error); });
    return () => controller.abort();
  }, [slug, attempt]);
  const status: PageStatus = error ? error instanceof DataError && error.status === 404 ? 'not-found' : 'error' : report ? 'ready' : 'loading';
  return <><PageSeo data={data} report={report} status={status} />{error ? <ErrorPage error={error} onRetry={() => setAttempt(attempt + 1)} /> : report ? <ArticleBody report={report} data={data} /> : <Loading />}</>;
}

function Loading() { return <div className="loading-state" role="status"><span className="loading-mark" /><p>正在整理資訊，請稍候…</p></div>; }
function ErrorPage({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  const missing = !error || error instanceof DataError && error.status === 404;
  return <section className="error-page section-padding"><span className="eyebrow">{missing ? '404 / PAGE NOT FOUND' : 'PLEASE TRY AGAIN'}</span><h1>{missing ? '這一頁，還沒有找到。' : '資料暫時無法載入'}</h1><p>{missing ? '連結可能有誤，請回到列表尋找你想閱讀的內容。' : '請確認網路連線後重試。'}</p><div><Link className="button primary" to="/">返回首頁</Link>{onRetry && !missing && <button className="button secondary" onClick={onRetry}>重新載入</button>}</div></section>;
}

function InfoDialog({ info, close }: { info: Info | null; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (info && dialog && !dialog.open) dialog.showModal(); if (!info && dialog?.open) dialog.close(); }, [info]);
  return <dialog ref={ref} className="info-dialog" aria-labelledby="dialog-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}><button className="icon-button dialog-close" aria-label="關閉說明" onClick={close} autoFocus><Icon name="close" /></button>{info && <><span className="tag cyan">2026 選舉工具箱</span><h2 id="dialog-title">{info.title}</h2><p className="dialog-description">{info.description}</p>{info.content.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{info.href && (info.href.startsWith('/') ? <Link className="button primary" to={info.href} onClick={close}>閱讀全文 ↗</Link> : <a className="button primary" href={info.href} target="_blank" rel="noopener noreferrer">閱讀全文 ↗</a>)}</>}</dialog>;
}

function RouteEffects() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const previousCard = previousPath.current.match(/^\/infographics\/([^/]+)\/[1-9]\d*$/)?.[1];
    const currentCard = location.pathname.match(/^\/infographics\/([^/]+)\/[1-9]\d*$/)?.[1];
    const changingCard = previousPath.current !== location.pathname && previousCard && previousCard === currentCard && !location.hash;
    previousPath.current = location.pathname;
    if (changingCard) return;
    const frame = requestAnimationFrame(() => {
      if (location.hash) { try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch { /* Ignore malformed URL fragments. */ } }
      else { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('main-content')?.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return null;
}

export default function App({ initial }: { initial?: RenderState }) {
  const [data, setData] = useState<Listings | null>(initial?.data ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [info, setInfo] = useState<Info | null>(null);
  const location = useLocation();
  useEffect(() => { const controller = new AbortController(); setError(null); getListings(controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(error => { if (!controller.signal.aborted) setError(error); }); return () => controller.abort(); }, [attempt]);
  if (error) return <>{data && <PageSeo data={data} status="error" />}<ErrorPage error={error} onRetry={() => setAttempt(attempt + 1)} /></>;
  if (!data) return <Loading />;
  return <RenderContext.Provider value={initial ?? { context: { siteUrl: null, previewOrigin: window.location.origin }, now: new Date().toISOString(), report: null, status: 200 }}><div className="site-shell"><RouteEffects /><Header data={data} onInfo={setInfo} /><main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<HomePage data={data} onInfo={setInfo} />} /><Route path="/reports" element={<ListingsPage data={data} />} /><Route path="/reports/:slug" element={<ReportRoute data={data} />} /><Route path="/infographics/:slug/:number" element={<InfographicPage data={data} />} /><Route path="*" element={<><PageSeo data={data} status="not-found" /><ErrorPage /></>} /></Routes></main><footer className="site-footer page-padding"><span>{data.site.footer}</span><nav className="footer-social" aria-label="社群媒體"><span>追蹤我們</span><div>{data.site.socialLinks.map(item => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}<span className="sr-only">（開啟新視窗）</span></a>)}</div></nav><Link className="footer-home" to="/">回到首頁 ↑</Link></footer><InfoDialog info={info} close={() => setInfo(null)} /></div></RenderContext.Provider>;
}
