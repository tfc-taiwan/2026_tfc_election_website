import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Report } from './data';

/** An article-specific layout; all editorial text remains in its report JSON. */
type InitiativeContent = NonNullable<Report['initiativeContent']>;
export function InitiativePanel({ page, description, title, embedded = false }: { page: InitiativeContent; description: string; isMock: boolean; title?: string; embedded?: boolean }) {
  const Container = embedded ? 'div' : 'article';
  const Heading = embedded ? 'h3' : 'h1';
  const Subheading = embedded ? 'h3' : 'h2';
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (paused || engaged || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setCurrent(value => (value + 1) % page.cases.length), 2500);
    return () => window.clearInterval(timer);
  }, [paused, engaged, page.cases.length]);
  function move(step: number) { setCurrent(value => (value + step + page.cases.length) % page.cases.length); }
  return <Container className={`pledge-page ${embedded ? 'pledge-embedded' : 'section-padding'}`}>
    {!embedded && <nav className="breadcrumbs" aria-label="麵包屑"><Link to="/">首頁</Link><span aria-hidden="true">／</span><Link to="/#initiative">深偽倡議</Link></nav>}
    {embedded && <div className="section-heading"><div><h2 id="initiative-title">{title}</h2><p>{description}</p></div></div>}
    <div className="pledge-columns">
      <div className="pledge-intro">
        {!embedded && <span className="pledge-eyebrow">{page.eyebrow}</span>}
        {!embedded && <Heading className="pledge-title">{page.titlePrefix}<span>{page.titleAccent}</span></Heading>}
        {!embedded && <p className="pledge-lead">{description}</p>}
        <ol className="pledge-reasons">{page.reasons.map((reason, index) => <li key={reason.title}><span className="pledge-number" aria-hidden="true">{index + 1}</span><div><Subheading>{reason.title}</Subheading><p>{reason.description}</p></div></li>)}</ol>
      </div>
      <section className="pledge-paper" aria-labelledby="pledge-principles-title">
        <Subheading id="pledge-principles-title"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3 3 6v5c0 5 5 9 9 10 4-1 9-5 9-10V6l-9-3Z"/><path d="m8 12 3 3 5-6"/></svg>{page.principlesTitle}</Subheading>
        {page.groups.map((group, index) => <section className={`pledge-group pledge-group-${index}`} key={group.title}><h3><span aria-hidden="true">{index === 0 ? '×' : '✓'}</span>{group.title}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></section>)}
        {page.fullTextUrl && <a className="button primary pledge-fulltext" href={page.fullTextUrl} target="_blank" rel="noopener noreferrer">瀏覽完整倡議全文 ↗<span className="sr-only">（開啟新視窗）</span></a>}
      </section>
    </div>
    <section className="pledge-ticker" aria-label={page.casesTitle} onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)} onFocusCapture={() => setEngaged(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false); }}>
      <Subheading><span aria-hidden="true"/>{page.casesTitle}</Subheading>
      <div className="pledge-ticker-copy" aria-live={paused || engaged ? 'polite' : 'off'} aria-atomic="true">{page.cases.map((item, index) => <div key={`${item.country}-${item.date}`} hidden={index !== current}><div className="pledge-case-meta"><span>{item.country}</span><time>{item.date}</time><small>{index + 1} / {page.cases.length}</small></div><p>{item.text}</p></div>)}</div>
      <div className="pledge-ticker-controls"><button className="round-button" type="button" aria-label="上一則案例" onClick={() => move(-1)}>←</button><button className="case-pause" type="button" aria-label={paused ? '播放案例輪播' : '暫停案例輪播'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '播放' : '暫停'}</button><button className="round-button" type="button" aria-label="下一則案例" onClick={() => move(1)}>→</button></div>
    </section>
    <details className="pledge-all-cases"><summary>展開全部案例（{page.cases.length} 則）</summary><ol>{page.cases.map(item => <li key={`${item.country}-${item.date}`}><strong>{item.country} · {item.date}</strong><p>{item.text}</p></li>)}</ol></details>
    {!embedded && <Link className="back-link" to="/#initiative">← 返回深偽倡議專區</Link>}
  </Container>;
}

export default function InitiativePage({ report }: { report: Report }) { return <InitiativePanel page={report.initiativeContent!} description={report.finding} isMock={report.isMock} />; }
