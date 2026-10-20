import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_GAP, TAB_BAR_HEIGHT, useTabBarState } from '@/lib/tab-bar';
import { useColors, type Palette } from '@/theme/colors';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Outline when idle, filled when current. Keyed by route name. */
const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'],
  shop: ['grid-outline', 'grid'],
  cart: ['bag-outline', 'bag'],
  account: ['person-outline', 'person'],
};

/** The indicator's spring: quick, with a small overshoot. */
const SPRING = { stiffness: 420, damping: 34, mass: 1 };
/** Space between the bar's edge and the indicator. */
const INSET = 6;

/**
 * The tab bar as a floating glass pill, with one capsule that slides to the
 * current tab. Rendered once by the tab navigator, above every tab screen,
 * so it never re-mounts or flickers between them.
 *
 * Everything that moves — the capsule, the icon lift, the press scale, the
 * hide on scroll — runs as transform or opacity on the UI thread.
 *
 * Glass: a real blur on iOS. On Android the blur needs the content behind it
 * wrapped in a BlurTargetView, which the navigator's screen container does
 * not allow, so Android gets the solid fallback — the surface at 92%.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useColors();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { scrolledAway, keyboardUp } = useTabBarState();

  const [width, setWidth] = useState(0);
  const slot = width > 0 ? (width - INSET * 2) / state.routes.length : 0;

  // ---- the sliding capsule -------------------------------------------------
  const x = useSharedValue(0);
  const capsuleOpacity = useSharedValue(1);
  const placed = useRef(false);

  useEffect(() => {
    if (slot === 0) return;
    const target = INSET + state.index * slot;
    if (!placed.current) {
      // First layout, or a resize / rotation: no journey, just be there.
      x.set(target);
      placed.current = true;
    } else if (reducedMotion) {
      // Reduced motion: jump, with a quick fade instead of a slide.
      capsuleOpacity.set(0);
      x.set(target);
      capsuleOpacity.set(withTiming(1, { duration: 120 }));
    } else {
      x.set(withSpring(target, SPRING));
    }
  }, [state.index, slot, reducedMotion, x, capsuleOpacity]);

  // A new width means new slots: re-place without animating.
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (Math.abs(next - width) > 0.5) {
      placed.current = false;
      setWidth(next);
    }
  };

  const capsuleStyle = useAnimatedStyle(() => ({
    width: slot,
    opacity: capsuleOpacity.get(),
    transform: [{ translateX: x.get() }],
  }));

  // ---- hiding --------------------------------------------------------------
  // A new tab always starts with the bar in view.
  useEffect(() => {
    scrolledAway.set(false);
  }, [state.index, scrolledAway]);

  const travel = TAB_BAR_HEIGHT + TAB_BAR_GAP + insets.bottom + 24;
  const barStyle = useAnimatedStyle(() => {
    const away = scrolledAway.get() || keyboardUp.get();
    const duration = reducedMotion ? 0 : 220;
    return {
      opacity: withTiming(keyboardUp.get() ? 0 : 1, { duration }),
      transform: [{ translateY: withTiming(away ? travel : 0, { duration }) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: TAB_BAR_GAP + insets.bottom }, barStyle]}
    >
      <View style={[styles.shadow, dark ? styles.shadowDark : styles.shadowLight]}>
        <View
          onLayout={onLayout}
          accessibilityRole="tablist"
          style={[
            styles.bar,
            {
              borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
              backgroundColor: Platform.OS === 'ios' ? undefined : solidFallback(colors, dark),
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <>
              <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)' },
                ]}
              />
            </>
          ) : null}
          {/* The glass's top highlight. */}
          <View
            pointerEvents="none"
            style={[
              styles.highlight,
              { backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.95)' },
            ]}
          />

          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.capsule,
                {
                  backgroundColor: hexToRgba(colors.action, dark ? 0.2 : 0.24),
                  borderColor: hexToRgba(colors.action, 0.45),
                  shadowColor: colors.action,
                },
                capsuleStyle,
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            const label = typeof options.title === 'string' ? options.title : route.name;
            const badge = options.tabBarBadge;

            const onPress = () => {
              Haptics.selectionAsync().catch(() => {});
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              // A tap on the current tab is left to the screen: its
              // useScrollToTop takes it back to the top.
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <TabItem
                key={route.key}
                label={label}
                icons={ICONS[route.name] ?? ['ellipse-outline', 'ellipse']}
                badge={typeof badge === 'number' || typeof badge === 'string' ? badge : undefined}
                focused={focused}
                reducedMotion={reducedMotion}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

function TabItem({
  label,
  icons,
  badge,
  focused,
  reducedMotion,
  onPress,
  onLongPress,
}: {
  label: string;
  icons: [IconName, IconName];
  badge: number | string | undefined;
  focused: boolean;
  reducedMotion: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  const color = focused ? colors.link : colors.textMuted;

  const pressScale = useSharedValue(1);
  const lift = useSharedValue(focused ? -2 : 0);
  useEffect(() => {
    lift.set(reducedMotion ? 0 : withTiming(focused ? -2 : 0, { duration: 180 }));
  }, [focused, reducedMotion, lift]);

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.get() }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge !== undefined ? `${label}, ${badge}` : label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressScale.set(withTiming(0.94, { duration: 90 }));
      }}
      onPressOut={() => {
        pressScale.set(withTiming(1, { duration: 140 }));
      }}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, itemStyle]}>
        <Animated.View style={iconStyle}>
          <Ionicons name={focused ? icons[1] : icons[0]} size={24} color={color} />
          {badge !== undefined ? <Badge value={badge} reducedMotion={reducedMotion} /> : null}
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** The cart count, which bumps (1 → 1.2 → 1) whenever it goes up. */
function Badge({ value, reducedMotion }: { value: number | string; reducedMotion: boolean }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const previous = useRef(value);

  useEffect(() => {
    const before = Number.parseInt(String(previous.current), 10);
    const now = Number.parseInt(String(value), 10);
    previous.current = value;
    if (!reducedMotion && Number.isFinite(before) && Number.isFinite(now) && now > before) {
      scale.set(
        withSequence(
          withTiming(1.2, { duration: 120 }),
          withSpring(1, { stiffness: 420, damping: 18 }),
        ),
      );
    }
  }, [value, reducedMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: colors.action, borderColor: colors.surface }, style]}
    >
      <Animated.Text style={[styles.badgeText, { color: colors.onAction }]}>{value}</Animated.Text>
    </Animated.View>
  );
}

/** The fallback where there is no blur: the surface, 92% opaque. */
function solidFallback(colors: Palette, dark: boolean): string {
  return hexToRgba(colors.surface, dark ? 0.92 : 0.94);
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  shadow: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 999,
  },
  shadowLight: {
    shadowColor: '#14110c',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
  },
  highlight: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  capsule: {
    position: 'absolute',
    left: 0,
    top: INSET,
    bottom: INSET,
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  item: { flex: 1, minHeight: 48, alignSelf: 'stretch' },
  itemInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, lineHeight: 14 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});
