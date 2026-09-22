import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/lib/theme';

export default function IndexRoute() {
  const { user, loading, store } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(app)/tabs');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, loading, store]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      <Text style={styles.text}>Cargando TiendApp...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  text: {
    fontSize: typography.body,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
});
