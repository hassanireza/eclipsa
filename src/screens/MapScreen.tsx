import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ChevronRight, Compass, Play, SquareTerminal } from 'lucide-react';
import { RouteBoard } from '../components/RouteBoard';
import { EpisodeSheet } from '../components/EpisodeSheet';
import { EclipseArt } from '../components/EclipseArt';
import { EPISODE_COUNT, LEVELS_PER_EPISODE, LEVEL_COUNT, episodeNames } from '../episodes';
import { episodePalette, questions } from '../questions';
import { nextLevel, type Progress } from '../progress';

type Props = { progress: Progress; focusLevel: number | null; restoreY: number | null; onOpen: (id: number) => void; onTerminal: () => void };
const episodeOf = (id: number) => Math.ceil(id / LEVELS_PER_EPISODE);

export function MapScreen({ progress, focusLevel, restoreY, onOpen, onTerminal }: Props) {
  const [sheet, setSheet] = useState(false);
  const done = useMemo(() => new Set(progress.done), [progress.done]);
  const next = nextLevel(progress);
  const resume = next ?? 1;
  const resumeQ = questions[resume - 1];
  const returning = progress.done.length > 0;
  const episodes = useMemo(() => Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1), []);

  // Land where the player is. The hero sits at the top (where the request enters), so beginners land right on it.
  useEffect(() => {
    const target = focusLevel ?? (returning ? resume : null);
    if (restoreY !== null) { requestAnimationFrame(() => window.scrollTo(0, restoreY)); return; }
    if (target === null || episodeOf(target) <= 1) { requestAnimationFrame(() => window.scrollTo(0, 0)); return; }
    requestAnimationFrame(() => document.getElementById(`ep-${episodeOf(target)}`)?.scrollIntoView({ block: 'center' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (ep: number) => { setSheet(false); requestAnimationFrame(() => document.getElementById(`ep-${ep}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };

  return (
    <>
      <section className="hero" id="entry">
        <div className="hero-art" aria-hidden="true"><EclipseArt size={300} /></div>
        <div className="hero-copy">
          <div className="eyebrow">A {LEVEL_COUNT.toLocaleString()}-LEVEL DJANGO WORKSHOP</div>
          <h1>Route the<br /><em>hidden world.</em></h1>
          <p>Fifty chapters. A thousand small programs. Wire each route by writing the real Django that answers it.</p>
          <div className="meter" role="img" aria-label={`${progress.done.length} of ${LEVEL_COUNT} routes wired`}>
            <div className="meter-bar"><i style={{ width: `${Math.max(1.5, (progress.done.length / LEVEL_COUNT) * 100)}%` }} /></div>
            <div className="meter-text"><b>{progress.done.length}</b> / {LEVEL_COUNT.toLocaleString()} routes wired</div>
          </div>
          <button className="sandbox-card" onClick={onTerminal}>
            <span className="sandbox-icon"><SquareTerminal size={20} /></span>
            <span className="sandbox-text"><b>Terminal</b><small>A free sandbox for any Django</small></span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>


      <section className="journey" aria-label="Chapters">
        <div className="section-title"><div className="eyebrow">THE REQUEST ENTERS HERE · LEVEL 001</div></div>
        <div className="episode-list">
          {episodes.map((ep) => {
            const items = questions.slice((ep - 1) * LEVELS_PER_EPISODE, ep * LEVELS_PER_EPISODE);
            const n = items.filter((q) => done.has(q.id)).length;
            return (
              <article id={`ep-${ep}`} key={ep} className={`episode${n === LEVELS_PER_EPISODE ? ' complete' : ''}`} style={{ '--tint': episodePalette[(ep - 1) % episodePalette.length] } as CSSProperties}>
                <header>
                  <div><span className="ep-no fig">FIG. {String(ep).padStart(2, '0')}</span><h2>{episodeNames[ep - 1]}</h2></div>
                  <div className="ep-count" aria-label={`${n} of ${LEVELS_PER_EPISODE} complete`}>{n === LEVELS_PER_EPISODE ? '◆ WIRED' : <><b>{n}</b>/{LEVELS_PER_EPISODE}</>}</div>
                </header>
                <RouteBoard items={items} done={done} nextId={next} onOpen={onOpen} />
              </article>
            );
          })}
        </div>
        <div className="origin">THE DATABASE · LEVEL 1000</div>
      </section>
      <nav className="dock" aria-label="Quick actions">
        <button className="dock-main" onClick={() => onOpen(resume)}>
          <span className="dock-play"><Play size={16} fill="currentColor" /></span>
          <span className="dock-text"><small>{next === null ? 'REPLAY' : returning ? 'CONTINUE' : 'BEGIN'} · LEVEL {String(resume).padStart(3, '0')}</small><b>{resumeQ.title}</b></span>
          <ChevronRight size={18} />
        </button>
        <button className="dock-icon" onClick={() => setSheet(true)} aria-label="Jump to chapter"><Compass size={22} /></button>
        <button className="dock-icon" onClick={onTerminal} aria-label="Open terminal"><SquareTerminal size={22} /></button>
      </nav>
      {sheet && <EpisodeSheet done={done} current={episodeOf(resume)} onPick={jump} onClose={() => setSheet(false)} />}
    </>
  );
}
