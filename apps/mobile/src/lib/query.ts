import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';
import { ApiError } from './api';

/**
 * One cache for every server read. Catalogue data is fine a minute stale (the
 * server caches it that long anyway); anything personal is refetched by the
 * screen that shows it. A 4xx is an answer, not a blip, so it is not retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failures, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 2,
    },
  },
});

// Offline, requests wait instead of failing; when the connection returns,
// whatever is on screen refetches by itself.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => subscription.remove();
});

// Coming back to the app counts as focus: stale screens refresh, as a browser
// tab does when it is shown again.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') setFocused(status === 'active');
  });
  return () => subscription.remove();
});
