import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { spacing, useColors } from '@/theme/colors';

/**
 * A full-height sheet over the current screen, for choices that need room:
 * sort and filters. The footer stays put while the body scrolls.
 */
export function Sheet({
  visible,
  title,
  onClose,
  footer,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.canvas }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <AppText variant="heading">{title}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
        {footer ? (
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { padding: spacing.lg, gap: spacing.xl },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
