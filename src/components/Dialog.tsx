import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 'side' renders the drawer; 'center' a dialog; 'wide' a roomy panel. */
  variant: 'side' | 'center' | 'wide';
  children: ReactNode;
  closeLabel?: string;
  /**
   * Modal dialogs trap focus and lock the page (palette, compare, readers).
   * Non-modal panels keep the atlas live behind them (the place drawer):
   * focus moves in on open and back on close, but the rail stays usable.
   */
  modal?: boolean;
}

/** Stack so Escape peels stacked dialogs top-first. */
const dialogStack: symbol[] = [];

export function Dialog({
  open,
  onClose,
  title,
  variant,
  children,
  closeLabel,
  modal = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const titleId = useId();

  // Focus in on open, restore on close. Keyed on `open` only so re-renders
  // (new onClose identities, query changes) never stomp user focus.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (!(panelRef.current && panelRef.current.contains(active))) {
      previouslyFocused.current = active;
    }
    const target =
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
    target?.focus({ preventScroll: true });
    return () => {
      const prev = previouslyFocused.current;
      if (prev instanceof HTMLElement && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol('dialog');
    dialogStack.push(id);
    if (modal) document.body.classList.add('dialog-open');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialogStack[dialogStack.length - 1] !== id) return;
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modal || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const index = dialogStack.indexOf(id);
      if (index !== -1) dialogStack.splice(index, 1);
      if (modal) document.body.classList.remove('dialog-open');
    };
  }, [open, onClose, modal]);

  if (!open) return null;

  return (
    <div className={`dialog-scrim variant-${variant}${modal ? '' : ' non-modal'}`}>
      <div
        ref={panelRef}
        className={`dialog-panel variant-${variant}`}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dialog-chrome">
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn dialog-close"
            onClick={onClose}
            aria-label={closeLabel ?? 'Close'}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
