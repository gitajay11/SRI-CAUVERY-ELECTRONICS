import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

type Tone = 'default' | 'muted' | 'faint' | 'link' | 'danger';
type Variant = 'title' | 'heading' | 'body' | 'small' | 'label';

/** Text in the app's palette and type scale. */
export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const colors = useColors();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    link: colors.link,
    danger: colors.danger,
  }[tone];
  // Titles and headings are headings to a screen reader too, so a shopper
  // can move through a screen section by section.
  const heading = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      {...props}
      style={[styles[variant], { color }, style]}
    />
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const colors = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: pressed ? colors.actionPressed : colors.action }
          : { borderWidth: 1, borderColor: colors.borderStrong, opacity: pressed ? 0.7 : 1 },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onAction : colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, { color: primary ? colors.onAction : colors.text }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Centred message for loading, empty and failed states. */
export function StateMessage({
  title,
  body,
  loading = false,
  action,
}: {
  title?: string;
  body?: string;
  loading?: boolean;
  action?: { label: string; onPress: () => void };
}) {
  const colors = useColors();
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator size="large" color={colors.link} /> : null}
      {title ? (
        <AppText variant="heading" style={styles.center}>
          {title}
        </AppText>
      ) : null}
      {body ? (
        <AppText tone="muted" style={styles.center}>
          {body}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="outline" /> : null}
    </View>
  );
}

/**
 * The standard failed-to-load state, with a retry. No connection and "not
 * found" get their own words in the shopper's language; the server's own
 * message is shown for anything else it explained, and a plain apology for
 * the rest.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useLocale();
  if (error instanceof ApiError && (error.code === 'network_error' || error.status === 0)) {
    return (
      <StateMessage
        title={t('offline.title')}
        body={t('offline.body')}
        action={{ label: t('offline.retry'), onPress: onRetry }}
      />
    );
  }
  if (error instanceof ApiError && error.status === 404) {
    return <StateMessage title={t('error.notFound.title')} body={error.message} />;
  }
  const message =
    error instanceof ApiError && error.status < 500 && error.message
      ? error.message
      : t('error.body');
  return (
    <StateMessage
      title={t('error.title')}
      body={message}
      action={{ label: t('common.retry'), onPress: onRetry }}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  center: { textAlign: 'center' },
});
