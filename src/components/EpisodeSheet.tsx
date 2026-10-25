import type { CSSProperties } from 'react';
import { EPISODE_COUNT, LEVELS_PER_EPISODE, episodeNames } from '../episodes';
import { episodePalette } from '../questions';
import { Sheet } from './Sheet';

type Props = { done: Set<number>; current: number; onPick: (episode: number) => void; onClose: () => void };

export function EpisodeSheet({ done, current, onPick, onClose }: Props) {
  return (
    <Sheet eyebrow="NAVIGATE" title="Jump to chapter" onClose={onClose}>
      <div className="sheet-grid">
        {Array.from({ length: EPISODE_COUNT }, (_, i) => EPISODE_COUNT - i).map((ep) => {
          let n = 0; for (let k = 0; k < LEVELS_PER_EPISODE; k++) if (done.has((ep - 1) * LEVELS_PER_EPISODE + k + 1)) n++;
          return (
            <button key={ep} className={`chip${ep === current ? ' here' : ''}${n === LEVELS_PER_EPISODE ? ' full' : ''}`} onClick={() => onPick(ep)}
              style={{ '--tint': episodePalette[(ep - 1) % episodePalette.length], '--fill': `${(n / LEVELS_PER_EPISODE) * 100}%` } as CSSProperties}
              aria-label={`Chapter ${ep}, ${episodeNames[ep - 1]}, ${n} of ${LEVELS_PER_EPISODE} complete`}>
              <span>{String(ep).padStart(2, '0')}</span><i />
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
