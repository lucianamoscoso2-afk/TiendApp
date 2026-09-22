import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Button } from '@/components/ui';
import { Store, ShoppingCart, TrendingUp, Bell, Package, Users } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando TiendApp...</Text>
      </View>
    );
  }

  if (user) {
    router.replace('/(app)/tabs');
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Store color={colors.white} size={36} strokeWidth={2.5} />
          </View>
        </View>
        <Text style={styles.appName}>TiendApp</Text>
        <Text style={styles.tagline}>La herramienta que ayuda a tu tienda a crecer</Text>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Todo lo que necesita tu tienda en un solo lugar</Text>

        <View style={styles.benefitList}>
          <BenefitItem
            icon={<ShoppingCart color={colors.primary[600]} size={24} strokeWidth={2} />}
            title="Registra ventas fácil"
            description="Vende en segundos, lleva el control de cada peso que entra."
          />
          <BenefitItem
            icon={<Package color={colors.primary[600]} size={24} strokeWidth={2} />}
            title="Controla tu inventario"
            description="Sabe qué tienes, qué te falta y qué está por vencerse."
          />
          <BenefitItem
            icon={<TrendingUp color={colors.primary[600]} size={24} strokeWidth={2} />}
            title="Conoce tus ganancias"
            description="Mira cuánto estás ganando y en qué estás gastando."
          />
          <BenefitItem
            icon={<Users color={colors.primary[600]} size={24} strokeWidth={2} />}
            title="Maneja fiados y clientes"
            description="Lleva el control de quién te debe y cuánto."
          />
          <BenefitItem
            icon={<Bell color={colors.primary[600]} size={24} strokeWidth={2} />}
            title="Recibe alertas"
            description="Te avisamos cuando algo necesita tu atención."
          />
        </View>
      </View>

      <View style={styles.ctaSection}>
        <Button
          onPress={() => router.push('/(auth)/login')}
          size="lg"
          fullWidth
        >
          Iniciar sesión
        </Button>
        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.signupText}>
            ¿No tienes cuenta? <Text style={styles.signupBold}>Crea una gratis</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>TiendApp - Hecho para los tenderos de Colombia</Text>
    </ScrollView>
  );
}

function BenefitItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>{icon}</View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  appName: {
    fontSize: 36,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary[700],
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
  },
  benefitsSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  benefitList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  signupLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signupText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  signupBold: {
    color: colors.primary[700],
    fontFamily: typography.fontFamilyBold,
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.caption,
    color: colors.neutral[400],
    fontFamily: typography.fontFamilyRegular,
    paddingTop: spacing.lg,
  },
});
