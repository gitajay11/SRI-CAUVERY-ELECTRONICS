import { Redirect, router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Field, FormMessage } from '@/components/Field';
import { AppText, Button } from '@/components/ui';
import { useDeleteAccount } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Deleting the account, as both stores require an app to offer. Says what goes
 * and what stays, asks for the password, and is refused by the server while
 * an order, return or cancellation is still open.
 */
export default function DeleteAccountScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');

  if (!user) return <Redirect href="/signin" />;

  const code = remove.error instanceof ApiError ? remove.error.code : undefined;
  const passwordError = code === 'invalid_password' ? t('account.delete.wrongPassword') : undefined;
  const blocked = code === 'orders_in_progress';
  const other =
    remove.error && !passwordError && !blocked
      ? remove.error instanceof ApiError
        ? remove.error.message
        : t('error.body')
      : null;

  const confirm = () =>
    remove.mutate(password, {
      onSuccess: () => {
        router.dismissTo('/');
        Alert.alert(t('account.delete.done'));
      },
    });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t('account.delete.title') }} />
      <ScrollView
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppText tone="muted">{t('account.delete.intro')}</AppText>

        <View
          style={[styles.card, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
        >
          <AppText tone="danger" style={styles.bold}>
            • {t('account.delete.removed')}
          </AppText>
          <AppText>• {t('account.delete.kept')}</AppText>
        </View>

        <Field
          label={t('account.delete.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          error={passwordError}
        />

        {blocked ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
            ]}
          >
            <AppText tone="danger">{t('account.delete.ordersInProgress')}</AppText>
            <Pressable accessibilityRole="link" onPress={() => router.push('/orders')} hitSlop={8}>
              <AppText tone="link" style={styles.bold}>
                {t('account.delete.viewOrders')} →
              </AppText>
            </Pressable>
          </View>
        ) : null}
        {other ? <FormMessage text={other} /> : null}

        <Button
          label={t('account.delete.confirm')}
          onPress={confirm}
          loading={remove.isPending}
          disabled={password.length === 0}
        />
        <Button label={t('common.back')} variant="outline" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radius.card },
  bold: { fontWeight: '700' },
});
