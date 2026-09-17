import React, { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DataError, daysUntil, getListings, getReport, searchStories, type Info, type Listings, type Report, type Story } from './data';
import { buildSeo, originFor, syncSeoHead, type PageStatus } from './seo';
import type { RenderState } from './render-state';

const RenderContext = createContext<Pick<RenderState, 'context' | 'now' | 'report' | 'status'>>({ context: { siteUrl: null, previewOrigin: 'http://localhost:4173' }, now: new Date().toISOString(), report: null, status: 200 });

function PageSeo({ data, report = null, status = 'ready' }: { data: Listings; report?: Report | null; status?: PageStatus }) {
  const { context } = useContext(RenderContext);
  const { pathname, search } = useLocation();
  useEffect(() => { syncSeoHead(buildSeo(data, pathname + search, report, context, status)); }, [data, report, context, pathname, search, status]);
  return null;
}

type IconName = 'search' | 'menu' | 'close' | 'left' | 'right' | 'down' | 'document' | 'calendar' | 'check' | 'globe' | 'copy' | 'print';
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
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand({ site }: { site: Listings['site'] }) {
  return <Link to="/" className="brand" aria-label={`${site.name}，回首頁`}>
    <svg className="brand-mark" aria-hidden="true" width="44" height="44" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" /><ellipse cx="50" cy="50" rx="32" ry="20" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="50" cy="50" r="10" fill="currentColor" /></svg>
    <span><strong>{site.name}</strong><small>{site.englishName}</small></span>
  </Link>;
}

function Header({ data, onInfo }: { data: Listings; onInfo: (info: Info) => void }) {
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setMenu(false); setQuery(new URLSearchParams(location.search).get('q') ?? ''); }, [location]);
  function search(event: FormEvent) { event.preventDefault(); navigate(`/reports${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); }
  return <header className="site-header">
    <a className="skip-link" href="#main-content">跳至主要內容</a>
    <div className="utility-bar page-padding">
      <div className="utility-start">
        <button ref={menuButton} className="icon-button menu-toggle" aria-label={menu ? '關閉選單' : '開啟選單'} aria-expanded={menu} aria-controls="main-nav" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button>
        <button className="donate-button" onClick={() => onInfo({ id: 'support', title: '支持事實查核', description: '讓有依據的資訊，成為公共討論的起點。', content: ['此為設計示範網站，沒有提供捐款或付款功能。你可以前往台灣事實查核中心正式網站，了解實際的支持方式。'] })}>捐款支持事實查核</button>
      </div>
      <div className="utility-end"><span className="edition-label">2026 ELECTION</span><button className="icon-button" aria-label="前往搜尋" onClick={() => { input.current?.focus(); input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}><Icon name="search" size={18} /></button></div>
    </div>
    <div className="masthead page-padding"><Brand site={data.site} /><form className="search-form" role="search" onSubmit={search}><input ref={input} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋查核報告…" aria-label="搜尋查核報告" /><button className="icon-button" type="submit" aria-label="送出搜尋"><Icon name="search" size={18} /></button></form></div>
    <nav id="main-nav" aria-label="主要導覽" className={`main-nav page-padding ${menu ? 'is-open' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus(); } }}>
      {data.navigation.map(item => <NavLink key={item.href} to={item.href} onClick={() => setMenu(false)}>{item.label}</NavLink>)}
      <span className="nav-note">看懂資訊・讓事實發聲</span>
    </nav>
  </header>;
}

function Illustration({ image, className = '', eager = false }: { image: Story['image']; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`illustration ${className}`}>
    {failed ? <div className="image-fallback" role="img" aria-label={image.alt}>FACT / CHECK</div> : <img src={image.src} alt={image.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} width="720" height="400" />}
  </div>;
}

function StoryCard({ story, compact = false }: { story: Story; compact?: boolean }) {
  return <Link className={`story-card ${compact ? 'compact' : ''}`} to={`/reports/${story.slug}`}>
    <Illustration image={story.image} />
    <div className="story-card-body"><div className="story-meta"><time dateTime={story.date}>{story.date}</time>{story.kind !== 'report' && <span className={`tag ${story.tone}`}>{story.tag}</span>}</div><h3>{story.title}</h3>{!compact && <p>{story.description}</p>}<span className="card-read">閱讀{story.kind === 'report' ? '報告' : '全文'} <span aria-hidden="true">↗</span></span></div>
  </Link>;
}

function Carousel({ stories, label }: { stories: Story[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const contentKey = stories.map(story => story.slug).join(',');
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
  return <div className="carousel" role="region" aria-label={label}>
    <div ref={ref} className="carousel-track" tabIndex={0} aria-label={`${label}，可左右捲動`} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); scroll(event.key === 'ArrowRight' ? 1 : -1); } }}>{stories.map(story => <StoryCard key={story.slug} story={story} />)}</div>
    <div className="carousel-controls"><span>{String(stories.length).padStart(2, '0')} 篇精選</span><div><button className="icon-button" disabled={edges.start} aria-label={`${label}：上一組`} onClick={() => scroll(-1)}><Icon name="left" size={17} /></button><button className="icon-button" disabled={edges.end} aria-label={`${label}：下一組`} onClick={() => scroll(1)}><Icon name="right" size={17} /></button></div></div>
  </div>;
}

function HomePage({ data, onInfo }: { data: Listings; onInfo: (info: Info) => void }) {
  const { now } = useContext(RenderContext);
  const { hero, sections, stories } = data;
  const [category, setCategory] = useState(sections.reports.categories[0]);
  const [script, setScript] = useState<string | null>(sections.scripts.items[0]?.id ?? null);
  const [today, setToday] = useState(() => new Date(now));
  useEffect(() => { setToday(new Date()); const timer = window.setInterval(() => setToday(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const pick = (slugs: string[]) => slugs.flatMap(slug => stories.find(story => story.slug === slug) ?? []);
  function openScript(id: string) { setScript(id); requestAnimationFrame(() => { const button = document.getElementById(`script-toggle-${id}`); button?.focus({ preventScroll: true }); button?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); }
  return <>
    <PageSeo data={data} />
    <section className="hero section-padding" id="about" aria-labelledby="hero-title">
      <div className="hero-intro"><span className="tag cyan">{hero.kicker}</span><h1 id="hero-title">{hero.title.map(line => <span key={line}>{line}</span>)}</h1><div className="countdown"><span>距離投票日還有</span><strong>{daysUntil(hero.electionDate, today)}</strong><span>天</span><small>{data.isMock ? '示範日期' : ''} {hero.electionDate.replaceAll('-', '.')}</small></div><p>{hero.description}</p></div>
      <div className="election-facts"><h2>本次選舉基本事實</h2><ol>{hero.facts.map((fact, index) => <li key={fact.title}><span className={`fact-number ${fact.tone}`}>{index + 1}</span><div><h3>{fact.title}</h3><p>{fact.description}</p></div></li>)}</ol></div>
    </section>
    <section className="reports-section section-padding surface" id="latest" aria-labelledby="latest-title"><div className="section-heading"><h2 id="latest-title">{sections.reports.title}</h2><div className="segmented" role="group" aria-label="報告分類">{sections.reports.categories.map(value => <button key={value} aria-pressed={value === category} onClick={() => setCategory(value)}>{value}</button>)}</div></div><Carousel stories={pick(sections.reports.slugs).filter(story => story.category === category)} label={`${category}查核報告`} /><div className="section-action"><Link className="button primary" to="/reports">瀏覽完整報告 <span aria-hidden="true">→</span></Link></div></section>
    <section className="analysis-section section-padding" id="analysis" aria-labelledby="analysis-title"><div className="center-heading"><h2 id="analysis-title">{sections.analyses.title}</h2><p>{sections.analyses.description}</p></div><Carousel stories={pick(sections.analyses.slugs)} label="資訊操弄解析" /></section>
    <section className="rumors-section section-padding" id="rumors"><div><h2>{sections.rumors.title}</h2><div className="rumor-grid">{sections.rumors.items.map(item => <button key={item.id} className="rumor-button" onClick={() => openScript(item.scriptId)} aria-label={`${item.label}：閱讀常見劇本`}><span className={`rumor-badge ${item.tone}`}>{item.badge}</span><span>{item.label}</span></button>)}</div></div><div className="scripts"><h2>{sections.scripts.title}</h2>{sections.scripts.items.map(item => <div className={`accordion ${script === item.id ? 'is-open' : ''}`} key={item.id}><h3><button id={`script-toggle-${item.id}`} aria-expanded={script === item.id} aria-controls={`script-${item.id}`} onClick={() => setScript(script === item.id ? null : item.id)}>{item.question}<Icon name="down" size={16} /></button></h3><div id={`script-${item.id}`} role="region" aria-labelledby={`script-toggle-${item.id}`} hidden={script !== item.id}><p>{item.answer}</p></div></div>)}</div></section>
    <section className="process-section section-padding surface" id="process"><div className="center-heading"><h2>{sections.process.title}</h2></div><div className="process-grid">{sections.process.items.map(item => <div className="process-card" key={item.id}><span className={`process-icon ${item.tone}`}><Icon name={item.icon} size={23} /></span><h3>{item.title}</h3><p>{item.description}</p><button className="text-button" onClick={() => onInfo(item)}>了解更多 <span aria-hidden="true">→</span><span className="sr-only">：{item.title}</span></button></div>)}</div></section>
    <section className="learning-section section-padding" id="learning"><div className="center-heading"><h2>{sections.learning.title}</h2></div><div className="learning-grid">{sections.learning.items.map(item => { const story = stories.find(s => s.slug === item.slug); return story && <div key={item.slug} className="learning-item"><Link to={`/reports/${item.slug}`} className="learning-art" tabIndex={-1} aria-hidden="true"><span className="learning-cross">+</span><strong>{item.badge}</strong><span className="learning-art-label">THE FACTCHECK TOOLKIT</span></Link><div><h3>{story.title}</h3><p>{story.description}</p><Link to={`/reports/${item.slug}`}>閱讀教學指南 <span aria-hidden="true">→</span><span className="sr-only">：{story.title}</span></Link></div></div>; })}</div></section>
    <section className="activities-section section-padding" id="activities"><h2>{sections.activities.title}</h2><div>{sections.activities.items.map(item => <div className="activity" key={item.id}><span className={`activity-date ink-${item.tone}`}>{item.dateLabel}</span><div className="activity-content"><span className="tag neutral">{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p></div><button className="button primary" onClick={() => onInfo(item)}>{item.cta}<span className="sr-only">：{item.title}</span><span aria-hidden="true">↗</span></button></div>)}</div></section>
  </>;
}

function ListingsPage({ data }: { data: Listings }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = ['地方選舉', '公投議題'].includes(params.get('category') ?? '') ? params.get('category')! : '全部';
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const stories = searchStories(query ? data.stories : data.stories.filter(story => story.kind === 'report'), query, category);
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value && value !== '全部') next.set(key, value); else next.delete(key); setParams(next); }
  return <section className="listing-page section-padding"><PageSeo data={data} /><nav className="breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><span>{query ? '搜尋結果' : '查核報告'}</span></nav><span className="eyebrow">THE FACTCHECK INDEX</span><h1>{query ? '尋找資訊的真實脈絡' : '查核報告'}</h1><p className="listing-intro">從每一則訊息開始，找回有依據的判斷。</p><form className="search-form listing-search" role="search" onSubmit={event => { event.preventDefault(); update('q', draft.trim()); }}><input type="search" value={draft} onChange={event => setDraft(event.target.value)} aria-label="輸入搜尋關鍵字" placeholder="搜尋標題、議題或關鍵字" /><button className="icon-button" aria-label="搜尋內容"><Icon name="search" /></button></form><div className="listing-filters"><div className="segmented" role="group" aria-label="篩選報告分類">{['全部', ...data.sections.reports.categories].map(value => <button key={value} aria-pressed={category === value} onClick={() => update('category', value)}>{value}</button>)}</div><p role="status">{query && <>「{query}」・</>}{stories.length} 篇內容</p></div>{stories.length ? <div className="listing-grid">{stories.map(story => <StoryCard story={story} key={story.slug} />)}</div> : <div className="empty-state"><Icon name="search" size={34} /><h2>沒有找到符合的內容</h2><p>試試較短的關鍵字，或切換其他分類。</p><button className="button secondary" onClick={() => setParams({})}>清除搜尋與篩選</button></div>}</section>;
}

function ShareTools({ report, data }: { report: Report; data: Listings }) {
  const { context } = useContext(RenderContext);
  const [message, setMessage] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const url = originFor(data, context) + `/reports/${report.slug}`;
  async function copy() { try { await navigator.clipboard.writeText(url); setMessage('已複製文章連結'); } catch { setManualCopy(true); setMessage('請選取下方連結複製'); } }
  return <div className="share-group"><span>分享：</span><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="分享到 Facebook（開啟新視窗）">Facebook</a><a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="分享到 LINE（開啟新視窗）">LINE</a><button className="icon-button" aria-label="複製文章連結" onClick={copy}><Icon name="copy" size={17} /></button><button className="icon-button" aria-label="列印報告" onClick={() => window.print()}><Icon name="print" size={18} /></button><span className="share-status" role="status">{message}</span>{manualCopy && <input aria-label="文章網址" readOnly value={url} onFocus={event => event.target.select()} />}</div>;
}

function ArticleBody({ report, data }: { report: Report; data: Listings }) {
  const related = report.relatedSlugs.flatMap(slug => data.stories.find(story => story.slug === slug) ?? []);
  const kind = report.kind === 'report' ? '查核報告' : report.kind === 'analysis' ? '資訊操弄解析' : '查核學堂';
  return <article className="report-page">
    <nav className="breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><Link to={report.kind === 'report' ? '/reports' : report.kind === 'analysis' ? '/#analysis' : '/#learning'}>{kind}</Link><span aria-hidden="true">／</span><span>{report.category}</span></nav>
    <div className="article-tags">{report.tags.map(tag => <span className={`tag ${tag === report.verdict ? 'magenta' : 'cyan'}`} key={tag}>{tag}</span>)}</div>
    <h1>{report.title}</h1><p className="article-finding">{report.finding}</p>
    <div className="article-meta"><span><strong>發佈：</strong><time dateTime={report.published}>{report.published}</time></span><span><strong>更新：</strong><time dateTime={report.updated}>{report.updated}</time></span><span><strong>報告編號：</strong>{report.reportId}</span><span><strong>查核記者：</strong>{report.reporter}</span><span><strong>責任編輯：</strong>{report.editor}</span></div>
    {report.isMock && <p className="article-mock-note"><span className="tag neutral">MOCK DATA</span> 本文為虛構示範，不代表真實事件或查核結論。</p>}
    <div className="article-toolbar"><nav aria-label="文章目錄"><span>內容：</span><a href="#background">背景</a><a href="#verification">{report.kind === 'report' ? '查核' : '解析'}</a><a href="#sources">資料來源</a></nav><ShareTools report={report} data={data} /></div>
    <figure className="article-cover"><Illustration image={report.image} eager /><figcaption>{report.imageCaption}</figcaption></figure>
    <section className="article-summary" aria-labelledby="summary-heading"><h2 id="summary-heading">{report.kind === 'report' ? '查核摘要' : '重點摘要'}</h2><ol>{report.summaryPoints.map(point => <li key={point}>{point}</li>)}</ol><p>{report.summaryClose}</p></section>
    <section className="article-section" id="background"><h2>{report.background.title}</h2>{report.background.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{report.background.image && <figure><Illustration image={report.background.image} /><figcaption>{report.background.caption}</figcaption></figure>}</section>
    <section className="article-section" id="verification"><h2>{report.kind === 'report' ? '查核' : '深入解析'}</h2>{report.checkSections.map(section => <section className="check-section" key={section.id} id={section.id}><h3>{section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.image && <figure><Illustration image={section.image} /><figcaption>{section.caption}</figcaption></figure>}</section>)}</section>
    <section className="article-section article-sources" id="sources"><h2>資料來源與說明</h2><ul>{report.sources.map(source => <li key={source.label}><strong>{source.href ? <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} ↗</a> : source.label}</strong><p>{source.note}</p></li>)}</ul></section>
    {report.kind === 'report' && <aside className="verdict-legend" aria-label="查核結果說明"><p>查核結果說明：</p><ul>{['錯誤', '部分錯誤', '事實釐清', '正確'].map((label, index) => <li key={label}><span className={`legend-dot verdict-${index}`} />{label}</li>)}</ul></aside>}
    {related.length > 0 && <section className="related-reports"><h2>相關查核報告</h2><div className="related-grid">{related.map(story => <StoryCard key={story.slug} story={story} compact />)}</div></section>}
    <Link className="back-link" to="/reports">← 返回完整報告列表</Link>
  </article>;
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
  return <dialog ref={ref} className="info-dialog" aria-labelledby="dialog-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}><button className="icon-button dialog-close" aria-label="關閉說明" onClick={close} autoFocus><Icon name="close" /></button>{info && <><span className="tag cyan">2026 選舉工具箱</span><h2 id="dialog-title">{info.title}</h2><p className="dialog-description">{info.description}</p>{info.content.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{info.id === 'support' && <a className="button primary" href="https://tfc-taiwan.org.tw/" target="_blank" rel="noopener noreferrer">前往正式網站 ↗</a>}</>}</dialog>;
}

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
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
  return <RenderContext.Provider value={initial ?? { context: { siteUrl: null, previewOrigin: window.location.origin }, now: new Date().toISOString(), report: null, status: 200 }}><div className="site-shell"><RouteEffects /><Header data={data} onInfo={setInfo} />{data.isMock && <div className="demo-notice page-padding"><span className="demo-dot" />{data.site.notice}</div>}<main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<HomePage data={data} onInfo={setInfo} />} /><Route path="/reports" element={<ListingsPage data={data} />} /><Route path="/reports/:slug" element={<ReportPage key={location.pathname} data={data} />} /><Route path="*" element={<><PageSeo data={data} status="not-found" /><ErrorPage /></>} /></Routes></main><footer className="site-footer page-padding"><span>{data.site.footer}</span><Link to="/">回到首頁 ↑</Link></footer><InfoDialog info={info} close={() => setInfo(null)} /></div></RenderContext.Provider>;
}
