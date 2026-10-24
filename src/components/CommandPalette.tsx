import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { LAYERS } from '../data/layers';
import {
  HORIZON_YEARS,
  SCENARIOS,
  displayValue,
  primaryMetricFor,
  valueWithUnit,
} from '../data/model';
import { SORTED_PLACES } from '../data/links';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

/**
 * Command palette (Ctrl/Cmd+K): find places, change layer, horizon or
 * scenario, open views and panels, reset. Full keyboard navigation.
 */
export function CommandPalette() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const d = dispatch;
    const list: Command[] = [];
    for (const l of LAYERS) {
      list.push({
        id: `layer-${l.id}`,
        label: `Layer: ${l.name}`,
        hint: 'switch layer',
        group: 'Layers',
        run: () => d({ type: 'setLayer', layer: l.id }),
      });
    }
    for (const y of HORIZON_YEARS) {
      list.push({
        id: `horizon-${y}`,
        label: `Horizon: ${y}`,
        hint: 'set horizon',
        group: 'Horizons',
        run: () => d({ type: 'setHorizon', horizon: y }),
      });
    }
    for (const s of SCENARIOS) {
      list.push({
        id: `scenario-${s.id}`,
        label: `Scenario: ${s.name}`,
        hint: 'set scenario',
        group: 'Scenarios',
        run: () => d({ type: 'setScenario', scenario: s.id }),
      });
    }
    list.push(
      {
        id: 'view-atlas',
        label: 'Go to the atlas',
        group: 'Views',
        run: () => d({ type: 'setView', view: 'atlas' }),
      },
      {
        id: 'view-scenarios',
        label: 'Open the scenario reader',
        group: 'Views',
        run: () => d({ type: 'setView', view: 'scenarios' }),
      },
      {
        id: 'open-note',
        label: 'Read the field note',
        group: 'Views',
        run: () => d({ type: 'setFieldNoteOpen', open: true }),
      },
      {
        id: 'open-methodology',
        label: 'Open methodology',
        group: 'Views',
        run: () => d({ type: 'setMethodologyOpen', open: true }),
      },
      {
        id: 'reset',
        label: 'Reset atlas view',
        group: 'Views',
        run: () => d({ type: 'resetView' }),
      },
    );
    return list;
  }, [dispatch]);

  const q = query.trim().toLowerCase();
  const filteredCommands = useMemo(
    () => (q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands),
    [commands, q],
  );

  const placeMatches = useMemo(() => {
    if (!q) return SORTED_PLACES.slice(0, 6);
    return SORTED_PLACES.filter((p) =>
      [p.name, p.country, p.region, p.kind].some((f) => f.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [q]);

  const options = useMemo(
    () => [
      ...placeMatches.map((p) => {
        const primary = primaryMetricFor(state.layer);
        const value = displayValue(p, primary.id, state.horizon, state.scenario);
        return {
          key: `place-${p.id}`,
          group: 'Places',
          label: p.name,
          hint: `${p.country} · ${value === null ? 'not modelled' : valueWithUnit(value, primary)}`,
          run: () => {
            dispatch({ type: 'selectPlace', id: p.id });
            dispatch({ type: 'setView', view: 'atlas' });
          },
        };
      }),
      ...filteredCommands.map((c) => ({
        key: c.id,
        group: c.group,
        label: c.label,
        hint: c.hint,
        run: c.run,
      })),
    ],
    [placeMatches, filteredCommands, dispatch, state.layer, state.horizon, state.scenario],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Reset the query each time the palette opens and take focus. Layout effect:
  // it must land before the browser paints or the next keystroke arrives.
  useLayoutEffect(() => {
    if (state.paletteOpen) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [state.paletteOpen]);

  if (!state.paletteOpen) return null;

  const runAt = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    opt.run();
    dispatch({ type: 'setPaletteOpen', open: false });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, options.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(active);
    }
  };

  let lastGroup = '';

  return (
    <Dialog
      open={state.paletteOpen}
      onClose={() => dispatch({ type: 'setPaletteOpen', open: false })}
      title="Command palette"
      variant="center"
      closeLabel="Close command palette"
    >
      <div className="palette" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          data-autofocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-listbox"
          aria-activedescendant={options[active] ? `palette-opt-${active}` : undefined}
          aria-label="Search commands and places"
          placeholder="Find a place, or type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="palette-input"
        />
        {options.length === 0 ? (
          <p className="palette-empty" role="status">
            Nothing matches “{query}”. Try a place name, a layer, or a year.
          </p>
        ) : (
          <ul className="palette-list" id="palette-listbox" role="listbox" aria-label="Commands" ref={listRef}>
            {options.map((opt, i) => {
              const showGroup = opt.group !== lastGroup;
              lastGroup = opt.group;
              return (
                <li
                  key={opt.key}
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`palette-option${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runAt(i);
                  }}
                >
                  {showGroup && <span className="palette-group">{opt.group}</span>}
                  <span className="palette-label">{opt.label}</span>
                  {opt.hint && <span className="palette-hint">{opt.hint}</span>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="palette-hints" aria-hidden="true">
          <kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>↵</kbd> run · <kbd>esc</kbd> close
        </p>
      </div>
    </Dialog>
  );
}
