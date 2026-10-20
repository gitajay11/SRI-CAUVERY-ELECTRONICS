import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { permissionGranted, pushSupported, registerForOrderUpdates } from '@/lib/notifications';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Asks for notifications right after an order — the moment the reason is
 * obvious. Hidden where pushes cannot arrive, and once they are already on.
 */
export function OrderUpdatesPrompt() {
  const { t, locale } = useLocale();
  const colors = useColors();
  const [supported] = useState(pushSupported);
  const [state, setState] = useState<'unknown' | 'ask' | 'on' | 'hidden'>(
    supported ? 'unknown' : 'hidden',
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    permissionGranted()
      .then((granted) => setState(granted ? 'hidden' : 'ask'))
      .catch(() => setState('hidden'));
  }, [supported]);

  if (state === 'unknown' || state === 'hidden') return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.action }]}>
      <View style={styles.head}>
        <Ionicons
          name={state === 'on' ? 'notifications' : 'notifications-outline'}
          size={22}
          color={colors.link}
        />
        <AppText variant="heading" style={styles.flex}>
          {t('order.notify.title')}
        </AppText>
      </View>
      {state === 'on' ? (
        <AppText>{t('order.notify.on')}</AppText>
      ) : (
        <>
          <AppText tone="muted">{t('order.notify.body')}</AppText>
          <Button
            label={t('order.notify.cta')}
            loading={busy}
            onPress={async () => {
              setBusy(true);
              const registered = await registerForOrderUpdates(locale, true);
              setBusy(false);
              // Declined at the system prompt: do not keep asking here.
              setState(registered ? 'on' : 'hidden');
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
