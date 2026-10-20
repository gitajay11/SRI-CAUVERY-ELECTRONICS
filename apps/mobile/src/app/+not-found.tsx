import { router, Stack } from 'expo-router';
import { StateMessage } from '@/components/ui';
import { useLocale } from '@/lib/i18n';

/** A link to a page the app does not have — an old link, or a mistyped one. */
export default function NotFoundScreen() {
  const { t } = useLocale();
  return (
    <>
      <Stack.Screen options={{ title: t('error.notFound.title') }} />
      <StateMessage
        title={t('error.notFound.title')}
        body={t('error.notFound.body')}
        action={{ label: t('error.notFound.cta'), onPress: () => router.dismissTo('/') }}
      />
    </>
  );
}
