import { useEffect } from 'react';
import { router, Slot } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { user, loading, storeLoading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/welcome');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  if (storeLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
