import type { Direction } from '../data/types';

/** Signed delta with a direction-aware sentiment color and symbol. */
export function DeltaChip({
  text,
  sentiment,
  neutralWord,
}: {
  text: string;
  sentiment: 'good' | 'bad' | 'neutral';
  neutralWord?: string;
}) {
  if (!text) return <span className="delta-chip muted">{neutralWord ?? 'n/a'}</span>;
  const arrow =
    sentiment === 'neutral' ? null : (
      <svg
        className={`delta-arrow ${sentiment === 'good' ? 'up' : 'down'}`}
        viewBox="0 0 10 10"
        aria-hidden="true"
      >
        <path d="M5 1.5 L8.5 8 H1.5 Z" />
      </svg>
    );
  return (
    <span className={`delta-chip ${sentiment}`}>
      {arrow}
      {text}
    </span>
  );
}

/** Human words for a metric direction, used in legends and methodology. */
export function directionWord(direction: Direction): string {
  switch (direction) {
    case 'upGood':
      return 'higher is better';
    case 'downGood':
      return 'lower is better';
    default:
      return 'direction neutral';
  }
}
