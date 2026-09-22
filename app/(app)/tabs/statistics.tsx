import { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { LineChart, BarChart, DonutChart, ProgressBar } from '@/components/charts';
import { formatCurrency } from '@/lib/format';
import {
  BarChart3, TrendingUp, TrendingDown, Package, Award,
  Calendar, ShoppingBag, Percent
} from 'lucide-react-native';

export default function StatisticsScreen() {
  const { sales, expenses, products, categories, loading } = useStoreData();

  const stats = useMemo(() => {
    const completedSales = sales.filter(s => s.status === 'completed');
    const now = new Date();

    // Last 7 days
    const last7Days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const rev = completedSales.filter(s => { const d = new Date(s.sale_date); return d >= dayStart && d < dayEnd; }).reduce((sum, s) => sum + Number(s.total), 0);
      const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      last7Days.push({ label: labels[dayStart.getDay()], value: rev });
    }

    // Last 6 months
    const last6Months: { label: string; value: number; value2: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rev = completedSales.filter(s => { const d = new Date(s.sale_date); return d >= mStart && d < mEnd; }).reduce((sum, s) => sum + Number(s.total), 0);
      const exp = expenses.filter(e => { const d = new Date(e.expense_date); return d >= mStart && d < mEnd; }).reduce((sum, e) => sum + Number(e.amount), 0);
      const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      last6Months.push({ label: labels[mStart.getMonth()], value: rev, value2: exp });
    }

    // Top products by quantity sold
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    completedSales.forEach(s => {
      s.sale_items?.forEach(item => {
        const key = item.product_id || item.product_name;
        if (!productSales[key]) productSales[key] = { name: item.product_name, qty: 0, revenue: 0 };
        productSales[key].qty += Number(item.quantity);
        productSales[key].revenue += Number(item.subtotal);
      });
    });
    const topProducts = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
    const lowProducts = Object.entries(productSales).sort((a, b) => a[1].qty - b[1].qty).slice(0, 5);

    // Top categories by revenue
    const catSales: Record<string, { name: string; revenue: number; color: string }> = {};
    completedSales.forEach(s => {
      s.sale_items?.forEach(item => {
        if (item.product_id) {
          const product = products.find(p => p.id === item.product_id);
          if (product?.category_id) {
            const cat = categories.find(c => c.id === product.category_id);
            if (cat) {
              if (!catSales[cat.id]) catSales[cat.id] = { name: cat.name, revenue: 0, color: cat.color };
              catSales[cat.id].revenue += Number(item.subtotal);
            }
          }
        }
      });
    });
    const topCategories = Object.entries(catSales).sort((a, b) => b[1].revenue - a[1].revenue);

    // Sales by day of week
    const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const daySales: { label: string; value: number }[] = dayLabels.map((label, i) => ({
      label: label.slice(0, 3),
      value: completedSales.filter(s => new Date(s.sale_date).getDay() === i).reduce((sum, s) => sum + Number(s.total), 0),
    }));

    // Payment methods distribution
    const payMethods: Record<string, number> = {};
    completedSales.forEach(s => {
      payMethods[s.payment_method] = (payMethods[s.payment_method] || 0) + 1;
    });

    const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      last7Days, last6Months, topProducts, lowProducts, topCategories,
      daySales, payMethods, totalRevenue, totalExpenses,
      completedSalesCount: completedSales.length,
    };
  }, [sales, expenses, products, categories]);

  if (loading) return <Loading message="Cargando estadísticas..." />;

  if (stats.completedSalesCount === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Estadísticas" subtitle="Análisis de tu tienda" />
        <View style={styles.content}>
          <EmptyState
            icon={<BarChart3 color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="Sin datos suficientes"
            message="Registra algunas ventas para ver estadísticas de tu tienda"
          />
        </View>
      </ScrollView>
    );
  }

  const payMethodColors: Record<string, string> = {
    efectivo: colors.primary[600], tarjeta: colors.info, transferencia: '#8B5CF6',
    nequi: '#EC4899', daviplata: '#06B6D4', fiado: colors.warning, otro: colors.neutral[400],
  };
  const payLabels: Record<string, string> = {
    efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia',
    nequi: 'Nequi', daviplata: 'Daviplata', fiado: 'Fiado', otro: 'Otro',
  };

  const donutData = Object.entries(stats.payMethods).map(([method, count]) => ({
    label: payLabels[method] || method,
    value: count,
    color: payMethodColors[method] || colors.neutral[400],
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Estadísticas" subtitle="Análisis completo de tu tienda" />

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total ingresos</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(stats.totalRevenue)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total gastos</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>{formatCurrency(stats.totalExpenses)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Ganancia</Text>
            <Text style={[styles.summaryValue, { color: stats.totalRevenue - stats.totalExpenses >= 0 ? colors.success : colors.error }]}>{formatCurrency(stats.totalRevenue - stats.totalExpenses)}</Text>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <Text style={styles.cardTitle}>Ventas últimos 7 días</Text>
          <LineChart data={stats.last7Days} height={180} color={colors.primary[600]} />
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Ingresos vs Gastos</Text>
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

        <Card style={styles.chartCard}>
          <Text style={styles.cardTitle}>Ventas por día de la semana</Text>
          <BarChart data={stats.daySales} height={180} color={colors.primary[500]} />
        </Card>

        {donutData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.cardTitle}>Métodos de pago</Text>
            <View style={styles.donutWrap}>
              <DonutChart data={donutData} size={180} centerValue={String(stats.completedSalesCount)} centerLabel="ventas" />
            </View>
          </Card>
        )}

        <Card style={styles.chartCard} noPadding>
          <View style={styles.cardHeaderPad}>
            <Text style={styles.cardTitle}>Productos más vendidos</Text>
          </View>
          {stats.topProducts.length === 0 ? (
            <Text style={styles.emptyText}>Sin datos</Text>
          ) : (
            <View style={styles.listSection}>
              {stats.topProducts.map(([key, data], i) => (
                <View key={key} style={styles.rankItem}>
                  <View style={styles.rankNumber}>
                    <Text style={styles.rankNumberText}>{i + 1}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{data.name}</Text>
                    <Text style={styles.rankSub}>{data.qty} unidades - {formatCurrency(data.revenue)}</Text>
                  </View>
                  <Award color={i < 3 ? colors.warning : colors.neutral[300]} size={20} strokeWidth={2} />
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.chartCard} noPadding>
          <View style={styles.cardHeaderPad}>
            <Text style={styles.cardTitle}>Productos con menos ventas</Text>
          </View>
          {stats.lowProducts.length === 0 ? (
            <Text style={styles.emptyText}>Sin datos</Text>
          ) : (
            <View style={styles.listSection}>
              {stats.lowProducts.map(([key, data], i) => (
                <View key={key} style={styles.rankItem}>
                  <View style={[styles.rankNumber, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.rankNumberText, { color: colors.error }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{data.name}</Text>
                    <Text style={styles.rankSub}>{data.qty} unidades - {formatCurrency(data.revenue)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {stats.topCategories.length > 0 && (
          <Card style={styles.chartCard} noPadding>
            <View style={styles.cardHeaderPad}>
              <Text style={styles.cardTitle}>Categorías más rentables</Text>
            </View>
            <View style={styles.listSection}>
              {stats.topCategories.map(([key, data]) => (
                <View key={key} style={styles.catItem}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, { backgroundColor: data.color }]} />
                    <Text style={styles.catName}>{data.name}</Text>
                  </View>
                  <Text style={styles.catRevenue}>{formatCurrency(data.revenue)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  summaryValue: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold },
  chartCard: { marginBottom: spacing.sm },
  cardTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.md },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.sm },
  cardHeaderPad: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  legendRow: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  donutWrap: { alignItems: 'center', paddingVertical: spacing.md },
  listSection: { paddingBottom: spacing.sm },
  rankItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rankNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  rankNumberText: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[700] },
  rankInfo: { flex: 1 },
  rankName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  rankSub: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyMedium, color: colors.text },
  catRevenue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[700] },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: typography.bodySmall, padding: spacing.xl, fontFamily: typography.fontFamilyRegular },
});
