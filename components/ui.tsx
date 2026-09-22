import { ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/lib/theme';

interface CardProps {
  children: ReactNode;
  style?: any;
  onPress?: () => void;
  noPadding?: boolean;
}

export function Card({ children, style, onPress, noPadding }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.card, !noPadding && styles.cardPadding, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.card, !noPadding && styles.cardPadding, style]}>
      {children}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  color?: string;
  trend?: { value: string; positive: boolean };
  onPress?: () => void;
}

export function StatCard({ label, value, icon, color, trend, onPress }: StatCardProps) {
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon && (
          <View style={[styles.statIcon, { backgroundColor: (color || colors.primary[50]) }]}>
            {icon}
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Text style={[styles.trend, { color: trend.positive ? colors.success : colors.error }]}>
            {trend.positive ? '\u2191' : '\u2193'} {trend.value}
          </Text>
        </View>
      )}
    </Card>
  );
}

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: any;
}

export function Button({ children, onPress, variant = 'primary', size = 'md', disabled, loading, fullWidth, style }: ButtonProps) {
  const variantStyles: Record<string, any> = {
    primary: { backgroundColor: colors.primary[600] },
    secondary: { backgroundColor: colors.primary[50] },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary[600] },
    danger: { backgroundColor: colors.error },
    ghost: { backgroundColor: 'transparent' },
  };
  const textColors: Record<string, string> = {
    primary: colors.white,
    secondary: colors.primary[700],
    outline: colors.primary[700],
    danger: colors.white,
    ghost: colors.primary[700],
  };
  const sizeStyles: Record<string, any> = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm },
    md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md },
    lg: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: radius.lg },
  };
  const textSizes: Record<string, number> = { sm: 13, md: 15, lg: 17 };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && { width: '100%' },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: textColors[variant], fontSize: textSizes[size] }]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface InputProps {
  label?: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  error?: string | null;
  style?: any;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, style, editable, multiline, numberOfLines }: InputProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[styles.input, error && styles.inputError, multiline && styles.inputMultiline, style]}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

import { TextInput } from 'react-native';

interface SelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  error?: string | null;
  placeholder?: string;
}

export function Select({ label, value, onValueChange, options, error, placeholder }: SelectProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.selectContainer, error && styles.inputError]}>
        <select
          value={value}
          onChange={(e: any) => onValueChange(e.target.value)}
          style={styles.selectWeb}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </View>
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', size = 'md' }: BadgeProps) {
  const variantColors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#DCFCE7', text: '#166534' },
    warning: { bg: '#FEF3C7', text: '#92400E' },
    error: { bg: '#FEE2E2', text: '#991B1B' },
    info: { bg: '#DBEAFE', text: '#1E40AF' },
    neutral: { bg: colors.neutral[100], text: colors.neutral[600] },
    primary: { bg: colors.primary[50], text: colors.primary[700] },
  };
  const c = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: c.text }, size === 'sm' && styles.badgeTextSm]}>
        {children}
      </Text>
    </View>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {icon && <View style={styles.emptyIcon}>{icon}</View>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
}

interface LoadingProps {
  message?: string;
}

export function Loading({ message }: LoadingProps) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  cardPadding: {
    padding: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  trendRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  trend: {
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyMedium,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontFamily: typography.fontFamilyBold,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamilyMedium,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.white,
    fontFamily: typography.fontFamilyRegular,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputErrorText: {
    fontSize: typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamilyRegular,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectContainer: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  selectWeb: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: '#1A2E1F',
    fontFamily: 'Inter-Regular, sans-serif',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: '40px',
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: typography.caption,
    fontFamily: typography.fontFamilyMedium,
  },
  badgeTextSm: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyRegular,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  screenTitle: {
    fontSize: typography.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  screenSubtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
});
