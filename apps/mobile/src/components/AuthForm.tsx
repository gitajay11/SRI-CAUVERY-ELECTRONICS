import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native';
import { Field, FormMessage } from '@/components/Field';
import { AppText, Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { spacing, useColors } from '@/theme/colors';

/**
 * Sign in or create an account. `next` is where to go afterwards — the
 * checkout sends shoppers here and gets them straight back.
 */
export function AuthForm({ mode, next }: { mode: 'signIn' | 'register'; next?: string }) {
  const { t } = useLocale();
  const colors = useColors();
  const { signIn, register } = useAuth();
  const registering = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      if (registering) {
        await register({ name, email, password, phone: phone.trim() || undefined });
      } else {
        await signIn({ email, password });
      }
      // Leave the sign-in screen behind, so Back does not return to it.
      if (next) router.replace(next as never);
      else router.back();
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiError) {
        setFields(caught.fields ?? {});
        setError(
          caught.code === 'invalid_credentials'
            ? t('auth.invalidCredentials')
            : caught.code === 'email_taken'
              ? t('auth.emailTaken')
              : caught.message,
        );
      } else {
        setError(t('error.body'));
      }
    }
  };

  const switchMode = () => {
    const params = next ? { next } : undefined;
    router.replace({ pathname: registering ? '/signin' : '/register', params });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <AppText variant="title">
            {registering ? t('auth.register.title') : t('auth.signIn.title')}
          </AppText>
          <AppText tone="muted">
            {registering ? t('auth.register.subtitle') : t('auth.signIn.subtitle')}
          </AppText>
        </View>

        {registering ? (
          <Field
            label={t('auth.name')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={fields.name}
          />
        ) : null}
        <Field
          ref={emailRef}
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => (registering ? phoneRef : passwordRef).current?.focus()}
          error={fields.email}
        />
        {registering ? (
          <Field
            ref={phoneRef}
            label={t('auth.phone')}
            optionalLabel={t('common.optional')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={fields.phone}
          />
        ) : null}
        <Field
          ref={passwordRef}
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={registering ? 'new-password' : 'current-password'}
          textContentType={registering ? 'newPassword' : 'password'}
          hint={registering ? t('auth.passwordHint') : undefined}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={fields.password}
        />

        {error ? <FormMessage text={error} /> : null}

        <Button
          label={registering ? t('auth.submitRegister') : t('auth.submitSignIn')}
          onPress={submit}
          loading={busy}
          disabled={!email || !password || (registering && !name)}
        />

        <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
          <AppText tone="muted">
            {registering ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <AppText tone="link" style={styles.bold}>
              {registering ? t('auth.submitSignIn') : t('auth.submitRegister')}
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  switch: { alignItems: 'center', paddingVertical: spacing.md },
  bold: { fontWeight: '700' },
});
