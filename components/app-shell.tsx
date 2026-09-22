import { ReactNode, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import { router, usePathname, useSegments, Link } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import {
  Home, ShoppingCart, Package, Truck, Wallet, TrendingUp,
  HandCoins, Users, UserCircle, BarChart3, Bot, Megaphone,
  FileText, Settings, Bell, Menu, X, Store, LogOut, ChevronRight
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && screenWidth > 768;

interface NavItem {
  label: string;
  icon: ReactNode;
  route: string;
  group?: string;
}

const primaryNav: NavItem[] = [
  { label: 'Inicio', icon: <Home size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs' },
  { label: 'Ventas', icon: <ShoppingCart size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/sales' },
  { label: 'Inventario', icon: <Package size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/inventory' },
  { label: 'Compras', icon: <Truck size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/purchases' },
  { label: 'Finanzas', icon: <Wallet size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/finance' },
  { label: 'Rentabilidad', icon: <TrendingUp size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/profitability' },
  { label: 'Fiados', icon: <HandCoins size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/debts' },
];

const secondaryNav: NavItem[] = [
  { label: 'Proveedores', icon: <Users size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/suppliers' },
  { label: 'Clientes', icon: <UserCircle size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/customers' },
  { label: 'Estadísticas', icon: <BarChart3 size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/statistics' },
  { label: 'Tendi', icon: <Bot size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/tendi' },
  { label: 'Consejos', icon: <TrendingUp size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/tips' },
  { label: 'Marketing', icon: <Megaphone size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/marketing' },
  { label: 'Reportes', icon: <FileText size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/reports' },
  { label: 'Configuración', icon: <Settings size={22} color="currentColor" strokeWidth={2} />, route: '/(app)/tabs/settings' },
];

const allNav = [...primaryNav, ...secondaryNav];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, store, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  const activeTab = useSegments()[useSegments().length - 1] || 'tabs';

  useEffect(() => {
    if (!store) return;
    fetchNotifications();
  }, [store]);

  const fetchNotifications = async () => {
    if (!store) return;
    setNotifLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data as Notification[] || []);
    setNotifLoading(false);
  };

  const unreadCount = notifications.filter(n => !n.reviewed).length;

  const isActive = (route: string) => {
    const segment = route.split('/').pop();
    if (segment === 'tabs') return activeTab === 'tabs';
    return activeTab === segment;
  };

  const handleNav = (route: string) => {
    setMobileMenuOpen(false);
    router.push(route as any);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const markNotificationRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ reviewed: true })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, reviewed: true } : n));
  };

  const markAllRead = async () => {
    if (!store) return;
    await supabase
      .from('notifications')
      .update({ reviewed: true })
      .eq('store_id', store.id)
      .eq('reviewed', false);
    setNotifications(prev => prev.map(n => ({ ...n, reviewed: true })));
  };

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarLogo}>
          <Store color={colors.white} size={20} strokeWidth={2.5} />
        </View>
        <Text style={styles.sidebarLogoText}>TiendApp</Text>
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={styles.storeSub}>{store.city || 'Tu tienda'}</Text>
        </View>
      )}

      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        <Text style={styles.navSection}>Principal</Text>
        {primaryNav.map(item => (
          <NavButton
            key={item.route}
            item={item}
            active={isActive(item.route)}
            onPress={() => handleNav(item.route)}
          />
        ))}

        <Text style={styles.navSection}>Más opciones</Text>
        {secondaryNav.map(item => (
          <NavButton
            key={item.route}
            item={item}
            active={isActive(item.route)}
            onPress={() => handleNav(item.route)}
          />
        ))}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={colors.error} strokeWidth={2} />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {isDesktop && (
        <View style={styles.desktopSidebar}>
          {sidebar}
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.topBar}>
          {!isDesktop && (
            <TouchableOpacity style={styles.menuButton} onPress={() => setMobileMenuOpen(true)}>
              <Menu color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>{getActiveLabel(activeTab)}</Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.notifButton} onPress={() => setNotifOpen(true)}>
              <Bell color={colors.text} size={22} strokeWidth={2} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {children}
        </View>
      </View>

      {/* Mobile menu modal */}
      <Modal
        visible={mobileMenuOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMobileMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mobileMenu}>
            <View style={styles.mobileMenuHeader}>
              <Text style={styles.mobileMenuTitle}>Menú</Text>
              <TouchableOpacity onPress={() => setMobileMenuOpen(false)} style={styles.closeButton}>
                <X color={colors.text} size={24} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {sidebar}
          </View>
          <View style={styles.modalBackdrop} />
        </View>
      </Modal>

      {/* Notifications modal */}
      <Modal
        visible={notifOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notifPanel}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Notificaciones</Text>
              <View style={styles.notifHeaderRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
                    <Text style={styles.markAllText}>Marcar todas</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setNotifOpen(false)} style={styles.closeButton}>
                  <X color={colors.text} size={24} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
              {notifLoading ? (
                <Text style={styles.notifEmpty}>Cargando...</Text>
              ) : notifications.length === 0 ? (
                <Text style={styles.notifEmpty}>No tienes notificaciones</Text>
              ) : (
                notifications.map(n => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifItem, !n.reviewed && styles.notifItemUnread]}
                    onPress={() => markNotificationRead(n.id)}
                  >
                    <View style={[styles.notifDot, { backgroundColor: getSeverityColor(n.severity) }]} />
                    <View style={styles.notifContent}>
                      <Text style={styles.notifItemTitle}>{n.title}</Text>
                      <Text style={styles.notifItemMessage}>{n.message}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          <View style={styles.modalBackdrop} />
        </View>
      </Modal>
    </View>
  );
}

function NavButton({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.navButton, active && styles.navButtonActive]}
      onPress={onPress}
    >
      <View style={[styles.navIcon, active && styles.navIconActive]}>
        {item.icon}
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
      {active && <ChevronRight size={16} color={colors.primary[600]} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

function getActiveLabel(tab: string): string {
  const item = allNav.find(n => {
    const seg = n.route.split('/').pop();
    return seg === tab;
  });
  return item?.label || 'Inicio';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'error': return colors.error;
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    default: return colors.info;
  }
}

const sidebarWidth = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  desktopSidebar: {
    width: sidebarWidth,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  sidebar: {
    flex: 1,
    backgroundColor: colors.card,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarLogoText: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary[700],
  },
  storeInfo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  storeName: {
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  storeSub: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    marginTop: 2,
  },
  navList: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navSection: {
    fontSize: 11,
    fontFamily: typography.fontFamilyBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  navButtonActive: {
    backgroundColor: colors.primary[50],
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconActive: {},
  navLabel: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary[700],
    fontFamily: typography.fontFamilyBold,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  signOutText: {
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyMedium,
    color: colors.error,
  },
  main: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    minHeight: 56,
  },
  menuButton: {
    padding: spacing.xs,
  },
  topBarTitle: {
    flex: 1,
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
  },
  content: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mobileMenu: {
    width: 280,
    backgroundColor: colors.card,
    ...shadows.lg,
  },
  mobileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileMenuTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  notifPanel: {
    width: 380,
    maxWidth: '90%',
    backgroundColor: colors.card,
    ...shadows.lg,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  notifHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  markAllText: {
    fontSize: typography.caption,
    color: colors.primary[600],
    fontFamily: typography.fontFamilyMedium,
  },
  notifList: {
    flex: 1,
    padding: spacing.md,
  },
  notifEmpty: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    padding: spacing.xl,
    fontFamily: typography.fontFamilyRegular,
  },
  notifItem: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.neutral[50],
  },
  notifItemUnread: {
    backgroundColor: colors.primary[50],
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notifContent: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: 2,
  },
  notifItemMessage: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 18,
  },
});
