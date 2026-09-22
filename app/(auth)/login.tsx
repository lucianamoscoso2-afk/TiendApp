import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Button, Input } from '@/components/ui';
import { ArrowLeft, Store, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Ingrese su correo y contraseña');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      router.replace('/(app)/tabs');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Store color={colors.white} size={28} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Ingresa a tu cuenta para administrar tu tienda</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
          error={error && !email.trim() ? 'Ingrese su correo' : null}
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Su contraseña"
          secureTextEntry
          error={error && !password ? 'Ingrese su contraseña' : null}
        />
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/recover')}
          style={styles.forgotLink}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
        <Button onPress={handleLogin} loading={loading} size="lg" fullWidth>
          Iniciar sesión
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.footerLink}>Crear cuenta gratis</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  title: {
    fontSize: typography.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
  },
  form: {
    gap: 0,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#991B1B',
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyRegular,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    color: colors.primary[700],
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyMedium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  footerLink: {
    fontSize: typography.bodySmall,
    color: colors.primary[700],
    fontFamily: typography.fontFamilyBold,
  },
});
