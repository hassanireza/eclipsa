import { useCallback, useEffect, useRef, useState } from 'react';
import { Cog, Flame } from 'lucide-react';
import { Backdrop } from './components/Backdrop';
import { InstallHint } from './components/InstallHint';
import { LogoMark } from './components/LogoMark';
import { MapScreen } from './screens/MapScreen';
import { PlayScreen } from './screens/PlayScreen';
import { TerminalScreen } from './screens/TerminalScreen';
import { LEVEL_COUNT } from './episodes';
import { useInstallHint, useViewportMode } from './hooks';
import { applySolve, liveStreak, readProgress, writeProgress, type Progress } from './progress';

type Route = { kind: 'map' } | { kind: 'level'; id: number } | { kind: 'terminal' };

/** The current screen lives in the URL hash, so the iOS edge-swipe / Android back gesture goes back inside the app. */
function parseRoute(): Route {
  if (location.hash === '#/terminal') return { kind: 'terminal' };
  const m = /^#\/level\/(\d+)$/.exec(location.hash); const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= LEVEL_COUNT ? { kind: 'level', id: n } : { kind: 'map' };
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [route, setRoute] = useState<Route>(parseRoute);
  const lastLevel = useRef<number | null>(null);
  const leftFor = useRef<'level' | 'terminal' | null>(null);
  const mapY = useRef(0);
  const pushed = useRef(false);
  useViewportMode();
  const hint = useInstallHint(route.kind === 'map');

  useEffect(() => writeProgress(progress), [progress]);
  useEffect(() => {
    const sync = () => setRoute(parseRoute());
    window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => {
    if (route.kind === 'level') lastLevel.current = route.id;
    document.title = route.kind === 'level' ? `Level ${route.id} · Eclipsa` : route.kind === 'terminal' ? 'Terminal · Eclipsa' : 'Eclipsa | Learn Django by wiring real routes';
  }, [route]);

  const push = useCallback((hash: string, from: 'level' | 'terminal') => {
    leftFor.current = from; mapY.current = window.scrollY; pushed.current = true; location.hash = hash;
  }, []);
  const open = useCallback((id: number) => {
    if (route.kind === 'map') push(`/level/${id}`, 'level');
    else { history.replaceState(null, '', `#/level/${id}`); setRoute({ kind: 'level', id }); } // "next level" replaces, so Back still returns to the map
  }, [route.kind, push]);
  const openTerminal = useCallback(() => push('/terminal', 'terminal'), [push]);
  const close = useCallback(() => {
    if (pushed.current) { pushed.current = false; history.back(); }
    else { history.replaceState(null, '', location.pathname + location.search); setRoute({ kind: 'map' }); }
  }, []);
  const solve = useCallback((id: number, xp: number) => setProgress((p) => applySolve(p, id, xp)), []);

  const streak = liveStreak(progress);
  return (
    <main className="shell" data-view={route.kind}>
      <Backdrop />
      <header className="topbar">
        <button className="brand" onClick={() => (route.kind !== 'map' ? close() : window.scrollTo({ top: 0, behavior: 'smooth' }))} aria-label={route.kind !== 'map' ? 'Back to map' : 'Scroll to the title and your progress'}>
          <LogoMark size={30} /><span>ECLIPSA</span>
        </button>
        <div className="top-stats">
          <span title="Day streak" aria-label={`${streak} day streak`}><Flame size={15} />{streak}</span>
          <span title="Brass" aria-label={`${progress.xp} brass`}><Cog size={15} />{progress.xp}</span>
        </div>
      </header>
      {route.kind === 'level' && <PlayScreen key={route.id} id={route.id} solved={progress.done.includes(route.id)} onSolve={solve} onOpen={open} onBack={close} />}
      {route.kind === 'terminal' && <TerminalScreen onBack={close} />}
      {route.kind === 'map' && <MapScreen progress={progress} focusLevel={leftFor.current === 'level' ? lastLevel.current : null} restoreY={leftFor.current === 'terminal' ? mapY.current : null} onOpen={open} onTerminal={openTerminal} />}
      {hint && route.kind === 'map' && <InstallHint hint={hint} />}
    </main>
  );
}
