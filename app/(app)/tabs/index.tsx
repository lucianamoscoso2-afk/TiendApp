import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useStoreData, useDashboardStats } from '@/lib/use-store-data';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, StatCard, Loading, EmptyState, Badge } from '@/components/ui';
import { LineChart, BarChart } from '@/components/charts';
import { formatCurrency, formatDate, daysUntil, getPaymentMethodLabel } from '@/lib/format';
import {
  ShoppingCart, Wallet, TrendingUp, Package, AlertTriangle,
  HandCoins, Plus, Truck, Receipt, ArrowRight, Bell, XCircle, Clock
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { store } = useAuth();
  const { loading, products, sales, debts } = useStoreData();
  const stats = useDashboardStats();

  if (loading) {
    return <Loading message="Cargando tu panel..." />;
  }

  const recentSales = sales.filter(s => s.status === 'completed').slice(0, 5);
  const hasData = products.length > 0 || sales.length > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Hola, bienvenido a tu tienda</Text>
          <Text style={styles.welcomeStore}>{store?.name}</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <QuickAction
            icon={<ShoppingCart color={colors.white} size={20} strokeWidth={2} />}
            label="Nueva venta"
            color={colors.primary[600]}
            onPress={() => router.push('/(app)/tabs/sales')}
          />
          <QuickAction
            icon={<Plus color={colors.white} size={20} strokeWidth={2} />}
            label="Agregar producto"
            color={colors.info}
            onPress={() => router.push('/(app)/tabs/inventory')}
          />
          <QuickAction
            icon={<Receipt color={colors.white} size={20} strokeWidth={2} />}
            label="Registrar gasto"
            color={colors.warning}
            onPress={() => router.push('/(app)/tabs/finance')}
          />
          <QuickAction
            icon={<Truck color={colors.white} size={20} strokeWidth={2} />}
            label="Registrar compra"
            color="#8B5CF6"
            onPress={() => router.push('/(app)/tabs/purchases')}
          />
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Ventas de hoy"
            value={formatCurrency(stats.todayRevenue)}
            icon={<ShoppingCart color={colors.primary[600]} size={20} strokeWidth={2} />}
            color={colors.primary[50]}
          />
          <StatCard
            label="Gastos de hoy"
            value={formatCurrency(stats.todayExpenses)}
            icon={<Wallet color={colors.warning} size={20} strokeWidth={2} />}
            color="#FEF3C7"
          />
          <StatCard
            label="Ganancia del mes"
            value={formatCurrency(stats.monthProfit)}
            icon={<TrendingUp color={stats.monthProfit >= 0 ? colors.success : colors.error} size={20} strokeWidth={2} />}
            color={stats.monthProfit >= 0 ? '#DCFCE7' : '#FEE2E2'}
          />
          <StatCard
            label="Artículos vendidos hoy"
            value={String(stats.itemsSoldToday)}
            icon={<Package color={colors.info} size={20} strokeWidth={2} />}
            color="#DBEAFE"
          />
        </View>

        {/* Pending debts alert */}
        {stats.totalPendingDebts > 0 && (
          <Card style={styles.alertCard} onPress={() => router.push('/(app)/tabs/debts')}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: '#FEF3C7' }]}>
                <HandCoins color={colors.warning} size={22} strokeWidth={2} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Dinero por cobrar</Text>
                <Text style={styles.alertText}>
                  Tienes {formatCurrency(stats.totalPendingDebts)} pendientes de {stats.pendingDebtsCount} {stats.pendingDebtsCount === 1 ? 'fiado' : 'fiados'}
                </Text>
              </View>
              <ArrowRight color={colors.textSecondary} size={20} strokeWidth={2} />
            </View>
          </Card>
        )}

        {/* Inventory alerts */}
        {(stats.lowStockProducts.length > 0 || stats.outOfStockProducts.length > 0 || stats.expiringProducts.length > 0) && (
          <Card style={styles.alertCard} onPress={() => router.push('/(app)/tabs/inventory')}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
                <AlertTriangle color={colors.error} size={22} strokeWidth={2} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Alertas de inventario</Text>
                <Text style={styles.alertText}>
                  {stats.outOfStockProducts.length} agotados, {stats.lowStockProducts.length} con pocas existencias
                  {stats.expiringProducts.length > 0 && `, ${stats.expiringProducts.length} por vencer`}
                </Text>
              </View>
              <ArrowRight color={colors.textSecondary} size={20} strokeWidth={2} />
            </View>
          </Card>
        )}

        {/* Charts */}
        <Card style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ventas de la semana</Text>
          </View>
          <LineChart data={stats.last7Days} height={180} color={colors.primary[600]} />
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ingresos vs Gastos (6 meses)</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary[600] }]} />
                <Text style={styles.legendText}>Ingresos</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>Gastos</Text>
              </View>
            </View>
          </View>
          <LineChart data={stats.last6Months} height={180} color={colors.primary[600]} color2={colors.error} />
        </Card>

        {/* Recent sales */}
        <Card style={styles.chartCard} noPadding>
          <View style={styles.cardHeaderPad}>
            <Text style={styles.cardTitle}>Ventas recientes</Text>
            {sales.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(app)/tabs/sales')}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSales.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>Aún no has registrado ventas</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {recentSales.map(sale => (
                <View key={sale.id} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.listItemIcon}>
                      <ShoppingCart color={colors.primary[600]} size={16} strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={styles.listItemTitle}>{formatCurrency(Number(sale.total))}</Text>
                      <Text style={styles.listItemSub}>{getPaymentMethodLabel(sale.payment_method)} - {formatDate(sale.sale_date)}</Text>
                    </View>
                  </View>
                  <Badge variant={sale.payment_method === 'fiado' ? 'warning' : 'success'} size="sm">
                    {sale.payment_method === 'fiado' ? 'Fiado' : 'Pagado'}
                  </Badge>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Expiring products */}
        {stats.expiringProducts.length > 0 && (
          <Card style={styles.chartCard} noPadding>
            <View style={styles.cardHeaderPad}>
              <Text style={styles.cardTitle}>Productos por vencer</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/tabs/inventory')}>
                <Text style={styles.seeAllText}>Ver inventario</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.listContainer}>
              {stats.expiringProducts.slice(0, 5).map(product => {
                const days = daysUntil(product.expiry_date!);
                return (
                  <View key={product.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <View style={[styles.listItemIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Clock color={colors.warning} size={16} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.listItemTitle}>{product.name}</Text>
                        <Text style={styles.listItemSub}>Vence en {days} {days === 1 ? 'día' : 'días'}</Text>
                      </View>
                    </View>
                    <Badge variant={days <= 3 ? 'error' : 'warning'} size="sm">
                      {days <= 0 ? 'Vence hoy' : `${days}d`}
                    </Badge>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {!hasData && (
          <Card style={styles.welcomeCard}>
            <View style={styles.welcomeCardInner}>
              <Package color={colors.primary[600]} size={40} strokeWidth={2} />
              <Text style={styles.welcomeCardTitle}>Empieza por aquí</Text>
              <Text style={styles.welcomeCardText}>
                Agrega tus primeros productos al inventario para empezar a vender y llevar el control de tu tienda.
              </Text>
              <TouchableOpacity
                style={styles.welcomeCardBtn}
                onPress={() => router.push('/(app)/tabs/inventory')}
              >
                <Text style={styles.welcomeCardBtnText}>Agregar productos</Text>
                <ArrowRight color={colors.white} size={18} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: React.ReactNode; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        {icon}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  welcomeSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
  },
  welcomeStore: {
    fontSize: typography.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  quickActionLabel: {
    fontSize: typography.caption,
    color: colors.text,
    fontFamily: typography.fontFamilyMedium,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  alertCard: {
    marginBottom: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginBottom: 2,
  },
  alertText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  chartCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardHeaderPad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  seeAllText: {
    fontSize: typography.bodySmall,
    color: colors.primary[600],
    fontFamily: typography.fontFamilyMedium,
  },
  emptyInline: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyInlineText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
  },
  listContainer: {
    paddingBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  listItemSub: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    marginTop: 2,
  },
  welcomeCard: {
    marginTop: spacing.lg,
  },
  welcomeCardInner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  welcomeCardTitle: {
    fontSize: typography.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  welcomeCardText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
    lineHeight: 20,
    maxWidth: 300,
  },
  welcomeCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  welcomeCardBtnText: {
    color: colors.white,
    fontSize: typography.body,
    fontFamily: typography.fontFamilyBold,
  },
});
