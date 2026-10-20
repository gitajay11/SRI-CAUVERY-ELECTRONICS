import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useScrollToTop, type Href } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { useOrders, useWishlist } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { LOCALE_LABELS, LOCALES, useLocale } from '@/lib/i18n';
import { useHideTabBarOnScroll, useTabBarInset } from '@/lib/tab-bar';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Account: who is signed in, and the way to everything that is theirs —
 * orders, the wishlist, addresses, profile and password — then the language,
 * signing out and deleting the account.
 */
export default function AccountScreen() {
  const { t, locale, setLocale } = useLocale();
  const { user, signOut } = useAuth();
  const colors = useColors();
  const orders = useOrders();
  const wishlist = useWishlist();
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
      {user ? (
        <View style={styles.block}>
          <AppText variant="title">{user.name}</AppText>
          <AppText tone="muted">{user.email}</AppText>
        </View>
      ) : (
        <View style={styles.block}>
          <AppText variant="title">{t('account.title')}</AppText>
          <AppText tone="muted">{t('nav.signInSubtitle')}</AppText>
          <View style={styles.actions}>
            <Button label={t('nav.signIn')} onPress={() => router.push('/signin')} />
            <Button
              label={t('nav.register')}
              variant="outline"
              onPress={() => router.push('/register')}
            />
          </View>
        </View>
      )}

      {user ? (
        <View
          style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Row
            icon="receipt-outline"
            label={t('order.myOrders')}
            count={orders.data?.length}
            href="/orders"
          />
          <Row
            icon="heart-outline"
            label={t('nav.wishlist')}
            count={wishlist.data?.length}
            href="/wishlist"
          />
          <Row icon="location-outline" label={t('account.addresses')} href="/account/addresses" />
          <Row
            icon="person-outline"
            label={`${t('account.profile')} · ${t('account.security')}`}
            href="/account/profile"
            last
          />
        </View>
      ) : null}

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

      {user ? (
        <View style={styles.block}>
          <Button label={t('nav.signOut')} variant="outline" onPress={() => void signOut()} />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/account/delete')}
            style={styles.delete}
            hitSlop={8}
          >
            <AppText tone="danger" style={styles.bold}>
              {t('account.delete.title')}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {__DEV__ ? (
        <AppText variant="small" tone="faint">
          API: {API_URL}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  count,
  href,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count?: number;
  href: Href;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.link} />
      <AppText style={styles.rowLabel}>{label}</AppText>
      {count ? (
        <AppText variant="small" tone="faint">
          {count}
        </AppText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  block: { gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  group: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  rowLabel: { flex: 1 },
  segments: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  delete: { alignItems: 'center', paddingVertical: spacing.md },
  bold: { fontWeight: '700' },
});
