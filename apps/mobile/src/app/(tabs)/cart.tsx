import { View } from 'react-native';
import { StateMessage } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { useTabBarInset } from '@/lib/tab-bar';

/** The cart and checkout arrive in their own phase. */
export default function CartScreen() {
  const { t } = useLocale();
  const bottomInset = useTabBarInset();
  return (
    <View style={{ flex: 1, paddingBottom: bottomInset }}>
      <StateMessage title={t('cart.empty.title')} body={t('cart.empty.body')} />
    </View>
  );
}
