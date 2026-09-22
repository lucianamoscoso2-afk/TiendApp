import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, Loading, ScreenHeader, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate, formatDateInput, getPaymentMethodLabel, getExpenseCategoryLabel } from '@/lib/format';
import { showSuccess } from '@/lib/alerts';
import {
  FileText, Download, ShoppingCart, Package, Wallet,
  Users, HandCoins, Truck, TrendingUp, Calendar
} from 'lucide-react-native';

type ReportType = 'sales' | 'inventory' | 'finance' | 'purchases' | 'customers' | 'debts' | 'profitability';

export default function ReportsScreen() {
  const { store } = useAuth();
  const { sales, products, expenses, purchases, customers, debts, categories, loading } = useStoreData();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (loading) return <Loading message="Cargando reportes..." />;

  const reportTypes: { value: ReportType; label: string; icon: React.ReactNode }[] = [
    { value: 'sales', label: 'Ventas', icon: <ShoppingCart color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'inventory', label: 'Inventario', icon: <Package color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'finance', label: 'Finanzas', icon: <Wallet color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'purchases', label: 'Compras', icon: <Truck color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'customers', label: 'Clientes', icon: <Users color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'debts', label: 'Fiados', icon: <HandCoins color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { value: 'profitability', label: 'Rentabilidad', icon: <TrendingUp color={colors.primary[600]} size={20} strokeWidth={2} /> },
  ];

  const filterByDate = (dateStr: string) => {
    if (!startDate || !endDate) return true;
    const d = new Date(dateStr);
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setDate(e.getDate() + 1);
    return d >= s && d < e;
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (Platform.OS === 'web') {
      showSuccess(`Reporte de ${reportTypes.find(r => r.value === reportType)?.label} preparado para exportar en ${format.toUpperCase()}. La función de descarga estará disponible próximamente.`);
    } else {
      showSuccess('Reporte preparado');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Reportes" subtitle="Genera informes de tu tienda" />

      <View style={styles.content}>
        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>Tipo de reporte</Text>
          <View style={styles.reportTypesGrid}>
            {reportTypes.map(rt => (
              <TouchableOpacity
                key={rt.value}
                style={[styles.reportTypeBtn, reportType === rt.value && styles.reportTypeBtnActive]}
                onPress={() => setReportType(rt.value)}
              >
                {rt.icon}
                <Text style={[styles.reportTypeText, reportType === rt.value && styles.reportTypeTextActive]}>{rt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterTitle, { marginTop: spacing.md }]}>Periodo (opcional)</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Input label="Desde" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.dateCol}>
              <Input label="Hasta" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          <View style={styles.exportRow}>
            <Button onPress={() => handleExport('pdf')} variant="outline" size="md" style={{ flex: 1 }}>
              <FileText color={colors.primary[700]} size={18} strokeWidth={2} />
              <Text style={{ color: colors.primary[700] }}>Exportar PDF</Text>
            </Button>
            <Button onPress={() => handleExport('excel')} variant="outline" size="md" style={{ flex: 1 }}>
              <Download color={colors.primary[700]} size={18} strokeWidth={2} />
              <Text style={{ color: colors.primary[700] }}>Exportar Excel</Text>
            </Button>
          </View>
        </Card>

        <ReportContent
          type={reportType}
          sales={sales}
          products={products}
          expenses={expenses}
          purchases={purchases}
          customers={customers}
          debts={debts}
          categories={categories}
          filterByDate={filterByDate}
        />
      </View>
    </ScrollView>
  );
}

function ReportContent({ type, sales, products, expenses, purchases, customers, debts, categories, filterByDate }: any) {
  if (type === 'sales') {
    const filtered = sales.filter((s: any) => filterByDate(s.sale_date));
    const completed = filtered.filter((s: any) => s.status === 'completed');
    const total = completed.reduce((sum: number, s: any) => sum + Number(s.total), 0);
    const byMethod: Record<string, number> = {};
    completed.forEach((s: any) => { byMethod[s.payment_method] = (byMethod[s.payment_method] || 0) + Number(s.total); });

    return (
      <View>
        <ReportSummary total={total} count={completed.length} label="total en ventas" />
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Fecha</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Método</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>
          {completed.slice(0, 30).map((s: any) => (
            <View key={s.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(s.sale_date)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{getPaymentMethodLabel(s.payment_method)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontFamily: typography.fontFamilyBold }]}>{formatCurrency(Number(s.total))}</Text>
            </View>
          ))}
          {completed.length === 0 && <Text style={styles.emptyTable}>Sin ventas en este periodo</Text>}
        </Card>
        {Object.keys(byMethod).length > 0 && (
          <Card style={styles.reportCard}>
            <Text style={styles.reportCardTitle}>Ventas por método de pago</Text>
            {Object.entries(byMethod).map(([method, amount]) => (
              <View key={method} style={styles.summaryRow2}>
                <Text style={styles.summaryRowLabel}>{getPaymentMethodLabel(method)}</Text>
                <Text style={styles.summaryRowValue}>{formatCurrency(amount as number)}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    );
  }

  if (type === 'inventory') {
    const active = products.filter((p: any) => p.active);
    const totalValue = active.reduce((sum: number, p: any) => sum + Number(p.purchase_price) * Number(p.stock), 0);
    return (
      <View>
        <ReportSummary total={totalValue} count={active.length} label="valor en inventario" />
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 3 }]}>Producto</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Stock</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Valor</Text>
          </View>
          {active.slice(0, 30).map((p: any) => (
            <View key={p.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{p.name}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{p.stock}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontFamily: typography.fontFamilyBold }]}>{formatCurrency(Number(p.purchase_price) * Number(p.stock))}</Text>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  if (type === 'finance') {
    const filteredExp = expenses.filter((e: any) => filterByDate(e.expense_date));
    const filteredSales = sales.filter((s: any) => s.status === 'completed' && filterByDate(s.sale_date));
    const totalIncome = filteredSales.reduce((sum: number, s: any) => sum + Number(s.total), 0);
    const totalExp = filteredExp.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    return (
      <View>
        <View style={styles.financeSummary}>
          <Card style={styles.financeCard}><Text style={styles.financeLabel}>Ingresos</Text><Text style={[styles.financeValue, { color: colors.success }]}>{formatCurrency(totalIncome)}</Text></Card>
          <Card style={styles.financeCard}><Text style={styles.financeLabel}>Gastos</Text><Text style={[styles.financeValue, { color: colors.error }]}>{formatCurrency(totalExp)}</Text></Card>
          <Card style={styles.financeCard}><Text style={styles.financeLabel}>Ganancia</Text><Text style={[styles.financeValue, { color: totalIncome - totalExp >= 0 ? colors.success : colors.error }]}>{formatCurrency(totalIncome - totalExp)}</Text></Card>
        </View>
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Fecha</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Descripción</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Categoría</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monto</Text>
          </View>
          {filteredExp.slice(0, 30).map((e: any) => (
            <View key={e.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(e.expense_date)}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{e.description}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{getExpenseCategoryLabel(e.category)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: colors.error, fontFamily: typography.fontFamilyBold }]}>-{formatCurrency(Number(e.amount))}</Text>
            </View>
          ))}
          {filteredExp.length === 0 && <Text style={styles.emptyTable}>Sin gastos en este periodo</Text>}
        </Card>
      </View>
    );
  }

  if (type === 'purchases') {
    const filtered = purchases.filter((p: any) => filterByDate(p.purchase_date));
    const total = filtered.reduce((sum: number, p: any) => sum + Number(p.total), 0);
    return (
      <View>
        <ReportSummary total={total} count={filtered.length} label="total en compras" />
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Fecha</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Proveedor</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>
          {filtered.slice(0, 30).map((p: any) => (
            <View key={p.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(p.purchase_date)}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{p.supplier?.name || 'Sin proveedor'}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontFamily: typography.fontFamilyBold }]}>{formatCurrency(Number(p.total))}</Text>
            </View>
          ))}
          {filtered.length === 0 && <Text style={styles.emptyTable}>Sin compras en este periodo</Text>}
        </Card>
      </View>
    );
  }

  if (type === 'customers') {
    return (
      <View>
        <ReportSummary total={customers.length} count={customers.length} label="clientes registrados" isCount />
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Nombre</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Teléfono</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Saldo</Text>
          </View>
          {customers.slice(0, 30).map((c: any) => (
            <View key={c.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{c.name}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{c.phone || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: Number(c.outstanding_balance) > 0 ? colors.warning : colors.text, fontFamily: typography.fontFamilyBold }]}>{formatCurrency(Number(c.outstanding_balance))}</Text>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  if (type === 'debts') {
    const pending = debts.filter((d: any) => d.status === 'pending');
    const total = pending.reduce((sum: number, d: any) => sum + Number(d.balance), 0);
    return (
      <View>
        <ReportSummary total={total} count={pending.length} label="pendiente por cobrar" />
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Cliente</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Fecha</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Saldo</Text>
          </View>
          {debts.slice(0, 30).map((d: any) => (
            <View key={d.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{d.customer?.name || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(d.debt_date)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontFamily: typography.fontFamilyBold, color: d.status === 'pending' ? colors.warning : colors.success }]}>{formatCurrency(Number(d.balance))}</Text>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  if (type === 'profitability') {
    const active = products.filter((p: any) => p.active);
    const sorted = active.sort((a: any, b: any) => {
      const ma = Number(a.purchase_price) > 0 ? ((Number(a.sale_price) - Number(a.purchase_price)) / Number(a.purchase_price)) * 100 : 0;
      const mb = Number(b.purchase_price) > 0 ? ((Number(b.sale_price) - Number(b.purchase_price)) / Number(b.purchase_price)) * 100 : 0;
      return mb - ma;
    });
    return (
      <View>
        <Card style={styles.reportCard} noPadding>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 3 }]}>Producto</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Compra</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Venta</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Margen</Text>
          </View>
          {sorted.slice(0, 30).map((p: any) => {
            const margin = Number(p.purchase_price) > 0 ? ((Number(p.sale_price) - Number(p.purchase_price)) / Number(p.purchase_price)) * 100 : 0;
            return (
              <View key={p.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{p.name}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(Number(p.purchase_price))}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(Number(p.sale_price))}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: margin >= 20 ? colors.success : margin >= 10 ? colors.warning : colors.error, fontFamily: typography.fontFamilyBold }]}>{margin.toFixed(0)}%</Text>
              </View>
            );
          })}
        </Card>
      </View>
    );
  }

  return null;
}

function ReportSummary({ total, count, label, isCount }: { total: number; count: number; label: string; isCount?: boolean }) {
  return (
    <View style={styles.reportSummaryRow}>
      <Card style={styles.reportSummaryCard}>
        <Text style={styles.reportSummaryLabel}>{label}</Text>
        <Text style={styles.reportSummaryValue}>{isCount ? count : formatCurrency(total)}</Text>
      </Card>
      <Card style={styles.reportSummaryCard}>
        <Text style={styles.reportSummaryLabel}>Registros</Text>
        <Text style={styles.reportSummaryValue}>{count}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  filterCard: { marginBottom: spacing.md },
  filterTitle: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  reportTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reportTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.neutral[50], borderWidth: 1.5, borderColor: colors.border },
  reportTypeBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  reportTypeText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  reportTypeTextActive: { color: colors.primary[700], fontFamily: typography.fontFamilyBold },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dateCol: { flex: 1 },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  reportCard: { marginBottom: spacing.sm },
  reportCardTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.border, backgroundColor: colors.neutral[50] },
  tableHeaderCell: { fontSize: typography.caption, fontFamily: typography.fontFamilyBold, color: colors.textSecondary },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableCell: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular },
  emptyTable: { textAlign: 'center', color: colors.textSecondary, fontSize: typography.bodySmall, padding: spacing.xl, fontFamily: typography.fontFamilyRegular },
  reportSummaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  reportSummaryCard: { flex: 1 },
  reportSummaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  reportSummaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  summaryRow2: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryRowLabel: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular },
  summaryRowValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  financeSummary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  financeCard: { flex: 1, alignItems: 'center' },
  financeLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  financeValue: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, marginTop: 4 },
});
