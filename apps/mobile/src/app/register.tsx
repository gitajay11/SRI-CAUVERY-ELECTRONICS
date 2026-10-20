import { Stack, useLocalSearchParams } from 'expo-router';
import { AuthForm } from '@/components/AuthForm';
import { useLocale } from '@/lib/i18n';

export default function RegisterScreen() {
  const { t } = useLocale();
  const { next } = useLocalSearchParams<{ next?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('auth.register.title') }} />
      <AuthForm mode="register" next={next} />
    </>
  );
}
