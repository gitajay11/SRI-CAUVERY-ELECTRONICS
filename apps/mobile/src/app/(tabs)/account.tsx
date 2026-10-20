import { useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { LOCALE_LABELS, LOCALES, useLocale } from '@/lib/i18n';
import { API_URL } from '@/lib/config';
import { useHideTabBarOnScroll, useTabBarInset } from '@/lib/tab-bar';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Account. Sign-in, orders and the rest arrive in the account phase; the
 * language choice is here already because every screen depends on it.
 */
export default function AccountScreen() {
  const { t, locale, setLocale } = useLocale();
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const onScroll = useHideTabBarOnScroll();
  const bottomInset = useTabBarInset();

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.block}>
        <AppText variant="title">{t('account.title')}</AppText>
        <AppText tone="muted">{t('nav.signInSubtitle')}</AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="label" tone="faint">
          {t('nav.language').toUpperCase()}
        </AppText>
        <View style={styles.segments} accessibilityRole="radiogroup">
          {LOCALES.map((option) => {
            const selected = option === locale;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setLocale(option)}
                style={[
                  styles.segment,
                  {
                    borderColor: selected ? colors.action : colors.borderStrong,
                    backgroundColor: selected ? colors.accentSoft : colors.surface,
                  },
                ]}
              >
                <AppText style={{ fontWeight: selected ? '700' : '400' }}>
                  {LOCALE_LABELS[option]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {__DEV__ ? (
        <AppText variant="small" tone="faint">
          API: {API_URL}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  block: { gap: spacing.sm },
  segments: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
