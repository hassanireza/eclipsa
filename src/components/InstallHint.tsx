import { ChevronRight, Share, SquarePlus, X } from 'lucide-react';
import type { InstallHint as Hint } from '../hooks';

export function InstallHint({ hint }: { hint: NonNullable<Hint> }) {
  return (
    <aside className="install" role="status">
      <div className="install-icon"><img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width="44" height="44" /></div>
      <div className="install-copy">
        <b>Keep Eclipsa on your Home Screen</b>
        {hint.kind === 'ios'
          ? <span>Tap <Share size={14} aria-label="Share" /> then <em><SquarePlus size={14} aria-hidden="true" /> Add to Home Screen</em></span>
          : <span>Install it for full-screen play, even offline.</span>}
      </div>
      {hint.kind === 'prompt' && hint.install && <button className="install-go" onClick={hint.install} aria-label="Install app"><ChevronRight size={18} /></button>}
      <button className="install-x" onClick={hint.dismiss} aria-label="Dismiss"><X size={16} /></button>
    </aside>
  );
}
