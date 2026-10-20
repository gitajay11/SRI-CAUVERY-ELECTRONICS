import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Field, FormMessage } from '@/components/Field';
import { AppText, Button } from '@/components/ui';
import { useChangePassword, useUpdateProfile } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** Name and phone, then the password. Email is the account itself and stays as it is. */
export default function ProfileScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  if (!user) return <Redirect href="/signin" />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t('account.profile') }} />
      <ScrollView
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileForm initialName={user.name} initialPhone={user.phone ?? ''} email={user.email} />
        <PasswordForm />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileForm({
  initialName,
  initialPhone,
  email,
}: {
  initialName: string;
  initialPhone: string;
  email: string;
}) {
  const { t } = useLocale();
  const update = useUpdateProfile();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saved, setSaved] = useState(false);
  const fields = update.error instanceof ApiError ? (update.error.fields ?? {}) : {};

  return (
    <Card title={t('account.profile')}>
      <Field
        label={t('auth.name')}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        error={fields.name}
      />
      <Field label={t('auth.email')} value={email} editable={false} />
      <Field
        label={t('auth.phone')}
        optionalLabel={t('common.optional')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={fields.phone}
      />
      {saved ? <FormMessage text={t('account.updated')} tone="info" /> : null}
      {update.error && !fields.name && !fields.phone ? (
        <FormMessage
          text={update.error instanceof ApiError ? update.error.message : t('error.body')}
        />
      ) : null}
      <Button
        label={t('common.save')}
        loading={update.isPending}
        disabled={!name.trim()}
        onPress={() => {
          setSaved(false);
          update.mutate({ name, phone }, { onSuccess: () => setSaved(true) });
        }}
      />
    </Card>
  );
}

function PasswordForm() {
  const { t } = useLocale();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [done, setDone] = useState(false);
  const fields = change.error instanceof ApiError ? (change.error.fields ?? {}) : {};

  return (
    <Card title={t('account.security')}>
      <Field
        label={t('account.currentPassword')}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        error={fields.currentPassword}
      />
      <Field
        label={t('account.newPassword')}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        hint={t('auth.passwordHint')}
        error={fields.newPassword}
      />
      {done ? <FormMessage text={t('account.passwordChanged')} tone="info" /> : null}
      {change.error && !fields.currentPassword && !fields.newPassword ? (
        <FormMessage
          text={change.error instanceof ApiError ? change.error.message : t('error.body')}
        />
      ) : null}
      <Button
        label={t('account.changePassword')}
        variant="outline"
        loading={change.isPending}
        disabled={!current || next.length < 8}
        onPress={() => {
          setDone(false);
          change.mutate(
            { currentPassword: current, newPassword: next },
            {
              onSuccess: () => {
                setDone(true);
                setCurrent('');
                setNext('');
              },
            },
          );
        }}
      />
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
});
