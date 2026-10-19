'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/**
 * What a modal needs while it is open: focus kept inside it, Escape and the
 * browser's back button closing it, the page behind it held still, and focus
 * handed back to whatever opened it.
 *
 * Back is handled by pushing one history entry on open. Pressing back pops
 * it and closes the modal; closing any other way pops it too, so the entry
 * never lingers for a later back press to land on. The entry carries the
 * router's own state, so Next treats the pop as a visit to the same page.
 *
 * Returns `requestClose`, which every close control should call. `force`
 * closes even while `canClose` is false, for when the work it guarded has
 * already ended.
 */
export function useModalDialog({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  returnFocusRef,
  canClose = true,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** False while closing would abandon work in flight, e.g. placing an order. */
  canClose?: boolean;
}): (force?: boolean) => void {
  // The latest values, without re-running the effect (and stealing focus
  // back to the first control) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  });

  const pushedRef = useRef(false);

  const requestClose = useCallback((force = false) => {
    if (!canCloseRef.current && !force) return;
    if (pushedRef.current) {
      // popstate below does the closing.
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.history.pushState({ ...window.history.state, modalDialog: true }, '');
    pushedRef.current = true;

    const onPopState = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      if (canCloseRef.current) {
        onCloseRef.current();
      } else {
        // Back while an order is being placed: stay, and keep the entry so
        // the next back still has something to close.
        window.history.pushState({ ...window.history.state, modalDialog: true }, '');
        pushedRef.current = true;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('keydown', onKeyDown);
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('keydown', onKeyDown);
      // Closed some other way than back — e.g. leaving for the order page.
      // The entry is left alone then: popping it would undo that navigation.
      pushedRef.current = false;
      // Read now, not on opening: the opener may have pointed it somewhere
      // else on the way out, such as the field the shopper chose to edit.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      returnFocusRef?.current?.focus();
    };
  }, [open, panelRef, initialFocusRef, returnFocusRef, requestClose]);

  return requestClose;
}
