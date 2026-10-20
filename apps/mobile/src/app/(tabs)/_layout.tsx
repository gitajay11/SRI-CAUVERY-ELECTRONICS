import { Tabs } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useCart } from '@/lib/cart';
import { useLocale } from '@/lib/i18n';
import { TabBarProvider } from '@/lib/tab-bar';
import { useColors } from '@/theme/colors';

export default function TabsLayout() {
  const { t } = useLocale();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const cart = useCart();
  const count = cart.data?.itemCount ?? 0;

  return (
    <TabBarProvider>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          // Tab screens crossfade; with reduced motion they simply switch.
          animation: reducedMotion ? 'none' : 'fade',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('nav.home'), headerTitle: 'Sri Cauvery Electronics' }}
        />
        <Tabs.Screen name="shop" options={{ title: t('nav.shop') }} />
        <Tabs.Screen
          name="cart"
          options={{
            title: t('nav.cart'),
            tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
          }}
        />
        <Tabs.Screen name="account" options={{ title: t('nav.account') }} />
      </Tabs>
    </TabBarProvider>
  );
}
