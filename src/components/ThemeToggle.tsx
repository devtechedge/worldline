import { useStore } from '../state/store';

/** Light/dark toggle, rightmost in the masthead actions. */
export function ThemeToggle() {
  const { state, dispatch } = useStore();
  const next = state.theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => dispatch({ type: 'setTheme', theme: next })}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="icon-moon">
        <path d="M15.5 12.4A6.5 6.5 0 0 1 7.6 4.5a6.5 6.5 0 1 0 7.9 7.9Z" />
      </svg>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="icon-sun">
        <circle cx="10" cy="10" r="3.6" />
        <path d="M10 1.8v2.2M10 16v2.2M18.2 10H16M4 10H1.8M15.8 4.2l-1.6 1.6M5.8 14.2l-1.6 1.6M15.8 15.8l-1.6-1.6M5.8 5.8 4.2 4.2" />
      </svg>
    </button>
  );
}
