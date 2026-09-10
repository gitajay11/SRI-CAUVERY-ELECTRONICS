'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Whether the shop can be installed, in one place.
 *
 * `beforeinstallprompt` fires once and must be captured the moment it does —
 * whoever is listening at that instant owns the only chance to install. That
 * used to be the timed banner, which meant the menu had no way to offer the
 * same thing. Holding the event here lets both ask.
 *
 * iOS never fires the event at all: Safari installs through Share → Add to
 * Home Screen and offers no API. Rather than hide the option from every
 * iPhone, `platform` says which of the two situations applies so the caller
 * can explain instead of prompting.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'prompt' | 'ios' | 'none';

interface InstallContextValue {
  /** True when there is something to offer — either an event or iOS steps. */
  canInstall: boolean;
  platform: Platform;
  /** Resolves to what the shopper chose; 'ios' means show them the steps. */
  install: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'>;
}

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
     Whether this is a standalone window, and whether it is iOS Safari, are
     facts about the browser that the server cannot know. Reading them during
     render would make the server and the client disagree about whether to
     draw an install button, which is a hydration mismatch. After mount is the
     only correct moment, and it settles in one extra render. */
  useEffect(() => {
    // Already running as an installed app: nothing to offer.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    // iPad reports itself as a Mac, so touch points are what separate them.
    const ua = window.navigator.userAgent;
    const iOSLike =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
    // Only Safari can install on iOS; other browsers there cannot.
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    setIsIOS(iOSLike && safari);

    const onPrompt = (nativeEvent: Event) => {
      // Suppressing the mini-infobar is what lets the shop choose the moment.
      nativeEvent.preventDefault();
      setEvent(nativeEvent as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const platform: Platform = installed
    ? 'none'
    : event
      ? 'prompt'
      : isIOS
        ? 'ios'
        : 'none';

  const install = useCallback<InstallContextValue['install']>(async () => {
    if (platform === 'ios') return 'ios';
    if (!event) return 'unavailable';

    await event.prompt();
    const choice = await event.userChoice;
    // The event is single-use; the browser will fire a fresh one if it decides
    // the shop is still installable.
    setEvent(null);
    return choice.outcome;
  }, [event, platform]);

  const value = useMemo<InstallContextValue>(
    () => ({ canInstall: platform !== 'none', platform, install }),
    [platform, install],
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall(): InstallContextValue {
  const value = useContext(InstallContext);
  if (!value) {
    throw new Error('useInstall must be used inside <InstallProvider>');
  }
  return value;
}
