import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Button, Input } from '@/components/ui';
import { ArrowLeft, Store } from 'lucide-react-native';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!storeName.trim()) {
      setError('Ingrese el nombre de su tienda');
      return;
    }
    if (!email.trim()) {
      setError('Ingrese su correo electrónico');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email.trim(), password, storeName.trim());
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
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Empieza a administrar tu tienda de forma fácil</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Nombre de tu tienda"
          value={storeName}
          onChangeText={setStoreName}
          placeholder="Ej: Tienda Doña María"
        />
        <Input
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />
        <Input
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repita su contraseña"
          secureTextEntry
        />
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Button onPress={handleSignup} loading={loading} size="lg" fullWidth>
          Crear cuenta
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.footerLink}>Iniciar sesión</Text>
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
