import { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import {
  Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Package,
  HandCoins, Clock, Award, ShoppingCart, DollarSign
} from 'lucide-react-native';

interface Tip {
  level: 'info' | 'opportunity' | 'alert';
  category: string;
  title: string;
  message: string;
  icon: React.ReactNode;
}

export default function TipsScreen() {
  const { store } = useAuth();
  const { sales, products, expenses, debts, loading } = useStoreData();

  const tips = useMemo<Tip[]>(() => {
    const result: Tip[] = [];
    const completedSales = sales.filter(s => s.status === 'completed');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const monthSales = completedSales.filter(s => new Date(s.sale_date) >= startOfMonth);
    const lastMonthSales = completedSales.filter(s => {
      const d = new Date(s.sale_date);
      return d >= lastMonthStart && d < startOfMonth;
    });
    const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total), 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + Number(s.total), 0);
    const monthExpenses = expenses.filter(e => new Date(e.expense_date) >= startOfMonth).reduce((sum, e) => sum + Number(e.amount), 0);

    // Low stock alerts
    const lowStock = products.filter(p => p.active && Number(p.stock) <= Number(p.min_stock) && Number(p.stock) > 0);
    const outStock = products.filter(p => p.active && Number(p.stock) <= 0);
    if (outStock.length > 0) {
      result.push({
        level: 'alert',
        category: 'Inventario',
        title: `${outStock.length} ${outStock.length === 1 ? 'producto agotado' : 'productos agotados'}`,
        message: `Los siguientes productos no tienen existencias: ${outStock.slice(0, 3).map(p => p.name).join(', ')}${outStock.length > 3 ? '...' : ''}. Considera reponerlos pronto para no perder ventas.`,
        icon: <Package color={colors.error} size={22} strokeWidth={2} />,
      });
    }
    if (lowStock.length > 0) {
      result.push({
        level: 'alert',
        category: 'Inventario',
        title: `${lowStock.length} ${lowStock.length === 1 ? 'producto con pocas existencias' : 'productos con pocas existencias'}`,
        message: `${lowStock.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ')}${lowStock.length > 3 ? '...' : ''}. Planea una compra pronto.`,
        icon: <AlertTriangle color={colors.warning} size={22} strokeWidth={2} />,
      });
    }

    // Expiring products
    const expiring = products.filter(p => {
      if (!p.expiry_date || !p.active) return false;
      const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days <= (store?.expiry_alert_days || 7) && days >= 0;
    });
    if (expiring.length > 0) {
      result.push({
        level: 'alert',
        category: 'Inventario',
        title: `${expiring.length} ${expiring.length === 1 ? 'producto por vencer' : 'productos por vencer'}`,
        message: `${expiring.slice(0, 3).map(p => p.name).join(', ')}${expiring.length > 3 ? '...' : ''} vencen pronto. Considera hacer una promoción para venderlos antes.`,
        icon: <Clock color={colors.warning} size={22} strokeWidth={2} />,
      });
    }

    // Sales trend
    if (lastMonthRevenue > 0) {
      const change = ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      if (change > 10) {
        result.push({
          level: 'opportunity',
          category: 'Ventas',
          title: `Tus ventas subieron ${change.toFixed(0)}% este mes`,
          message: `Has vendido ${formatCurrency(monthRevenue)} este mes comparado con ${formatCurrency(lastMonthRevenue)} el mes pasado. Sigue así. Considera aumentar tu inventario de los productos más vendidos.`,
          icon: <TrendingUp color={colors.success} size={22} strokeWidth={2} />,
        });
      } else if (change < -10) {
        result.push({
          level: 'alert',
          category: 'Ventas',
          title: `Tus ventas bajaron ${Math.abs(change).toFixed(0)}% este mes`,
          message: `Has vendido ${formatCurrency(monthRevenue)} este mes comparado con ${formatCurrency(lastMonthRevenue)} el mes pasado. Revisa si hay productos que no están vendiendo o considera una promoción.`,
          icon: <TrendingDown color={colors.error} size={22} strokeWidth={2} />,
        });
      }
    }

    // Profit analysis
    const profit = monthRevenue - monthExpenses;
    if (monthRevenue > 0) {
      const margin = (profit / monthRevenue) * 100;
      if (margin < 10) {
        result.push({
          level: 'alert',
          category: 'Finanzas',
          title: 'Tu margen de ganancia es bajo',
          message: `Tu ganancia este mes es ${formatCurrency(profit)}, un ${margin.toFixed(0)}% de tus ingresos. Revisa tus gastos y considera ajustar tus precios para mejorar la rentabilidad.`,
          icon: <DollarSign color={colors.warning} size={22} strokeWidth={2} />,
        });
      } else if (margin > 30) {
        result.push({
          level: 'opportunity',
          category: 'Finanzas',
          title: 'Buen margen de ganancia',
          message: `Tu ganancia es del ${margin.toFixed(0)}% de tus ingresos. Estás manejando bien tu negocio. Podrías reinvertir en más inventario o mejorar tu tienda.`,
          icon: <Award color={colors.success} size={22} strokeWidth={2} />,
        });
      }
    }

    // Pending debts
    const pendingDebts = debts.filter(d => d.status === 'pending');
    const totalDebt = pendingDebts.reduce((sum, d) => sum + Number(d.balance), 0);
    if (totalDebt > 0 && pendingDebts.length > 0) {
      const oldDebts = pendingDebts.filter(d => {
        const days = Math.ceil((now.getTime() - new Date(d.debt_date).getTime()) / (1000 * 60 * 60 * 24));
        return days > 30;
      });
      if (oldDebts.length > 0) {
        result.push({
          level: 'alert',
          category: 'Fiados',
          title: `${oldDebts.length} ${oldDebts.length === 1 ? 'fiado antiguo' : 'fiados antiguos'} sin cobrar`,
          message: `Tienes ${formatCurrency(totalDebt)} pendientes por cobrar. ${oldDebts.length} ${oldDebts.length === 1 ? 'fiado tiene' : 'fiados tienen'} más de 30 días. Contacta a esos clientes para recuperar tu dinero.`,
          icon: <HandCoins color={colors.warning} size={22} strokeWidth={2} />,
        });
      } else {
        result.push({
          level: 'info',
          category: 'Fiados',
          title: 'Tienes fiados pendientes',
          message: `Tienes ${formatCurrency(totalDebt)} pendientes de ${pendingDebts.length} ${pendingDebts.length === 1 ? 'cliente' : 'clientes'}. Mantente al día con los cobros.`,
          icon: <HandCoins color={colors.info} size={22} strokeWidth={2} />,
        });
      }
    }

    // Low profitability products
    const lowMargin = products.filter(p => p.active && Number(p.purchase_price) > 0 && ((Number(p.sale_price) - Number(p.purchase_price)) / Number(p.purchase_price)) * 100 < 15);
    if (lowMargin.length > 0) {
      result.push({
        level: 'opportunity',
        category: 'Rentabilidad',
        title: `${lowMargin.length} ${lowMargin.length === 1 ? 'producto con baja rentabilidad' : 'productos con baja rentabilidad'}`,
        message: `${lowMargin.slice(0, 3).map(p => p.name).join(', ')}${lowMargin.length > 3 ? '...' : ''} tienen un margen menor al 15%. Considera subir el precio o buscar proveedores más económicos.`,
        icon: <TrendingDown color={colors.warning} size={22} strokeWidth={2} />,
      });
    }

    // No sales today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = completedSales.filter(s => new Date(s.sale_date) >= todayStart);
    if (todaySales.length === 0 && now.getHours() >= 12) {
      result.push({
        level: 'info',
        category: 'Ventas',
        title: 'Aún no has registrado ventas hoy',
        message: 'Es mediodía y no tienes ventas registradas. Asegúrate de registrar cada venta para llevar un control exacto.',
        icon: <ShoppingCart color={colors.info} size={22} strokeWidth={2} />,
      });
    }

    // General tip
    if (result.length === 0) {
      result.push({
        level: 'info',
        category: 'General',
        title: 'Todo está en orden',
        message: 'No hay alertas importantes en este momento. Sigue registrando tus ventas, gastos y compras para mantener el control de tu tienda.',
        icon: <Lightbulb color={colors.success} size={22} strokeWidth={2} />,
      });
    }

    return result.sort((a, b) => {
      const order = { alert: 0, opportunity: 1, info: 2 };
      return order[a.level] - order[b.level];
    });
  }, [sales, products, expenses, debts, store]);

  if (loading) return <Loading message="Analizando tu tienda..." />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Consejos para tu tienda" subtitle="Recomendaciones basadas en tus datos" />

      <View style={styles.content}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Lightbulb color={colors.primary[600]} size={24} strokeWidth={2} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Análisis automático</Text>
            <Text style={styles.introSub}>Estos consejos se generan a partir de la información real de tu tienda.</Text>
          </View>
        </View>

        {tips.map((tip, i) => (
          <Card key={i} style={[styles.tipCard, tip.level === 'alert' && styles.tipAlert, tip.level === 'opportunity' && styles.tipOpportunity]}>
            <View style={styles.tipTop}>
              <View style={[styles.tipIcon, tip.level === 'alert' && { backgroundColor: '#FEE2E2' }, tip.level === 'opportunity' && { backgroundColor: '#DCFCE7' }, tip.level === 'info' && { backgroundColor: '#DBEAFE' }]}>
                {tip.icon}
              </View>
              <View style={styles.tipHeader}>
                <Badge variant={tip.level === 'alert' ? 'error' : tip.level === 'opportunity' ? 'success' : 'info'} size="sm">
                  {tip.level === 'alert' ? 'Alerta' : tip.level === 'opportunity' ? 'Oportunidad' : 'Info'}
                </Badge>
                <Text style={styles.tipCategory}>{tip.category}</Text>
              </View>
            </View>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipMessage}>{tip.message}</Text>
          </Card>
        ))}

        <View style={{ height: spacing.xl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 700, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary[50], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  introIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  introText: { flex: 1 },
  introTitle: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.primary[800] },
  introSub: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyRegular, marginTop: 2, lineHeight: 18 },
  tipCard: { marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.info },
  tipAlert: { borderLeftColor: colors.error },
  tipOpportunity: { borderLeftColor: colors.success },
  tipTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  tipIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipCategory: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  tipTitle: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 6 },
  tipMessage: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, lineHeight: 20 },
});
