import { QueryClient } from '@tanstack/react-query';
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
