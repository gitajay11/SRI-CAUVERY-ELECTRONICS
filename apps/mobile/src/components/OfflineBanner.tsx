import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkState } from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * A strip at the top while the phone is offline, and a brief "Back online"
 * when it returns. Screens keep what they last showed; requests wait for the
 * connection rather than failing (see query.ts).
 */
export function OfflineBanner() {
  const { t } = useLocale();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;

  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);
  useEffect(() => {
    if (offline) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    // Deferred so the state change does not happen inside the effect body.
    const show = setTimeout(() => setBackOnline(true), 0);
    const hide = setTimeout(() => setBackOnline(false), 2500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [offline]);

  if (!offline && !backOnline) return null;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInUp.duration(200)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(200)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.wrap, { top: insets.top + spacing.xs }]}
    >
      <View style={[styles.banner, { backgroundColor: offline ? colors.text : colors.action }]}>
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'}
          size={16}
          color={offline ? colors.canvas : colors.onAction}
        />
        <AppText
          variant="small"
          style={[styles.text, { color: offline ? colors.canvas : colors.onAction }]}
        >
          {offline ? t('offline.banner') : t('offline.backOnline')}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    maxWidth: '92%',
  },
  text: { fontWeight: '600', flexShrink: 1 },
});
