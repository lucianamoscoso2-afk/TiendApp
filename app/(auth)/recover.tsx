import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, typography } from '@/lib/theme';
import { Button, Input } from '@/components/ui';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

export default function RecoverPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRecover = async () => {
    if (!email.trim()) {
      setError('Ingrese su correo electrónico');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
        </Text>
      </View>

      {sent ? (
        <View style={styles.successBox}>
          <CheckCircle color={colors.success} size={48} strokeWidth={2} />
          <Text style={styles.successTitle}>Correo enviado</Text>
          <Text style={styles.successText}>
            Revisa tu correo electrónico para restablecer tu contraseña.
          </Text>
          <Button onPress={() => router.push('/(auth)/login')} variant="primary" size="lg" style={{ marginTop: spacing.lg }}>
            Volver a iniciar sesión
          </Button>
        </View>
      ) : (
        <View style={styles.form}>
          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            error={error}
          />
          <Button onPress={handleRecover} loading={loading} size="lg" fullWidth>
            Enviar enlace
          </Button>
        </View>
      )}
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
  title: {
    fontSize: typography.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
  },
  form: {
    gap: 0,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  successTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
  },
});
