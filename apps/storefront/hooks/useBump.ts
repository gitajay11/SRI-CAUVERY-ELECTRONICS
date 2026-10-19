'use client';

import { useState } from 'react';

/**
 * A key that changes each time `value` goes up — never on first render or
 * when it goes down. Used as a React key, it replays a "bump" animation on
 * the cart badge exactly when something has been added.
 */
export function useBump(value: number): number {
  const [previous, setPrevious] = useState(value);
  const [bumps, setBumps] = useState(0);
  if (value !== previous) {
    setPrevious(value);
    if (value > previous) setBumps(bumps + 1);
  }
  return bumps;
}
