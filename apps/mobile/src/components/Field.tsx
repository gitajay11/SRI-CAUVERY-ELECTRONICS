import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from '@/components/ui';
import { radius, spacing, useColors } from '@/theme/colors';

/** A labelled text input with a hint underneath, replaced by the error when there is one. */
export const Field = forwardRef<
  TextInput,
  TextInputProps & { label: string; hint?: string; error?: string; optionalLabel?: string }
>(function Field({ label, hint, error, optionalLabel, style, ...props }, ref) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <AppText variant="small" style={styles.label}>
        {label}
        {optionalLabel ? <AppText variant="small" tone="faint">{` (${optionalLabel})`}</AppText> : null}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        {...props}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.borderStrong,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="small" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="faint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

/** A form-level message, for errors that belong to no single field. */
export function FormMessage({ text, tone = 'danger' }: { text: string; tone?: 'danger' | 'info' }) {
  const colors = useColors();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.message,
        { backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.accentSoft },
      ]}
    >
      <AppText tone={tone === 'danger' ? 'danger' : 'default'}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  message: { padding: spacing.md, borderRadius: radius.md },
});
