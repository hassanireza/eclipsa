import { useEffect, useState } from 'react';

import { useSyncExternalStore } from 'react';

/* ───────── Focus mode ─────────
   On phones the on-screen keyboard covers ~half the screen. Instead of letting fixed bars float over the editor,
   we switch the workspace into a full-bleed "focus mode" that is sized to the *visual* viewport (the part you can
   actually see): compact header, editor filling all remaining space, one slim toolbar glued above the keyboard. */
let editing = false;
const subs = new Set<() => void>();
const setEditing = (v: boolean) => { if (v !== editing) { editing = v; subs.forEach((f) => f()); } };
/** True while the code editor has focus on a touch phone. */
export const useEditing = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => editing);

export function useViewportMode() {
  useEffect(() => {
    const root = document.documentElement, vv = window.visualViewport;
    const phone = window.matchMedia('(pointer: coarse) and (max-width: 820px)');
    let savedY = 0, timer = 0;
    const vars = () => {
      root.style.setProperty('--vv-h', `${Math.round(vv ? vv.height : window.innerHeight)}px`);
      root.style.setProperty('--vv-top', `${Math.round(vv ? vv.offsetTop : 0)}px`);
    };
    const inEditor = () => !!document.activeElement?.closest('.cm-editor');
    const apply = () => {
      const on = phone.matches && inEditor();
      if (on === editing) return;
      root.classList.toggle('editing', on); setEditing(on);
      if (!on) requestAnimationFrame(() => window.scrollTo(0, savedY));
    };
    const remember = () => { if (!editing) savedY = window.scrollY; };
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(apply, 80); };
    vars(); vv?.addEventListener('resize', vars); vv?.addEventListener('scroll', vars);
    window.addEventListener('pointerdown', remember, { capture: true, passive: true });
    document.addEventListener('focusin', soon); document.addEventListener('focusout', soon);
    window.addEventListener('hashchange', soon); window.addEventListener('popstate', soon);
    return () => {
      vv?.removeEventListener('resize', vars); vv?.removeEventListener('scroll', vars);
      window.removeEventListener('pointerdown', remember, { capture: true } as EventListenerOptions);
      document.removeEventListener('focusin', soon); document.removeEventListener('focusout', soon);
      window.removeEventListener('hashchange', soon); window.removeEventListener('popstate', soon);
      root.classList.remove('editing'); setEditing(false);
    };
  }, []);
}

const HINT_KEY = 'eclipsa.installHint';
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

export type InstallHint = { kind: 'ios' | 'prompt'; install?: () => void; dismiss: () => void } | null;

/** iOS has no install event, so we teach the Share → Add to Home Screen path once; Chromium gets the real prompt. */
export function useInstallHint(enabled: boolean): InstallHint {
  const [kind, setKind] = useState<'ios' | 'prompt' | null>(null);
  const [evt, setEvt] = useState<any>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    if (!enabled || isStandalone()) return;
    let snoozed = false;
    try { snoozed = Date.now() - Number(localStorage.getItem(HINT_KEY) || 0) < 14 * 86400000; } catch { /* ignore */ }
    if (snoozed) return;
    const t = window.setTimeout(() => setKind(evt ? 'prompt' : isIOS() ? 'ios' : null), 5000);
    return () => window.clearTimeout(t);
  }, [enabled, evt]);

  const dismiss = () => { setKind(null); try { localStorage.setItem(HINT_KEY, String(Date.now())); } catch { /* ignore */ } };
  if (!kind) return null;
  return { kind, dismiss, install: evt ? async () => { await evt.prompt(); setEvt(null); dismiss(); } : undefined };
}

export function useMedia(query: string) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const q = window.matchMedia(query); const f = () => setM(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, [query]);
  return m;
}
