import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PushRegistration } from '@/components/PushRegistration';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { queryClient } from '@/lib/query';
import { loadSession } from '@/lib/session';
import { palettes } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

// A crash anywhere below shows a retry screen instead of a blank page.
export { CrashScreen as ErrorBoundary } from '@/components/CrashScreen';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = palettes[scheme];
  const [ready, setReady] = useState(false);

  // Nothing may call the API before the stored token is in memory, or a
  // signed-in shopper would be served as a guest for the first screen.
  useEffect(() => {
    loadSession()
      .catch(() => {
        // An unreadable keychain starts the app signed out rather than not at all.
      })
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.link,
      background: palette.canvas,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <PushRegistration />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: palette.surface },
                headerTintColor: palette.text,
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="search" />
              <Stack.Screen name="products" />
              <Stack.Screen name="product/[slug]" />
              <Stack.Screen name="signin" />
              <Stack.Screen name="register" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="order-placed" />
              <Stack.Screen name="orders" />
              <Stack.Screen name="order/[number]" />
              <Stack.Screen name="wishlist" />
              <Stack.Screen name="account/profile" />
              <Stack.Screen name="account/addresses" />
              <Stack.Screen name="account/delete" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <OfflineBanner />
          </ThemeProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
