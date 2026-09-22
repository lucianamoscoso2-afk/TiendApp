import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { LineChart } from '@/components/charts';
import { formatCurrency, formatDate, formatDateTime, formatDateInput, getExpenseCategoryLabel } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Expense, ExpenseCategory } from '@/lib/types';
import {
  Wallet, Plus, TrendingUp, TrendingDown, Search, X, Trash2, Filter, Receipt,
} from 'lucide-react-native';

type PeriodKey = 'hoy' | 'semana' | 'mes' | 'personalizado';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  amount: number;
  date: string;
  expenseId?: string;
  notes?: string | null;
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'personalizado', label: 'Personalizado' },
];

const EXPENSE_CATEGORIES: { label: string; value: ExpenseCategory }[] = [
  { label: 'Mercancía', value: 'mercancia' },
  { label: 'Arriendo', value: 'arriendo' },
  { label: 'Servicios públicos', value: 'servicios' },
  { label: 'Transporte', value: 'transporte' },
  { label: 'Mantenimiento', value: 'mantenimiento' },
  { label: 'Administrativos', value: 'administrativos' },
  { label: 'Salarios', value: 'salarios' },
  { label: 'Otros', value: 'otros' },
];

function getPeriodRange(period: PeriodKey, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'hoy') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start, end };
  }
  if (period === 'semana') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (period === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }
  // personalizado
  const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export default function FinanceScreen() {
  const { sales, expenses, loading, refresh, storeId } = useStoreData();
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const completedSales = sales.filter(s => s.status === 'completed');

  const periodRange = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  // Summary for the selected period
  const totalIncome = useMemo(() =>
    completedSales
      .filter(s => { const d = new Date(s.sale_date); return d >= periodRange.start && d < periodRange.end; })
      .reduce((sum, s) => sum + Number(s.total), 0),
    [completedSales, periodRange]
  );

  const totalExpenses = useMemo(() =>
    expenses
      .filter(e => { const d = new Date(e.expense_date); return d >= periodRange.start && d < periodRange.end; })
      .reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses, periodRange]
  );

  const profit = totalIncome - totalExpenses;

  // Combined transactions list
  const transactions = useMemo<Transaction[]>(() => {
    const { start, end } = periodRange;
    const income: Transaction[] = completedSales
      .filter(s => { const d = new Date(s.sale_date); return d >= start && d < end; })
      .map(s => {
        const count = s.sale_items?.length || 0;
        return {
          id: `sale-${s.id}`,
          type: 'income',
          description: `Venta · ${count} ${count === 1 ? 'artículo' : 'artículos'}`,
          amount: Number(s.total),
          date: s.sale_date,
        };
      });

    const expenseTxns: Transaction[] = expenses
      .filter(e => { const d = new Date(e.expense_date); return d >= start && d < end; })
      .map(e => ({
        id: `exp-${e.id}`,
        type: 'expense',
        description: e.description,
        category: e.category,
        amount: Number(e.amount),
        date: e.expense_date,
        expenseId: e.id,
        notes: e.notes,
      }));

    let result = [...income, ...expenseTxns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.category && getExpenseCategoryLabel(t.category).toLowerCase().includes(q))
      );
    }
    return result;
  }, [completedSales, expenses, periodRange, search]);

  // Last 6 months chart data (ingresos vs gastos)
  const chartData = useMemo(() => {
    const now = new Date();
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data: { label: string; value: number; value2: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rev = completedSales
        .filter(s => { const d = new Date(s.sale_date); return d >= monthStart && d < monthEnd; })
        .reduce((sum, s) => sum + Number(s.total), 0);
      const exp = expenses
        .filter(e => { const d = new Date(e.expense_date); return d >= monthStart && d < monthEnd; })
        .reduce((sum, e) => sum + Number(e.amount), 0);
      data.push({ label: monthLabels[monthStart.getMonth()], value: rev, value2: exp });
    }
    return data;
  }, [completedSales, expenses]);

  const handleDeleteExpense = (expenseId: string, description: string) => {
    confirmAction(
      `¿Eliminar el gasto "${description}"? Esta acción no se puede deshacer.`,
      async () => {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (error) {
          showError('No se pudo eliminar el gasto');
        } else {
          refresh();
          showSuccess('Gasto eliminado correctamente');
        }
      }
    );
  };

  if (loading) return <Loading message="Cargando finanzas..." />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Finanzas"
        subtitle="Ingresos, gastos y ganancias de tu tienda"
        right={
          <Button onPress={() => setShowExpenseModal(true)} size="md">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Registrar gasto</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
                <TrendingUp color={colors.primary[600]} size={18} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(totalIncome)}</Text>
            <Text style={styles.summaryLabel}>Total ingresos</Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
                <TrendingDown color={colors.error} size={18} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
            <Text style={styles.summaryLabel}>Total gastos</Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: profit >= 0 ? colors.primary[50] : '#FEE2E2' }]}>
                <Wallet color={profit >= 0 ? colors.primary[600] : colors.error} size={18} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={[styles.summaryValue, profit < 0 && { color: colors.error }]}>
              {formatCurrency(profit)}
            </Text>
            <Text style={styles.summaryLabel}>Ganancia estimada</Text>
          </Card>
        </View>

        {/* Period filter */}
        <Card style={styles.filtersCard}>
          <View style={styles.filterLabelRow}>
            <Filter color={colors.textSecondary} size={16} strokeWidth={2} />
            <Text style={styles.filterLabelText}>Período</Text>
          </View>
          <View style={styles.periodRow}>
            {PERIOD_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.periodPill, period === opt.key && styles.periodPillActive]}
                onPress={() => setPeriod(opt.key)}
              >
                <Text style={[styles.periodPillText, period === opt.key && styles.periodPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {period === 'personalizado' && (
            <View style={styles.customDateRow}>
              <View style={styles.customDateCol}>
                <Input
                  label="Desde"
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.customDateCol}>
                <Input
                  label="Hasta"
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          )}
          <View style={styles.searchInput}>
            <Search color={colors.textSecondary} size={18} strokeWidth={2} />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Buscar transacción..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </Card>

        {/* Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Ingresos vs gastos</Text>
            <Text style={styles.chartSubtitle}>Últimos 6 meses</Text>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary[600] }]} />
              <Text style={styles.legendLabel}>Ingresos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={styles.legendLabel}>Gastos</Text>
            </View>
          </View>
          <LineChart
            data={chartData}
            height={220}
            color={colors.primary[600]}
            color2={colors.error}
            formatValue={formatCurrency}
          />
        </Card>

        {/* Transactions list */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Movimientos</Text>
          <Text style={styles.listCount}>{transactions.length} registros</Text>
        </View>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay movimientos"
            message="No se encontraron ingresos ni gastos para el período seleccionado."
            action={
              <Button onPress={() => setShowExpenseModal(true)}>
                <Plus color={colors.white} size={18} strokeWidth={2.5} />
                <Text style={{ color: colors.white }}>Registrar gasto</Text>
              </Button>
            }
          />
        ) : (
          <View style={styles.txnList}>
            {transactions.map(txn => (
              <Card key={txn.id} style={styles.txnCard}>
                <View style={styles.txnRow}>
                  <View style={styles.txnLeft}>
                    <Badge variant={txn.type === 'income' ? 'success' : 'error'} size="sm">
                      {txn.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </Badge>
                    <View style={styles.txnInfo}>
                      <Text style={styles.txnDesc} numberOfLines={2}>{txn.description}</Text>
                      <View style={styles.txnMeta}>
                        {txn.category && (
                          <Text style={styles.txnCategory}>{getExpenseCategoryLabel(txn.category)}</Text>
                        )}
                        <Text style={styles.txnDate}>{formatDate(txn.date)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.txnRight}>
                    <Text
                      style={[
                        styles.txnAmount,
                        txn.type === 'income' ? styles.txnAmountIncome : styles.txnAmountExpense,
                      ]}
                    >
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </Text>
                    {txn.type === 'expense' && txn.expenseId && (
                      <TouchableOpacity
                        style={styles.txnDeleteBtn}
                        onPress={() => handleDeleteExpense(txn.expenseId!, txn.description)}
                      >
                        <Trash2 color={colors.error} size={16} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <ExpenseFormModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        storeId={storeId || ''}
        onSaved={() => { refresh(); setShowExpenseModal(false); }}
      />
    </ScrollView>
  );
}

function ExpenseFormModal({ visible, onClose, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('mercancia');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form each time the modal opens
  useMemo(() => {
    if (visible) {
      setDescription('');
      setCategory('mercancia');
      setAmount('');
      setDate(formatDateInput(new Date()));
      setNotes('');
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!description.trim()) { setError('Ingresa una descripción del gasto'); return; }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido mayor a cero'); return;
    }
    if (!date) { setError('Selecciona una fecha'); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('expenses').insert({
        store_id: storeId,
        description: description.trim(),
        category,
        amount: amountNum,
        expense_date: date,
        notes: notes.trim() || null,
      });
      if (insertError) throw insertError;
      showSuccess('Gasto registrado correctamente');
      onSaved();
    } catch (e: any) {
      setError('No se pudo registrar el gasto: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Registrar gasto</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Input
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Compra de mercancía"
            />
            <Select
              label="Categoría"
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
              options={EXPENSE_CATEGORIES}
            />
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Input
                  label="Monto"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formCol}>
                <Input
                  label="Fecha"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Observaciones del gasto..."
              multiline
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              Guardar gasto
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  // Summary
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, minWidth: 180 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  summaryIcon: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },

  // Filters
  filtersCard: { marginBottom: spacing.md },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  filterLabelText: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  periodPill: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.neutral[100] },
  periodPillActive: { backgroundColor: colors.primary[600] },
  periodPillText: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  periodPillTextActive: { color: colors.white, fontFamily: typography.fontFamilyBold },
  customDateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  customDateCol: { flex: 1 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },

  // Chart
  chartCard: { marginBottom: spacing.md },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  chartTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  chartSubtitle: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  chartLegend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },

  // Transactions list
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  listTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  listCount: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  txnList: { gap: spacing.sm },
  txnCard: {},
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnLeft: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  txnInfo: { flex: 1, marginLeft: spacing.xs },
  txnDesc: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  txnMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  txnCategory: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  txnDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  txnRight: { alignItems: 'flex-end', gap: 6, flexDirection: 'row', alignItems: 'center' },
  txnAmount: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold },
  txnAmountIncome: { color: colors.success },
  txnAmountExpense: { color: colors.error },
  txnDeleteBtn: { padding: 6, borderRadius: 6, backgroundColor: '#FEE2E2', marginLeft: spacing.sm },

  // Modal
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 480, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  closeBtn: { padding: spacing.xs },
  formBody: { flex: 1, padding: spacing.lg },
  formRow: { flexDirection: 'row', gap: spacing.md },
  formCol: { flex: 1 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
});
