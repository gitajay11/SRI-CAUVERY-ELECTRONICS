import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Keyboard, Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared state for the floating tab bar: whether scrolling or the keyboard
 * has sent it away. Both live in shared values, so hiding and showing run on
 * the UI thread and never re-render the bar or the screen.
 */

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_GAP = 12;

interface TabBarState {
  /** Hidden by scrolling down. */
  scrolledAway: SharedValue<boolean>;
  /** Hidden because the keyboard is up. */
  keyboardUp: SharedValue<boolean>;
}

const TabBarContext = createContext<TabBarState | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const scrolledAway = useSharedValue(false);
  const keyboardUp = useSharedValue(false);

  useEffect(() => {
    // iOS announces the keyboard before it moves; Android only once it has.
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      Keyboard.addListener(show, () => {
        keyboardUp.set(true);
      }),
      Keyboard.addListener(hide, () => {
        keyboardUp.set(false);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [keyboardUp]);

  return (
    <TabBarContext.Provider value={{ scrolledAway, keyboardUp }}>{children}</TabBarContext.Provider>
  );
}

export function useTabBarState(): TabBarState {
  const value = useContext(TabBarContext);
  if (!value) throw new Error('useTabBarState must be used inside <TabBarProvider>.');
  return value;
}

/** Room a tab screen leaves at its foot, so the floating bar never covers its last item. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_GAP + insets.bottom + 16;
}

/** Distance scrolled before the direction counts, so a jittery thumb does not flicker the bar. */
const THRESHOLD = 8;
/** Near the top the bar always shows. */
const TOP_ZONE = 24;

/**
 * An `onScroll` for a tab screen's list: scrolling down sends the bar away,
 * scrolling up or reaching the top brings it back. Pair it with
 * `scrollEventThrottle={16}`.
 */
export function useHideTabBarOnScroll() {
  const { scrolledAway } = useTabBarState();
  const last = useRef(0);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - last.current;
      if (y <= TOP_ZONE) {
        if (scrolledAway.get()) scrolledAway.set(false);
        last.current = y;
      } else if (Math.abs(delta) >= THRESHOLD) {
        const away = delta > 0;
        if (scrolledAway.get() !== away) scrolledAway.set(away);
        last.current = y;
      }
    },
    [scrolledAway],
  );
}
