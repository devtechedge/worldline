import { useEffect } from 'react';
import { EDITION, UI_COPY } from '../data/content';
import { getPlace } from '../data/places';
import { StoreProvider, useStore } from '../state/store';
import { AtlasMap } from './AtlasMap';
import { CommandPalette } from './CommandPalette';
import { ComparePanel } from './ComparePanel';
import { FieldNote } from './FieldNote';
import { Masthead } from './Masthead';
import { Methodology } from './Methodology';
import { PlaceDrawer } from './PlaceDrawer';
import { Rail } from './Rail';
import { ScenarioView } from './ScenarioView';

function Shell() {
  const { state, dispatch } = useStore();

  // Global shortcut: Ctrl/Cmd+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch({ type: 'setPaletteOpen', open: !state.paletteOpen });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.paletteOpen]);

  const compareA = state.compareA ? getPlace(state.compareA) : null;
  const compareB = state.compareB ? getPlace(state.compareB) : null;
  const bothPicked = compareA !== null && compareB !== null;

  return (
    <div className="app">
      <a className="skip-link" href="#atlas-main">
        Skip to the atlas
      </a>
      <Masthead />
      {state.view === 'atlas' ? (
        <main id="atlas-main" className="atlas-main">
          <Rail />
          <section className="map-panel" aria-label="World map">
            <div className="map-stage">
              {!state.introDismissed && (
                <div className="intro-hint" role="note">
                  <p>{UI_COPY.firstRunHint}</p>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => dispatch({ type: 'dismissIntro' })}
                  >
                    Got it
                  </button>
                </div>
              )}
              {(compareA || compareB) && (
                <div className="compare-tray" role="group" aria-label="Comparison tray">
                  <span className="tray-label">Compare</span>
                  {[compareA, compareB].map((p, i) => (
                    <span key={i} className="tray-slot">
                      {p ? (
                        <>
                          <span className={`compare-role role-${i === 0 ? 'a' : 'b'}`}>
                            {i === 0 ? 'A' : 'B'}
                          </span>
                          <span className="tray-name">{p.name}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Remove ${p.name} from comparison`}
                            onClick={() => dispatch({ type: 'removeFromCompare', id: p.id })}
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                          </button>
                        </>
                      ) : (
                        <span className="tray-empty">{UI_COPY.comparePrompt}</span>
                      )}
                    </span>
                  ))}
                  {bothPicked && !state.compareOpen && (
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={() => dispatch({ type: 'setCompareOpen', open: true })}
                    >
                      Open comparison
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn tray-clear"
                    aria-label="Clear comparison"
                    onClick={() => dispatch({ type: 'clearCompare' })}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  </button>
                </div>
              )}
              {!state.storageOk && (
                <div className="storage-note" role="status">
                  {UI_COPY.storageWarning}
                </div>
              )}
              <AtlasMap />
            </div>
          </section>
        </main>
      ) : (
        <main id="atlas-main" className="page-main">
          <ScenarioView />
        </main>
      )}
      <footer className="footer">
        <p>
          <strong>{EDITION.name}</strong> · {EDITION.edition} · {EDITION.horizons}
        </p>
        <p>
          {UI_COPY.illustrativeLabel}, bundled and deterministic. Geography from Natural Earth
          (public domain) via world-atlas. No account, no network calls, no tracking.
        </p>
        <p>
          Keyboard: <kbd>Tab</kbd> moves between places · <kbd>Enter</kbd> opens ·{' '}
          <kbd>Esc</kbd> closes · <kbd>Ctrl</kbd>+<kbd>K</kbd> commands
        </p>
      </footer>

      <PlaceDrawer />
      <ComparePanel />
      <FieldNote />
      <Methodology />
      <CommandPalette />
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
