import { EDITION } from '../data/content';
import { useStore } from '../state/store';
import { ThemeToggle } from './ThemeToggle';

export function Masthead() {
  const { state, dispatch } = useStore();

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          <p className="brand-over" aria-hidden="true">
            {EDITION.edition}
          </p>
          <h1 className="brand-title">Worldline</h1>
          <p className="brand-tag">{EDITION.tagline}</p>
        </div>
        <nav className="mast-nav" aria-label="Primary">
          <button
            type="button"
            className={`nav-link${state.view === 'atlas' ? ' is-current' : ''}`}
            aria-current={state.view === 'atlas' ? 'page' : undefined}
            onClick={() => dispatch({ type: 'setView', view: 'atlas' })}
          >
            Atlas
          </button>
          <button
            type="button"
            className={`nav-link${state.view === 'scenarios' ? ' is-current' : ''}`}
            aria-current={state.view === 'scenarios' ? 'page' : undefined}
            onClick={() => dispatch({ type: 'setView', view: 'scenarios' })}
          >
            Scenarios
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => dispatch({ type: 'setFieldNoteOpen', open: true })}
          >
            Field note
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => dispatch({ type: 'setMethodologyOpen', open: true })}
          >
            Methodology
          </button>
        </nav>
        <div className="mast-actions">
          <button
            type="button"
            className="palette-btn"
            onClick={() => dispatch({ type: 'setPaletteOpen', open: true })}
            aria-haspopup="dialog"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5 14 14" />
            </svg>
            Search
            <kbd aria-hidden="true">Ctrl K</kbd>
            <span className="sr-only">, opens the command palette</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
