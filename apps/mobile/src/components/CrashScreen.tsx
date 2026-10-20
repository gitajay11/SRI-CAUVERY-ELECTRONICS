import Ionicons from '@expo/vector-icons/Ionicons';
import type { ErrorBoundaryProps } from 'expo-router';
import { getLocales } from 'expo-localization';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { createTranslator } from '@shop/i18n';
import { palettes } from '@/theme/colors';

/**
 * What the shopper sees if a screen crashes, instead of a white page. It
 * renders outside every provider — the crash may have been in one — so it
 * reads the phone's language and colours directly.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const t = createTranslator(getLocales()[0]?.languageCode === 'ta' ? 'ta' : 'en');
  if (__DEV__) console.error(error);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.link} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {t('error.title')}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{t('error.body')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.actionPressed : colors.action },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.onAction }]}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  button: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
